import { memo, useEffect, useMemo } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';

import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import { DatePicker } from '@/components/forms/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import {
  FARMER_SEED_GENERATIONS,
  GRADING_SIZES,
  POTATO_VARIETIES,
} from '@/components/forms/grading/constants';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import { useCreateFarmerSeedEntry } from '@/services/store-admin/farmer-seed/useCreateFarmerSeedEntry';
import { FarmerSeedSummarySheet } from '@/components/forms/farmer-seed/summary-sheet';
import { formatFarmerSeedAmount } from '@/components/forms/farmer-seed/format-farmer-seed-amount';
import { toast } from 'sonner';
import { useState } from 'react';
import { Route as FarmerSeedRoute } from '@/routes/store-admin/_authenticated/farmer-seed';
import { formatDate, formatDateToISO } from '@/lib/helpers';

type FieldErrors = Array<{ message?: string } | undefined>;
type FarmerSeedBagSizeRow = {
  name: string;
  quantity: number;
  rate: number;
  acres: number;
};
type FarmerSeedExtraBagSizeRow = {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  acres: number;
};

/** Default bag size rows shown on the farmer seed form (not the full grading list). */
const FARMER_SEED_DEFAULT_SIZES = [
  'Below 30',
  '30-40',
  '40-50',
  'Above 50',
] as const;

const formSchema = z
  .object({
    farmerStorageLinkId: z.string().min(1, 'Please select a farmer'),
    gatePassNo: z
      .number()
      .int()
      .min(0, 'Gate pass number must be non-negative'),
    invoiceNumber: z.string().trim(),
    date: z
      .string()
      .regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Please select a valid date'),
    variety: z.string().min(1, 'Please select a variety'),
    generation: z.string().min(1, 'Please select a generation'),
    bagSizes: z.array(
      z.object({
        name: z.string().min(1, 'Bag size is required'),
        quantity: z.number().int().min(0, 'Quantity must be non-negative'),
        rate: z.number().min(0, 'Rate must be non-negative'),
        acres: z.number().min(0, 'Acres must be non-negative'),
      })
    ),
    extraBagSizeRows: z.array(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Bag size is required'),
        quantity: z.number().int().min(0, 'Quantity must be non-negative'),
        rate: z.number().min(0, 'Rate must be non-negative'),
        acres: z.number().min(0, 'Acres must be non-negative'),
      })
    ),
    remarks: z.string().trim(),
  })
  .refine(
    (data) =>
      data.bagSizes.some((item) => (item.quantity ?? 0) > 0) ||
      data.extraBagSizeRows.some((item) => (item.quantity ?? 0) > 0),
    {
      message: 'Please enter quantity for at least one bag size.',
      path: ['bagSizes'],
    }
  );

const defaultBagSizes: FarmerSeedBagSizeRow[] = FARMER_SEED_DEFAULT_SIZES.map(
  (size) => ({
    name: size,
    quantity: 0,
    rate: 0,
    acres: 0,
  })
);

const formatAcresValue = (value: number) => {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '');
};

const FarmerSeedForm = memo(function FarmerSeedForm() {
  const { farmerStorageLinkId: farmerStorageLinkIdFromSearch } =
    FarmerSeedRoute.useSearch();
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const {
    data: farmerLinks,
    isLoading: isLoadingFarmers,
    refetch: refetchFarmers,
  } = useGetAllFarmers();
  const { mutate: createFarmerSeedEntry, isPending } =
    useCreateFarmerSeedEntry();

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

  const form = useForm({
    defaultValues: {
      farmerStorageLinkId: '',
      gatePassNo: 0,
      invoiceNumber: '',
      date: formatDate(new Date()),
      variety: '',
      generation: '',
      bagSizes: defaultBagSizes,
      extraBagSizeRows: [] as FarmerSeedExtraBagSizeRow[],
      remarks: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      createFarmerSeedEntry(
        {
          farmerStorageLinkId: value.farmerStorageLinkId,
          gatePassNo:
            value.gatePassNo > 0 ? Number(value.gatePassNo) : undefined,
          invoiceNumber: value.invoiceNumber.trim() || undefined,
          date: formatDateToISO(value.date),
          variety: value.variety.trim(),
          generation: value.generation,
          bagSizes: [
            ...value.bagSizes
              .filter((item) => (item.quantity ?? 0) > 0)
              .map((item) => ({
                name: item.name,
                quantity: Number(item.quantity ?? 0),
                rate: Number(item.rate ?? 0),
                acres: Number(item.acres ?? 0),
              })),
            ...value.extraBagSizeRows
              .filter((item) => (item.quantity ?? 0) > 0)
              .map((item) => ({
                name: item.name,
                quantity: Number(item.quantity ?? 0),
                rate: Number(item.rate ?? 0),
                acres: Number(item.acres ?? 0),
              })),
          ],
          remarks: value.remarks?.trim() || undefined,
        },
        {
          onSuccess: (data) => {
            if (data.success) {
              setIsSummarySheetOpen(false);
              form.reset();
            }
          },
        }
      );
    },
  });

  useEffect(() => {
    if (!farmerStorageLinkIdFromSearch) return;
    if (!farmerLinks || farmerLinks.length === 0) return;
    if (form.state.values.farmerStorageLinkId) return;
    const exists = farmerLinks.some(
      (link) => link._id === farmerStorageLinkIdFromSearch
    );
    if (!exists) return;
    form.setFieldValue('farmerStorageLinkId', farmerStorageLinkIdFromSearch);
  }, [
    farmerStorageLinkIdFromSearch,
    farmerLinks,
    form,
    form.state.values.farmerStorageLinkId,
  ]);

  const selectedFarmer = useMemo(() => {
    if (!form.state.values.farmerStorageLinkId || !farmerLinks) return null;
    return (
      farmerLinks.find(
        (link) => link._id === form.state.values.farmerStorageLinkId
      ) ?? null
    );
  }, [form.state.values.farmerStorageLinkId, farmerLinks]);

  const handleNextClick = () => {
    requestAnimationFrame(() => {
      form.validateAllFields('submit');
      requestAnimationFrame(() => {
        if (form.state.isValid) setIsSummarySheetOpen(true);
      });
    });
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Create Farmer Seed Entry
        </h1>
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
            name="farmerStorageLinkId"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
              return (
                <Field data-invalid={isInvalid}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <FieldLabel
                        htmlFor="farmer-seed-farmer-select"
                        className="font-custom mb-2 block text-base font-semibold"
                      >
                        Enter Account Name (search and select)
                      </FieldLabel>
                      <SearchSelector
                        id="farmer-seed-farmer-select"
                        options={farmerOptions}
                        placeholder="Search or Create Farmer"
                        searchPlaceholder="Search by name, account number, or mobile..."
                        onSelect={(value) => field.handleChange(value)}
                        value={field.state.value}
                        loading={isLoadingFarmers}
                        loadingMessage="Loading farmers..."
                        emptyMessage="No farmers found"
                        className="w-full"
                        buttonClassName="w-full justify-between"
                      />
                    </div>
                    <AddFarmerModal
                      links={farmerLinks ?? []}
                      onFarmerAdded={() => refetchFarmers()}
                    />
                  </div>
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="gatePassNo"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && field.state.value < 0;
              const valueDisplay =
                field.state.value === 0 ? '' : String(field.state.value);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Gate Pass No
                  </FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Enter gate pass number"
                    value={valueDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const num =
                        raw === '' ? 0 : Math.max(0, parseInt(raw, 10) || 0);
                      field.handleChange(num);
                    }}
                    onBlur={field.handleBlur}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="invoiceNumber"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Invoice Number
                  </FieldLabel>
                  <Input
                    type="text"
                    placeholder="Enter invoice number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="font-custom"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="date"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation;
              return (
                <Field data-invalid={isInvalid}>
                  <DatePicker
                    id="farmer-seed-date"
                    label="Date"
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                  />
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="variety"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Select Variety
                  </FieldLabel>
                  <p className="font-custom text-muted-foreground mb-2 text-sm">
                    Choose the potato variety for this farmer seed entry
                  </p>
                  <SearchSelector
                    options={POTATO_VARIETIES}
                    placeholder="Select a variety"
                    searchPlaceholder="Search variety..."
                    onSelect={(value) => field.handleChange(value ?? '')}
                    value={field.state.value}
                    buttonClassName="w-full justify-between"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="generation"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap &&
                'onSubmit' in field.state.meta.errorMap &&
                field.state.meta.errorMap.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Select Generation
                  </FieldLabel>
                  <p className="font-custom text-muted-foreground mb-2 text-sm">
                    Choose G2 or G3 for this farmer seed entry
                  </p>
                  <SearchSelector
                    id="farmer-seed-generation"
                    options={FARMER_SEED_GENERATIONS}
                    placeholder="Select generation"
                    searchPlaceholder="Search generation..."
                    onSelect={(value) => field.handleChange(value ?? '')}
                    value={field.state.value}
                    buttonClassName="w-full justify-between"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={field.state.meta.errors as FieldErrors}
                    />
                  )}
                </Field>
              );
            }}
          />

          <form.Field
            name="remarks"
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Remarks (optional)
                </FieldLabel>
                <Input
                  type="text"
                  placeholder="Enter remarks"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="font-custom"
                />
              </Field>
            )}
          />

          <form.Field
            name="bagSizes"
            children={(field) => (
              <form.Subscribe
                selector={(state) => ({
                  extraBagSizeRows: state.values.extraBagSizeRows ?? [],
                })}
              >
                {({ extraBagSizeRows }) => {
                  const bagSizes = field.state.value ?? defaultBagSizes;
                  const extraTotal = extraBagSizeRows.reduce(
                    (sum, row) => sum + (row.quantity ?? 0),
                    0
                  );
                  const fixedTotal = bagSizes.reduce(
                    (sum, row) => sum + (row.quantity ?? 0),
                    0
                  );
                  const totalQty = fixedTotal + extraTotal;
                  const fixedAmount = bagSizes.reduce(
                    (sum, row) => sum + (row.quantity ?? 0) * (row.rate ?? 0),
                    0
                  );
                  const extraAmount = extraBagSizeRows.reduce(
                    (sum, row) => sum + (row.quantity ?? 0) * (row.rate ?? 0),
                    0
                  );
                  const totalAmount = fixedAmount + extraAmount;
                  const fixedAcres = bagSizes.reduce(
                    (sum, row) => sum + (row.acres ?? 0),
                    0
                  );
                  const extraAcres = extraBagSizeRows.reduce(
                    (sum, row) => sum + (row.acres ?? 0),
                    0
                  );
                  const totalAcres = fixedAcres + extraAcres;
                  const hasQty = totalQty > 0;

                  const defaultExtraName = GRADING_SIZES[0] ?? '';

                  const addExtraRow = () => {
                    const next: FarmerSeedExtraBagSizeRow[] = [
                      ...extraBagSizeRows,
                      {
                        id: crypto.randomUUID(),
                        name: defaultExtraName,
                        quantity: 0,
                        rate: 0,
                        acres: 0,
                      },
                    ];
                    form.setFieldValue(
                      'extraBagSizeRows' as never,
                      next as never
                    );
                  };

                  const updateExtraRow = (
                    id: string,
                    updates: Partial<FarmerSeedExtraBagSizeRow>
                  ) => {
                    const next = extraBagSizeRows.map((row) =>
                      row.id === id ? { ...row, ...updates } : row
                    );
                    form.setFieldValue(
                      'extraBagSizeRows' as never,
                      next as never
                    );
                  };

                  const removeExtraRow = (id: string) => {
                    const next = extraBagSizeRows.filter(
                      (row) => row.id !== id
                    );
                    form.setFieldValue(
                      'extraBagSizeRows' as never,
                      next as never
                    );
                  };

                  return (
                    <Card className="overflow-hidden">
                      <CardHeader className="space-y-1.5 pb-4">
                        <CardTitle className="font-custom text-foreground text-xl font-semibold">
                          Enter Bag Sizes
                        </CardTitle>
                        <CardDescription className="font-custom text-muted-foreground text-sm">
                          Add quantity and rate for each size. Use Add Size for
                          additional grading sizes. At least one row must have
                          quantity greater than zero.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {bagSizes.map((row, index) => {
                          const qtyDisplay =
                            row.quantity === 0 ? '' : String(row.quantity);
                          const rateDisplay =
                            row.rate === 0 ? '' : String(row.rate);
                          const acresDisplay =
                            row.acres === 0 ? '' : String(row.acres);

                          return (
                            <div
                              key={`${row.name}-${index}`}
                              className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4"
                            >
                              <label
                                htmlFor={`farmer-seed-size-${index}`}
                                className="font-custom text-foreground text-base font-normal"
                              >
                                {row.name}
                              </label>
                              <Input
                                id={`farmer-seed-size-${index}`}
                                type="number"
                                min={0}
                                step={1}
                                placeholder="Qty"
                                value={qtyDisplay}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const num =
                                    raw === ''
                                      ? 0
                                      : Math.max(0, parseInt(raw, 10) || 0);
                                  const next = [...bagSizes];
                                  next[index] = {
                                    ...next[index],
                                    quantity: num,
                                  };
                                  field.handleChange(next);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="Rate"
                                value={rateDisplay}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const num =
                                    raw === ''
                                      ? 0
                                      : Math.max(0, parseFloat(raw) || 0);
                                  const next = [...bagSizes];
                                  next[index] = { ...next[index], rate: num };
                                  field.handleChange(next);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="Acres"
                                value={acresDisplay}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const num =
                                    raw === ''
                                      ? 0
                                      : Math.max(0, parseFloat(raw) || 0);
                                  const next = [...bagSizes];
                                  next[index] = {
                                    ...next[index],
                                    acres: num,
                                  };
                                  field.handleChange(next);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                            </div>
                          );
                        })}
                        {extraBagSizeRows.map((row) => {
                          const qtyDisplay =
                            row.quantity === 0 ? '' : String(row.quantity);
                          const rateDisplay =
                            row.rate === 0 ? '' : String(row.rate);
                          const acresDisplay =
                            row.acres === 0 ? '' : String(row.acres);
                          return (
                            <div
                              key={row.id}
                              className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <select
                                  aria-label="Select bag size"
                                  value={row.name}
                                  onChange={(e) =>
                                    updateExtraRow(row.id, {
                                      name: e.target.value,
                                    })
                                  }
                                  className="border-input bg-background text-foreground font-custom focus-visible:ring-primary h-9 min-w-0 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                >
                                  {GRADING_SIZES.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => removeExtraRow(row.id)}
                                  aria-label={`Remove ${row.name || 'size'} row`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                placeholder="Qty"
                                value={qtyDisplay}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const num =
                                    raw === ''
                                      ? 0
                                      : Math.max(0, parseInt(raw, 10) || 0);
                                  updateExtraRow(row.id, {
                                    quantity: num,
                                  });
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="Rate"
                                value={rateDisplay}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const num =
                                    raw === ''
                                      ? 0
                                      : Math.max(0, parseFloat(raw) || 0);
                                  updateExtraRow(row.id, { rate: num });
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="Acres"
                                value={acresDisplay}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const num =
                                    raw === ''
                                      ? 0
                                      : Math.max(0, parseFloat(raw) || 0);
                                  updateExtraRow(row.id, {
                                    acres: num,
                                  });
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
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
                        <Separator className="my-4" />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-custom text-foreground text-base font-normal">
                            Total Quantity
                          </span>
                          <span className="font-custom text-foreground text-base font-medium sm:text-right">
                            {totalQty}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-custom text-foreground text-base font-normal">
                            Total Acres
                          </span>
                          <span className="font-custom text-foreground text-base font-medium sm:text-right">
                            {formatAcresValue(totalAcres)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="font-custom text-foreground text-base font-normal">
                            Total Amount
                          </span>
                          <span className="font-custom text-foreground text-base font-medium sm:text-right">
                            {formatFarmerSeedAmount(totalAmount)}
                          </span>
                        </div>
                        {!hasQty && (
                          <p className="font-custom text-destructive text-sm">
                            Please enter quantity for at least one bag size.
                          </p>
                        )}
                        {field.state.meta.isTouched &&
                          !field.state.meta.isValid && (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          )}
                      </CardContent>
                    </Card>
                  );
                }}
              </form.Subscribe>
            )}
          />
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset();
              toast.info('Form reset');
            }}
            className="font-custom"
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            disabled={isPending}
            onClick={handleNextClick}
          >
            Next
          </Button>
        </div>
      </form>

      <FarmerSeedSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        selectedFarmer={selectedFarmer}
        formValues={{
          gatePassNo: form.state.values.gatePassNo,
          invoiceNumber: form.state.values.invoiceNumber,
          date: form.state.values.date,
          variety: form.state.values.variety,
          generation: form.state.values.generation,
          remarks: form.state.values.remarks,
          bagSizes: [
            ...form.state.values.bagSizes,
            ...form.state.values.extraBagSizeRows.map(
              ({ name, quantity, rate, acres }) => ({
                name,
                quantity,
                rate,
                acres,
              })
            ),
          ],
        }}
        isPending={isPending}
        onSubmit={() => form.handleSubmit()}
      />
    </main>
  );
});

export default FarmerSeedForm;
