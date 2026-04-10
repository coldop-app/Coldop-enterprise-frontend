import { memo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/forms/date-picker';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatDate, formatDateToISO } from '@/lib/helpers';
import { useEditNikasiGatePass } from '@/services/store-admin/nikasi-gate-pass/useEditNikasiGatePass';
import type { PassVoucherData } from './types';

interface NikasiEditRow {
  size: string;
  variety: string;
  quantityIssued: number;
}

interface NikasiEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucher: PassVoucherData;
}

function toNumberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isoToDdMmYyyy(value: string | undefined): string {
  if (!value) return formatDate(new Date());
  const d = new Date(value);
  if (isNaN(d.getTime())) return formatDate(new Date());
  return formatDate(d);
}

export const NikasiEditSheet = memo(function NikasiEditSheet({
  open,
  onOpenChange,
  voucher,
}: NikasiEditSheetProps) {
  const { mutate: editNikasiGatePass, isPending } = useEditNikasiGatePass();

  const [gatePassNo, setGatePassNo] = useState<string>(
    voucher.gatePassNo != null ? String(voucher.gatePassNo) : ''
  );
  const [manualGatePassNumber, setManualGatePassNumber] = useState<string>(
    voucher.manualGatePassNumber != null
      ? String(voucher.manualGatePassNumber)
      : ''
  );
  const [date, setDate] = useState<string>(isoToDdMmYyyy(voucher.date));
  const [from, setFrom] = useState<string>(voucher.from ?? '');
  const [toField, setToField] = useState<string>(voucher.toField ?? '');
  const [remarks, setRemarks] = useState<string>(voucher.remarks ?? '');
  const [netWeight, setNetWeight] = useState<string>(
    voucher.netWeight != null && Number.isFinite(voucher.netWeight)
      ? String(voucher.netWeight)
      : ''
  );
  const [averageWeightPerBag, setAverageWeightPerBag] = useState<string>(
    voucher.averageWeightPerBag != null &&
      Number.isFinite(voucher.averageWeightPerBag)
      ? String(voucher.averageWeightPerBag)
      : ''
  );
  const [bagSizes, setBagSizes] = useState<NikasiEditRow[]>(
    Array.isArray(voucher.bagSize) && voucher.bagSize.length > 0
      ? voucher.bagSize.map((row) => ({
          size: row.size ?? '',
          variety: row.variety ?? voucher.variety ?? '',
          quantityIssued: row.quantityIssued ?? 0,
        }))
      : (voucher.orderDetails ?? []).map((row) => ({
          size: row.size ?? '',
          variety: voucher.variety ?? '',
          quantityIssued: row.quantityIssued ?? 0,
        }))
  );

  const handleBagSizeChange = (
    index: number,
    key: keyof NikasiEditRow,
    value: string
  ) => {
    setBagSizes((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [key]:
                key === 'quantityIssued'
                  ? Math.max(0, Number(value) || 0)
                  : value,
            }
          : row
      )
    );
  };

  const handleSubmit = () => {
    const id = voucher._id;
    if (!id) {
      toast.error('Nikasi gate pass id not found');
      return;
    }

    const payloadBagSizes = bagSizes.filter(
      (row) =>
        row.size.trim() !== '' &&
        row.variety.trim() !== '' &&
        Number.isFinite(row.quantityIssued)
    );

    editNikasiGatePass(
      {
        id,
        gatePassNo: toNumberOrUndefined(gatePassNo),
        manualGatePassNumber: toNumberOrUndefined(manualGatePassNumber),
        date: formatDateToISO(date),
        from: from.trim(),
        toField: toField.trim(),
        bagSizes: payloadBagSizes,
        remarks: remarks.trim() || undefined,
        netWeight: toNumberOrUndefined(netWeight),
        averageWeightPerBag: toNumberOrUndefined(averageWeightPerBag),
      },
      {
        onSuccess: (data) => {
          if (data.success) onOpenChange(false);
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b px-4 py-4 sm:px-6">
          <SheetTitle className="font-custom">Edit sheet</SheetTitle>
          <SheetDescription className="font-custom">
            Update nikasi gate pass details.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="font-custom text-sm font-medium">
                Gate Pass No
              </label>
              <Input
                type="number"
                min={0}
                value={gatePassNo}
                onChange={(e) => setGatePassNo(e.target.value)}
                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-custom text-sm font-medium">
                Manual Gate Pass No
              </label>
              <Input
                type="number"
                min={0}
                value={manualGatePassNumber}
                onChange={(e) => setManualGatePassNumber(e.target.value)}
                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <DatePicker
            value={date}
            onChange={setDate}
            label="Date"
            id="nikasi-edit-date"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="font-custom text-sm font-medium">From</label>
              <Input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="font-custom"
              />
            </div>
            <div className="space-y-1">
              <label className="font-custom text-sm font-medium">To</label>
              <Input
                value={toField}
                onChange={(e) => setToField(e.target.value)}
                className="font-custom"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-custom text-sm font-semibold">Bag Sizes</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setBagSizes((prev) => [
                    ...prev,
                    {
                      size: '',
                      variety: voucher.variety ?? '',
                      quantityIssued: 0,
                    },
                  ])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {bagSizes.map((row, index) => (
                <div
                  key={index}
                  className="bg-muted/20 grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-12"
                >
                  <Input
                    value={row.size}
                    onChange={(e) =>
                      handleBagSizeChange(index, 'size', e.target.value)
                    }
                    placeholder="Size"
                    className="font-custom sm:col-span-3"
                  />
                  <Input
                    value={row.variety}
                    onChange={(e) =>
                      handleBagSizeChange(index, 'variety', e.target.value)
                    }
                    placeholder="Variety"
                    className="font-custom sm:col-span-5"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={row.quantityIssued}
                    onChange={(e) =>
                      handleBagSizeChange(
                        index,
                        'quantityIssued',
                        e.target.value
                      )
                    }
                    placeholder="Qty"
                    className="font-custom [appearance:textfield] sm:col-span-3 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:col-span-1"
                    onClick={() =>
                      setBagSizes((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label="Remove bag size row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="font-custom text-sm font-medium">
                Net Weight
              </label>
              <Input
                type="number"
                min={0}
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value)}
                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="space-y-1">
              <label className="font-custom text-sm font-medium">
                Average Weight/Bag
              </label>
              <Input
                type="number"
                min={0}
                value={averageWeightPerBag}
                onChange={(e) => setAverageWeightPerBag(e.target.value)}
                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-custom text-sm font-medium">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </div>
        </div>

        <SheetFooter className="bg-background border-t px-4 py-4 sm:px-6">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="font-custom w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="font-custom w-full sm:w-auto"
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
