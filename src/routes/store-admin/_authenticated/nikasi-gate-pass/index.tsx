/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { memo, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { DatePicker } from '@/components/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { AddDispatchLedgerModal } from '@/components/forms/add-dispatch-ledger-modal';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import { useGetDispatchLedgers } from '@/services/store-admin/dispatch-ledger/useGetDispatchLedgers';
import { useCreateNikasiGatePass } from '@/services/store-admin/nikasi-gate-pass/useCreateNikasiGatePass';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/general/useGetVoucherNumber';
import { formatDateToISO } from '@/lib/helpers';
import { BAG_TYPES, GRADING_SIZES, POTATO_VARIETIES } from '@/lib/constants';
import {
  NikasiSummarySheet,
  type NikasiSummaryFormValues,
} from './edit/-SummarySheet';

type ExtraQuantityRow = {
  id: string;
  size: string;
  quantity: number;
  bagType: string;
  variety: string;
};

const defaultSizeQuantities = Object.fromEntries(
  GRADING_SIZES.map((size) => [size, 0])
) as Record<string, number>;

const defaultSizeBagTypes = Object.fromEntries(
  GRADING_SIZES.map((size) => [size, 'JUTE'])
) as Record<string, string>;

const defaultSizeVarieties = Object.fromEntries(
  GRADING_SIZES.map((size) => [size, ''])
) as Record<string, string>;

function preventArrowKeys(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
}

const NikasiCreateForm = memo(function NikasiCreateForm() {
  const navigate = useNavigate();
  const { mutate: createNikasiGatePass, isPending } = useCreateNikasiGatePass();
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('nikasi-gate-pass');
  const { data: farmerLinks, isLoading: isLoadingFarmers } = useGetAllFarmers();
  const {
    data: dispatchLedgersResponse,
    isLoading: isLoadingDispatchLedgers,
    refetch: refetchDispatchLedgers,
  } = useGetDispatchLedgers();

  const dispatchLedgers = useMemo(
    () => dispatchLedgersResponse?.data ?? [],
    [dispatchLedgersResponse?.data]
  );

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

  const dispatchLedgerOptions: Option<string>[] = useMemo(
    () =>
      dispatchLedgers.map((ledger) => ({
        value: ledger._id,
        label: ledger.mobileNumber
          ? `${ledger.name} (${ledger.mobileNumber})`
          : ledger.name,
        searchableText: `${ledger.name} ${ledger.mobileNumber ?? ''} ${ledger.address}`,
      })),
    [dispatchLedgers]
  );

  const [manualGatePassNumber, setManualGatePassNumber] = useState<
    number | undefined
  >(undefined);
  const [farmerStorageLinkId, setFarmerStorageLinkId] = useState('');
  const [dispatchLedgerId, setDispatchLedgerId] = useState('');
  const [toField, setToField] = useState('');
  const [date, setDate] = useState('');
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
  const [isInternalTransfer, setIsInternalTransfer] = useState(false);

  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const openSheetRef = useRef(false);
  const selectedFarmerName = useMemo(() => {
    const selectedFarmer = farmerLinks?.find(
      (link) => link._id === farmerStorageLinkId
    );
    return selectedFarmer?.farmerId?.name?.trim() ?? '';
  }, [farmerLinks, farmerStorageLinkId]);

  const totalQty = useMemo(() => {
    const fixed = Object.values(sizeQuantities ?? {}).reduce(
      (sum, qty) => sum + (qty ?? 0),
      0
    );
    const extra = (extraQuantityRows ?? []).reduce(
      (sum, row) => sum + (row.quantity ?? 0),
      0
    );
    return fixed + extra;
  }, [sizeQuantities, extraQuantityRows]);

  const summaryFormValues: NikasiSummaryFormValues = useMemo(() => {
    const fixedAllocations = (
      Object.entries(sizeQuantities) as [string, number][]
    )
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([size, quantityToAllocate]) => ({
        size,
        quantityToAllocate,
        availableQuantity: quantityToAllocate,
      }));

    const extraAllocations = (extraQuantityRows ?? [])
      .filter((row) => (row.quantity ?? 0) > 0)
      .map((row) => ({
        size: row.size,
        quantityToAllocate: row.quantity,
        availableQuantity: row.quantity,
      }));

    return {
      passes: [
        {
          date,
          from: selectedFarmerName,
          toField,
          remarks,
          isInternalTransfer,
          gradingGatePasses: [
            {
              gradingGatePassId: '_direct',
              variety: (
                [
                  ...Object.values(sizeVarieties ?? {}),
                  ...(extraQuantityRows ?? []).map((row) => row.variety),
                ].find((v) => v?.trim()) ?? '-'
              ).trim(),
              allocations: [...fixedAllocations, ...extraAllocations],
            },
          ],
        },
      ],
    };
  }, [
    date,
    selectedFarmerName,
    toField,
    remarks,
    isInternalTransfer,
    sizeQuantities,
    sizeVarieties,
    extraQuantityRows,
  ]);

  const voucherNumberDisplay =
    voucherNumber != null ? `#${voucherNumber}` : null;
  const gatePassNo = voucherNumber ?? 0;

  const submitCreate = () => {
    if (!farmerStorageLinkId.trim())
      return toast.error('Please select a farmer account.');
    if (!selectedFarmerName)
      return toast.error(
        'Selected farmer is invalid. Please re-select farmer.'
      );
    if (!dispatchLedgerId.trim())
      return toast.error('Please select a dispatch ledger.');
    if (!date.trim()) return toast.error('Date is required.');
    if (totalQty <= 0)
      return toast.error('Please enter at least one quantity.');
    if (!gatePassNo)
      return toast.error(
        'Voucher number is not available yet. Please try again.'
      );

    const bagSizes = [
      ...(Object.entries(sizeQuantities) as [string, number][])
        .filter(([, quantity]) => (quantity ?? 0) > 0)
        .map(([size, quantity]) => ({
          size,
          variety: (sizeVarieties[size] ?? '').trim() || 'Potato',
          quantityIssued: quantity,
        })),
      ...(extraQuantityRows ?? [])
        .filter((row) => (row.quantity ?? 0) > 0)
        .map((row) => ({
          size: row.size,
          variety: row.variety.trim() || 'Potato',
          quantityIssued: row.quantity,
        })),
    ];

    createNikasiGatePass(
      {
        gatePassNo,
        farmerStorageLinkId: farmerStorageLinkId.trim(),
        manualGatePassNumber,
        isInternalTransfer,
        date: formatDateToISO(date),
        from: selectedFarmerName,
        dispatchLedgerId: dispatchLedgerId.trim(),
        bagSizes,
        remarks: remarks.trim() || undefined,
        netWeight,
        averageWeightPerBag,
      },
      {
        onSuccess: (data) => {
          if (!data.success && data.status !== 'success') return;
          setIsSummarySheetOpen(false);
          navigate({ to: '/store-admin/daybook' });
        },
      }
    );
  };

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
              VOUCHER NO: {voucherNumberDisplay}
            </span>
          </div>
        ) : null}
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <FieldGroup className="space-y-6">
          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Manual Gate Pass Number
            </FieldLabel>
            <Input
              type="number"
              min={0}
              value={manualGatePassNumber ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) return setManualGatePassNumber(undefined);
                const val = Number.parseInt(raw, 10);
                setManualGatePassNumber(Number.isNaN(val) ? undefined : val);
              }}
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={preventArrowKeys}
              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </Field>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              Enter Account Name (search and select)
            </FieldLabel>
            <SearchSelector
              id="nikasi-create-farmer-select"
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
          </Field>

          <Field>
            <FieldLabel className="font-custom mb-2 block text-base font-semibold">
              To
            </FieldLabel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <SearchSelector
                  id="nikasi-create-to"
                  options={dispatchLedgerOptions}
                  placeholder="Search or select dispatch ledger"
                  searchPlaceholder="Search by name, mobile, or address..."
                  value={dispatchLedgerId}
                  onSelect={(value) => {
                    const selectedId = value ?? '';
                    setDispatchLedgerId(selectedId);
                    const selected = dispatchLedgers.find(
                      (ledger) => ledger._id === selectedId
                    );
                    setToField(selected?.name ?? '');
                  }}
                  loading={isLoadingDispatchLedgers}
                  loadingMessage="Loading dispatch ledgers..."
                  emptyMessage="No dispatch ledgers found"
                  className="w-full"
                  buttonClassName="w-full justify-between"
                />
              </div>
              <AddDispatchLedgerModal
                onDispatchLedgerAdded={refetchDispatchLedgers}
              />
            </div>
          </Field>

          <Field>
            <DatePicker
              value={date}
              onChange={(v) => setDate(v ?? '')}
              label="Date"
            />
          </Field>

          <Field>
            <label className="font-custom flex items-center gap-2 text-base font-semibold">
              <input
                type="checkbox"
                checked={isInternalTransfer}
                onChange={(e) => setIsInternalTransfer(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Is Internal Transfer
            </label>
          </Field>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="font-custom text-foreground text-xl font-semibold">
                Enter Quantities
              </CardTitle>
              <CardDescription className="font-custom text-muted-foreground text-sm">
                Add quantities by size and extra rows for duplicate sizes with
                different variety.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {GRADING_SIZES.map((size) => (
                <div
                  key={size}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <label className="font-custom text-foreground text-base font-normal">
                    {size}
                  </label>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <Input
                      type="number"
                      min={0}
                      value={
                        sizeQuantities[size] ? String(sizeQuantities[size]) : ''
                      }
                      onChange={(e) =>
                        setSizeQuantities((p) => ({
                          ...p,
                          [size]: Math.max(
                            0,
                            Number.parseInt(e.target.value || '0', 10) || 0
                          ),
                        }))
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={preventArrowKeys}
                      className="font-custom w-full [appearance:textfield] sm:w-24 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <select
                      value={sizeBagTypes[size] ?? 'JUTE'}
                      onChange={(e) =>
                        setSizeBagTypes((p) => ({
                          ...p,
                          [size]: e.target.value,
                        }))
                      }
                      className="border-input bg-background font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm sm:w-28"
                    >
                      {BAG_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <SearchSelector
                      id={`nikasi-create-variety-${size}`}
                      options={POTATO_VARIETIES}
                      placeholder="Variety"
                      value={sizeVarieties[size] ?? ''}
                      onSelect={(v) =>
                        setSizeVarieties((p) => ({ ...p, [size]: v ?? '' }))
                      }
                      buttonClassName="font-custom h-9 w-full sm:w-28"
                    />
                  </div>
                </div>
              ))}

              {extraQuantityRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                    <select
                      value={row.size}
                      onChange={(e) =>
                        setExtraQuantityRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, size: e.target.value } : r
                          )
                        )
                      }
                      className="border-input bg-background font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm sm:w-28"
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
                      value={row.quantity ? String(row.quantity) : ''}
                      onChange={(e) =>
                        setExtraQuantityRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? {
                                  ...r,
                                  quantity: Math.max(
                                    0,
                                    Number.parseInt(
                                      e.target.value || '0',
                                      10
                                    ) || 0
                                  ),
                                }
                              : r
                          )
                        )
                      }
                      className="font-custom w-full [appearance:textfield] sm:w-24 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <select
                      value={row.bagType}
                      onChange={(e) =>
                        setExtraQuantityRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id
                              ? { ...r, bagType: e.target.value }
                              : r
                          )
                        )
                      }
                      className="border-input bg-background font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm sm:w-28"
                    >
                      {BAG_TYPES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <SearchSelector
                      id={`nikasi-create-extra-variety-${row.id}`}
                      options={POTATO_VARIETIES}
                      placeholder="Variety"
                      value={row.variety}
                      onSelect={(v) =>
                        setExtraQuantityRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, variety: v ?? '' } : r
                          )
                        )
                      }
                      buttonClassName="font-custom h-9 w-full sm:w-28"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() =>
                        setExtraQuantityRows((prev) =>
                          prev.filter((r) => r.id !== row.id)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setExtraQuantityRows((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      size: GRADING_SIZES[0] ?? '',
                      quantity: 0,
                      bagType: 'JUTE',
                      variety: '',
                    },
                  ])
                }
                className="font-custom w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Size
              </Button>

              <div className="flex items-center justify-between pt-2">
                <span className="font-custom text-base">Total</span>
                <span className="font-custom text-base font-medium">
                  {totalQty}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                Net Weight
              </FieldLabel>
              <Input
                type="number"
                min={0}
                step="any"
                value={netWeight ?? ''}
                onChange={(e) =>
                  setNetWeight(
                    e.target.value
                      ? Number.parseFloat(e.target.value)
                      : undefined
                  )
                }
                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </Field>
            <Field>
              <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                Average Weight per Bag
              </FieldLabel>
              <Input
                type="number"
                min={0}
                step="any"
                value={averageWeightPerBag ?? ''}
                onChange={(e) =>
                  setAverageWeightPerBag(
                    e.target.value
                      ? Number.parseFloat(e.target.value)
                      : undefined
                  )
                }
                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
              className="border-input bg-background text-foreground font-custom w-full rounded-md border p-2 focus-visible:outline-none"
              rows={4}
              maxLength={500}
            />
          </Field>
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setManualGatePassNumber(undefined);
              setFarmerStorageLinkId('');
              setDispatchLedgerId('');
              setToField('');
              setDate('');
              setSizeQuantities(defaultSizeQuantities);
              setSizeBagTypes(defaultSizeBagTypes);
              setSizeVarieties(defaultSizeVarieties);
              setExtraQuantityRows([]);
              setNetWeight(undefined);
              setAverageWeightPerBag(undefined);
              setRemarks('');
              setIsInternalTransfer(false);
            }}
            className="font-custom"
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            onClick={() => {
              openSheetRef.current = true;
              setIsSummarySheetOpen(true);
            }}
          >
            Review
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>

      <NikasiSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={(open) => {
          if (!open) openSheetRef.current = false;
          setIsSummarySheetOpen(open);
        }}
        voucherNumberDisplay={voucherNumberDisplay}
        formValues={summaryFormValues}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        submitLabel="Create Nikasi Gate Pass"
        submitLoadingLabel="Creating..."
        description="Review before creating nikasi gate pass"
        onSubmit={submitCreate}
      />
    </main>
  );
});

export const Route = createFileRoute(
  '/store-admin/_authenticated/nikasi-gate-pass/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <NikasiCreateForm />;
}
