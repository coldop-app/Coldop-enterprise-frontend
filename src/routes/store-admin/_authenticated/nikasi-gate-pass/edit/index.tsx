/* eslint-disable react-refresh/only-export-components */
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createFileRoute,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
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
import { usePreferencesStore, useStore } from '@/stores/store';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import { useGetDispatchLedgers } from '@/services/store-admin/dispatch-ledger/useGetDispatchLedgers';
import {
  isEditNikasiGatePassSuccess,
  useEditNikasiGatePass,
} from '@/services/store-admin/nikasi-gate-pass/useEditNikasiGatePass';
import { useGetIncomingGatePassesOfFarmer } from '@/services/store-admin/general/useGetIncomingGatePassesOfFarmer';
import type { NikasiGatePassEditState } from '@/components/daybook/nikasi-gate-pass-card';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import {
  computeAverageWeightPerBag,
  formatDateToISO,
  toDatePickerDisplayValue,
} from '@/lib/helpers';
import { cn } from '@/lib/utils';
import {
  NikasiSummarySheet,
  type NikasiSummaryFormValues,
} from './-SummarySheet';
import {
  NIKASI_FIXED_FARMER_COLD_STORAGE_ID,
  NIKASI_FIXED_FARMER_STORAGE_LINK_ID,
} from '../-fixed-farmer-by-cold-storage';

type ExtraQuantityRow = {
  id: string;
  size: string;
  quantity: number;
  bagType: string;
  variety: string;
};

const formSchema = z.object({
  manualGatePassNumber: z.union([z.number().nonnegative(), z.undefined()]),
  truckNumber: z.string().max(120).default(''),
  farmerStorageLinkId: z.string().min(1, 'Please select a farmer account'),
  dispatchLedgerId: z.string().trim().min(1, 'Please select a dispatch ledger'),
  toField: z.string().trim().optional().default(''),
  toLabelOptional: z.string().max(200).optional().default(''),
  date: z.string().trim().min(1, 'Date is required'),
  sizeQuantities: z.record(z.string(), z.number().min(0)),
  sizeBagTypes: z.record(z.string(), z.string()),
  sizeVarieties: z.record(z.string(), z.string()),
  extraQuantityRows: z.array(
    z.object({
      id: z.string(),
      size: z.string(),
      quantity: z.number().min(0),
      bagType: z.string(),
      variety: z.string(),
    })
  ),
  netWeight: z.union([z.number().nonnegative(), z.undefined()]),
  remarks: z.string().max(500).default(''),
  isInternalTransfer: z.boolean().default(false),
});

function parseDisplayDateToIso(value: string): string {
  return formatDateToISO(value);
}

const NikasiEditForm = memo(function NikasiEditForm({
  editData,
}: {
  editData: NikasiGatePassEditState;
}) {
  const navigate = useNavigate();
  const coldStorageId = useStore((s) => s.coldStorage?._id);
  const isFixedFarmerColdStorage =
    coldStorageId === NIKASI_FIXED_FARMER_COLD_STORAGE_ID;
  const { mutate: editNikasiGatePass, isPending } = useEditNikasiGatePass();
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
  const preferences = usePreferencesStore((state) => state.preferences);
  const incomingLocationSuggestions = useMemo(
    () =>
      (preferences?.custom.incomingLocations ?? []).filter(
        (location) => location.trim().length > 0
      ),
    [preferences?.custom.incomingLocations]
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
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const [openSheetRef, setOpenSheetRef] = useState(false);

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
  const form = useForm({
    defaultValues: (() => {
      const sizeQuantities = { ...defaultSizeQuantities };
      const sizeBagTypes = { ...defaultSizeBagTypes };
      const sizeVarieties = { ...defaultSizeVarieties };
      const extraQuantityRows: ExtraQuantityRow[] = [];

      for (const row of editData.bagSize ?? []) {
        const qty = Number(row.quantityIssued) || 0;
        if (gradingSizes.includes(row.size)) {
          sizeQuantities[row.size] = (sizeQuantities[row.size] ?? 0) + qty;
          sizeVarieties[row.size] = row.variety ?? '';
        } else {
          extraQuantityRows.push({
            id: crypto.randomUUID(),
            size: row.size,
            quantity: qty,
            bagType: defaultBagType,
            variety: row.variety ?? '',
          });
        }
      }

      const manualParsed = Number(editData.manualGatePassNumber);
      const netWeightParsed = Number(editData.netWeight);

      const ledgerNameTrim = (editData.dispatchLedgerName ?? '').trim();
      const apiToTrim = (editData.to ?? '').trim();
      const legacyToTrim = (editData.toField ?? '').trim();
      const initialToLabelOptional =
        apiToTrim && apiToTrim !== ledgerNameTrim
          ? apiToTrim
          : !apiToTrim && legacyToTrim && legacyToTrim !== ledgerNameTrim
            ? legacyToTrim
            : '';

      return {
        manualGatePassNumber:
          Number.isFinite(manualParsed) && manualParsed > 0
            ? manualParsed
            : undefined,
        truckNumber: editData.truckNumber ?? '',
        farmerStorageLinkId: editData.farmerLinkId ?? '',
        dispatchLedgerId: editData.dispatchLedgerId ?? '',
        toField: editData.dispatchLedgerName || editData.toField || '',
        toLabelOptional: initialToLabelOptional,
        date: toDatePickerDisplayValue(editData.date),
        sizeQuantities,
        sizeBagTypes,
        sizeVarieties,
        extraQuantityRows,
        netWeight:
          Number.isFinite(netWeightParsed) && netWeightParsed >= 0
            ? netWeightParsed
            : undefined,
        remarks: editData.remarks ?? '',
        isInternalTransfer: Boolean(editData.isInternalTransfer),
      };
    })(),
    validators: {
      onSubmit: formSchema as never,
    },
    onSubmit: async ({ value }) => {
      const bagSizes = [
        ...(Object.entries(value.sizeQuantities) as [string, number][])
          .filter(([, quantity]) => (quantity ?? 0) > 0)
          .map(([size, quantity]) => ({
            size,
            variety: (value.sizeVarieties[size] ?? '').trim() || 'Potato',
            quantityIssued: quantity,
          })),
        ...(value.extraQuantityRows ?? [])
          .filter((row) => (row.quantity ?? 0) > 0)
          .map((row) => ({
            size: row.size,
            variety: row.variety.trim() || 'Potato',
            quantityIssued: row.quantity,
          })),
      ];

      if (bagSizes.length === 0) {
        toast.error('Please enter at least one quantity.');
        return;
      }
      if (!selectedFarmerName) {
        toast.error('Selected farmer is invalid. Please re-select farmer.');
        return;
      }

      if (!openSheetRef) {
        setOpenSheetRef(true);
        setIsSummarySheetOpen(true);
        return;
      }

      const submitTotalQty =
        Object.values(value.sizeQuantities ?? {}).reduce(
          (sum, qty) => sum + (qty ?? 0),
          0
        ) +
        (value.extraQuantityRows ?? []).reduce(
          (sum, row) => sum + (row.quantity ?? 0),
          0
        );
      const submitAverageWeightPerBag = computeAverageWeightPerBag(
        value.netWeight,
        submitTotalQty
      );

      editNikasiGatePass(
        {
          nikasiGatePassId: editData.id,
          gatePassNo: Number(editData.gatePassNo),
          manualGatePassNumber: value.manualGatePassNumber,
          truckNumber: value.truckNumber.trim(),
          isInternalTransfer: value.isInternalTransfer,
          date: parseDisplayDateToIso(value.date),
          from: selectedFarmerName,
          dispatchLedgerId: value.dispatchLedgerId.trim(),
          to: value.toLabelOptional.trim() || value.toField.trim() || undefined,
          bagSizes,
          remarks: value.remarks.trim() || undefined,
          netWeight: value.netWeight,
          averageWeightPerBag: submitAverageWeightPerBag,
        },
        {
          onSuccess: (data) => {
            if (!isEditNikasiGatePassSuccess(data)) return;
            setIsSummarySheetOpen(false);
            navigate({ to: '/store-admin/daybook' });
          },
        }
      );
    },
  });

  useEffect(() => {
    if (!isFixedFarmerColdStorage) return;
    form.setFieldValue(
      'farmerStorageLinkId',
      NIKASI_FIXED_FARMER_STORAGE_LINK_ID
    );
  }, [form, isFixedFarmerColdStorage]);

  const selectedFarmerStorageLinkId = form.state.values.farmerStorageLinkId;
  const effectiveFarmerLinkId = isFixedFarmerColdStorage
    ? NIKASI_FIXED_FARMER_STORAGE_LINK_ID
    : selectedFarmerStorageLinkId;
  const { data: incomingGatePassesOfFarmer = [] } =
    useGetIncomingGatePassesOfFarmer(effectiveFarmerLinkId);

  const selectedFarmerName =
    farmerLinks
      ?.find((link) => link._id === effectiveFarmerLinkId)
      ?.farmerId?.name?.trim() ||
    editData.from ||
    '';

  const totalQty = useMemo(() => {
    const fixed = Object.values(form.state.values.sizeQuantities ?? {}).reduce(
      (sum, qty) => sum + (qty ?? 0),
      0
    );
    const extra = (form.state.values.extraQuantityRows ?? []).reduce(
      (sum, row) => sum + (row.quantity ?? 0),
      0
    );
    return fixed + extra;
  }, [form.state.values.sizeQuantities, form.state.values.extraQuantityRows]);

  const averageWeightPerBag = useMemo(
    () => computeAverageWeightPerBag(form.state.values.netWeight, totalQty),
    [form.state.values.netWeight, totalQty]
  );

  const summaryFormValues: NikasiSummaryFormValues = useMemo(() => {
    const values = form.state.values;
    const fixedAllocations = (
      Object.entries(values.sizeQuantities) as [string, number][]
    )
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([size, quantityToAllocate]) => ({
        size,
        quantityToAllocate,
        availableQuantity: quantityToAllocate,
      }));

    const extraAllocations = (values.extraQuantityRows ?? [])
      .filter((row) => (row.quantity ?? 0) > 0)
      .map((row) => ({
        size: row.size,
        quantityToAllocate: row.quantity,
        availableQuantity: row.quantity,
      }));

    return {
      passes: [
        {
          date: values.date,
          farmerName: selectedFarmerName,
          dispatchLedgerName: values.toField.trim(),
          destination: values.toLabelOptional.trim() || values.toField.trim(),
          remarks: values.remarks,
          truckNumber: values.truckNumber.trim() || undefined,
          isInternalTransfer: values.isInternalTransfer,
          gradingGatePasses: [
            {
              gradingGatePassId: '_direct',
              variety: (
                [
                  ...Object.values(values.sizeVarieties ?? {}),
                  ...(values.extraQuantityRows ?? []).map((row) => row.variety),
                ].find((v) => v?.trim()) ??
                incomingGatePassesOfFarmer[0]?.variety ??
                '-'
              ).trim(),
              allocations: [...fixedAllocations, ...extraAllocations],
            },
          ],
        },
      ],
    };
  }, [form.state.values, incomingGatePassesOfFarmer, selectedFarmerName]);

  const handleDispatchLedgerAdded = useCallback(() => {
    refetchDispatchLedgers();
  }, [refetchDispatchLedgers]);

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Edit Dispatch (Pre Storage) Pass
        </h1>
        <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
          <span className="font-custom text-primary text-sm font-medium">
            Nikasi Dispatch (Pre Storage) #{editData.gatePassNo}
          </span>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          <form.Field
            name="manualGatePassNumber"
            children={(field) => (
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
                  value={field.state.value ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      field.handleChange(undefined);
                      return;
                    }
                    const parsed = Number.parseInt(raw, 10);
                    field.handleChange(
                      Number.isNaN(parsed) ? undefined : parsed
                    );
                  }}
                  onWheel={blurTargetOnNumberWheel}
                  onKeyDown={preventArrowUpDownOnNumericInput}
                  className={cn('font-custom', businessNumberSpinnerClassName)}
                />
              </Field>
            )}
          />

          <form.Field
            name="truckNumber"
            children={(field) => (
              <Field>
                <FieldLabel
                  htmlFor="nikasi-edit-truckNumber"
                  className="font-custom mb-2 block text-base font-semibold"
                >
                  Truck Number
                </FieldLabel>
                <Input
                  id="nikasi-edit-truckNumber"
                  name="truckNumber"
                  placeholder="Enter truck number"
                  className="font-custom"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          />

          {!isFixedFarmerColdStorage ? (
            <form.Field
              name="farmerStorageLinkId"
              children={(field) => (
                <Field>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Enter Account Name (search and select)
                  </FieldLabel>
                  <SearchSelector
                    id="nikasi-edit-farmer-select"
                    options={farmerOptions}
                    placeholder="Search or select farmer"
                    searchPlaceholder="Search by name, account number, or mobile..."
                    value={field.state.value}
                    onSelect={(value) => field.handleChange(value ?? '')}
                    loading={isLoadingFarmers}
                    loadingMessage="Loading farmers..."
                    emptyMessage="No farmers found"
                    className="w-full"
                    buttonClassName="w-full justify-between"
                  />
                </Field>
              )}
            />
          ) : null}

          <form.Field
            name="dispatchLedgerId"
            children={(field) => (
              <form.Field
                name="toField"
                children={(toField) => (
                  <Field>
                    <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                      To
                    </FieldLabel>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <SearchSelector
                          id="nikasi-edit-to"
                          options={dispatchLedgerOptions}
                          placeholder="Search or select dispatch ledger"
                          searchPlaceholder="Search by name, mobile, or address..."
                          value={field.state.value}
                          onSelect={(value) => {
                            const selectedId = value ?? '';
                            field.handleChange(selectedId);
                            const selected = dispatchLedgers.find(
                              (ledger) => ledger._id === selectedId
                            );
                            toField.handleChange(selected?.name ?? '');
                          }}
                          loading={isLoadingDispatchLedgers}
                          loadingMessage="Loading dispatch ledgers..."
                          emptyMessage="No dispatch ledgers found"
                          className="w-full"
                          buttonClassName="w-full justify-between"
                        />
                      </div>
                      <AddDispatchLedgerModal
                        onDispatchLedgerAdded={handleDispatchLedgerAdded}
                      />
                    </div>
                    <form.Field
                      name="toLabelOptional"
                      children={(optField) => (
                        <>
                          <p className="font-custom text-muted-foreground mt-2 text-sm">
                            Optional: set a custom destination label for the
                            gate pass; if left blank, the selected ledger name
                            is used.
                          </p>
                          <Input
                            id="nikasi-edit-to-label-optional"
                            list="nikasi-edit-incoming-location-suggestions"
                            value={optField.state.value}
                            onChange={(e) =>
                              optField.handleChange(e.target.value)
                            }
                            placeholder="Destination label (optional)"
                            maxLength={200}
                            className="font-custom focus-visible:ring-primary mt-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                          />
                          <datalist id="nikasi-edit-incoming-location-suggestions">
                            {incomingLocationSuggestions.map((location) => (
                              <option key={location} value={location} />
                            ))}
                          </datalist>
                        </>
                      )}
                    />
                  </Field>
                )}
              />
            )}
          />

          <form.Field
            name="date"
            children={(field) => (
              <Field>
                <DatePicker
                  value={field.state.value}
                  onChange={(value: string | null) =>
                    field.handleChange(value ?? '')
                  }
                  label="Date"
                  id="nikasi-edit-date"
                />
              </Field>
            )}
          />

          <form.Field
            name="isInternalTransfer"
            children={(field) => (
              <Field>
                <label
                  htmlFor="nikasi-edit-is-internal-transfer"
                  className="font-custom flex items-center gap-2 text-base font-semibold"
                >
                  <input
                    id="nikasi-edit-is-internal-transfer"
                    type="checkbox"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Is Internal Transfer
                </label>
              </Field>
            )}
          />

          <Card className="overflow-hidden">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="font-custom text-foreground text-xl font-semibold">
                Enter Quantities
              </CardTitle>
              <CardDescription className="font-custom text-muted-foreground text-sm">
                Edit quantities by size and add extra rows for duplicate sizes
                with different variety.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form.Subscribe
                selector={(state) => ({
                  sizeQuantities: state.values.sizeQuantities,
                  sizeBagTypes: state.values.sizeBagTypes,
                  sizeVarieties: state.values.sizeVarieties,
                  extraQuantityRows: state.values.extraQuantityRows,
                })}
              >
                {({
                  sizeQuantities,
                  sizeBagTypes,
                  sizeVarieties,
                  extraQuantityRows,
                }) => (
                  <>
                    {gradingSizes.map((size) => {
                      const value = sizeQuantities[size] ?? 0;
                      const bagType = sizeBagTypes[size] ?? defaultBagType;
                      const variety = sizeVarieties[size] ?? '';
                      return (
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
                              value={value === 0 ? '' : String(value)}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const num =
                                  raw === ''
                                    ? 0
                                    : Math.max(
                                        0,
                                        Number.parseInt(raw, 10) || 0
                                      );
                                form.setFieldValue('sizeQuantities', {
                                  ...(sizeQuantities ?? defaultSizeQuantities),
                                  [size]: num,
                                });
                              }}
                              onWheel={blurTargetOnNumberWheel}
                              onKeyDown={preventArrowUpDownOnNumericInput}
                              className={cn(
                                'font-custom w-full sm:w-24',
                                businessNumberSpinnerClassName
                              )}
                            />
                            <select
                              value={bagType}
                              onChange={(e) => {
                                form.setFieldValue('sizeBagTypes', {
                                  ...(sizeBagTypes ?? defaultSizeBagTypes),
                                  [size]: e.target.value,
                                });
                              }}
                              className="border-input bg-background focus-visible:ring-primary font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-28"
                            >
                              {bagTypes.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <SearchSelector
                              id={`nikasi-edit-variety-${size}`}
                              options={potatoVarietyOptions}
                              placeholder="Variety"
                              searchPlaceholder="Search variety..."
                              value={variety}
                              onSelect={(v) =>
                                form.setFieldValue('sizeVarieties', {
                                  ...(sizeVarieties ?? defaultSizeVarieties),
                                  [size]: v ?? '',
                                })
                              }
                              buttonClassName="font-custom h-9 w-full sm:w-28"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {(extraQuantityRows ?? []).map((row) => (
                      <div
                        key={row.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                      >
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                          <select
                            value={row.size}
                            onChange={(e) =>
                              form.setFieldValue(
                                'extraQuantityRows',
                                (extraQuantityRows ?? []).map((r) =>
                                  r.id === row.id
                                    ? { ...r, size: e.target.value }
                                    : r
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
                            value={
                              row.quantity === 0 ? '' : String(row.quantity)
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              const num =
                                raw === ''
                                  ? 0
                                  : Math.max(0, Number.parseInt(raw, 10) || 0);
                              form.setFieldValue(
                                'extraQuantityRows',
                                (extraQuantityRows ?? []).map((r) =>
                                  r.id === row.id ? { ...r, quantity: num } : r
                                )
                              );
                            }}
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
                              form.setFieldValue(
                                'extraQuantityRows',
                                (extraQuantityRows ?? []).map((r) =>
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
                            id={`nikasi-edit-extra-variety-${row.id}`}
                            options={potatoVarietyOptions}
                            placeholder="Variety"
                            searchPlaceholder="Search variety..."
                            value={row.variety}
                            onSelect={(v) =>
                              form.setFieldValue(
                                'extraQuantityRows',
                                (extraQuantityRows ?? []).map((r) =>
                                  r.id === row.id
                                    ? { ...r, variety: v ?? '' }
                                    : r
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
                              form.setFieldValue(
                                'extraQuantityRows',
                                (extraQuantityRows ?? []).filter(
                                  (r) => r.id !== row.id
                                )
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </form.Subscribe>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  form.setFieldValue('extraQuantityRows', [
                    ...(form.state.values.extraQuantityRows ?? []),
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

          <div
            className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 sm:gap-y-3"
            role="group"
            aria-label="Net weight and average per bag"
          >
            <form.Field
              name="netWeight"
              children={(field) => (
                <>
                  <FieldLabel
                    htmlFor="nikasi-edit-net-weight"
                    className="font-custom block text-base font-semibold sm:col-start-1 sm:row-start-1 sm:self-end"
                  >
                    Net Weight
                  </FieldLabel>
                  <Input
                    id="nikasi-edit-net-weight"
                    type="number"
                    min={0}
                    step="any"
                    value={field.state.value ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') return field.handleChange(undefined);
                      const parsed = Number.parseFloat(raw);
                      field.handleChange(
                        Number.isFinite(parsed) ? parsed : undefined
                      );
                    }}
                    onWheel={blurTargetOnNumberWheel}
                    onKeyDown={preventArrowUpDownOnNumericInput}
                    className={cn(
                      'font-custom sm:col-start-1 sm:row-start-2',
                      businessNumberSpinnerClassName
                    )}
                  />
                </>
              )}
            />
            <FieldLabel
              htmlFor="nikasi-edit-avg-weight-per-bag"
              className="font-custom block text-base font-semibold sm:col-start-2 sm:row-start-1 sm:self-end"
            >
              Average Weight per Bag
              <span className="text-muted-foreground mt-0.5 block text-sm font-normal">
                (net weight ÷ total bags)
              </span>
            </FieldLabel>
            <Input
              id="nikasi-edit-avg-weight-per-bag"
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

          <form.Field
            name="remarks"
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Remarks
                </FieldLabel>
                <textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="border-input bg-background text-foreground font-custom placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background w-full rounded-md border p-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  rows={4}
                  maxLength={500}
                />
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              if (isFixedFarmerColdStorage) {
                form.setFieldValue(
                  'farmerStorageLinkId',
                  NIKASI_FIXED_FARMER_STORAGE_LINK_ID
                );
              }
            }}
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
        onOpenChange={(open) => {
          if (!open) setOpenSheetRef(false);
          setIsSummarySheetOpen(open);
        }}
        voucherNumberDisplay={`#${editData.gatePassNo}`}
        formValues={summaryFormValues}
        isPending={isPending}
        isLoadingVoucher={false}
        gatePassNo={Number(editData.gatePassNo) || 0}
        onSubmit={() => form.handleSubmit()}
      />
    </main>
  );
});

export const Route = createFileRoute(
  '/store-admin/_authenticated/nikasi-gate-pass/edit/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const editData = (
    location.state as { nikasiGatePass?: NikasiGatePassEditState } | undefined
  )?.nikasiGatePass;

  if (!editData) {
    return (
      <Card className="mx-auto mt-6 w-full max-w-3xl p-6">
        <h1 className="font-custom text-xl font-bold text-[#333]">
          Nikasi Edit Form
        </h1>
        <p className="font-custom mt-2 text-sm text-[#6f6f6f]">
          No gate pass data was received in router state. Please open this page
          from the Nikasi card edit icon.
        </p>
      </Card>
    );
  }

  return <NikasiEditForm editData={editData} />;
}
