import { memo } from 'react';
import { Calendar, FileText, Layers, Loader2, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type StorageSummaryAllocation = {
  size: string;
  quantityToAllocate: number;
  chamber: string;
  floor: string;
  row: string;
};

type StorageSummaryGradingEntry = {
  gradingGatePassId: string;
  allocations: StorageSummaryAllocation[];
  gatePassNo?: number;
  date?: string;
};

type StorageSummaryPassValues = {
  date: string;
  variety: string;
  remarks: string;
  gradingGatePasses: StorageSummaryGradingEntry[];
};

export type StorageSummaryFormValues = {
  passes: StorageSummaryPassValues[];
};

interface StorageSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNumberDisplay: string | null;
  formValues: StorageSummaryFormValues;
  isPending: boolean;
  isLoadingVoucher: boolean;
  gatePassNo: number;
  onSubmit: () => void;
  submitLabel?: string;
}

function SummaryInfo({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | number | null;
  icon?: typeof Calendar;
}) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className="border-border/60 bg-card rounded-lg border p-3">
      <div className="mb-1 flex items-center gap-1.5">
        {Icon ? <Icon className="text-muted-foreground h-3.5 w-3.5" /> : null}
        <p className="font-custom text-muted-foreground text-[11px] font-medium uppercase">
          {label}
        </p>
      </div>
      <p className="font-custom text-foreground text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

export const StorageSummarySheet = memo(function StorageSummarySheet({
  open,
  onOpenChange,
  voucherNumberDisplay,
  formValues,
  isPending,
  isLoadingVoucher,
  gatePassNo,
  onSubmit,
  submitLabel = 'Update',
}: StorageSummarySheetProps) {
  const pass = formValues.passes[0];
  const allocations =
    pass?.gradingGatePasses?.flatMap((gp) => gp.allocations) ?? [];
  const total = allocations.reduce(
    (sum, row) => sum + row.quantityToAllocate,
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-custom text-xl font-semibold">
            Storage Gate Pass Summary
          </SheetTitle>
          <SheetDescription className="font-custom text-sm">
            Review details before logging values to the console.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SummaryInfo
              label="Voucher"
              value={voucherNumberDisplay}
              icon={FileText}
            />
            <SummaryInfo label="Date" value={pass?.date} icon={Calendar} />
            <SummaryInfo label="Variety" value={pass?.variety} icon={Package} />
            <SummaryInfo
              label="Total Allocations"
              value={allocations.length}
              icon={Layers}
            />
          </div>

          <div className="border-border/60 bg-card rounded-lg border">
            <div className="border-border/60 border-b px-3 py-2.5">
              <p className="font-custom text-foreground text-sm font-semibold">
                Bag Size Summary
              </p>
            </div>
            {allocations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead className="bg-muted/40">
                    <tr className="border-border/60 border-b">
                      <th className="font-custom text-muted-foreground px-3 py-2 text-[11px] font-semibold uppercase">
                        Size
                      </th>
                      <th className="font-custom text-muted-foreground px-3 py-2 text-[11px] font-semibold uppercase">
                        Location
                      </th>
                      <th className="font-custom text-muted-foreground px-3 py-2 text-right text-[11px] font-semibold uppercase">
                        Selected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((row, idx) => (
                      <tr
                        key={`${row.size}-${idx}`}
                        className="border-border/60 hover:bg-muted/20 border-b last:border-b-0"
                      >
                        <td className="font-custom text-foreground px-3 py-2.5 text-sm font-semibold">
                          {row.size}
                        </td>
                        <td className="font-custom text-muted-foreground px-3 py-2.5 text-sm">
                          {row.chamber || '--'}/{row.floor || '--'}/
                          {row.row || '--'}
                        </td>
                        <td className="font-custom text-primary px-3 py-2.5 text-right text-sm font-semibold">
                          {row.quantityToAllocate.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-3 py-3">
                <p className="font-custom text-muted-foreground text-sm">
                  No allocations to display.
                </p>
              </div>
            )}
          </div>

          {pass?.remarks?.trim() ? (
            <div className="border-border/60 bg-card rounded-lg border p-3">
              <p className="font-custom text-muted-foreground text-[11px] font-medium uppercase">
                Remarks
              </p>
              <p className="font-custom text-foreground mt-1 text-sm">
                {pass.remarks}
              </p>
            </div>
          ) : null}

          <div className="bg-primary/10 border-primary/20 flex items-center justify-between rounded-lg border px-4 py-3">
            <span className="font-custom text-muted-foreground text-xs uppercase">
              Grand Total
            </span>
            <span className="font-custom text-primary text-xl font-bold">
              {total}
            </span>
          </div>
        </div>

        <SheetFooter className="bg-background border-t px-5 py-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
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
              className="font-custom w-full font-bold sm:flex-1"
              onClick={onSubmit}
              disabled={isPending || isLoadingVoucher || !gatePassNo}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging...
                </span>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
