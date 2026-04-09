import {
  memo,
  useMemo,
  useState,
  useCallback,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import { useCreateNikasiGatePass } from '@/services/store-admin/nikasi-gate-pass/useCreateNikasiGatePass';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';
import { formatDate, formatDateToYYYYMMDD } from '@/lib/helpers';
import {
  GRADING_SIZES,
  BAG_TYPES,
  POTATO_VARIETIES,
} from '@/components/forms/grading/constants';
import {
  NikasiSummarySheet,
  type NikasiSummaryFormValues,
} from './summary-sheet';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';

const defaultSizeQuantities = Object.fromEntries(
  GRADING_SIZES.map((s) => [s, 0])
) as Record<string, number>;
const defaultSizeBagTypes = Object.fromEntries(
  GRADING_SIZES.map((s) => [s, 'JUTE'])
) as Record<string, string>;
const defaultSizeVarieties = Object.fromEntries(
  GRADING_SIZES.map((s) => [s, ''])
) as Record<string, string>;

const numberInputClassName =
  'font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

type ExtraQuantityRow = {
  id: string;
  size: string;
  quantity: number;
  bagType: string;
  variety: string;
};

function preventArrowKeys(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
}

/** When coldStorageId matches this, farmer is fixed to FIXED_FARMER_STORAGE_LINK_ID */
const FIXED_FARMER_COLD_STORAGE_ID = '69807e772cfeef6ed3342e78';
const FIXED_FARMER_STORAGE_LINK_ID = '69a3da68ea67b19be4c0e86c';

export interface NikasiGatePassFormProps {
  /** Initial farmer from route (e.g. from Daybook); used when not in fixed-farmer mode */
  farmerStorageLinkId: string;
  gradingPassId?: string;
}

const NikasiGatePassForm = memo(function NikasiGatePassForm({
  farmerStorageLinkId: initialFarmerStorageLinkId,
}: NikasiGatePassFormProps) {
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('nikasi-gate-pass');
  const navigate = useNavigate();
  const { mutate: createNikasiGatePass, isPending } = useCreateNikasiGatePass();
  const coldStorageId = useStore(
    (s) => s.coldStorage?._id ?? s.admin?.coldStorageId
  );
  const isFixedFarmerMode = coldStorageId === FIXED_FARMER_COLD_STORAGE_ID;
  const { data: farmerLinks, isLoading: isLoadingFarmers } = useGetAllFarmers();

  const farmerOptions: Option<string>[] = useMemo(() => {
    if (!farmerLinks) return [];
    return farmerLinks
      .filter((link) => link.isActive)
      .map((link) => ({
        value: link._id,
        label: `${link.farmerId.name} (Account #${link.accountNumber})`,
        searchableText: `${link.farmerId.name} ${link.accountNumber} ${link.farmerId.mobileNumber} ${link.farmerId.address}`,
      }));
  }, [farmerLinks]);

  const [farmerStorageLinkId, setFarmerStorageLinkId] = useState(
    () => initialFarmerStorageLinkId ?? ''
  );

  const effectiveFarmerStorageLinkId = isFixedFarmerMode
    ? FIXED_FARMER_STORAGE_LINK_ID
    : farmerStorageLinkId;

  const [manualGatePassNumber, setManualGatePassNumber] = useState<
    number | undefined
  >(undefined);
  const [from, setFrom] = useState('');
  const [toField, setToField] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(
    defaultSizeQuantities
  );
  const [sizeBagTypes, setSizeBagTypes] =
    useState<Record<string, string>>(defaultSizeBagTypes);
  const [sizeVarieties, setSizeVarieties] =
    useState<Record<string, string>>(defaultSizeVarieties);
  const [extraQuantityRows, setExtraQuantityRows] = useState<
    ExtraQuantityRow[]
  >([]);
  const [netWeight, setNetWeight] = useState<number | undefined>(undefined);
  const [averageWeightPerBag, setAverageWeightPerBag] = useState<
    number | undefined
  >(undefined);
  const [remarks, setRemarks] = useState('');
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  const voucherNumberDisplay =
    voucherNumber != null ? `#${voucherNumber}` : null;
  const gatePassNo = voucherNumber ?? 0;

  const totalQty = useMemo(
    () =>
      Object.values(sizeQuantities).reduce((sum, q) => sum + (q ?? 0), 0) +
      extraQuantityRows.reduce((sum, row) => sum + (row.quantity ?? 0), 0),
    [sizeQuantities, extraQuantityRows]
  );

  const summaryFormValues = useMemo((): NikasiSummaryFormValues => {
    const fixedAllocations = (
      Object.entries(sizeQuantities) as [string, number][]
    )
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([size, quantityToAllocate]) => ({
        size,
        quantityToAllocate,
        availableQuantity: quantityToAllocate,
      }));
    const extraAllocations = extraQuantityRows
      .filter((row) => (row.quantity ?? 0) > 0)
      .map((row) => ({
        size: row.size,
        quantityToAllocate: row.quantity,
        availableQuantity: row.quantity,
      }));
    const allocations = [...fixedAllocations, ...extraAllocations];
    return {
      passes: [
        {
          date,
          from,
          toField,
          remarks,
          gradingGatePasses: [
            {
              gradingGatePassId: '_direct',
              variety: (
                [
                  ...Object.values(sizeVarieties),
                  ...extraQuantityRows.map((row) => row.variety),
                ].find((v) => v?.trim()) ?? '—'
              ).trim(),
              allocations,
            },
          ],
        },
      ],
    };
  }, [
    date,
    from,
    toField,
    remarks,
    sizeQuantities,
    sizeVarieties,
    extraQuantityRows,
  ]);

  const handleSubmit = useCallback(() => {
    if (!effectiveFarmerStorageLinkId?.trim()) {
      toast.error('Please select a farmer account.');
      return;
    }
    if (voucherNumber == null) return;
    const bagSizesFromFixed = (
      Object.entries(sizeQuantities) as [string, number][]
    )
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([size, quantityIssued]) => ({
        size,
        variety: (sizeVarieties[size] ?? '').trim() || 'Potato',
        quantityIssued: quantityIssued ?? 0,
      }));
    const bagSizesFromExtra = extraQuantityRows
      .filter((row) => (row.quantity ?? 0) > 0)
      .map((row) => ({
        size: row.size,
        variety: row.variety.trim() || 'Potato',
        quantityIssued: row.quantity ?? 0,
      }));
    const bagSizes = [...bagSizesFromFixed, ...bagSizesFromExtra];
    if (bagSizes.length === 0) {
      toast.error('Please enter at least one quantity.');
      return;
    }

    const gatePassNoToUse =
      manualGatePassNumber != null ? manualGatePassNumber : voucherNumber;

    createNikasiGatePass(
      {
        farmerStorageLinkId: effectiveFarmerStorageLinkId,
        gatePassNo: gatePassNoToUse,
        date: formatDateToYYYYMMDD(date),
        from: from.trim(),
        toField: toField.trim(),
        bagSizes,
        manualGatePassNumber:
          manualGatePassNumber != null ? manualGatePassNumber : undefined,
        remarks: remarks.trim() || undefined,
        netWeight: netWeight != null ? netWeight : undefined,
        averageWeightPerBag:
          averageWeightPerBag != null ? averageWeightPerBag : undefined,
      },
      {
        onSuccess: () => {
          setIsSummarySheetOpen(false);
          navigate({ to: '/store-admin/daybook' });
        },
      }
    );
  }, [
    voucherNumber,
    manualGatePassNumber,
    effectiveFarmerStorageLinkId,
    date,
    from,
    toField,
    sizeQuantities,
    sizeVarieties,
    extraQuantityRows,
    remarks,
    netWeight,
    averageWeightPerBag,
    createNikasiGatePass,
    navigate,
  ]);

  const handleReview = useCallback(() => {
    setIsSummarySheetOpen(true);
  }, []);

  const resetForm = useCallback(() => {
    if (!isFixedFarmerMode) {
      setFarmerStorageLinkId(initialFarmerStorageLinkId ?? '');
    }
    setManualGatePassNumber(undefined);
    setFrom('');
    setToField('');
    setDate(formatDate(new Date()));
    setSizeQuantities({ ...defaultSizeQuantities });
    setSizeBagTypes({ ...defaultSizeBagTypes });
    setSizeVarieties({ ...defaultSizeVarieties });
    setExtraQuantityRows([]);
    setNetWeight(undefined);
    setAverageWeightPerBag(undefined);
    setRemarks('');
  }, [isFixedFarmerMode, initialFarmerStorageLinkId]);

  const addExtraRow = useCallback(() => {
    setExtraQuantityRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        size: GRADING_SIZES[0] ?? '',
        quantity: 0,
        bagType: 'JUTE',
        variety: '',
      },
    ]);
  }, []);

  const updateExtraRow = useCallback(
    (id: string, updates: Partial<ExtraQuantityRow>) => {
      setExtraQuantityRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...updates } : row))
      );
    },
    []
  );

  const removeExtraRow = useCallback((id: string) => {
    setExtraQuantityRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Create Nikasi Gate Pass
        </h1>
        {isLoadingVoucher ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              Loading voucher number...
            </span>
          </div>
        ) : voucherNumberDisplay ? (
          <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
            <span className="font-custom text-primary text-sm font-medium">
              Nikasi Gate Pass {voucherNumberDisplay}
            </span>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleReview();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Manual Gate Pass Number
              <span className="font-custom text-muted-foreground ml-1 font-normal">
                (optional)
              </span>
            </FieldLabel>
            <Input
              type="number"
              min={0}
              value={manualGatePassNumber ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') {
                  setManualGatePassNumber(undefined);
                  return;
                }
                const parsed = parseInt(raw, 10);
                setManualGatePassNumber(
                  Number.isNaN(parsed) ? undefined : parsed
                );
              }}
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={preventArrowKeys}
              placeholder="e.g. 101"
              className={numberInputClassName}
            />
          </Field>

          <Field>
            <FieldLabel
              htmlFor="nikasi-farmer-select"
              className="font-custom mb-2 block text-base font-semibold"
            >
              {isFixedFarmerMode
                ? 'Farmer (fixed for this store)'
                : 'Enter Account Name (search and select)'}
            </FieldLabel>
            {isFixedFarmerMode ? (
              <p className="font-custom text-muted-foreground text-sm">
                Farmer account is fixed for this store.
              </p>
            ) : (
              <SearchSelector
                id="nikasi-farmer-select"
                options={farmerOptions}
                placeholder="Search or select farmer"
                searchPlaceholder="Search by name, account number, or mobile..."
                value={farmerStorageLinkId}
                onSelect={(value) => setFarmerStorageLinkId(value ?? '')}
                loading={isLoadingFarmers}
                loadingMessage="Loading farmers..."
                emptyMessage="No farmers found"
                className="w-full"
                buttonClassName="w-full justify-between"
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel
                htmlFor="nikasi-from"
                className="font-custom mb-2 block text-base font-semibold"
              >
                From
              </FieldLabel>
              <Input
                id="nikasi-from"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="e.g. Warehouse A"
                className="font-custom"
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor="nikasi-to"
                className="font-custom mb-2 block text-base font-semibold"
              >
                To
              </FieldLabel>
              <Input
                id="nikasi-to"
                value={toField}
                onChange={(e) => setToField(e.target.value)}
                placeholder="e.g. Location B"
                className="font-custom"
              />
            </Field>
          </div>

          <Field>
            <DatePicker
              value={date}
              onChange={(value) => setDate(value ?? '')}
              label="Date"
              id="nikasi-date"
            />
          </Field>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="font-custom text-foreground text-xl font-semibold">
                Enter Quantities
              </CardTitle>
              <CardDescription className="font-custom text-muted-foreground text-sm">
                Enter size, quantity, bag type and variety. Add another variety
                to dispatch multiple varieties in one gate pass.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {GRADING_SIZES.map((size) => {
                const value = sizeQuantities[size] ?? 0;
                const displayValue = value === 0 ? '' : String(value);
                const bagType = sizeBagTypes[size] ?? 'JUTE';
                const variety = sizeVarieties[size] ?? '';
                return (
                  <div
                    key={size}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <label
                      htmlFor={`nikasi-qty-${size}`}
                      className="font-custom text-foreground text-base font-normal"
                    >
                      {size}
                    </label>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:min-w-0 sm:flex-nowrap">
                      <Input
                        id={`nikasi-qty-${size}`}
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={displayValue}
                        onChange={(e) => {
                          const next = { ...sizeQuantities };
                          const raw = e.target.value;
                          const num =
                            raw === ''
                              ? 0
                              : Math.max(0, parseInt(raw, 10) || 0);
                          next[size] = num;
                          setSizeQuantities(next);
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={preventArrowKeys}
                        className={`w-full sm:w-24 ${numberInputClassName}`}
                      />
                      <select
                        aria-label={`Bag type for ${size}`}
                        value={bagType}
                        onChange={(e) => {
                          setSizeBagTypes((prev) => ({
                            ...prev,
                            [size]: e.target.value,
                          }));
                        }}
                        className="border-input bg-background focus-visible:ring-primary font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-28"
                      >
                        {BAG_TYPES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <SearchSelector
                        id={`nikasi-variety-${size}`}
                        options={POTATO_VARIETIES}
                        placeholder="Variety"
                        searchPlaceholder="Search variety..."
                        value={variety}
                        onSelect={(v) =>
                          setSizeVarieties((prev) => ({
                            ...prev,
                            [size]: v ?? '',
                          }))
                        }
                        buttonClassName="font-custom h-9 w-full sm:w-28"
                      />
                    </div>
                  </div>
                );
              })}
              {extraQuantityRows.map((row) => {
                const displayValue =
                  row.quantity === 0 ? '' : String(row.quantity);
                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:min-w-0 sm:flex-nowrap">
                      <select
                        aria-label="Select size"
                        value={row.size}
                        onChange={(e) =>
                          updateExtraRow(row.id, { size: e.target.value })
                        }
                        className="border-input bg-background text-foreground font-custom focus-visible:ring-primary h-9 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-28"
                      >
                        {GRADING_SIZES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Qty"
                        value={displayValue}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const num =
                            raw === ''
                              ? 0
                              : Math.max(0, parseInt(raw, 10) || 0);
                          updateExtraRow(row.id, { quantity: num });
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        onKeyDown={preventArrowKeys}
                        className={`w-full sm:w-24 ${numberInputClassName}`}
                      />
                      <select
                        aria-label={`Bag type for ${row.size}`}
                        value={row.bagType}
                        onChange={(e) =>
                          updateExtraRow(row.id, { bagType: e.target.value })
                        }
                        className="border-input bg-background focus-visible:ring-primary font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-28"
                      >
                        {BAG_TYPES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <SearchSelector
                        id={`nikasi-extra-variety-${row.id}`}
                        options={POTATO_VARIETIES}
                        placeholder="Variety"
                        searchPlaceholder="Search variety..."
                        value={row.variety}
                        onSelect={(v) =>
                          updateExtraRow(row.id, { variety: v ?? '' })
                        }
                        buttonClassName="font-custom h-9 w-full sm:w-28"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeExtraRow(row.id)}
                        aria-label={`Remove ${row.size || 'size'} row`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExtraRow}
                className="font-custom w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Size
              </Button>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-custom text-foreground text-base font-normal">
                  Total
                </span>
                <span className="font-custom text-foreground text-base font-medium sm:text-right">
                  {totalQty}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel
                htmlFor="nikasi-net-weight"
                className="font-custom mb-2 block text-base font-semibold"
              >
                Net Weight
                <span className="font-custom text-muted-foreground ml-1 font-normal">
                  (optional)
                </span>
              </FieldLabel>
              <Input
                id="nikasi-net-weight"
                type="number"
                min={0}
                step="any"
                value={netWeight ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setNetWeight(undefined);
                    return;
                  }
                  const parsed = parseFloat(raw);
                  setNetWeight(Number.isNaN(parsed) ? undefined : parsed);
                }}
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={preventArrowKeys}
                placeholder="e.g. 100.5"
                className={numberInputClassName}
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor="nikasi-avg-weight-per-bag"
                className="font-custom mb-2 block text-base font-semibold"
              >
                Average Weight per Bag
                <span className="font-custom text-muted-foreground ml-1 font-normal">
                  (optional)
                </span>
              </FieldLabel>
              <Input
                id="nikasi-avg-weight-per-bag"
                type="number"
                min={0}
                step="any"
                value={averageWeightPerBag ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setAverageWeightPerBag(undefined);
                    return;
                  }
                  const parsed = parseFloat(raw);
                  setAverageWeightPerBag(
                    Number.isNaN(parsed) ? undefined : parsed
                  );
                }}
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={preventArrowKeys}
                placeholder="e.g. 50"
                className={numberInputClassName}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Remarks
            </FieldLabel>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="border-input bg-background text-foreground font-custom placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background w-full rounded-md border p-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              rows={4}
              placeholder="Optional remarks"
              maxLength={500}
            />
          </Field>
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="font-custom"
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
          >
            Review
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>

      <NikasiSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        formValues={summaryFormValues}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        onSubmit={handleSubmit}
      />
    </main>
  );
});

export default NikasiGatePassForm;
