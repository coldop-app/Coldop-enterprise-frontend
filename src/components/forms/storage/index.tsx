import { memo, useMemo, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import * as z from 'zod';

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
import { DatePicker } from '@/components/forms/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import { useCreateBulkStorageGatePasses } from '@/services/store-admin/storage-gate-pass/useCreateBulkStorageGatePasses';
import { toast } from 'sonner';
import { formatDate, formatDateToISO } from '@/lib/helpers';

import {
  POTATO_VARIETIES,
  GRADING_SIZES,
  BAG_TYPES,
} from '@/components/forms/grading/constants';
import type { StorageGatePassFormProps } from '@/components/forms/storage/storage-form-types';
import {
  StorageSummarySheet,
  type StorageSummaryFormValues,
} from '@/components/forms/storage/summary-sheet';

const DEFAULT_LOCATION = { chamber: '', floor: '', row: '' };
type LocationEntry = { chamber: string; floor: string; row: string };
type FieldErrors = Array<{ message?: string } | undefined>;

const DIRECT_PASS_ID = '_direct';

const defaultSizeQuantities = Object.fromEntries(
  GRADING_SIZES.map((s) => [s, 0])
) as Record<string, number>;
const defaultSizeBagTypes = Object.fromEntries(
  GRADING_SIZES.map((s) => [s, 'JUTE'])
) as Record<string, string>;

const formSchema = z
  .object({
    manualGatePassNumber: z.union([z.number(), z.undefined()]),
    farmerStorageLinkId: z.string().min(1, 'Please select a farmer'),
    date: z.string().min(1, 'Date is required'),
    variety: z.string().min(1, 'Please select a variety'),
    sizeQuantities: z.record(z.string(), z.number().min(0)),
    sizeBagTypes: z.record(z.string(), z.string()),
    locationBySize: z.record(
      z.string(),
      z.object({
        chamber: z.string(),
        floor: z.string(),
        row: z.string(),
      })
    ),
    remarks: z.string().max(500).default(''),
  })
  .refine(
    (data) => {
      const withQty = Object.entries(data.sizeQuantities).filter(
        ([, qty]) => (qty ?? 0) > 0
      );
      return withQty.every(([size]) => {
        const loc = data.locationBySize?.[size];
        return (
          loc &&
          loc.chamber?.trim() !== '' &&
          loc.floor?.trim() !== '' &&
          loc.row?.trim() !== ''
        );
      });
    },
    {
      message:
        'Please enter chamber, floor and row for each size that has a quantity.',
      path: ['locationBySize'],
    }
  )
  .refine(
    (data) => {
      const total = Object.values(data.sizeQuantities).reduce(
        (sum, qty) => sum + (qty ?? 0),
        0
      );
      return total > 0;
    },
    {
      message: 'Please enter at least one quantity.',
      path: ['sizeQuantities'],
    }
  );

const StorageGatePassForm = memo(function StorageGatePassForm({
  farmerStorageLinkId: initialFarmerStorageLinkId,
}: StorageGatePassFormProps) {
  const navigate = useNavigate();
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('storage-gate-pass');
  const {
    data: farmerLinks,
    isLoading: isLoadingFarmers,
    refetch: refetchFarmers,
  } = useGetAllFarmers();
  const { mutate: createBulkStorageGatePasses, isPending } =
    useCreateBulkStorageGatePasses();

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

  const [step, setStep] = useState<1 | 2>(1);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const openSheetRef = useRef(false);

  const form = useForm({
    defaultValues: {
      manualGatePassNumber: undefined as number | undefined,
      farmerStorageLinkId: initialFarmerStorageLinkId ?? '',
      date: formatDate(new Date()),
      variety: '',
      sizeQuantities: defaultSizeQuantities,
      sizeBagTypes: defaultSizeBagTypes,
      locationBySize: {} as Record<string, LocationEntry>,
      remarks: '',
    },
    validators: {
      onSubmit: formSchema as never,
    },
    onSubmit: async ({ value }) => {
      if (!openSheetRef.current) {
        openSheetRef.current = true;
        setSummaryOpen(true);
        return;
      }
      openSheetRef.current = false;

      if (!voucherNumber) return;

      const bagSizes = (
        Object.entries(value.sizeQuantities) as [string, number][]
      )
        .filter(([, qty]) => (qty ?? 0) > 0)
        .map(([size, qty]) => {
          const loc = value.locationBySize[size] ?? { ...DEFAULT_LOCATION };
          const quantity = qty ?? 0;
          return {
            size,
            bagType: value.sizeBagTypes[size] ?? 'JUTE',
            currentQuantity: quantity,
            initialQuantity: quantity,
            chamber: loc.chamber.trim(),
            floor: loc.floor.trim(),
            row: loc.row.trim(),
          };
        });

      createBulkStorageGatePasses(
        {
          passes: [
            {
              farmerStorageLinkId: value.farmerStorageLinkId,
              gatePassNo: voucherNumber,
              date: formatDateToISO(value.date),
              variety: value.variety.trim(),
              bagSizes,
              remarks: value.remarks?.trim() || undefined,
            },
          ],
        },
        {
          onSuccess: () => {
            form.reset();
            setStep(1);
            setSummaryOpen(false);
            navigate({ to: '/store-admin/daybook' });
          },
        }
      );
    },
  });

  const voucherNumberDisplay =
    voucherNumber != null ? `#${voucherNumber}` : null;
  const gatePassNo = voucherNumber ?? 0;

  const formValues = form.state.values;
  const summaryFormValues: StorageSummaryFormValues = useMemo(() => {
    const allocations = (
      Object.entries(formValues.sizeQuantities) as [string, number][]
    )
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([size]) => {
        const qty = formValues.sizeQuantities[size] ?? 0;
        const loc = formValues.locationBySize?.[size] ?? {
          ...DEFAULT_LOCATION,
        };
        return {
          size,
          quantityToAllocate: qty,
          chamber: loc.chamber,
          floor: loc.floor,
          row: loc.row,
        };
      });
    return {
      passes: [
        {
          date: formValues.date,
          variety: formValues.variety,
          remarks: formValues.remarks ?? '',
          gradingGatePasses: [
            {
              gradingGatePassId: DIRECT_PASS_ID,
              gatePassNo: voucherNumber ?? undefined,
              date: formValues.date,
              allocations,
            },
          ],
        },
      ],
    };
  }, [
    formValues.sizeQuantities,
    formValues.locationBySize,
    formValues.date,
    formValues.variety,
    formValues.remarks,
    voucherNumber,
  ]);

  const handleFarmerAdded = () => {
    refetchFarmers();
  };

  const handleNextOrReview = () => {
    if (step === 1) {
      if (!formValues.farmerStorageLinkId?.trim()) {
        toast.error('Please select a farmer.');
        return;
      }
      if (!formValues.variety?.trim()) {
        toast.error('Please select a variety.');
        return;
      }
      const total = Object.values(formValues.sizeQuantities).reduce(
        (s, q) => s + (q ?? 0),
        0
      );
      if (total === 0) {
        toast.error('Please enter at least one quantity.');
        return;
      }
      setStep(2);
      return;
    }
    form.validateAllFields('submit');
    if (form.state.isValid) {
      form.handleSubmit();
    }
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Create Storage Gate Pass
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleNextOrReview();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          {step === 1 && (
            <>
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
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                          field.handleChange(undefined);
                          return;
                        }
                        const parsed = parseInt(raw, 10);
                        field.handleChange(
                          Number.isNaN(parsed) ? undefined : parsed
                        );
                      }}
                      placeholder="e.g. 101"
                      className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </Field>
                )}
              />

              {/* Farmer Selection */}
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
                  const hasValue = Boolean(
                    field.state.value && String(field.state.value).trim()
                  );
                  const isInvalid = invalidFromValidation && !hasValue;
                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <FieldLabel
                            htmlFor="storage-farmer-select"
                            className="font-custom mb-2 block text-base font-semibold"
                          >
                            Enter Account Name (search and select)
                          </FieldLabel>
                          <SearchSelector
                            id="storage-farmer-select"
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
                          onFarmerAdded={handleFarmerAdded}
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
                name="date"
                children={(field) => (
                  <Field>
                    <DatePicker
                      value={field.state.value}
                      onChange={(v) => field.handleChange(v)}
                      label="Date"
                      id="storage-date"
                    />
                  </Field>
                )}
              />

              <form.Field
                name="variety"
                children={(field) => {
                  const hasSubmitError = Boolean(
                    field.state.meta.errorMap &&
                    'onSubmit' in field.state.meta.errorMap &&
                    field.state.meta.errorMap.onSubmit
                  );
                  const isInvalid =
                    (hasSubmitError ||
                      (field.state.meta.isTouched &&
                        !field.state.meta.isValid)) &&
                    !field.state.value;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                        Select Variety
                      </FieldLabel>
                      <p className="font-custom text-muted-foreground mb-2 text-sm">
                        Choose the potato variety for this order
                      </p>
                      <SearchSelector
                        options={POTATO_VARIETIES}
                        placeholder="Select a variety"
                        searchPlaceholder="Search variety..."
                        onSelect={(v) => field.handleChange(v ?? '')}
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
                name="sizeQuantities"
                children={(field) => (
                  <form.Subscribe
                    selector={(state) => ({
                      variety: state.values.variety,
                      sizeBagTypes:
                        state.values.sizeBagTypes ?? defaultSizeBagTypes,
                    })}
                  >
                    {({ variety, sizeBagTypes }) => {
                      const sizeQuantities =
                        field.state.value ?? defaultSizeQuantities;
                      const quantitiesDisabled = !variety?.trim();
                      return (
                        <Card className="overflow-hidden">
                          <CardHeader className="space-y-1.5 pb-4">
                            <CardTitle className="font-custom text-foreground text-xl font-semibold">
                              Enter Quantities
                            </CardTitle>
                            <CardDescription className="font-custom text-muted-foreground text-sm">
                              {quantitiesDisabled
                                ? 'Please select a variety first to enter quantities.'
                                : 'Enter quantity and bag type for each size.'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {GRADING_SIZES.map((size) => {
                              const value = sizeQuantities[size] ?? 0;
                              const displayValue =
                                value === 0 ? '' : String(value);
                              const bagType = sizeBagTypes[size] ?? 'JUTE';
                              return (
                                <div
                                  key={size}
                                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                                >
                                  <label
                                    htmlFor={`qty-${size}`}
                                    className="font-custom text-foreground text-base font-normal"
                                  >
                                    {size}
                                  </label>
                                  <div className="flex w-full gap-2 sm:w-auto sm:min-w-[200px]">
                                    <Input
                                      id={`qty-${size}`}
                                      type="number"
                                      min={0}
                                      placeholder="Qty"
                                      disabled={quantitiesDisabled}
                                      value={displayValue}
                                      onChange={(e) => {
                                        const next = {
                                          ...(field.state.value ??
                                            defaultSizeQuantities),
                                        };
                                        const raw = e.target.value;
                                        const num =
                                          raw === ''
                                            ? 0
                                            : Math.max(
                                                0,
                                                parseInt(raw, 10) || 0
                                              );
                                        next[size] = num;
                                        field.handleChange(next);
                                      }}
                                      onWheel={(e) => e.currentTarget.blur()}
                                      className="w-full [appearance:textfield] sm:w-24 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                    <select
                                      aria-label={`Bag type for ${size}`}
                                      disabled={quantitiesDisabled}
                                      value={bagType}
                                      onChange={(e) => {
                                        form.setFieldValue(
                                          'sizeBagTypes' as never,
                                          {
                                            ...(form.state.values
                                              .sizeBagTypes ??
                                              defaultSizeBagTypes),
                                            [size]: e.target.value,
                                          } as never
                                        );
                                      }}
                                      className="border-input bg-background focus-visible:ring-primary font-custom h-9 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-28"
                                    >
                                      {BAG_TYPES.map((opt) => (
                                        <option key={opt} value={opt}>
                                          {opt}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                            <Separator className="my-4" />
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="font-custom text-foreground text-base font-normal">
                                Total
                              </span>
                              <span className="font-custom text-foreground text-base font-medium sm:text-right">
                                {Object.values(sizeQuantities).reduce(
                                  (s, q) => s + (q ?? 0),
                                  0
                                )}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }}
                  </form.Subscribe>
                )}
              />
            </>
          )}

          {step === 2 && (
            <>
              <form.Field
                name="locationBySize"
                children={(field) => (
                  <form.Subscribe
                    selector={(state) => ({
                      sizeQuantities: state.values.sizeQuantities,
                    })}
                  >
                    {({ sizeQuantities }) => {
                      const fixedWithQty = GRADING_SIZES.filter(
                        (size) => (sizeQuantities[size] ?? 0) > 0
                      ).map((size) => ({
                        key: size,
                        sizeLabel: size,
                        quantity: sizeQuantities[size] ?? 0,
                      }));
                      const locationBySize = field.state.value ?? {};
                      const locationRows = fixedWithQty;

                      const clearAllLocations = () => {
                        const next: Record<string, LocationEntry> = {};
                        for (const row of locationRows) {
                          next[row.key] = { ...DEFAULT_LOCATION };
                        }
                        field.handleChange(next);
                      };

                      const sourceLocation: LocationEntry | null = (() => {
                        for (const row of locationRows) {
                          const loc = locationBySize[row.key] ?? {
                            ...DEFAULT_LOCATION,
                          };
                          const c = loc.chamber?.trim();
                          const f = loc.floor?.trim();
                          const r = loc.row?.trim();
                          if (c && f && r)
                            return { chamber: c, floor: f, row: r };
                        }
                        return null;
                      })();

                      const applyToAllLocations = () => {
                        if (!sourceLocation) return;
                        const next: Record<string, LocationEntry> = {};
                        for (const row of locationRows) {
                          next[row.key] = { ...sourceLocation };
                        }
                        field.handleChange(next);
                      };

                      const getLocation = (key: string) =>
                        locationBySize[key] ?? { ...DEFAULT_LOCATION };

                      const setLocation = (
                        key: string,
                        locKey: keyof LocationEntry,
                        value: string
                      ) => {
                        const prev = getLocation(key);
                        field.handleChange({
                          ...locationBySize,
                          [key]: { ...prev, [locKey]: value },
                        });
                      };

                      return (
                        <Card className="overflow-hidden">
                          <CardHeader className="space-y-1.5 pb-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1.5">
                                <CardTitle className="font-custom text-foreground text-xl font-semibold">
                                  Enter Address (CH FL R)
                                </CardTitle>
                                <CardDescription className="font-custom text-muted-foreground text-sm">
                                  Assign chamber, floor and row for each size
                                  that has a quantity.
                                </CardDescription>
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  onClick={applyToAllLocations}
                                  disabled={!sourceLocation}
                                  className="font-custom"
                                  aria-label="Apply chamber, floor and row from one size to all sizes"
                                >
                                  Apply to all
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={clearAllLocations}
                                  className="font-custom text-muted-foreground hover:text-foreground"
                                >
                                  Clear All
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {locationRows.map((row, index) => {
                              const loc = getLocation(row.key);
                              const allFilled =
                                Boolean(loc.chamber?.trim()) &&
                                Boolean(loc.floor?.trim()) &&
                                Boolean(loc.row?.trim());
                              const combined = allFilled
                                ? `${loc.chamber.trim()}-${loc.floor.trim()}-${loc.row.trim()}`
                                : null;
                              const anyFilled =
                                !!loc.chamber?.trim() ||
                                !!loc.floor?.trim() ||
                                !!loc.row?.trim();
                              const combinedLabel = combined
                                ? combined
                                : anyFilled
                                  ? 'Enter all fields'
                                  : '-';
                              return (
                                <div key={row.key}>
                                  {index > 0 && <Separator className="mb-6" />}
                                  <div className="space-y-4">
                                    <h3 className="font-custom text-foreground text-base font-semibold">
                                      {row.sizeLabel} – {row.quantity} bags
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                      <Field>
                                        <FieldLabel className="font-custom text-foreground mb-2 block text-base font-semibold">
                                          Chamber
                                        </FieldLabel>
                                        <Input
                                          value={loc.chamber}
                                          onChange={(e) =>
                                            setLocation(
                                              row.key,
                                              'chamber',
                                              e.target.value.toUpperCase()
                                            )
                                          }
                                          placeholder="e.g. A"
                                          className="font-custom"
                                        />
                                      </Field>
                                      <Field>
                                        <FieldLabel className="font-custom text-foreground mb-2 block text-base font-semibold">
                                          Floor
                                        </FieldLabel>
                                        <Input
                                          value={loc.floor}
                                          onChange={(e) =>
                                            setLocation(
                                              row.key,
                                              'floor',
                                              e.target.value.toUpperCase()
                                            )
                                          }
                                          placeholder="e.g. 1"
                                          className="font-custom"
                                        />
                                      </Field>
                                      <Field>
                                        <FieldLabel className="font-custom text-foreground mb-2 block text-base font-semibold">
                                          Row
                                        </FieldLabel>
                                        <Input
                                          value={loc.row}
                                          onChange={(e) =>
                                            setLocation(
                                              row.key,
                                              'row',
                                              e.target.value.toUpperCase()
                                            )
                                          }
                                          placeholder="e.g. R1"
                                          className="font-custom"
                                        />
                                      </Field>
                                    </div>
                                    <div className="border-border/60 bg-muted/30 flex flex-col gap-2 rounded-md border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                                      <span className="font-custom text-muted-foreground text-base font-normal">
                                        Combined Location
                                      </span>
                                      <span
                                        className={`font-custom text-base font-medium sm:text-right ${combined ? 'text-foreground' : 'text-muted-foreground'}`}
                                      >
                                        {combinedLabel}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      );
                    }}
                  </form.Subscribe>
                )}
              />
              <form.Field
                name="remarks"
                children={(field) => (
                  <Field>
                    <FieldLabel className="font-custom mb-2 block text-base font-semibold">
                      Remarks
                    </FieldLabel>
                    <textarea
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="border-input bg-background text-foreground font-custom placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background w-full rounded-md border p-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                      rows={4}
                      placeholder="Optional remarks"
                    />
                  </Field>
                )}
              />
            </>
          )}
        </FieldGroup>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="font-custom"
              >
                Back
              </Button>
            )}
            {step === 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  toast.info('Form reset');
                }}
                className="font-custom"
              >
                Reset
              </Button>
            )}
          </div>
          <form.Subscribe
            selector={(state) => ({
              farmerStorageLinkId: state.values.farmerStorageLinkId,
              variety: state.values.variety,
              sizeQuantities: state.values.sizeQuantities,
            })}
          >
            {({ farmerStorageLinkId, variety, sizeQuantities }) => {
              const totalQty = Object.values(sizeQuantities ?? {}).reduce(
                (s, q) => s + (q ?? 0),
                0
              );
              const canProceedFromStep1 =
                Boolean(farmerStorageLinkId?.trim()) &&
                Boolean(variety?.trim()) &&
                totalQty > 0;
              return (
                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  className="font-custom px-8 font-bold"
                  disabled={step === 2 ? false : !canProceedFromStep1}
                >
                  {step === 1 ? 'Next' : 'Review'}
                </Button>
              );
            }}
          </form.Subscribe>
        </div>
      </form>

      <StorageSummarySheet
        open={summaryOpen}
        onOpenChange={(open) => {
          if (!open) openSheetRef.current = false;
          setSummaryOpen(open);
        }}
        voucherNumberDisplay={voucherNumberDisplay}
        formValues={summaryFormValues}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        onSubmit={() => form.handleSubmit()}
      />
    </main>
  );
});

export default StorageGatePassForm;
