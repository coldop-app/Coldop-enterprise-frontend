import { memo, type ElementType } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  FileText,
  Calendar,
  MapPin,
  Loader2,
  Repeat2,
  Truck,
  User,
} from 'lucide-react';

export interface NikasiSummaryAllocation {
  size: string;
  variety: string;
  bagType: string;
  quantityToAllocate: number;
  availableQuantity?: number;
}

export interface NikasiSummaryGradingEntry {
  gradingGatePassId: string;
  variety: string;
  allocations: NikasiSummaryAllocation[];
  gatePassNo?: number;
  date?: string;
}

export interface NikasiSummaryPassValues {
  date: string;
  /** Farmer / account holder */
  farmerName: string;
  /** Selected dispatch ledger name */
  dispatchLedgerName: string;
  /** Destination label (optional override; defaults to ledger when blank on submit) */
  destination: string;
  remarks: string;
  truckNumber?: string;
  manualGatePassNumber?: number;
  netWeight?: number;
  averageWeightPerBag?: number;
  isInternalTransfer?: boolean;
  gradingGatePasses: NikasiSummaryGradingEntry[];
}

export interface NikasiSummaryFormValues {
  passes: NikasiSummaryPassValues[];
}

function formatKg(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateLong(dateStr: string): string {
  if (!dateStr?.trim()) return '-';
  const trimmed = dateStr.trim();
  if (trimmed.includes('-')) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime())
      ? trimmed
      : d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
  }

  const [day, month, year] = trimmed.split('.').map(Number);
  if (!day || !month || !year) return trimmed;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime())
    ? trimmed
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

export interface NikasiSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNumberDisplay: string | null;
  formValues: NikasiSummaryFormValues;
  isPending: boolean;
  isLoadingVoucher: boolean;
  gatePassNo: number;
  onSubmit: () => void;
  submitLabel?: string;
  submitLoadingLabel?: string;
  description?: string;
}

const MetaItem = memo(function MetaItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: ElementType;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
        {label}
      </p>
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="text-muted-foreground h-4 w-4 flex-shrink-0" />
        )}
        <p className="text-foreground text-sm font-medium">{value}</p>
      </div>
    </div>
  );
});

export const NikasiSummarySheet = memo(function NikasiSummarySheet({
  open,
  onOpenChange,
  voucherNumberDisplay,
  formValues,
  isPending,
  isLoadingVoucher,
  gatePassNo,
  onSubmit,
  submitLabel = 'Update Nikasi Gate Pass',
  submitLoadingLabel = 'Updating...',
  description = 'Review before updating nikasi gate pass',
}: NikasiSummarySheetProps) {
  const passList = formValues.passes ?? [];
  const totalBags = passList.reduce(
    (sum, pass) =>
      sum +
      pass.gradingGatePasses.reduce(
        (a, entry) =>
          a +
          entry.allocations.reduce(
            (b, alloc) => b + alloc.quantityToAllocate,
            0
          ),
        0
      ),
    0
  );

  const totalNetWeight = passList.reduce(
    (sum, p) =>
      sum +
      (p.netWeight != null && Number.isFinite(p.netWeight) ? p.netWeight : 0),
    0
  );

  const hasNetWeights = passList.some(
    (p) =>
      p.netWeight != null && Number.isFinite(p.netWeight) && p.netWeight > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-background flex w-full flex-col border-0 p-0 sm:max-w-lg"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <SheetHeader className="border-border border-b px-6 py-5">
            <SheetTitle className="text-foreground text-xl font-semibold">
              Gate Pass Summary
            </SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              {description}
            </SheetDescription>
            {voucherNumberDisplay && (
              <div className="mt-3 flex items-center gap-2">
                <FileText className="text-muted-foreground h-4 w-4" />
                <span className="text-foreground text-sm font-medium">
                  Voucher:{' '}
                  <span className="font-semibold">{voucherNumberDisplay}</span>
                </span>
              </div>
            )}
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6">
              {passList.map((pass, passIndex) => {
                const {
                  date,
                  farmerName,
                  dispatchLedgerName,
                  destination,
                  remarks,
                  truckNumber,
                  netWeight,
                  averageWeightPerBag,
                  gradingGatePasses,
                  isInternalTransfer,
                } = pass;

                const passBags = gradingGatePasses.reduce(
                  (sum, entry) =>
                    sum +
                    entry.allocations.reduce(
                      (a, b) => a + b.quantityToAllocate,
                      0
                    ),
                  0
                );

                return (
                  <div key={passIndex} className="space-y-4">
                    {/* Pass Header - Compact Metadata Grid */}
                    <div className="border-border bg-card rounded-lg border p-4">
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        <MetaItem
                          label="Date"
                          value={formatDateLong(date || '-')}
                          icon={Calendar}
                        />
                        <MetaItem
                          label="Farmer"
                          value={farmerName?.trim() || null}
                          icon={User}
                        />
                        <MetaItem
                          label="Destination"
                          value={
                            destination?.trim() ||
                            dispatchLedgerName?.trim() ||
                            null
                          }
                          icon={MapPin}
                        />
                        {truckNumber?.trim() && (
                          <MetaItem
                            label="Truck"
                            value={truckNumber}
                            icon={Truck}
                          />
                        )}
                        {netWeight != null && Number.isFinite(netWeight) && (
                          <MetaItem
                            label="Net Weight"
                            value={`${formatKg(netWeight)} kg`}
                          />
                        )}
                        {averageWeightPerBag != null &&
                          Number.isFinite(averageWeightPerBag) && (
                            <MetaItem
                              label="Avg/Bag"
                              value={`${formatKg(averageWeightPerBag)} kg`}
                            />
                          )}
                      </div>

                      {/* Badges */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
                          {passBags} bags
                        </span>
                        {isInternalTransfer && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                            <Repeat2 className="h-3 w-3" />
                            Internal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Allocations — one table; each row keeps its own variety */}
                    {(() => {
                      const allocationRows = gradingGatePasses.flatMap(
                        (entry) => entry.allocations
                      );
                      const displayDate = formatDateLong(date);

                      if (allocationRows.length === 0) return null;

                      return (
                        <div className="border-border bg-muted/30 overflow-hidden rounded-lg border">
                          <div className="border-border bg-muted/50 border-b px-4 py-3">
                            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                              Bag allocation
                            </p>
                            <p className="text-foreground mt-1 text-sm font-semibold">
                              {displayDate}
                            </p>
                          </div>

                          <div className="overflow-x-auto px-4 py-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-border border-b">
                                  <th className="text-muted-foreground pb-2 text-left text-xs font-semibold tracking-widest uppercase">
                                    Size
                                  </th>
                                  <th className="text-muted-foreground px-2 pb-2 text-left text-xs font-semibold tracking-widest uppercase">
                                    Variety
                                  </th>
                                  <th className="text-muted-foreground px-2 pb-2 text-left text-xs font-semibold tracking-widest uppercase">
                                    Type
                                  </th>
                                  <th className="text-muted-foreground py-2 pl-2 text-right text-xs font-semibold tracking-widest uppercase">
                                    Qty
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-border divide-y">
                                {allocationRows.map((alloc, idx) => (
                                  <tr
                                    key={`${alloc.size}-${alloc.variety}-${alloc.bagType}-${alloc.quantityToAllocate}-${idx}`}
                                    className="hover:bg-muted/40 transition-colors"
                                  >
                                    <td className="text-foreground py-2 font-medium">
                                      {alloc.size}
                                    </td>
                                    <td className="text-foreground px-2 py-2 font-medium">
                                      {alloc.variety?.trim() || '—'}
                                    </td>
                                    <td className="text-muted-foreground px-2 py-2 text-sm">
                                      {alloc.bagType?.trim() || '—'}
                                    </td>
                                    <td className="text-primary py-2 pl-2 text-right font-semibold tabular-nums">
                                      {Number(alloc.quantityToAllocate).toFixed(
                                        1
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Remarks */}
                    {remarks?.trim() && (
                      <div className="border-border bg-muted/20 rounded-lg border p-4">
                        <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                          Remarks
                        </p>
                        <p className="text-foreground mt-2 text-sm">
                          {remarks}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Summary Footer */}
              <div className="border-border bg-card sticky bottom-0 space-y-3 rounded-lg border p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">
                    Total Bags
                  </span>
                  <span className="text-primary text-2xl font-bold">
                    {totalBags}
                  </span>
                </div>
                {hasNetWeights && (
                  <div className="border-border flex items-baseline justify-between gap-2 border-t pt-3">
                    <span className="text-muted-foreground text-sm font-semibold tracking-widest uppercase">
                      Total Weight
                    </span>
                    <span className="text-foreground text-lg font-semibold tabular-nums">
                      {formatKg(totalNetWeight)} kg
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-border bg-background border-t px-6 py-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="lg"
                className="flex-1 font-semibold"
                onClick={onSubmit}
                disabled={isPending || isLoadingVoucher || !gatePassNo}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {submitLoadingLabel}
                  </span>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});
