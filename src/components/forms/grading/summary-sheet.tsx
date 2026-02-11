import { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

import { FileText, Calendar, Package, Loader2 } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

export interface GradingSummaryFormValues {
  date: string;
  sizeEntries: Array<{
    size: string;
    quantity: number;
    bagType: string;
    weightPerBagKg: number;
  }>;
  remarks?: string;
  manualGatePassNumber?: number;
}

export interface GradingSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNumberDisplay: string | null;
  variety: string;
  formValues: GradingSummaryFormValues;
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
      {Icon && <Icon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />}
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-zinc-400 uppercase">
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
/*                              Table row cells                               */
/* -------------------------------------------------------------------------- */

const RowCells = memo(function RowCells({
  size,
  bagType,
  quantity,
}: {
  size: string;
  bagType: string;
  quantity: number;
}) {
  return (
    <>
      <div className="font-custom border-b border-zinc-600/40 py-2.5 font-medium text-zinc-300">
        {size}
      </div>
      <div className="font-custom border-b border-zinc-600/40 py-2.5 font-medium text-zinc-300">
        {bagType}
      </div>
      <div className="font-custom text-primary border-b border-zinc-600/40 py-2.5 text-right font-medium">
        {quantity}
      </div>
    </>
  );
});

/* -------------------------------------------------------------------------- */
/*                                Main Sheet                                  */
/* -------------------------------------------------------------------------- */

export const GradingSummarySheet = memo(function GradingSummarySheet({
  open,
  onOpenChange,
  voucherNumberDisplay,
  variety,
  formValues,
  isPending,
  isLoadingVoucher,
  gatePassNo,
  onSubmit,
}: GradingSummarySheetProps) {
  const totalBags = formValues.sizeEntries.reduce(
    (sum, row) => sum + row.quantity,
    0
  );

  const rowsWithQuantity = formValues.sizeEntries.filter(
    (row) => row.quantity > 0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-0 p-0 sm:max-w-lg"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Dark content area (Varieties & Quantities style)                   */}
        {/* ------------------------------------------------------------------ */}

        <div className="flex min-h-0 flex-1 flex-col bg-zinc-900">
          {/* Header */}
          <SheetHeader className="border-zinc-700/60 px-4 py-4 sm:px-6">
            <SheetTitle className="font-custom text-lg font-bold text-white sm:text-xl">
              Grading Gate Pass Summary
            </SheetTitle>
            <SheetDescription className="font-custom text-sm text-zinc-400">
              Review before creating the grading gate pass
            </SheetDescription>
          </SheetHeader>

          {/* Meta: Voucher, Date (compact) */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-zinc-700/60 px-4 py-3 sm:px-6">
            {voucherNumberDisplay && (
              <SummaryMetaRow
                label="Voucher"
                value={voucherNumberDisplay}
                icon={FileText}
              />
            )}
            <SummaryMetaRow
              label="Date"
              value={formValues.date}
              icon={Calendar}
            />
          </div>

          {/* Varieties & Quantities section (image style) */}
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <h2 className="font-custom mb-4 text-xl font-bold text-white sm:text-2xl">
              Varieties & Quantities
            </h2>

            {/* Variety card */}
            <div className="rounded-xl bg-zinc-800/80 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-600/50 px-4 py-3 sm:px-5">
                <span className="font-custom inline-flex items-center gap-2 rounded-full bg-zinc-700/80 px-3 py-1 text-sm font-semibold text-white">
                  <Package className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                  Variety: {variety}
                </span>
                <span className="font-custom flex items-baseline gap-1.5 text-sm font-semibold">
                  <span className="text-zinc-400">Total:</span>
                  <span className="text-primary">{totalBags}</span>
                </span>
              </div>

              {/* Table: Size | Bag Type | Quantity */}
              <div className="px-4 py-3 sm:px-5">
                <div className="grid grid-cols-[1fr_1fr_minmax(5rem,auto)] gap-x-6 gap-y-0 text-sm">
                  <div className="font-custom border-b border-zinc-600/50 py-2.5 font-medium tracking-wide text-zinc-400 uppercase">
                    Size
                  </div>
                  <div className="font-custom border-b border-zinc-600/50 py-2.5 font-medium tracking-wide text-zinc-400 uppercase">
                    Bag Type
                  </div>
                  <div className="font-custom border-b border-zinc-600/50 py-2.5 text-right font-medium tracking-wide text-zinc-400 uppercase">
                    Quantity
                  </div>
                  {rowsWithQuantity.length > 0 ? (
                    rowsWithQuantity.map((row) => (
                      <RowCells
                        key={row.size}
                        size={row.size}
                        bagType={row.bagType}
                        quantity={row.quantity}
                      />
                    ))
                  ) : (
                    <>
                      <div className="font-custom col-span-2 border-b border-zinc-600/40 py-2.5 text-zinc-500">
                        —
                      </div>
                      <div className="font-custom text-primary border-b border-zinc-600/40 py-2.5 text-right font-medium">
                        0
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Grand Total card */}
            <div className="mt-5 rounded-xl bg-zinc-800/80 px-4 py-4 shadow-lg sm:px-5">
              <div className="flex items-center justify-between">
                <span className="font-custom text-base font-bold text-white sm:text-lg">
                  Grand Total
                </span>
                <span className="font-custom text-primary text-xl font-bold sm:text-2xl">
                  {totalBags}
                </span>
              </div>
            </div>

            {formValues.remarks?.trim() && (
              <div className="mt-4 rounded-lg bg-zinc-800/60 px-4 py-3 sm:px-5">
                <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase">
                  Remarks
                </p>
                <p className="font-custom mt-1 text-sm text-zinc-300">
                  {formValues.remarks}
                </p>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* Footer (light bar)                                                 */}
          {/* ------------------------------------------------------------------ */}

          <SheetFooter className="border-t border-zinc-700/60 bg-zinc-800/90 px-4 py-4 sm:px-6">
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
                  'Create Grading Gate Pass'
                )}
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
});
