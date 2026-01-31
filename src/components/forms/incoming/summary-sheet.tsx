import { memo } from 'react';
import type { FarmerStorageLink } from '@/types/farmer';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

import {
  FileText,
  User,
  Calendar,
  Package,
  Truck,
  Layers,
  Loader2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface SummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNumberDisplay: string | null;
  selectedFarmer: FarmerStorageLink | null;
  formValues: {
    date: string;
    variety: string;
    truckNumber: string;
    bagsReceived: number;
    weightSlip?: {
      slipNumber: string;
      grossWeightKg: number;
      tareWeightKg: number;
    };
    remarks?: string;
    manualGatePassNumber?: number;
  };
  isPending: boolean;
  isLoadingVoucher: boolean;
  gatePassNo: number;
  onSubmit: () => void;
}

/* -------------------------------------------------------------------------- */
/*                              Compact Row UI                                */
/* -------------------------------------------------------------------------- */

const SummaryRow = memo(function SummaryRow({
  label,
  value,
  subValue,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border px-3 py-2">
      {Icon && (
        <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      )}

      <div className="min-w-0">
        <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
          {label}
        </p>

        <p className="text-foreground truncate text-sm font-medium">{value}</p>

        {subValue && (
          <p className="text-muted-foreground truncate text-xs">{subValue}</p>
        )}
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*                                Main Sheet                                  */
/* -------------------------------------------------------------------------- */

export const SummarySheet = memo(function SummarySheet({
  open,
  onOpenChange,
  voucherNumberDisplay,
  selectedFarmer,
  formValues,
  isPending,
  isLoadingVoucher,
  gatePassNo,
  onSubmit,
}: SummarySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-lg"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}

        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-xl font-semibold">
            Order Summary
          </SheetTitle>

          <SheetDescription className="text-sm">
            Review before creating the order
          </SheetDescription>
        </SheetHeader>

        {/* ------------------------------------------------------------------ */}
        {/* Scrollable Content                                                  */}
        {/* ------------------------------------------------------------------ */}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Grid Summary */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {voucherNumberDisplay && (
              <SummaryRow
                label="Voucher"
                value={voucherNumberDisplay}
                icon={FileText}
              />
            )}

            {selectedFarmer && (
              <SummaryRow
                label="Farmer"
                value={selectedFarmer.farmerId.name}
                subValue={`Account #${selectedFarmer.accountNumber}`}
                icon={User}
              />
            )}

            <SummaryRow label="Date" value={formValues.date} icon={Calendar} />

            <SummaryRow
              label="Variety"
              value={formValues.variety}
              icon={Package}
            />

            <SummaryRow
              label="Truck"
              value={formValues.truckNumber}
              icon={Truck}
            />

            <SummaryRow
              label="Bags"
              value={formValues.bagsReceived}
              icon={Layers}
            />

            {formValues.weightSlip?.slipNumber && (
              <SummaryRow
                label="Weight Slip"
                value={formValues.weightSlip.slipNumber}
                subValue={`Gross: ${formValues.weightSlip.grossWeightKg} kg, Tare: ${formValues.weightSlip.tareWeightKg} kg`}
              />
            )}

            {formValues.remarks && (
              <SummaryRow label="Remarks" value={formValues.remarks} />
            )}
          </div>

          {/* Highlight Metric */}
          <div className="bg-muted/40 mt-4 flex items-center justify-between rounded-lg px-4 py-3">
            <span className="text-muted-foreground text-xs tracking-wide uppercase">
              Total Bags
            </span>

            <span className="text-xl font-bold">{formValues.bagsReceived}</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Footer                                                             */}
        {/* ------------------------------------------------------------------ */}

        <SheetFooter className="bg-background border-t px-5 py-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              size="lg"
              className="w-full font-semibold sm:flex-1"
              onClick={onSubmit}
              disabled={isPending || isLoadingVoucher || !gatePassNo}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Incoming Order'
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
