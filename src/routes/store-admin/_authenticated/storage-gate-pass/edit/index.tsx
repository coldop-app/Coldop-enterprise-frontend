/* eslint-disable react-refresh/only-export-components */
import {
  createFileRoute,
  useLocation,
  useNavigate,
} from '@tanstack/react-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Plus, Trash2 } from 'lucide-react';
import * as z from 'zod';
import { toast } from 'sonner';

import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { DatePicker } from '@/components/date-picker';
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
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { BAG_TYPES, GRADING_SIZES, POTATO_VARIETIES } from '@/lib/constants';
import { formatDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/general/useGetVoucherNumber';
import { useEditStorageGatePass } from '@/services/store-admin/storage-gate-pass/useEditStorageGatePass';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import { useStore } from '@/stores/store';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import {
  StorageSummarySheet,
  type StorageSummaryFormValues,
} from './-SummarySheet';

const DEFAULT_LOCATION = { chamber: '', floor: '', row: '' };
type LocationEntry = { chamber: string; floor: string; row: string };
type FieldErrors = Array<{ message?: string } | undefined>;

const DIRECT_PASS_ID = '_direct';
const EXTRA_ROW_KEY_PREFIX = 'extra:';

const FIXED_FARMER_COLD_STORAGE_ID = '69807e772cfeef6ed3342e78';
const FIXED_FARMER_STORAGE_LINK_ID = '69a3da68ea67b19be4c0e86c';

type StorageGatePassFormProps = {
  farmerStorageLinkId?: string;
  locationState?: StorageGatePassEditLocationState;
};

type StorageGatePassEditLocationState = {
  storageGatePass?: StorageGatePassWithLink;
};

type ExtraQuantityRow = {
  id: string;
  size: string;
  quantity: number;
  bagType: string;
};

const defaultSizeQuantities = Object.fromEntries(
  GRADING_SIZES.map((size) => [size, 0])
) as Record<string, number>;

const defaultSizeBagTypes = Object.fromEntries(
  GRADING_SIZES.map((size) => [size, 'JUTE'])
) as Record<string, string>;

const formSchema = z
  .object({
    isMarkedAsNull: z.boolean().default(false),
    manualGatePassNumber: z.union([z.number(), z.undefined()]),
    farmerStorageLinkId: z.string().min(1, 'Please select a farmer'),
    date: z.string().min(1, 'Date is required'),
    variety: z.string().min(1, 'Please select a variety'),
    sizeQuantities: z.record(z.string(), z.number().min(0)),
    sizeBagTypes: z.record(z.string(), z.string()),
    extraQuantityRows: z.array(
      z.object({
        id: z.string(),
        size: z.string(),
        quantity: z.number().min(0),
        bagType: z.string(),
      })
    ),
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
      const fixedWithQty = Object.entries(data.sizeQuantities).filter(
        ([, qty]) => (qty ?? 0) > 0
      );
      const fixedOk = fixedWithQty.every(([size]) => {
        const loc = data.locationBySize?.[size];
        return (
          loc &&
          loc.chamber?.trim() !== '' &&
          loc.floor?.trim() !== '' &&
          loc.row?.trim() !== ''
        );
      });
      if (!fixedOk) return false;

      const extraWithQty = (data.extraQuantityRows ?? []).filter(
        (row) => (row.quantity ?? 0) > 0
      );
      return extraWithQty.every((row) => {
        const key = `${EXTRA_ROW_KEY_PREFIX}${row.id}`;
        const loc = data.locationBySize?.[key];
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
      const fixedTotal = Object.values(data.sizeQuantities).reduce(
        (sum, qty) => sum + (qty ?? 0),
        0
      );
      const extraTotal = (data.extraQuantityRows ?? []).reduce(
        (sum, row) => sum + (row.quantity ?? 0),
        0
      );
      return data.isMarkedAsNull || fixedTotal + extraTotal > 0;
    },
    {
      message: 'Please enter at least one quantity.',
      path: ['sizeQuantities'],
    }
  );

function toDisplayDate(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function toIsoDateFromDisplay(value: string): string {
  const trimmed = value.trim();
  const [ddRaw, mmRaw, yyyyRaw] = trimmed.split('.');
  const dd = Number(ddRaw);
  const mm = Number(mmRaw);
  const yyyy = Number(yyyyRaw);

  if (
    !Number.isInteger(dd) ||
    !Number.isInteger(mm) ||
    !Number.isInteger(yyyy) ||
    dd < 1 ||
    dd > 31 ||
    mm < 1 ||
    mm > 12 ||
    yyyy < 1000
  ) {
    return new Date().toISOString();
  }

  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

const StorageGatePassEditForm = memo(function StorageGatePassEditForm({
  farmerStorageLinkId: initialFarmerStorageLinkId,
  locationState,
}: StorageGatePassFormProps) {
  const navigate = useNavigate();
  const { mutate: editStorageGatePass, isPending } = useEditStorageGatePass();
  const coldStorageId = useStore(
    (s) => s.coldStorage?._id ?? s.admin?.coldStorageId
  );
  const isFixedFarmerMode = coldStorageId === FIXED_FARMER_COLD_STORAGE_ID;

  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('storage-gate-pass');
  const {
    data: farmerLinks,
    isLoading: isLoadingFarmers,
    refetch: refetchFarmers,
  } = useGetAllFarmers();

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
  const [isMarkedAsNull, setIsMarkedAsNull] = useState(false);
  const openSheetRef = useRef(false);
  const remarksRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldFocusRemarksOnStepTwoRef = useRef(false);
  const editGatePass = locationState?.storageGatePass;

  const initialFormValues = useMemo(() => {
    const bagSizes = editGatePass?.bagSizes ?? [];
    const sizeQuantities = { ...defaultSizeQuantities };
    const sizeBagTypes = { ...defaultSizeBagTypes };
    const locationBySize: Record<string, LocationEntry> = {};
    const extraRows: ExtraQuantityRow[] = [];

    for (const bag of bagSizes) {
      const size = bag.size?.trim() || '';
      if (!size) continue;

      if (size in sizeQuantities) {
        sizeQuantities[size] =
          (sizeQuantities[size] ?? 0) + (bag.currentQuantity ?? 0);
        sizeBagTypes[size] = bag.bagType || 'JUTE';
        locationBySize[size] = {
          chamber: bag.chamber ?? '',
          floor: bag.floor ?? '',
          row: bag.row ?? '',
        };
      } else {
        const id = crypto.randomUUID();
        extraRows.push({
          id,
          size,
          quantity: bag.currentQuantity ?? 0,
          bagType: bag.bagType || 'JUTE',
        });
        locationBySize[`${EXTRA_ROW_KEY_PREFIX}${id}`] = {
          chamber: bag.chamber ?? '',
          floor: bag.floor ?? '',
          row: bag.row ?? '',
        };
      }
    }

    return {
      isMarkedAsNull: false,
      manualGatePassNumber: editGatePass?.manualGatePassNumber as
        | number
        | undefined,
      farmerStorageLinkId: isFixedFarmerMode
        ? FIXED_FARMER_STORAGE_LINK_ID
        : (initialFarmerStorageLinkId ??
          editGatePass?.farmerStorageLinkId?._id ??
          ''),
      date: toDisplayDate(editGatePass?.date) || formatDate(new Date()),
      variety: editGatePass?.variety ?? '',
      sizeQuantities,
      sizeBagTypes,
      extraQuantityRows: extraRows,
      locationBySize,
      remarks: editGatePass?.remarks ?? '',
    };
  }, [editGatePass, initialFarmerStorageLinkId, isFixedFarmerMode]);

  const form = useForm({
    defaultValues: initialFormValues,
    validators: {
      onSubmit: formSchema as never,
    },
    onSubmit: async ({ value }) => {
      if (!openSheetRef.current) {
        openSheetRef.current = true;
        setSummaryOpen(true);
        return;
      }

      if (!editGatePass?._id) {
        toast.error(
          'Missing storage gate pass id. Please open edit from Daybook.'
        );
        return;
      }

      const fixedBagSizes = (
        Object.entries(value.sizeQuantities ?? {}) as [string, number][]
      )
        .filter(([, qty]) => (qty ?? 0) > 0)
        .map(([size, qty]) => {
          const location = value.locationBySize?.[size] ?? DEFAULT_LOCATION;
          return {
            size,
            bagType: value.sizeBagTypes?.[size] || 'JUTE',
            currentQuantity: qty ?? 0,
            initialQuantity: qty ?? 0,
            chamber: location.chamber,
            floor: location.floor,
            row: location.row,
          };
        });

      const extraBagSizes = (value.extraQuantityRows ?? [])
        .filter((row) => (row.quantity ?? 0) > 0)
        .map((row) => {
          const key = `${EXTRA_ROW_KEY_PREFIX}${row.id}`;
          const location = value.locationBySize?.[key] ?? DEFAULT_LOCATION;
          return {
            size: row.size,
            bagType: row.bagType || 'JUTE',
            currentQuantity: row.quantity ?? 0,
            initialQuantity: row.quantity ?? 0,
            chamber: location.chamber,
            floor: location.floor,
            row: location.row,
          };
        });

      const payload = {
        id: editGatePass._id,
        gatePassNo: gatePassNo || undefined,
        manualGatePassNumber: value.manualGatePassNumber,
        date: toIsoDateFromDisplay(value.date),
        variety: value.variety || undefined,
        bagSizes: [...fixedBagSizes, ...extraBagSizes],
        remarks: value.remarks?.trim() || undefined,
        isMarkedAsNull: value.isMarkedAsNull || undefined,
      };

      editStorageGatePass(payload, {
        onSuccess: (data) => {
          if (!data.success) return;
          setSummaryOpen(false);
          navigate({ to: '/store-admin/daybook' });
        },
      });

      openSheetRef.current = false;
    },
  });

  useEffect(() => {
    if (isFixedFarmerMode) {
      form.setFieldValue('farmerStorageLinkId', FIXED_FARMER_STORAGE_LINK_ID);
    }
  }, [isFixedFarmerMode, form]);

  useEffect(() => {
    console.log(
      'Storage gate pass edit form values changed',
      form.state.values
    );
  }, [form.state.values]);

  const voucherNumberDisplay =
    voucherNumber != null ? `#${voucherNumber}` : null;
  const gatePassNo = voucherNumber ?? 0;

  const formValues = form.state.values;
  const summaryFormValues: StorageSummaryFormValues = useMemo(() => {
    const fixedAllocations = (
      Object.entries(formValues.sizeQuantities ?? {}) as [string, number][]
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

    const extraAllocations = (formValues.extraQuantityRows ?? [])
      .filter((row) => (row.quantity ?? 0) > 0)
      .map((row) => {
        const key = `${EXTRA_ROW_KEY_PREFIX}${row.id}`;
        const loc = formValues.locationBySize?.[key] ?? { ...DEFAULT_LOCATION };
        return {
          size: row.size,
          quantityToAllocate: row.quantity ?? 0,
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
              allocations: [...fixedAllocations, ...extraAllocations],
            },
          ],
        },
      ],
    };
  }, [
    formValues.sizeQuantities,
    formValues.extraQuantityRows,
    formValues.locationBySize,
    formValues.date,
    formValues.variety,
    formValues.remarks,
    voucherNumber,
  ]);

  const handleNextOrReview = () => {
    const values = form.state.values;
    if (step === 1) {
      if (!values.farmerStorageLinkId?.trim()) {
        toast.error('Please select a farmer.');
        return;
      }
      if (!values.variety?.trim()) {
        toast.error('Please select a variety.');
        return;
      }
      const fixedTotal = Object.values(values.sizeQuantities ?? {}).reduce(
        (s, q) => s + (q ?? 0),
        0
      );
      const extraTotal = (values.extraQuantityRows ?? []).reduce(
        (s, row) => s + (row.quantity ?? 0),
        0
      );
      if (!isMarkedAsNull && fixedTotal + extraTotal === 0) {
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

  const handleMarkAsNull = () => {
    setIsMarkedAsNull(true);

    const currentValues = form.state.values;
    const currentSizeQuantities = currentValues.sizeQuantities ?? {};
    const currentExtraRows = currentValues.extraQuantityRows ?? [];
    const currentLocations = currentValues.locationBySize ?? {};

    const nextSizeQuantities = Object.fromEntries(
      Object.keys(currentSizeQuantities).map((size) => [size, 0])
    ) as Record<string, number>;

    const nextExtraRows = currentExtraRows.map((row) => ({
      ...row,
      quantity: 0,
    }));

    const nextLocations = Object.fromEntries(
      Object.keys(currentLocations).map((key) => [key, { ...DEFAULT_LOCATION }])
    ) as Record<string, LocationEntry>;

    form.setFieldValue('sizeQuantities', nextSizeQuantities);
    form.setFieldValue('extraQuantityRows' as never, nextExtraRows as never);
    form.setFieldValue('locationBySize', nextLocations);
    form.setFieldValue('isMarkedAsNull', true);
    shouldFocusRemarksOnStepTwoRef.current = true;
  };

  useEffect(() => {
    if (step !== 2 || !shouldFocusRemarksOnStepTwoRef.current) return;

    requestAnimationFrame(() => {
      remarksRef.current?.focus();
      shouldFocusRemarksOnStepTwoRef.current = false;
    });
  }, [step]);

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-foreground text-3xl font-bold sm:text-4xl">
          Edit Storage Gate Pass
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
        <Button
          type="button"
          variant="destructive"
          className="font-custom block w-fit"
          onClick={handleMarkAsNull}
          disabled={isMarkedAsNull}
        >
          {isMarkedAsNull ? 'Marked as Null' : 'Mark as Null'}
        </Button>
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
                    </FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = parseInt(raw, 10);
                        field.handleChange(
                          raw === '' || Number.isNaN(parsed)
                            ? undefined
                            : parsed
                        );
                      }}
                      placeholder="e.g. 101"
                      onWheel={blurTargetOnNumberWheel}
                      onKeyDown={preventArrowUpDownOnNumericInput}
                      className={cn(
                        'font-custom',
                        businessNumberSpinnerClassName
                      )}
                    />
                  </Field>
                )}
              />

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
                  const displayValue = isFixedFarmerMode
                    ? FIXED_FARMER_STORAGE_LINK_ID
                    : field.state.value;

                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <FieldLabel
                            htmlFor="storage-edit-farmer-select"
                            className="font-custom mb-2 block text-base font-semibold"
                          >
                            Enter Account Name (search and select)
                          </FieldLabel>
                          <SearchSelector
                            id="storage-edit-farmer-select"
                            options={farmerOptions}
                            placeholder="Search or Create Farmer"
                            searchPlaceholder="Search by name, account number, or mobile..."
                            onSelect={(value) =>
                              !isFixedFarmerMode && field.handleChange(value)
                            }
                            value={displayValue}
                            loading={isLoadingFarmers}
                            loadingMessage="Loading farmers..."
                            emptyMessage="No farmers found"
                            className="w-full"
                            buttonClassName="w-full justify-between"
                            disabled={isFixedFarmerMode}
                          />
                        </div>
                        {!isFixedFarmerMode && (
                          <AddFarmerModal
                            links={farmerLinks ?? []}
                            onFarmerAdded={refetchFarmers}
                          />
                        )}
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
                      id="storage-edit-date"
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
                      extraQuantityRows: state.values.extraQuantityRows ?? [],
                    })}
                  >
                    {({ variety, sizeBagTypes, extraQuantityRows }) => {
                      const sizeQuantities =
                        field.state.value ?? defaultSizeQuantities;
                      const quantitiesDisabled = !variety?.trim();
                      const fixedTotal = GRADING_SIZES.reduce(
                        (sum, size) => sum + (sizeQuantities[size] ?? 0),
                        0
                      );
                      const extraTotal = extraQuantityRows.reduce(
                        (sum, row) => sum + (row.quantity ?? 0),
                        0
                      );
                      const totalQty = fixedTotal + extraTotal;

                      const addExtraRow = () => {
                        const next: ExtraQuantityRow[] = [
                          ...extraQuantityRows,
                          {
                            id: crypto.randomUUID(),
                            size: GRADING_SIZES[0] ?? '',
                            quantity: 0,
                            bagType: 'JUTE',
                          },
                        ];
                        form.setFieldValue(
                          'extraQuantityRows' as never,
                          next as never
                        );
                      };

                      const updateExtraRow = (
                        id: string,
                        updates: Partial<ExtraQuantityRow>
                      ) => {
                        const next = extraQuantityRows.map((row) =>
                          row.id === id ? { ...row, ...updates } : row
                        );
                        form.setFieldValue(
                          'extraQuantityRows' as never,
                          next as never
                        );
                      };

                      const removeExtraRow = (id: string) => {
                        const next = extraQuantityRows.filter(
                          (row) => row.id !== id
                        );
                        form.setFieldValue(
                          'extraQuantityRows' as never,
                          next as never
                        );
                      };

                      return (
                        <Card className="overflow-hidden">
                          <CardHeader className="space-y-1.5 pb-4">
                            <CardTitle className="font-custom text-foreground text-xl font-semibold">
                              Enter Quantities
                            </CardTitle>
                            <CardDescription className="font-custom text-muted-foreground text-sm">
                              Quantity, bag type, and optional extra rows per
                              size.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {GRADING_SIZES.map((size) => {
                              const value = sizeQuantities[size] ?? 0;
                              const bagType = sizeBagTypes[size] ?? 'JUTE';
                              return (
                                <div
                                  key={size}
                                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                                >
                                  <label className="font-custom text-base">
                                    {size}
                                  </label>
                                  <div className="flex w-full gap-2 sm:w-auto sm:min-w-[200px]">
                                    <Input
                                      type="number"
                                      min={0}
                                      placeholder="Qty"
                                      disabled={quantitiesDisabled}
                                      value={value === 0 ? '' : String(value)}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        const num =
                                          raw === ''
                                            ? 0
                                            : Math.max(
                                                0,
                                                parseInt(raw, 10) || 0
                                              );
                                        field.handleChange({
                                          ...(field.state.value ??
                                            defaultSizeQuantities),
                                          [size]: num,
                                        });
                                      }}
                                      onWheel={blurTargetOnNumberWheel}
                                      onKeyDown={
                                        preventArrowUpDownOnNumericInput
                                      }
                                      className={cn(
                                        'font-custom w-full sm:w-24',
                                        businessNumberSpinnerClassName
                                      )}
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

                            {extraQuantityRows.map((row) => (
                              <div
                                key={row.id}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-row">
                                  <select
                                    aria-label="Select size"
                                    disabled={quantitiesDisabled}
                                    value={row.size}
                                    onChange={(e) =>
                                      updateExtraRow(row.id, {
                                        size: e.target.value,
                                      })
                                    }
                                    className="border-input bg-background text-foreground font-custom focus-visible:ring-primary h-9 flex-1 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32"
                                  >
                                    {GRADING_SIZES.map((s) => (
                                      <option key={s} value={s}>
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    aria-label={`Bag type for ${row.size}`}
                                    disabled={quantitiesDisabled}
                                    value={row.bagType ?? 'JUTE'}
                                    onChange={(e) =>
                                      updateExtraRow(row.id, {
                                        bagType: e.target.value,
                                      })
                                    }
                                    className="border-input bg-background focus-visible:ring-primary font-custom h-9 w-24 shrink-0 rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {BAG_TYPES.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => removeExtraRow(row.id)}
                                    aria-label="Remove extra row"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="Qty"
                                  disabled={quantitiesDisabled}
                                  value={
                                    row.quantity === 0
                                      ? ''
                                      : String(row.quantity)
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const num =
                                      raw === ''
                                        ? 0
                                        : Math.max(0, parseInt(raw, 10) || 0);
                                    updateExtraRow(row.id, { quantity: num });
                                  }}
                                  onWheel={blurTargetOnNumberWheel}
                                  onKeyDown={preventArrowUpDownOnNumericInput}
                                  className={cn(
                                    'font-custom w-full sm:w-24 sm:text-right',
                                    businessNumberSpinnerClassName
                                  )}
                                />
                              </div>
                            ))}

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addExtraRow}
                              disabled={quantitiesDisabled}
                              className="font-custom w-full sm:w-auto"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Size
                            </Button>
                            <Separator className="my-4" />
                            <div className="flex items-center justify-between">
                              <span className="font-custom text-base">
                                Total
                              </span>
                              <span className="font-custom text-base font-medium">
                                {totalQty}
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
                      extraQuantityRows: state.values.extraQuantityRows ?? [],
                    })}
                  >
                    {({ sizeQuantities, extraQuantityRows }) => {
                      const fixedWithQty = GRADING_SIZES.filter(
                        (size) => (sizeQuantities[size] ?? 0) > 0
                      ).map((size) => ({
                        key: size,
                        sizeLabel: size,
                        quantity: sizeQuantities[size] ?? 0,
                      }));
                      const extraWithQty = (extraQuantityRows ?? [])
                        .filter((row) => (row.quantity ?? 0) > 0)
                        .map((row) => ({
                          key: `${EXTRA_ROW_KEY_PREFIX}${row.id}`,
                          sizeLabel: row.size,
                          quantity: row.quantity ?? 0,
                        }));
                      const locationBySize = field.state.value ?? {};
                      const rows = [...fixedWithQty, ...extraWithQty];

                      const getLocation = (key: string) =>
                        locationBySize[key] ?? { ...DEFAULT_LOCATION };

                      const setLocation = (
                        key: string,
                        locKey: keyof LocationEntry,
                        value: string
                      ) => {
                        field.handleChange({
                          ...locationBySize,
                          [key]: { ...getLocation(key), [locKey]: value },
                        });
                      };

                      return (
                        <Card className="overflow-hidden">
                          <CardHeader className="space-y-1.5 pb-4">
                            <CardTitle className="font-custom text-foreground text-xl font-semibold">
                              Enter Address (CH FL R)
                            </CardTitle>
                            <CardDescription className="font-custom text-muted-foreground text-sm">
                              Fill chamber, floor and row for each size with
                              quantity.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {rows.map((row, index) => {
                              const loc = getLocation(row.key);
                              return (
                                <div key={row.key}>
                                  {index > 0 && <Separator className="mb-6" />}
                                  <div className="space-y-4">
                                    <h3 className="font-custom text-base font-semibold">
                                      {row.sizeLabel} - {row.quantity} bags
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                      <Field>
                                        <FieldLabel className="font-custom mb-2 block text-base font-semibold">
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
                                        <FieldLabel className="font-custom mb-2 block text-base font-semibold">
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
                                        <FieldLabel className="font-custom mb-2 block text-base font-semibold">
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
                      ref={remarksRef}
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
                  setIsMarkedAsNull(false);
                  toast.info('Form reset');
                }}
                className="font-custom"
              >
                Reset
              </Button>
            )}
          </div>
          <form.Subscribe
            selector={(state) => {
              const sq = state.values.sizeQuantities ?? {};
              const eq = state.values.extraQuantityRows ?? [];
              const fixedQty = Object.values(sq).reduce(
                (s, q) => s + (q ?? 0),
                0
              );
              const extraQty = eq.reduce(
                (s, row) => s + (row.quantity ?? 0),
                0
              );
              return {
                farmerStorageLinkId: state.values.farmerStorageLinkId,
                variety: state.values.variety,
                totalQty: fixedQty + extraQty,
              };
            }}
          >
            {({ farmerStorageLinkId, variety, totalQty }) => {
              const canProceedFromStep1 =
                Boolean(farmerStorageLinkId?.trim()) &&
                Boolean(variety?.trim()) &&
                (totalQty > 0 || isMarkedAsNull);
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

export const Route = createFileRoute(
  '/store-admin/_authenticated/storage-gate-pass/edit/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation({
    select: (state) => state.state as StorageGatePassEditLocationState,
  });

  const initialFarmerStorageLinkId =
    location?.storageGatePass?.farmerStorageLinkId?._id;

  return (
    <StorageGatePassEditForm
      farmerStorageLinkId={initialFarmerStorageLinkId}
      locationState={location}
    />
  );
}
