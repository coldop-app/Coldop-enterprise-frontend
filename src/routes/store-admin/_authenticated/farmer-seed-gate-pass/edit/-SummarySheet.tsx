import { memo, type ComponentType } from 'react';
import { Calendar, FileText, Loader2, Sprout, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export interface FarmerSeedSummaryBagSize {
  name: string;
  quantity: number;
  rate: number;
  acres: number;
}

interface FarmerSeedSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatePassNo?: string;
  invoiceNumber?: string;
  date?: string;
  variety?: string;
  generation?: string;
  farmerName?: string;
  farmerAccountNumber?: string;
  bagSizes: FarmerSeedSummaryBagSize[];
  remarks?: string;
  isPending: boolean;
  onSubmit: () => void;
}

const formatAmount = (value: number) =>
  `Rs. ${Math.round(value).toLocaleString('en-IN')}`;

const formatAcres = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '');

export const FarmerSeedSummarySheet = memo(function FarmerSeedSummarySheet({
  open,
  onOpenChange,
  gatePassNo,
  invoiceNumber,
  date,
  variety,
  generation,
  farmerName,
  farmerAccountNumber,
  bagSizes,
  remarks,
  isPending,
  onSubmit,
}: FarmerSeedSummarySheetProps) {
  const rowsWithQty = bagSizes.filter((row) => (row.quantity ?? 0) > 0);
  const totalQty = rowsWithQty.reduce(
    (sum, row) => sum + (row.quantity ?? 0),
    0
  );
  const totalAcres = rowsWithQty.reduce(
    (sum, row) => sum + (row.acres ?? 0),
    0
  );
  const totalAmount = rowsWithQty.reduce(
    (sum, row) => sum + (row.quantity ?? 0) * (row.rate ?? 0),
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
            Farmer Seed Summary
          </SheetTitle>
          <SheetDescription className="font-custom text-sm">
            Review details before updating this entry.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {gatePassNo ? (
              <SummaryRow
                label="Gate Pass No"
                value={gatePassNo}
                icon={FileText}
              />
            ) : null}
            {invoiceNumber ? (
              <SummaryRow
                label="Invoice No"
                value={invoiceNumber}
                icon={FileText}
              />
            ) : null}
            {date ? (
              <SummaryRow label="Date" value={date} icon={Calendar} />
            ) : null}
            {variety ? (
              <SummaryRow label="Variety" value={variety} icon={Sprout} />
            ) : null}
            {generation ? (
              <SummaryRow label="Generation" value={generation} icon={Sprout} />
            ) : null}
            {farmerName ? (
              <SummaryRow
                label="Farmer"
                value={farmerName}
                subValue={
                  farmerAccountNumber
                    ? `Account #${farmerAccountNumber}`
                    : undefined
                }
                icon={User}
              />
            ) : null}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="bg-muted/40 grid grid-cols-5 gap-2 px-3 py-2 text-xs font-semibold">
              <span className="font-custom col-span-2">Size</span>
              <span className="font-custom text-right">Qty</span>
              <span className="font-custom text-right">Rate</span>
              <span className="font-custom text-right">Acres</span>
            </div>
            <div className="divide-y">
              {rowsWithQty.map((row) => (
                <div
                  key={`${row.name}-${row.quantity}-${row.rate}-${row.acres}`}
                  className="grid grid-cols-5 gap-2 px-3 py-2 text-sm"
                >
                  <span className="font-custom col-span-2">{row.name}</span>
                  <span className="font-custom text-right">{row.quantity}</span>
                  <span className="font-custom text-right">{row.rate}</span>
                  <span className="font-custom text-right">
                    {formatAcres(row.acres)}
                  </span>
                </div>
              ))}
              {rowsWithQty.length === 0 ? (
                <div className="font-custom text-muted-foreground px-3 py-3 text-sm">
                  No bag size with quantity greater than zero.
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-muted/40 space-y-2 rounded-lg border px-4 py-3">
            <SummaryMetric label="Total Quantity" value={String(totalQty)} />
            <SummaryMetric
              label="Total Acres"
              value={formatAcres(totalAcres)}
            />
            <SummaryMetric
              label="Total Amount"
              value={formatAmount(totalAmount)}
            />
          </div>

          {remarks ? (
            <div className="rounded-lg border px-4 py-3">
              <p className="font-custom text-muted-foreground mb-1 text-xs uppercase">
                Remarks
              </p>
              <p className="font-custom text-sm">{remarks}</p>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t px-5 py-4">
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
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </span>
              ) : (
                'Update Farmer Seed Entry'
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});

function SummaryRow({
  label,
  value,
  subValue,
  icon: Icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex items-center gap-2">
        {Icon ? <Icon className="text-muted-foreground h-4 w-4" /> : null}
        <p className="font-custom text-muted-foreground text-xs uppercase">
          {label}
        </p>
      </div>
      <p className="font-custom text-sm font-semibold">{value}</p>
      {subValue ? (
        <p className="font-custom text-muted-foreground mt-1 text-xs">
          {subValue}
        </p>
      ) : null}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-custom text-muted-foreground text-sm">{label}</span>
      <span className="font-custom text-sm font-semibold">{value}</span>
    </div>
  );
}
