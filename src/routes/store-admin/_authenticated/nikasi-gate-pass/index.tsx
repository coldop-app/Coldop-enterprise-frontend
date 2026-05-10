/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { memo, useMemo, useRef, useState } from 'react';
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
import {
  isCreateNikasiGatePassSuccess,
  useCreateNikasiGatePass,
} from '@/services/store-admin/nikasi-gate-pass/useCreateNikasiGatePass';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/general/useGetVoucherNumber';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { computeAverageWeightPerBag, formatDateToISO } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { usePreferencesStore } from '@/stores/store';
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

const NikasiCreateForm = memo(function NikasiCreateForm() {
  const preferences = usePreferencesStore((state) => state.preferences);
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
  const gradingSizes = useMemo(
    () =>
      (preferences?.bagSizes ?? []).filter((size) => size.trim().length > 0),
    [preferences?.bagSizes]
  );
  const bagTypes = useMemo(
    () =>
      (preferences?.custom.bagConfig.bagTypes ?? []).filter(
        (bagType) => bagType.trim().length > 0
      ),
    [preferences?.custom.bagConfig.bagTypes]
  );
  const potatoVarietyOptions = useMemo(
    () => preferences?.custom.potatoVarieties ?? [],
    [preferences?.custom.potatoVarieties]
  );
  const defaultBagType = bagTypes[0] ?? 'JUTE';
  const defaultSizeQuantities = useMemo(
    () =>
      Object.fromEntries(gradingSizes.map((size) => [size, 0])) as Record<
        string,
        number
      >,
    [gradingSizes]
  );
  const defaultSizeBagTypes = useMemo(
    () =>
      Object.fromEntries(
        gradingSizes.map((size) => [size, defaultBagType])
      ) as Record<string, string>,
    [defaultBagType, gradingSizes]
  );
  const defaultSizeVarieties = useMemo(
    () =>
      Object.fromEntries(gradingSizes.map((size) => [size, ''])) as Record<
        string,
        string
      >,
    [gradingSizes]
  );

  const [truckNumber, setTruckNumber] = useState('');
  const [manualGatePassNumber, setManualGatePassNumber] = useState<
    number | undefined
  >(undefined);
  const [farmerStorageLinkId, setFarmerStorageLinkId] = useState('');
  const [dispatchLedgerId, setDispatchLedgerId] = useState('');
  const [toField, setToField] = useState('');
  /** Optional override for API `to`; when empty, selected ledger name (`toField`) is used. */
  const [toLabelOptional, setToLabelOptional] = useState('');
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

  const averageWeightPerBag = useMemo(
    () => computeAverageWeightPerBag(netWeight, totalQty),
    [netWeight, totalQty]
  );

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
          farmerName: selectedFarmerName,
          dispatchLedgerName: toField.trim(),
          destination: toLabelOptional.trim() || toField.trim(),
          remarks,
          truckNumber: truckNumber.trim() || undefined,
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
    toLabelOptional,
    remarks,
    truckNumber,
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
        truckNumber: truckNumber.trim() || undefined,
        isInternalTransfer,
        date: formatDateToISO(date),
        from: selectedFarmerName,
        dispatchLedgerId: dispatchLedgerId.trim(),
        to: toLabelOptional.trim() || toField.trim() || undefined,
        bagSizes,
        remarks: remarks.trim() || undefined,
        netWeight,
        averageWeightPerBag,
      },
      {
        onSuccess: (data) => {
          if (!isCreateNikasiGatePassSuccess(data)) return;
          setIsSummarySheetOpen(false);
        },
      }
    );
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Create Dispatch (Pre Storage) Pass
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
              onWheel={blurTargetOnNumberWheel}
              onKeyDown={preventArrowUpDownOnNumericInput}
              className={cn('font-custom', businessNumberSpinnerClassName)}
            />
          </Field>

          <Field>
            <FieldLabel
              htmlFor="nikasi-create-truckNumber"
              className="font-custom mb-2 block text-base font-semibold"
            >
              Truck Number
            </FieldLabel>
            <Input
              id="nikasi-create-truckNumber"
              name="truckNumber"
              placeholder="Enter truck number"
              className="font-custom"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
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
            <p className="font-custom text-muted-foreground mt-2 text-sm">
              Optional: set a custom destination label for the gate pass; if
              left blank, the selected ledger name is used.
            </p>
            <Input
              id="nikasi-create-to-label-optional"
              value={toLabelOptional}
              onChange={(e) => setToLabelOptional(e.target.value)}
              placeholder="Destination label (optional)"
              maxLength={200}
              className="font-custom focus-visible:ring-primary mt-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            />
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
              {gradingSizes.map((size) => (
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
                      onWheel={blurTargetOnNumberWheel}
                      onKeyDown={preventArrowUpDownOnNumericInput}
                      className={cn(
                        'font-custom w-full sm:w-24',
                        businessNumberSpinnerClassName
                      )}
                    />
                    <select
                      value={sizeBagTypes[size] ?? defaultBagType}
                      onChange={(e) =>
                        setSizeBagTypes((p) => ({
                          ...p,
                          [size]: e.target.value,
                        }))
                      }
                      className="border-input bg-background font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm sm:w-28"
                    >
                      {bagTypes.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <SearchSelector
                      id={`nikasi-create-variety-${size}`}
                      options={potatoVarietyOptions}
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
                      {gradingSizes.map((s) => (
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
                      onWheel={blurTargetOnNumberWheel}
                      onKeyDown={preventArrowUpDownOnNumericInput}
                      className={cn(
                        'font-custom w-full sm:w-24',
                        businessNumberSpinnerClassName
                      )}
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
                      {bagTypes.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <SearchSelector
                      id={`nikasi-create-extra-variety-${row.id}`}
                      options={potatoVarietyOptions}
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
                      size: gradingSizes[0] ?? '',
                      quantity: 0,
                      bagType: defaultBagType,
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

          <div
            className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 sm:gap-y-3"
            role="group"
            aria-label="Net weight and average per bag"
          >
            <FieldLabel
              htmlFor="nikasi-create-net-weight"
              className="font-custom block text-base font-semibold sm:col-start-1 sm:row-start-1 sm:self-end"
            >
              Net Weight
            </FieldLabel>
            <FieldLabel
              htmlFor="nikasi-create-avg-weight-per-bag"
              className="font-custom block text-base font-semibold sm:col-start-2 sm:row-start-1 sm:self-end"
            >
              Average Weight per Bag
              <span className="text-muted-foreground mt-0.5 block text-sm font-normal">
                (net weight ÷ total bags)
              </span>
            </FieldLabel>
            <Input
              id="nikasi-create-net-weight"
              type="number"
              min={0}
              step="any"
              value={netWeight ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) return setNetWeight(undefined);
                const parsed = Number.parseFloat(raw);
                setNetWeight(Number.isFinite(parsed) ? parsed : undefined);
              }}
              onWheel={blurTargetOnNumberWheel}
              onKeyDown={preventArrowUpDownOnNumericInput}
              className={cn(
                'font-custom sm:col-start-1 sm:row-start-2',
                businessNumberSpinnerClassName
              )}
            />
            <Input
              id="nikasi-create-avg-weight-per-bag"
              readOnly
              tabIndex={-1}
              aria-readonly="true"
              type="text"
              value={
                averageWeightPerBag === undefined
                  ? ''
                  : String(averageWeightPerBag)
              }
              placeholder="—"
              className={cn(
                'font-custom bg-muted/50 text-foreground sm:col-start-2 sm:row-start-2',
                businessNumberSpinnerClassName
              )}
            />
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
              setTruckNumber('');
              setManualGatePassNumber(undefined);
              setFarmerStorageLinkId('');
              setDispatchLedgerId('');
              setToField('');
              setToLabelOptional('');
              setDate('');
              setSizeQuantities(defaultSizeQuantities);
              setSizeBagTypes(defaultSizeBagTypes);
              setSizeVarieties(defaultSizeVarieties);
              setExtraQuantityRows([]);
              setNetWeight(undefined);
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
