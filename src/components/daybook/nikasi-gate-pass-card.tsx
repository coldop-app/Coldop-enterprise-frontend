import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  Package,
  Pencil,
  Hash,
  MapPin,
  FileText,
  Warehouse,
  Scale,
  CircleUser,
  ArrowRightCircle,
  Ban,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  NikasiGatePassFarmerStorageLink,
  NikasiGatePassCreatedBy,
  NikasiGatePassDispatchLedger,
  NikasiGatePassItem,
} from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePasses';

const InfoBlock = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-muted-foreground font-custom flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </span>
    <span className="text-foreground font-custom truncate text-xs font-semibold sm:text-sm">
      {value}
    </span>
  </div>
);

export interface NikasiVoucherCardProps {
  gatePass: NikasiGatePassItem;
  variant?: 'default' | 'dispatch';
}

export interface NikasiGatePassEditState {
  id: string;
  gatePassNo: string;
  manualGatePassNumber: string;
  date: string;
  from: string;
  toField: string;
  remarks: string;
  isInternalTransfer: boolean;
  farmerName: string;
  farmerAccountNumber: string;
  farmerLinkId: string;
  dispatchLedgerId: string;
  dispatchLedgerName: string;
  bagSize: Array<{
    size: string;
    variety: string;
    quantityIssued: string;
  }>;
  netWeight: string;
  averageWeightPerBag: string;
}

function isFarmerStorageLink(
  value: NikasiGatePassFarmerStorageLink | string | undefined
): value is NikasiGatePassFarmerStorageLink {
  return typeof value === 'object' && value !== null;
}

function isCreatedByObject(
  value: NikasiGatePassCreatedBy | string | undefined
): value is NikasiGatePassCreatedBy {
  return typeof value === 'object' && value !== null;
}

function isDispatchLedgerObject(
  value: NikasiGatePassDispatchLedger | string | undefined
): value is NikasiGatePassDispatchLedger {
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

export function NikasiVoucherCard({
  gatePass,
  variant = 'dispatch',
}: NikasiVoucherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const isDispatch = variant === 'dispatch';
  const themeDot = isDispatch
    ? 'bg-destructive shadow-[0_0_8px_rgba(var(--destructive),0.6)]'
    : 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]';
  const themeText = isDispatch ? 'text-destructive' : 'text-primary';
  const themeBorderHover = isDispatch
    ? 'hover:border-destructive/40'
    : 'hover:border-primary/40';
  const themeTableFooter = isDispatch
    ? 'bg-destructive/5 border-destructive/20 text-destructive'
    : 'bg-primary/5 border-primary/20 text-primary';

  const farmerStorageLink = isFarmerStorageLink(gatePass.farmerStorageLinkId)
    ? gatePass.farmerStorageLinkId
    : null;
  const farmer = farmerStorageLink?.farmerId;
  const createdBy = isCreatedByObject(gatePass.createdBy)
    ? gatePass.createdBy.name
    : '--';
  const dispatchLedgerValue = gatePass.dispatchLedgerId;
  const dispatchLedger = isDispatchLedgerObject(dispatchLedgerValue)
    ? dispatchLedgerValue
    : null;
  const dispatchLedgerIdForEdit = isDispatchLedgerObject(dispatchLedgerValue)
    ? dispatchLedgerValue._id
    : typeof dispatchLedgerValue === 'string'
      ? dispatchLedgerValue
      : '';
  const dispatchLedgerNameForEdit =
    dispatchLedger?.name ?? gatePass.toField ?? '';
  const bagDetails = gatePass.bagSize ?? [];
  const totalIssued = bagDetails.reduce(
    (sum, row) => sum + row.quantityIssued,
    0
  );
  const isCancelledGatePass = totalIssued === 0;

  const handleEditClick = () => {
    const editState: NikasiGatePassEditState = {
      id: gatePass._id,
      gatePassNo: String(gatePass.gatePassNo),
      manualGatePassNumber: String(gatePass.manualGatePassNumber ?? ''),
      date: gatePass.date,
      from: gatePass.from,
      toField: gatePass.toField ?? '',
      remarks: gatePass.remarks ?? '',
      isInternalTransfer: Boolean(gatePass.isInternalTransfer),
      farmerName: farmer?.name ?? '',
      farmerAccountNumber: String(farmerStorageLink?.accountNumber ?? ''),
      farmerLinkId: farmerStorageLink?._id ?? '',
      dispatchLedgerId: dispatchLedgerIdForEdit,
      dispatchLedgerName: dispatchLedgerNameForEdit,
      bagSize: bagDetails.map((row) => ({
        size: row.size,
        variety: row.variety,
        quantityIssued: String(row.quantityIssued),
      })),
      netWeight: String(gatePass.netWeight ?? ''),
      averageWeightPerBag: String(gatePass.averageWeightPerBag ?? ''),
    };

    navigate({
      to: '/store-admin/nikasi-gate-pass/edit',
      state: (prev) => ({
        ...prev,
        nikasiGatePass: editState,
      }),
    });
  };

  return (
    <Card
      className={cn(
        `border-border/40 bg-card relative overflow-hidden rounded-xl pt-0 shadow-sm transition-all duration-200 hover:shadow-md ${themeBorderHover}`,
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

      <div
        className={cn(
          'bg-muted/15 border-border/50 flex flex-col justify-between gap-3 border-b px-3 pt-2 pb-3 sm:flex-row sm:items-start sm:px-4 sm:pt-3 sm:pb-4',
          isCancelledGatePass && 'bg-muted/30 border-border/30'
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className={`h-2 w-2 shrink-0 rounded-full ${themeDot}`} />
            <h3 className="text-foreground font-custom text-sm font-bold tracking-tight sm:text-base">
              NGP <span className={themeText}>#{gatePass.gatePassNo}</span>
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
          {gatePass.isInternalTransfer ? (
            <Badge
              variant="secondary"
              className="font-custom border-primary/30 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold"
            >
              Internal Transfer
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={cn(
              'font-custom bg-background px-2 py-0.5 text-[10px] font-medium',
              isCancelledGatePass &&
                'border-border/50 bg-muted/40 text-muted-foreground'
            )}
          >
            {totalIssued.toLocaleString('en-IN')} Bag(s)
          </Badge>
          {isCancelledGatePass ? (
            <Badge
              variant="secondary"
              className="font-custom border-border/60 bg-muted/40 text-muted-foreground px-2 py-0.5 text-[10px] font-medium"
            >
              Cancelled Gate Pass
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <InfoBlock
            label="Variety"
            value={bagDetails[0]?.variety ?? '--'}
            icon={Package}
          />
          <InfoBlock label="From" value={gatePass.from} icon={MapPin} />
          <InfoBlock
            label="To"
            value={dispatchLedger?.name || gatePass.toField || '--'}
            icon={ArrowRightCircle}
          />
        </div>
      </div>

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
            aria-label={`Edit nikasi gate pass ${gatePass.gatePassNo}`}
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

      {isExpanded && (
        <div className="border-border/50 animate-in slide-in-from-top-2 fade-in border-t p-3 duration-200 sm:p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <Scale className={`h-4 w-4 ${themeText}`} />
                  Weight Details
                </h4>
                <div className="bg-muted/30 mt-2.5 grid grid-cols-2 gap-3 rounded-lg p-3">
                  <InfoBlock
                    label="Net Weight"
                    value={`${(gatePass.netWeight ?? 0).toLocaleString('en-IN')} kg`}
                  />
                  <InfoBlock
                    label="Avg Weight/Bag"
                    value={`${(gatePass.averageWeightPerBag ?? 0).toLocaleString('en-IN')} kg`}
                  />
                </div>
              </section>

              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <CircleUser className={`h-4 w-4 ${themeText}`} />
                  System Record
                </h4>
                <div className="bg-muted/30 mt-2.5 grid grid-cols-2 gap-3 rounded-lg p-3">
                  <InfoBlock label="Created By" value={createdBy} />
                  <InfoBlock
                    label="Account"
                    value={`#${farmerStorageLink?.accountNumber ?? '--'}`}
                    icon={Hash}
                  />
                </div>
              </section>
            </div>

            <section>
              <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                <Warehouse className={`h-4 w-4 ${themeText}`} />
                Detailed Breakdown
              </h4>
              <div className="border-border/50 mt-2.5 overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-muted/50 text-muted-foreground font-custom text-[10px] font-semibold tracking-wide uppercase">
                      <tr>
                        <th className="px-4 py-3">Bag Size</th>
                        <th className="px-4 py-3">Variety</th>
                        <th className="px-4 py-3 text-right">Qty Issued</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/40 divide-y">
                      {bagDetails.map((row, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-muted/20 transition-colors"
                        >
                          <td className="text-foreground px-4 py-3 font-medium">
                            {row.size}
                          </td>
                          <td className="text-muted-foreground px-4 py-3">
                            {row.variety}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${themeText}`}
                          >
                            {row.quantityIssued.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={`border-t-2 ${themeTableFooter}`}>
                      <tr>
                        <td
                          className="font-custom px-4 py-3 font-bold"
                          colSpan={2}
                        >
                          Total Summary
                        </td>
                        <td className="font-custom px-4 py-3 text-right font-bold">
                          {totalIssued.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                <FileText className={`h-4 w-4 ${themeText}`} />
                Remarks
              </h4>
              <div className="bg-muted/30 mt-2.5 rounded-lg p-3">
                <p className="text-muted-foreground font-custom text-xs leading-relaxed">
                  {gatePass.remarks || '--'}
                </p>
              </div>
            </section>
          </div>
        </div>
      )}
    </Card>
  );
}
