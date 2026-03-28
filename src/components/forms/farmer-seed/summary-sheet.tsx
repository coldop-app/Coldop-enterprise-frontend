import { memo } from 'react';
import type { FarmerStorageLink } from '@/types/farmer';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { FileText, Loader2, Package, User } from 'lucide-react';

export interface FarmerSeedSummaryBagSize {
  name: string;
  quantity: number;
  rate: number;
}

interface FarmerSeedSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFarmer: FarmerStorageLink | null;
  formValues: {
    variety: string;
    bagSizes: FarmerSeedSummaryBagSize[];
  };
  isPending: boolean;
  onSubmit: () => void;
}

export const FarmerSeedSummarySheet = memo(function FarmerSeedSummarySheet({
  open,
  onOpenChange,
  selectedFarmer,
  formValues,
  isPending,
  onSubmit,
}: FarmerSeedSummarySheetProps) {
  const nonZeroRows = formValues.bagSizes.filter(
    (row) => (row.quantity ?? 0) > 0
  );
  const totalQuantity = nonZeroRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalAmount = nonZeroRows.reduce(
    (sum, row) => sum + row.quantity * row.rate,
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-custom text-xl font-semibold">
            Farmer Seed Summary
          </SheetTitle>
          <SheetDescription className="font-custom text-sm">
            Review before creating the farmer seed entry
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">
            {selectedFarmer && (
              <div className="flex items-start gap-3 rounded-md border px-3 py-2">
                <User className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                    Farmer
                  </p>
                  <p className="text-foreground text-sm font-medium">
                    {selectedFarmer.farmerId.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Account #{selectedFarmer.accountNumber}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-md border px-3 py-2">
              <Package className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                  Variety
                </p>
                <p className="text-foreground text-sm font-medium">
                  {formValues.variety || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border px-3 py-2">
              <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                  Bag Sizes
                </p>
                <div className="mt-2 overflow-hidden rounded-md border">
                  <table className="font-custom w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-muted-foreground px-3 py-2 text-left text-xs font-medium uppercase">
                          Size
                        </th>
                        <th className="text-muted-foreground px-3 py-2 text-right text-xs font-medium uppercase">
                          Qty
                        </th>
                        <th className="text-muted-foreground px-3 py-2 text-right text-xs font-medium uppercase">
                          Rate
                        </th>
                        <th className="text-muted-foreground px-3 py-2 text-right text-xs font-medium uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nonZeroRows.map((row, idx) => (
                        <tr key={`${row.name}-${idx}`}>
                          <td className="border-t px-3 py-2">{row.name}</td>
                          <td className="border-t px-3 py-2 text-right">
                            {row.quantity}
                          </td>
                          <td className="border-t px-3 py-2 text-right">
                            {row.rate.toFixed(2)}
                          </td>
                          <td className="border-t px-3 py-2 text-right">
                            {(row.quantity * row.rate).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/40 mt-4 space-y-2 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="font-custom text-muted-foreground text-xs uppercase">
                Total Quantity
              </span>
              <span className="font-custom text-foreground text-lg font-bold">
                {totalQuantity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-custom text-muted-foreground text-xs uppercase">
                Total Amount
              </span>
              <span className="font-custom text-foreground text-lg font-bold">
                {totalAmount.toFixed(2)}
              </span>
            </div>
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
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              className="font-custom w-full font-bold sm:flex-1"
              onClick={onSubmit}
              disabled={isPending || nonZeroRows.length === 0}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Farmer Seed Entry'
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
