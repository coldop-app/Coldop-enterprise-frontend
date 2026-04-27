import { memo, type ComponentType } from 'react';
import {
  Calendar,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Package,
  Truck,
  User,
  type LucideProps,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type SelectedFarmer = {
  farmerId: {
    name: string;
  };
  accountNumber: string | number;
};

type SummaryFormValues = {
  manualGatePassNumber?: number | string;
  date: string;
  variety: string;
  location: string;
  truckNumber: string;
  bagsReceived: number;
  remarks?: string;
  weightSlip?: {
    slipNumber?: string;
    grossWeightKg?: number | string;
    tareWeightKg?: number | string;
  };
};

interface SummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherNumberDisplay?: string;
  selectedFarmer: SelectedFarmer | null;
  formValues: SummaryFormValues;
  isPending: boolean;
  isLoadingVoucher: boolean;
  gatePassNo: number | null | undefined;
  onSubmit: () => void;
  submitLabel?: string;
  allowSubmitWithoutGatePassNo?: boolean;
}

function SummaryRow({
  label,
  value,
  subValue,
  icon: Icon,
}: {
  label: string;
  value: string | number | undefined | null;
  subValue?: string;
  icon?: ComponentType<LucideProps>;
}) {
  const hasValue = value !== undefined && value !== null && value !== '';
  if (!hasValue) return null;

  return (
    <div className="border-border/60 bg-card rounded-lg border p-3">
      <div className="mb-1 flex items-center gap-2">
        {Icon ? <Icon className="text-muted-foreground h-4 w-4" /> : null}
        <p className="font-custom text-muted-foreground text-xs uppercase">
          {label}
        </p>
      </div>
      <p className="font-custom text-sm font-semibold text-[#333]">{value}</p>
      {subValue ? (
        <p className="font-custom text-muted-foreground mt-1 text-xs">
          {subValue}
        </p>
      ) : null}
    </div>
  );
}

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
  submitLabel = 'Update Incoming Order',
  allowSubmitWithoutGatePassNo = false,
}: SummarySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="font-custom text-xl font-semibold">
            Order Summary
          </SheetTitle>
          <SheetDescription className="font-custom text-sm">
            Review before updating the order
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <SummaryRow
              label="Voucher"
              value={voucherNumberDisplay}
              icon={FileText}
            />
            <SummaryRow
              label="Manual Gate Pass No."
              value={formValues.manualGatePassNumber}
              icon={FileText}
            />
            {selectedFarmer ? (
              <SummaryRow
                label="Farmer"
                value={selectedFarmer.farmerId.name}
                subValue={`Account #${selectedFarmer.accountNumber}`}
                icon={User}
              />
            ) : null}
            <SummaryRow label="Date" value={formValues.date} icon={Calendar} />
            <SummaryRow
              label="Variety"
              value={formValues.variety}
              icon={Package}
            />
            <SummaryRow
              label="Location"
              value={formValues.location}
              icon={MapPin}
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
            <SummaryRow
              label="Weight Slip"
              value={formValues.weightSlip?.slipNumber}
              subValue={
                formValues.weightSlip?.slipNumber
                  ? `Gross: ${formValues.weightSlip?.grossWeightKg ?? 0} kg, Tare: ${formValues.weightSlip?.tareWeightKg ?? 0} kg`
                  : undefined
              }
            />
            <SummaryRow label="Remarks" value={formValues.remarks} />
          </div>

          <div className="bg-muted/40 mt-4 flex items-center justify-between rounded-lg px-4 py-3">
            <span className="font-custom text-muted-foreground text-xs uppercase">
              Total Bags
            </span>
            <span className="font-custom text-xl font-bold">
              {formValues.bagsReceived}
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
              size="lg"
              className="font-custom w-full font-bold sm:flex-1"
              onClick={onSubmit}
              disabled={
                isPending ||
                isLoadingVoucher ||
                (!allowSubmitWithoutGatePassNo && !gatePassNo)
              }
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
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
