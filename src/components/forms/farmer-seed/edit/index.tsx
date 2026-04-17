import { memo, useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import { DatePicker } from '@/components/forms/date-picker';
import {
  FARMER_SEED_GENERATIONS,
  GRADING_SIZES,
  POTATO_VARIETIES,
} from '@/components/forms/grading/constants';
import { SearchSelector } from '@/components/forms/search-selector';
import { FarmerSeedSummarySheet } from '@/components/forms/farmer-seed/summary-sheet';
import { formatFarmerSeedAmount } from '@/components/forms/farmer-seed/format-farmer-seed-amount';
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
import { formatDate, formatDateToISO } from '@/lib/helpers';
import { useEditFarmerSeedEntry } from '@/services/store-admin/farmer-seed/useEditFarmerSeedEntry';
import type {
  FarmerSeedEntryByStorageLink,
  FarmerSeedEntryListItem,
} from '@/types/farmer-seed';
import { toast } from 'sonner';

/** Entry shape for the shared edit form (people flow or daybook list item). */
export type FarmerSeedEditableEntry =
  | FarmerSeedEntryByStorageLink
  | FarmerSeedEntryListItem;

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

const FARMER_SEED_DEFAULT_SIZES = [
  'Below 30',
  '30-40',
  '40-50',
  'Above 50',
] as const;

const formSchema = z.object({
  id: z.string(),
  farmerStorageLinkId: z.string(),
  gatePassNo: z.number().int().min(0, 'Gate pass number must be non-negative'),
  invoiceNumber: z.string().trim(),
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, 'Please select a valid date'),
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
});

const defaultBagSizes: FarmerSeedBagSizeRow[] = FARMER_SEED_DEFAULT_SIZES.map(
  (size) => ({
    name: size,
    quantity: 0,
    rate: 0,
    acres: 0,
  })
);

const formatAcresValue = (value: number) =>
  Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '');

function toInputDate(isoDate: string | undefined): string {
  if (!isoDate) return formatDate(new Date());
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime())
    ? formatDate(new Date())
    : formatDate(parsed);
}

export interface FarmerSeedEditFormProps {
  entry: FarmerSeedEditableEntry;
  /** Called after a successful update (summary sheet closed). */
  onSuccess: (ctx?: { farmerStorageLinkId: string }) => void;
  onCancel: () => void;
}

const FarmerSeedEditForm = memo(function FarmerSeedEditForm({
  entry,
  onSuccess,
  onCancel,
}: FarmerSeedEditFormProps) {
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);
  const { mutate: editFarmerSeedEntry, isPending } = useEditFarmerSeedEntry();

  const initialValues = useMemo(() => {
    const fixedMap = new Map<string, FarmerSeedBagSizeRow>(
      defaultBagSizes.map((row) => [row.name, { ...row }])
    );
    const extras: FarmerSeedExtraBagSizeRow[] = [];
    for (const row of entry.bagSizes ?? []) {
      const normalized = {
        name: row.name,
        quantity: Number(row.quantity ?? 0),
        rate: Number(row.rate ?? 0),
        acres: Number(row.acres ?? 0),
      };
      if (fixedMap.has(row.name)) {
        fixedMap.set(row.name, normalized);
      } else {
        extras.push({ id: crypto.randomUUID(), ...normalized });
      }
    }

    return {
      id: entry._id,
      farmerStorageLinkId:
        typeof entry.farmerStorageLinkId === 'string'
          ? entry.farmerStorageLinkId
          : (entry.farmerStorageLinkId?._id ?? ''),
      gatePassNo: Number(entry.gatePassNo ?? 0),
      invoiceNumber: entry.invoiceNumber ?? '',
      date: toInputDate(entry.date),
      variety: entry.variety ?? '',
      generation: entry.generation ?? '',
      bagSizes: defaultBagSizes.map((row) => fixedMap.get(row.name) ?? row),
      extraBagSizeRows: extras,
      remarks: entry.remarks ?? '',
    };
  }, [entry]);

  const form = useForm({
    defaultValues: initialValues,
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      if (!value.id) {
        toast.error('Missing farmer seed record');
        return;
      }
      editFarmerSeedEntry(
        {
          id: value.id,
          farmerStorageLinkId: value.farmerStorageLinkId || undefined,
          gatePassNo:
            value.gatePassNo > 0 ? Number(value.gatePassNo) : undefined,
          invoiceNumber: value.invoiceNumber.trim() || undefined,
          date: formatDateToISO(value.date),
          variety: value.variety.trim(),
          generation: value.generation.trim(),
          bagSizes: [
            ...value.bagSizes.map((item) => {
              const quantity = Number(item.quantity ?? 0);
              return {
                name: item.name,
                quantity,
                rate: quantity === 0 ? 0 : Number(item.rate ?? 0),
                acres: quantity === 0 ? 0 : Number(item.acres ?? 0),
              };
            }),
            ...value.extraBagSizeRows.map((item) => {
              const quantity = Number(item.quantity ?? 0);
              return {
                name: item.name,
                quantity,
                rate: quantity === 0 ? 0 : Number(item.rate ?? 0),
                acres: quantity === 0 ? 0 : Number(item.acres ?? 0),
              };
            }),
          ],
          remarks: value.remarks.trim(),
        },
        {
          onSuccess: (data) => {
            if (!data.success) return;
            setIsSummarySheetOpen(false);
            onSuccess({
              farmerStorageLinkId: value.farmerStorageLinkId,
            });
          },
        }
      );
    },
  });

  const handleNextClick = () => {
    requestAnimationFrame(() => {
      form.validateAllFields('submit');
      requestAnimationFrame(() => {
        if (form.state.isValid) setIsSummarySheetOpen(true);
      });
    });
  };

  return (
    <>
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
            name="gatePassNo"
            children={(field) => {
              const isInvalid =
                Boolean(field.state.meta.errorMap?.onSubmit) ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const showInvalid = isInvalid && field.state.value < 0;
              const valueDisplay =
                field.state.value === 0 ? '' : String(field.state.value);
              return (
                <Field data-invalid={showInvalid}>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Gate Pass No
                  </FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={valueDisplay}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === ''
                          ? 0
                          : Math.max(0, parseInt(e.target.value, 10) || 0)
                      )
                    }
                    onBlur={field.handleBlur}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {showInvalid && (
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
              const isInvalid =
                Boolean(field.state.meta.errorMap?.onSubmit) ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                    Invoice Number
                  </FieldLabel>
                  <Input
                    type="text"
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
              const isInvalid =
                Boolean(field.state.meta.errorMap?.onSubmit) ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              return (
                <Field data-invalid={isInvalid}>
                  <DatePicker
                    id="farmer-seed-edit-date"
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
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Select Variety
                </FieldLabel>
                <SearchSelector
                  options={POTATO_VARIETIES}
                  placeholder="Select a variety"
                  searchPlaceholder="Search variety..."
                  onSelect={(value) => field.handleChange(value ?? '')}
                  value={field.state.value}
                  buttonClassName="w-full justify-between"
                />
              </Field>
            )}
          />

          <form.Field
            name="generation"
            children={(field) => (
              <Field>
                <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                  Select Generation
                </FieldLabel>
                <SearchSelector
                  id="farmer-seed-edit-generation"
                  options={FARMER_SEED_GENERATIONS}
                  placeholder="Select generation"
                  searchPlaceholder="Search generation..."
                  onSelect={(value) => field.handleChange(value ?? '')}
                  value={field.state.value}
                  buttonClassName="w-full justify-between"
                />
              </Field>
            )}
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
                  const defaultExtraName = GRADING_SIZES[0] ?? '';

                  const addExtraRow = () => {
                    form.setFieldValue(
                      'extraBagSizeRows' as never,
                      [
                        ...extraBagSizeRows,
                        {
                          id: crypto.randomUUID(),
                          name: defaultExtraName,
                          quantity: 0,
                          rate: 0,
                          acres: 0,
                        },
                      ] as never
                    );
                  };
                  const updateExtraRow = (
                    id: string,
                    updates: Partial<FarmerSeedExtraBagSizeRow>
                  ) => {
                    form.setFieldValue(
                      'extraBagSizeRows' as never,
                      extraBagSizeRows.map((row) =>
                        row.id === id ? { ...row, ...updates } : row
                      ) as never
                    );
                  };
                  const removeExtraRow = (id: string) => {
                    form.setFieldValue(
                      'extraBagSizeRows' as never,
                      extraBagSizeRows.filter((row) => row.id !== id) as never
                    );
                  };

                  return (
                    <Card className="overflow-hidden">
                      <CardHeader className="space-y-1.5 pb-4">
                        <CardTitle className="font-custom text-foreground text-xl font-semibold">
                          Enter Bag Sizes
                        </CardTitle>
                        <CardDescription className="font-custom text-muted-foreground text-sm">
                          Update quantity and rate for each size. Use Add Size
                          for additional grading sizes.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {bagSizes.map((row, index) => (
                          <div
                            key={`${row.name}-${index}`}
                            className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:items-center sm:gap-4"
                          >
                            <label
                              htmlFor={`farmer-seed-edit-size-${index}`}
                              className="font-custom text-foreground text-base font-normal"
                            >
                              {row.name}
                            </label>
                            <Input
                              id={`farmer-seed-edit-size-${index}`}
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Qty"
                              value={String(row.quantity)}
                              onChange={(e) => {
                                const quantity =
                                  e.target.value === ''
                                    ? 0
                                    : Math.max(
                                        0,
                                        parseInt(e.target.value, 10) || 0
                                      );
                                const next = [...bagSizes];
                                next[index] = {
                                  ...next[index],
                                  quantity,
                                  rate:
                                    quantity === 0
                                      ? 0
                                      : (next[index]?.rate ?? 0),
                                  acres:
                                    quantity === 0
                                      ? 0
                                      : (next[index]?.acres ?? 0),
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
                              value={String(row.rate)}
                              onChange={(e) => {
                                const next = [...bagSizes];
                                next[index] = {
                                  ...next[index],
                                  rate:
                                    e.target.value === ''
                                      ? 0
                                      : Math.max(
                                          0,
                                          parseFloat(e.target.value) || 0
                                        ),
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
                              placeholder="Acres"
                              value={String(row.acres)}
                              onChange={(e) => {
                                const next = [...bagSizes];
                                next[index] = {
                                  ...next[index],
                                  acres:
                                    e.target.value === ''
                                      ? 0
                                      : Math.max(
                                          0,
                                          parseFloat(e.target.value) || 0
                                        ),
                                };
                                field.handleChange(next);
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        ))}

                        {extraBagSizeRows.map((row) => (
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
                              value={String(row.quantity)}
                              onChange={(e) => {
                                const quantity =
                                  e.target.value === ''
                                    ? 0
                                    : Math.max(
                                        0,
                                        parseInt(e.target.value, 10) || 0
                                      );
                                updateExtraRow(row.id, {
                                  quantity,
                                  rate: quantity === 0 ? 0 : row.rate,
                                  acres: quantity === 0 ? 0 : row.acres,
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
                              value={String(row.rate)}
                              onChange={(e) =>
                                updateExtraRow(row.id, {
                                  rate:
                                    e.target.value === ''
                                      ? 0
                                      : Math.max(
                                          0,
                                          parseFloat(e.target.value) || 0
                                        ),
                                })
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Acres"
                              value={String(row.acres)}
                              onChange={(e) =>
                                updateExtraRow(row.id, {
                                  acres:
                                    e.target.value === ''
                                      ? 0
                                      : Math.max(
                                          0,
                                          parseFloat(e.target.value) || 0
                                        ),
                                })
                              }
                              onWheel={(e) => e.currentTarget.blur()}
                              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </div>
                        ))}

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
            onClick={onCancel}
            className="font-custom"
            disabled={isPending}
          >
            Cancel
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
        selectedFarmer={null}
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
        submitLabel="Update Farmer Seed Entry"
      />
    </>
  );
});

const FarmerSeedEdit = memo(function FarmerSeedEdit() {
  const navigate = useNavigate();
  const routerState = useRouterState({
    select: (state) =>
      state.location.state as
        | { farmerSeedEntry?: FarmerSeedEntryByStorageLink }
        | undefined,
  });
  const entry = routerState?.farmerSeedEntry;

  if (!entry) {
    return (
      <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="font-custom text-muted-foreground">
              No seed entry selected for editing.
            </p>
            <Button
              type="button"
              className="font-custom"
              onClick={() => navigate({ to: '/store-admin/people' })}
            >
              Back to People
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Edit Farmer Seed Entry
        </h1>
      </div>
      <FarmerSeedEditForm
        entry={entry}
        onSuccess={(ctx) => {
          const redirectFarmerStorageLinkId = ctx?.farmerStorageLinkId;
          if (redirectFarmerStorageLinkId) {
            navigate({
              to: '/store-admin/people/$farmerStorageLinkId',
              params: { farmerStorageLinkId: redirectFarmerStorageLinkId },
            });
            return;
          }
          navigate({ to: '/store-admin/people' });
        }}
        onCancel={() => navigate({ to: '/store-admin/people' })}
      />
    </main>
  );
});

export default FarmerSeedEdit;
export { FarmerSeedEditForm };
