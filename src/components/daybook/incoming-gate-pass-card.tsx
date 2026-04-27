import { useState } from 'react';
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
  type LucideIcon,
} from 'lucide-react';

// --- Placeholder Data ---
const MOCK_DATA = {
  gatePassNo: '1042',
  manualGatePassNumber: '400',
  date: 'Oct 12, 2023 • 10:30 AM',
  status: 'Pending Grading',
  bagsReceived: 150,
  farmer: {
    name: 'Gurpreet Singh',
    account: 'ACC-8921',
    address: 'Vill. Raipur, Jalandhar, Punjab',
    mobile: '+91 98765 43210',
  },
  truckNumber: 'PB 08 CX 1234',
  location: 'Godown A, Section 2',
  variety: 'Sharbati',
  createdBy: 'Admin User',
  weightSlip: {
    slipNumber: 'WS-2023-881',
    grossWeightKg: 7650.5,
    tareWeightKg: 4200.2,
  },
  remarks: 'Bags arrived in good condition. Driver requested early unloading.',
};

const JUTE_BAG_WEIGHT = 1.2;

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
    <span className="text-muted-foreground font-custom flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </span>
    <span
      className={`text-foreground font-custom truncate text-sm font-semibold ${valueClassName ?? ''}`}
    >
      {value}
    </span>
  </div>
);

export function IncomingVoucherCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derived mock calculations
  const gross = MOCK_DATA.weightSlip.grossWeightKg;
  const tare = MOCK_DATA.weightSlip.tareWeightKg;
  const netKg = gross - tare;
  const bardanaKg = MOCK_DATA.bagsReceived * JUTE_BAG_WEIGHT;
  const netProductKg = netKg - bardanaKg;

  return (
    <Card className="border-border/60 bg-card overflow-hidden rounded-xl shadow-sm transition-all duration-200 hover:shadow-md">
      {/* --- Card Header --- */}
      <div className="bg-muted/20 border-border/50 flex flex-col justify-between gap-4 border-b p-4 sm:flex-row sm:items-start sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary h-2 w-2 shrink-0 rounded-full" />
            <h3 className="text-foreground font-custom text-base font-bold tracking-tight sm:text-lg">
              IGP <span className="text-primary">#{MOCK_DATA.gatePassNo}</span>
            </h3>
            {MOCK_DATA.manualGatePassNumber && (
              <Badge
                variant="secondary"
                className="font-custom text-[10px] font-medium sm:text-xs"
              >
                Manual #{MOCK_DATA.manualGatePassNumber}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground font-custom mt-1 text-xs sm:text-sm">
            {MOCK_DATA.date}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="bg-background font-custom px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs"
          >
            {MOCK_DATA.bagsReceived.toLocaleString('en-IN')} Bags
          </Badge>
          <Badge className="font-custom px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs">
            {MOCK_DATA.status}
          </Badge>
        </div>
      </div>

      {/* --- Primary Info Grid --- */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:grid-cols-3 lg:grid-cols-5">
          <InfoBlock label="Farmer" value={MOCK_DATA.farmer.name} icon={User} />
          <InfoBlock label="Account" value={MOCK_DATA.farmer.account} />
          <InfoBlock
            label="Location"
            value={MOCK_DATA.location}
            icon={MapPin}
          />
          <InfoBlock label="Truck" value={MOCK_DATA.truckNumber} icon={Truck} />
          <InfoBlock label="Variety" value={MOCK_DATA.variety} icon={Package} />
        </div>
      </div>

      {/* --- Action Bar --- */}
      <div className="bg-muted/10 border-border/50 flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((p) => !p)}
          className="text-muted-foreground font-custom hover:text-foreground -ml-2 w-fit text-sm font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1.5 h-4 w-4" /> Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 h-4 w-4" /> View Details
            </>
          )}
        </Button>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="font-custom h-8 flex-1 gap-1.5 sm:flex-none"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-custom h-8 flex-1 gap-1.5 sm:flex-none"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* --- Expanded Details --- */}
      {isExpanded && (
        <div className="border-border/50 animate-in slide-in-from-top-2 fade-in border-t p-4 duration-200 sm:p-5">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Farmer Details */}
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-sm font-semibold">
                  <User className="text-primary h-4 w-4" />
                  Farmer Information
                </h4>
                <div className="bg-muted/30 mt-3 grid grid-cols-2 gap-4 rounded-xl p-4">
                  <InfoBlock label="Name" value={MOCK_DATA.farmer.name} />
                  <InfoBlock label="Mobile" value={MOCK_DATA.farmer.mobile} />
                  <div className="col-span-2">
                    <InfoBlock
                      label="Address"
                      value={MOCK_DATA.farmer.address}
                    />
                  </div>
                </div>
              </section>

              {/* Remarks */}
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-sm font-semibold">
                  <FileText className="text-primary h-4 w-4" />
                  Remarks
                </h4>
                <div className="bg-muted/30 mt-3 rounded-xl p-4">
                  <p className="text-muted-foreground font-custom text-sm leading-relaxed">
                    {MOCK_DATA.remarks}
                  </p>
                </div>
              </section>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Weight Slip */}
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-sm font-semibold">
                  <Weight className="text-primary h-4 w-4" />
                  Weight Slip Details
                </h4>
                <div className="border-primary/20 bg-primary/5 mt-3 rounded-xl border p-4">
                  <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <InfoBlock
                      label="Slip No"
                      value={MOCK_DATA.weightSlip.slipNumber}
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

                  <Separator className="bg-primary/10 my-3" />

                  <div className="space-y-2">
                    <div className="font-custom flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">Net Weight</span>
                      <span className="text-right font-semibold">
                        {netKg.toLocaleString('en-IN')} kg
                      </span>
                    </div>
                    <div className="font-custom flex items-center justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        Bardana ({MOCK_DATA.bagsReceived} × {JUTE_BAG_WEIGHT}kg)
                      </span>
                      <span className="text-right font-medium text-red-500/90">
                        - {bardanaKg.toLocaleString('en-IN')} kg
                      </span>
                    </div>
                    <Separator className="bg-primary/10 my-2" />
                    <div className="font-custom flex items-center justify-between gap-3 text-base">
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
                <div className="bg-muted/30 flex items-center justify-between rounded-xl p-4">
                  <InfoBlock label="Created By" value={MOCK_DATA.createdBy} />
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
