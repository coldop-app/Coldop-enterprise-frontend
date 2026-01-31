import { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileText, Calendar, Package, Loader2 } from 'lucide-react';
import type {
  CreateStorageGatePassAllocation,
  CreateStorageGatePassGradingEntry,
} from '@/types/storage-gate-pass';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

/** Allocation with display-only available quantity (current quantity in that cell) */
export interface StorageSummaryAllocation
  extends CreateStorageGatePassAllocation {
  availableQuantity?: number;
}

/** Extended entry for summary display (gatePassNo + date per grading pass) */
export interface StorageSummaryGradingEntry
  extends Omit<CreateStorageGatePassGradingEntry, 'allocations'> {
  allocations: StorageSummaryAllocation[];
  gatePassNo?: number;
  date?: string;
}

export interface StorageSummaryFormValues {
  date: string;
  remarks: string;
  gradingGatePasses: StorageSummaryGradingEntry[];
  variety: string;
  manualGatePassNumber?: number;
}

/** Format dd.mm.yyyy or ISO to "Jan 18, 2026" */
function formatDateLong(dateStr: string): string {
  if (!dateStr?.trim()) return '—';
  const trimmed = dateStr.trim();
  if (trimmed.includes('-')) {
    const d = new Date(trimmed);
    return isNaN(d.getTime())
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
  return isNaN(d.getTime())
    ? trimmed
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

export interface StorageSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNumberDisplay: string | null;
  formValues: StorageSummaryFormValues;
  isPending: boolean;
  isLoadingVoucher: boolean;
  gatePassNo: number;
  onSubmit: () => void;
}

/* -------------------------------------------------------------------------- */
/*                           Compact Meta Row UI                              */
/* -------------------------------------------------------------------------- */

const SummaryMetaRow = memo(function SummaryMetaRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <Icon className="text-zinc-400 h-4 w-4 shrink-0" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="text-zinc-400 text-[11px] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="font-custom truncate text-sm font-medium text-white">
          {value}
        </p>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*                                Main Sheet                                  */
/* -------------------------------------------------------------------------- */

export const StorageSummarySheet = memo(function StorageSummarySheet({
  open,
  onOpenChange,
  voucherNumberDisplay,
  formValues,
  isPending,
  isLoadingVoucher,
  gatePassNo,
  onSubmit,
}: StorageSummarySheetProps) {
  const { date, remarks, gradingGatePasses, variety } = formValues;
  const totalBags = gradingGatePasses.reduce(
    (sum, entry) =>
      sum +
      entry.allocations.reduce((a, b) => a + b.quantityToAllocate, 0),
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-0 p-0 sm:max-w-lg"
      >
        <div className="flex min-h-0 flex-1 flex-col bg-zinc-900">
          <SheetHeader className="border-zinc-700/60 px-4 py-4 sm:px-6">
            <SheetTitle className="font-custom text-lg font-bold text-white sm:text-xl">
              Storage Gate Pass Summary
            </SheetTitle>
            <SheetDescription className="font-custom text-sm text-zinc-400">
              Review before creating the storage gate pass
            </SheetDescription>
          </SheetHeader>

          <div className="border-zinc-700/60 flex flex-wrap gap-x-6 gap-y-3 border-b px-4 py-3 sm:px-6">
            {voucherNumberDisplay && (
              <SummaryMetaRow
                label="Voucher"
                value={voucherNumberDisplay}
                icon={FileText}
              />
            )}
            <SummaryMetaRow label="Date" value={date} icon={Calendar} />
            <SummaryMetaRow
              label="Variety"
              value={variety || '—'}
              icon={Package}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <h2 className="font-custom mb-4 text-xl font-bold text-white sm:text-2xl">
              Selected Bags
            </h2>

            {gradingGatePasses.map((entry) => {
              const displayDate = entry.date ? formatDateLong(entry.date) : formatDateLong(date);
              return (
                <div
                  key={entry.gradingGatePassId}
                  className="mb-5 rounded-xl bg-zinc-800/80 shadow-lg overflow-hidden"
                >
                  {/* Gate Pass details: left = Gate Pass # + date, right = Commodity (variety) */}
                  <div className="border-zinc-600/50 flex flex-wrap items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
                    <div>
                      <p className="font-custom text-lg font-bold text-white sm:text-xl">
                        Gate Pass #{entry.gatePassNo ?? '—'}
                      </p>
                      <p className="font-custom mt-0.5 text-sm text-zinc-400">
                        {displayDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-custom text-xs font-medium uppercase tracking-wide text-zinc-400">
                        Commodity
                      </p>
                      <p className="font-custom mt-0.5 text-lg font-bold text-white sm:text-xl">
                        {variety || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Variety in rounded box */}
                  <div className="border-zinc-600/40 bg-zinc-700/40 mx-4 mt-3 rounded-lg border px-4 py-2.5 sm:mx-5 sm:px-5">
                    <p className="font-custom text-sm text-white">
                      Variety: {variety || '—'}
                    </p>
                  </div>

                  {/* Table: Size | Location | Avail | Sel | Rem */}
                  <div className="px-4 py-3 sm:px-5">
                    <table className="font-custom w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border-zinc-600/50 border-b py-2.5 pr-3 text-left text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            Size
                          </th>
                          <th className="border-zinc-600/50 border-b py-2.5 px-2 text-left text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            Location
                          </th>
                          <th className="border-zinc-600/50 border-b py-2.5 px-2 text-right text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            Avail
                          </th>
                          <th className="border-zinc-600/50 border-b py-2.5 px-2 text-right text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            Sel
                          </th>
                          <th className="border-zinc-600/50 border-b py-2.5 pl-2 text-right text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            Rem
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.allocations.map((alloc) => {
                          const avail = alloc.availableQuantity;
                          const rem =
                            avail != null
                              ? avail - alloc.quantityToAllocate
                              : null;
                          return (
                            <tr key={alloc.size}>
                              <td className="border-zinc-600/40 border-b py-2.5 pr-3 font-medium text-white">
                                {alloc.size}
                              </td>
                              <td className="border-zinc-600/40 border-b py-2.5 px-2 text-white">
                                {[alloc.chamber, alloc.floor, alloc.row].join(
                                  '/'
                                )}
                              </td>
                              <td className="border-zinc-600/40 border-b py-2.5 px-2 text-right text-white">
                                {avail != null
                                  ? Number(avail).toFixed(1)
                                  : '—'}
                              </td>
                              <td className="border-zinc-600/40 border-b py-2.5 px-2 text-right font-medium text-primary">
                                {Number(alloc.quantityToAllocate).toFixed(1)}
                              </td>
                              <td className="border-zinc-600/40 border-b py-2.5 pl-2 text-right text-white">
                                {rem != null ? Number(rem).toFixed(1) : '—'}
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

            <div className="mt-5 rounded-xl bg-zinc-800/80 px-4 py-4 shadow-lg sm:px-5">
              <div className="flex items-center justify-between">
                <span className="font-custom text-base font-bold text-white sm:text-lg">
                  Grand Total
                </span>
                <span className="font-custom text-xl font-bold text-primary sm:text-2xl">
                  {totalBags}
                </span>
              </div>
            </div>

            {remarks?.trim() && (
              <div className="mt-4 rounded-lg bg-zinc-800/60 px-4 py-3 sm:px-5">
                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
                  Remarks
                </p>
                <p className="font-custom mt-1 text-sm text-zinc-300">
                  {remarks}
                </p>
              </div>
            )}
          </div>

          <SheetFooter className="border-zinc-700/60 bg-zinc-800/90 border-t px-4 py-4 sm:px-6">
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="font-custom w-full border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-700 hover:text-white sm:w-auto"
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
                    Creating...
                  </span>
                ) : (
                  'Create Storage Gate Pass'
                )}
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
});
