import { memo, useCallback, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/forms/date-picker';
import { SearchSelector } from '@/components/forms/search-selector';
import { AddDispatchLedgerModal } from '@/components/forms/add-dispatch-ledger-modal';
import {
  GRADING_SIZES,
  POTATO_VARIETIES,
} from '@/components/forms/grading/constants';
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
import { useGetNikasiLedgers } from '@/services/store-admin/nikasi-gate-pass/nikasi-ledger/useGetNikasiLedgers';
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

const GRADING_SIZE_LIST = GRADING_SIZES as readonly string[];
const FIRST_GRADING_SIZE = GRADING_SIZES[0] ?? '';

function sizeOptionsFor(current: string): string[] {
  const s = current?.trim() ?? '';
  if (s && !GRADING_SIZE_LIST.includes(s)) {
    return [s, ...GRADING_SIZE_LIST];
  }
  return [...GRADING_SIZE_LIST];
}

function varietyOptionsFor(currentVariety: string) {
  const v = currentVariety?.trim();
  const base = [...POTATO_VARIETIES];
  if (v && !base.some((o) => o.value === v)) {
    return [{ label: v, value: v }, ...base];
  }
  return base;
}

export const NikasiEditSheet = memo(function NikasiEditSheet({
  open,
  onOpenChange,
  voucher,
}: NikasiEditSheetProps) {
  const { mutate: editNikasiGatePass, isPending } = useEditNikasiGatePass();
  const {
    data: dispatchLedgers,
    isLoading: isLoadingDispatchLedgers,
    refetch: refetchDispatchLedgers,
  } = useGetNikasiLedgers();

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
  const [dispatchLedgerId, setDispatchLedgerId] = useState<string>('');
  const [toField, setToField] = useState<string>(voucher.toField ?? '');
  const [isInternalTransfer, setIsInternalTransfer] = useState<boolean>(
    voucher.isInternalTransfer ?? false
  );
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
          size: (row.size ?? '').trim() || FIRST_GRADING_SIZE,
          variety: row.variety ?? voucher.variety ?? '',
          quantityIssued: row.quantityIssued ?? 0,
        }))
      : (voucher.orderDetails ?? []).map((row) => ({
          size: (row.size ?? '').trim() || FIRST_GRADING_SIZE,
          variety: voucher.variety ?? '',
          quantityIssued: row.quantityIssued ?? 0,
        }))
  );

  const dispatchLedgerOptions = useMemo(() => {
    if (!dispatchLedgers) return [];
    return dispatchLedgers.map((ledger) => ({
      value: ledger._id,
      label: ledger.mobileNumber
        ? `${ledger.name} (${ledger.mobileNumber})`
        : ledger.name,
      searchableText: `${ledger.name} ${ledger.mobileNumber ?? ''} ${ledger.address}`,
    }));
  }, [dispatchLedgers]);

  const handleDispatchLedgerAdded = useCallback(
    (name: string) => {
      setToField(name);
      setDispatchLedgerId('');
      refetchDispatchLedgers();
    },
    [refetchDispatchLedgers]
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
    const resolvedDispatchLedgerId =
      dispatchLedgerId ||
      dispatchLedgers?.find(
        (ledger) =>
          ledger.name.trim().toLowerCase() === toField.trim().toLowerCase()
      )?._id;

    editNikasiGatePass(
      {
        id,
        gatePassNo: toNumberOrUndefined(gatePassNo),
        manualGatePassNumber: toNumberOrUndefined(manualGatePassNumber),
        date: formatDateToISO(date),
        from: from.trim(),
        dispatchLedgerId: resolvedDispatchLedgerId || undefined,
        isInternalTransfer,
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

          <div className="space-y-1">
            <label
              htmlFor="nikasi-edit-is-internal-transfer"
              className="font-custom flex items-center gap-2 text-sm font-medium"
            >
              <input
                id="nikasi-edit-is-internal-transfer"
                type="checkbox"
                checked={isInternalTransfer}
                onChange={(e) => setIsInternalTransfer(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Is Internal Transfer
            </label>
          </div>

          <DatePicker
            value={date}
            onChange={setDate}
            label="Date"
            id="nikasi-edit-date"
          />

          <div className="space-y-3">
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
              <div className="flex flex-col gap-3">
                <SearchSelector
                  id="nikasi-edit-to"
                  options={dispatchLedgerOptions}
                  placeholder="Search or select dispatch ledger"
                  searchPlaceholder="Search by name, mobile, or address..."
                  value={dispatchLedgerId}
                  onSelect={(value) => {
                    const selectedId = value ?? '';
                    setDispatchLedgerId(selectedId);
                    const selectedLedger = dispatchLedgers?.find(
                      (ledger) => ledger._id === selectedId
                    );
                    setToField(selectedLedger?.name ?? '');
                  }}
                  loading={isLoadingDispatchLedgers}
                  loadingMessage="Loading dispatch ledgers..."
                  emptyMessage="No dispatch ledgers found"
                  className="w-full"
                  buttonClassName="w-full justify-between"
                />
                <AddDispatchLedgerModal
                  onLedgerAdded={handleDispatchLedgerAdded}
                />
              </div>
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
                      size: FIRST_GRADING_SIZE,
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
              {bagSizes.map((row, index) => {
                const sizeChoices = sizeOptionsFor(row.size);
                const sizeSelectValue = sizeChoices.includes(row.size)
                  ? row.size
                  : (sizeChoices[0] ?? '');
                return (
                  <div
                    key={index}
                    className="bg-muted/20 grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-12"
                  >
                    <select
                      aria-label={`Size row ${index + 1}`}
                      value={sizeSelectValue}
                      onChange={(e) =>
                        handleBagSizeChange(index, 'size', e.target.value)
                      }
                      className="border-input bg-background text-foreground font-custom focus-visible:ring-primary h-9 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:col-span-3"
                    >
                      {sizeChoices.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="min-w-0 sm:col-span-5">
                      <SearchSelector
                        id={`nikasi-edit-variety-${index}`}
                        options={varietyOptionsFor(row.variety)}
                        placeholder="Variety"
                        searchPlaceholder="Search variety..."
                        value={row.variety}
                        onSelect={(v) =>
                          handleBagSizeChange(index, 'variety', v ?? '')
                        }
                        buttonClassName="font-custom h-9 w-full justify-between"
                      />
                    </div>
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
                        setBagSizes((prev) =>
                          prev.filter((_, i) => i !== index)
                        )
                      }
                      aria-label="Remove bag size row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
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
