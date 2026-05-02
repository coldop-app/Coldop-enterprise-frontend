import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  Truck,
  Package,
  Printer,
  Pencil,
  Weight,
  FileText,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import type {
  FarmerStorageLink,
  IncomingGatePassWithLink,
  User as IncomingUser,
} from '@/types/incoming-gate-pass';
import { cn } from '@/lib/utils';
import { JUTE_BAG_WEIGHT } from '@/lib/constants';

const STATUS_LABELS = {
  NOT_GRADED: 'Pending Grading',
  GRADED: 'Graded',
  PARTIALLY_GRADED: 'Partially Graded',
} as const;

// --- Helper Component for consistent data display ---
interface InfoBlockProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  valueClassName?: string;
}

const InfoBlock = ({
  label,
  value,
  icon: Icon,
  valueClassName,
}: InfoBlockProps) => (
  <div className="flex flex-col gap-1">
    <span className="text-muted-foreground font-custom flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
    <span
      className={`text-foreground font-custom truncate text-xs font-semibold sm:text-sm ${valueClassName ?? ''}`}
    >
      {value}
    </span>
  </div>
);

interface IncomingVoucherCardProps {
  gatePass: IncomingGatePassWithLink;
}

function isFarmerStorageLink(
  value: FarmerStorageLink | string
): value is FarmerStorageLink {
  return typeof value === 'object' && value !== null;
}

function isUserObject(value: IncomingUser | string): value is IncomingUser {
  return typeof value === 'object' && value !== null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function IncomingVoucherCard({ gatePass }: IncomingVoucherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const farmerStorageLink = isFarmerStorageLink(gatePass.farmerStorageLinkId)
    ? gatePass.farmerStorageLinkId
    : null;
  const farmer = farmerStorageLink?.farmerId;
  const createdBy = isUserObject(gatePass.createdBy)
    ? gatePass.createdBy.name
    : 'Unknown user';
  const statusLabel = STATUS_LABELS[gatePass.status] ?? gatePass.status;
  const gross = gatePass.weightSlip?.grossWeightKg ?? 0;
  const tare = gatePass.weightSlip?.tareWeightKg ?? 0;
  const netKg = gross - tare;
  const bardanaKg = gatePass.bagsReceived * JUTE_BAG_WEIGHT;
  const netProductKg = netKg - bardanaKg;
  const isCancelledGatePass = gatePass.bagsReceived === 0;

  const handleEditClick = () => {
    const editSearch = {
      id: gatePass._id,
      gatePassNo: String(gatePass.gatePassNo),
      manualGatePassNumber: String(gatePass.manualGatePassNumber ?? ''),
      date: gatePass.date,
      variety: gatePass.variety,
      location: gatePass.location,
      truckNumber: gatePass.truckNumber,
      bagsReceived: String(gatePass.bagsReceived),
      weightSlipNumber: gatePass.weightSlip?.slipNumber ?? '',
      weightSlipGrossKg: String(gatePass.weightSlip?.grossWeightKg ?? ''),
      weightSlipTareKg: String(gatePass.weightSlip?.tareWeightKg ?? ''),
      remarks: gatePass.remarks ?? '',
      farmerName: farmer?.name ?? '',
      farmerAccountNumber: String(farmerStorageLink?.accountNumber ?? ''),
      farmerLinkId: farmerStorageLink?._id ?? '',
      status: gatePass.status,
    };

    navigate({
      to: '/store-admin/incoming-gate-pass/edit',
      search: editSearch,
    });
  };

  return (
    <Card
      className={cn(
        'border-border/40 bg-card hover:border-primary/40 relative overflow-hidden rounded-xl pt-0 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md',
        isCancelledGatePass &&
          'border-border/20 bg-muted/30 opacity-55 saturate-0'
      )}
    >
      {isCancelledGatePass ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <div className="border-border/30 bg-background/40 rounded-full border p-3">
              <Ban className="text-muted-foreground/50 h-7 w-7" />
            </div>
            <span className="font-custom text-muted-foreground/60 text-[10px] tracking-[0.18em] uppercase">
              Null
            </span>
          </div>
        </div>
      ) : null}

      {/* --- Card Header --- */}
      <div
        className={cn(
          'bg-muted/15 border-border/50 flex flex-col justify-between gap-3 border-b px-3 pt-2 pb-3 sm:flex-row sm:items-start sm:px-4 sm:pt-3 sm:pb-4',
          isCancelledGatePass && 'bg-muted/30 border-border/30'
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
            <h3 className="text-foreground font-custom text-sm font-bold tracking-tight sm:text-base">
              IGP{' '}
              <span
                className={cn(
                  'text-primary',
                  isCancelledGatePass && 'text-muted-foreground'
                )}
              >
                #{gatePass.gatePassNo}
              </span>
            </h3>
            {gatePass.manualGatePassNumber ? (
              <Badge
                variant="secondary"
                className="font-custom px-2 py-0.5 text-[10px] font-medium"
              >
                Manual #{gatePass.manualGatePassNumber}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground font-custom mt-1 text-[11px] sm:text-xs">
            {formatDateTime(gatePass.date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant="outline"
            className={cn(
              'bg-background font-custom px-2 py-0.5 text-[10px] font-medium',
              isCancelledGatePass &&
                'border-border/50 bg-muted/40 text-muted-foreground'
            )}
          >
            {gatePass.bagsReceived.toLocaleString('en-IN')} Bags
          </Badge>
          {isCancelledGatePass ? (
            <Badge
              variant="secondary"
              className="font-custom border-border/60 bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-medium"
            >
              Cancelled Gate Pass
            </Badge>
          ) : null}
          <Badge className="font-custom px-2 py-0.5 text-[10px] font-medium">
            {statusLabel}
          </Badge>
        </div>
      </div>

      {/* --- Primary Info Grid --- */}
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          <InfoBlock label="Farmer" value={farmer?.name ?? '--'} icon={User} />
          <InfoBlock
            label="Account"
            value={farmerStorageLink?.accountNumber ?? '--'}
          />
          <InfoBlock label="Location" value={gatePass.location} icon={MapPin} />
          <InfoBlock label="Truck" value={gatePass.truckNumber} icon={Truck} />
          <InfoBlock label="Variety" value={gatePass.variety} icon={Package} />
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="bg-muted/10 border-border/50 flex items-center justify-between border-t px-3 py-2.5 sm:px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((p) => !p)}
          className="text-muted-foreground font-custom hover:text-foreground h-8 px-2 text-xs font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> Less
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> More
            </>
          )}
        </Button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="font-custom h-8 w-8 p-0"
            onClick={handleEditClick}
            aria-label={`Edit incoming gate pass ${gatePass.gatePassNo}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-custom h-8 w-8 p-0"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* --- Expanded Details --- */}
      {isExpanded && (
        <div className="border-border/50 animate-in slide-in-from-top-2 fade-in border-t p-3 duration-200 sm:p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Farmer Details */}
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <User className="text-primary h-4 w-4" />
                  Farmer Information
                </h4>
                <div className="bg-muted/30 mt-2.5 grid grid-cols-2 gap-3 rounded-lg p-3">
                  <InfoBlock label="Name" value={farmer?.name ?? '--'} />
                  <InfoBlock
                    label="Mobile"
                    value={farmer?.mobileNumber ?? '--'}
                  />
                  <div className="col-span-2">
                    <InfoBlock
                      label="Address"
                      value={farmer?.address ?? '--'}
                    />
                  </div>
                </div>
              </section>

              {/* Remarks */}
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <FileText className="text-primary h-4 w-4" />
                  Remarks
                </h4>
                <div className="bg-muted/30 mt-2.5 rounded-lg p-3">
                  <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                    {gatePass.remarks || '--'}
                  </p>
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Weight Slip */}
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <Weight className="text-primary h-4 w-4" />
                  Weight Slip Details
                </h4>
                <div
                  className={cn(
                    'border-primary/20 bg-primary/5 mt-2.5 rounded-lg border p-3',
                    isCancelledGatePass && 'border-border/30 bg-muted/30'
                  )}
                >
                  {isCancelledGatePass ? (
                    <p className="font-custom text-muted-foreground mb-3 text-xs font-medium">
                      This entry is treated as cancelled because bags received
                      is zero.
                    </p>
                  ) : null}
                  <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <InfoBlock
                      label="Slip No"
                      value={gatePass.weightSlip?.slipNumber ?? '--'}
                    />
                    <InfoBlock
                      label="Gross (kg)"
                      value={gross.toLocaleString('en-IN')}
                    />
                    <InfoBlock
                      label="Tare (kg)"
                      value={tare.toLocaleString('en-IN')}
                    />
                  </div>

                  <Separator className="bg-primary/10 my-2.5" />

                  <div className="space-y-1.5">
                    <div className="font-custom flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">Net Weight</span>
                      <span className="text-right font-semibold">
                        {netKg.toLocaleString('en-IN')} kg
                      </span>
                    </div>
                    <div className="font-custom flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Bardana ({gatePass.bagsReceived} x {JUTE_BAG_WEIGHT}kg)
                      </span>
                      <span className="text-right font-medium text-red-500/90">
                        - {bardanaKg.toLocaleString('en-IN')} kg
                      </span>
                    </div>
                    <Separator className="bg-primary/10 my-1.5" />
                    <div className="font-custom flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground font-bold">
                        Final Net Product
                      </span>
                      <span className="text-primary text-right font-bold">
                        {netProductKg.toLocaleString('en-IN')} kg
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* System Details */}
              <section>
                <div className="bg-muted/30 flex items-center justify-between rounded-lg p-3">
                  <InfoBlock label="Created By" value={createdBy} />
                  <InfoBlock label="System Status" value="Logged in Daybook" />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
