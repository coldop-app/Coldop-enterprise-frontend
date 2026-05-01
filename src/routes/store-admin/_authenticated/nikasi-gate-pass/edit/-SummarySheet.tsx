import { memo, type ElementType } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileText, Calendar, MapPin, Loader2, Repeat2 } from 'lucide-react';

export interface NikasiSummaryAllocation {
  size: string;
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
  from: string;
  toField: string;
  remarks: string;
  isInternalTransfer?: boolean;
  gradingGatePasses: NikasiSummaryGradingEntry[];
}

export interface NikasiSummaryFormValues {
  passes: NikasiSummaryPassValues[];
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

const SummaryMetaRow = memo(function SummaryMetaRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: ElementType;
}) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <Icon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="text-muted-foreground font-custom text-[11px] font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="text-foreground font-custom truncate text-sm font-medium">
          {value}
        </p>
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-background flex w-full flex-col border-0 p-0 sm:max-w-lg"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <SheetHeader className="border-border border-b px-4 py-4 sm:px-6">
            <SheetTitle className="text-foreground font-custom text-lg font-bold sm:text-xl">
              Nikasi Gate Pass Summary
            </SheetTitle>
            <SheetDescription className="text-muted-foreground font-custom text-sm">
              {description}
            </SheetDescription>
          </SheetHeader>

          {voucherNumberDisplay && (
            <div className="border-border bg-muted/40 flex flex-wrap gap-x-6 gap-y-3 border-b px-4 py-3 sm:px-6">
              <SummaryMetaRow
                label="Voucher"
                value={voucherNumberDisplay}
                icon={FileText}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {passList.map((pass, passIndex) => {
              const { date, from, toField, remarks, gradingGatePasses } = pass;
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
                <div
                  key={passIndex}
                  className="bg-card mb-6 overflow-hidden rounded-xl border"
                >
                  <div className="border-border bg-muted/30 border-b px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                      <SummaryMetaRow
                        label="Date"
                        value={formatDateLong(date || '-')}
                        icon={Calendar}
                      />
                      <SummaryMetaRow
                        label="From"
                        value={from || '-'}
                        icon={MapPin}
                      />
                      <SummaryMetaRow
                        label="To"
                        value={toField || '-'}
                        icon={MapPin}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-primary font-custom bg-primary/10 inline-flex items-center rounded-full px-2.5 py-1 text-sm font-semibold">
                        {passBags} bags
                      </span>
                      {pass.isInternalTransfer ? (
                        <span className="bg-primary/15 text-primary font-custom inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold">
                          <Repeat2 className="h-3.5 w-3.5" />
                          Internal transfer
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <h3 className="text-foreground font-custom mt-3 mb-2 px-4 text-sm font-semibold">
                    Allocation
                  </h3>

                  {gradingGatePasses.map((entry) => {
                    const displayDate = entry.date
                      ? formatDateLong(entry.date)
                      : formatDateLong(date);

                    return (
                      <div
                        key={entry.gradingGatePassId}
                        className="bg-muted/25 mx-4 mb-4 overflow-hidden rounded-lg border"
                      >
                        <div className="border-border bg-muted/30 flex flex-wrap items-start justify-between gap-4 border-b px-3 py-3 sm:px-4">
                          <div>
                            <p className="text-foreground font-custom text-base font-bold">
                              Quantities by size
                            </p>
                            <p className="text-muted-foreground font-custom mt-0.5 text-xs">
                              {displayDate}
                            </p>
                          </div>
                        </div>

                        <div className="px-3 py-2 sm:px-4">
                          <table className="font-custom w-full border-collapse text-sm">
                            <thead>
                              <tr>
                                <th className="text-muted-foreground border-border py-2 pr-3 text-left text-[10px] font-medium tracking-wide uppercase">
                                  Size
                                </th>
                                <th className="text-muted-foreground border-border px-2 py-2 text-right text-[10px] font-medium tracking-wide uppercase">
                                  Quantity
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {entry.allocations.map((alloc) => {
                                return (
                                  <tr
                                    key={`${alloc.size}-${alloc.quantityToAllocate}`}
                                  >
                                    <td className="border-border text-foreground py-2 pr-3 font-medium">
                                      {alloc.size}
                                    </td>
                                    <td className="text-primary border-border px-2 py-2 text-right font-medium">
                                      {Number(alloc.quantityToAllocate).toFixed(
                                        1
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}

                  {remarks?.trim() && (
                    <div className="bg-muted/30 mx-4 mb-4 rounded-lg border px-3 py-2 sm:px-4">
                      <p className="text-muted-foreground font-custom text-[10px] font-medium tracking-wide uppercase">
                        Remarks
                      </p>
                      <p className="text-foreground font-custom mt-1 text-xs">
                        {remarks}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="bg-muted/40 mt-5 rounded-xl border px-4 py-4 shadow-sm sm:px-5">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-custom text-base font-bold sm:text-lg">
                  Grand Total
                </span>
                <span className="text-primary font-custom text-xl font-bold sm:text-2xl">
                  {totalBags}
                </span>
              </div>
            </div>
          </div>

          <SheetFooter className="border-border bg-background border-t px-4 py-4 sm:px-6">
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="font-custom w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="lg"
                className="font-custom w-full font-bold sm:flex-1"
                onClick={onSubmit}
                disabled={isPending || isLoadingVoucher || !gatePassNo}
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {submitLoadingLabel}
                  </span>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
});
