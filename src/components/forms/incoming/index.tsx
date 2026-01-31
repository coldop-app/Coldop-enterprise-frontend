import { memo, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/forms/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import { SummarySheet } from './summary-sheet';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import { useCreateIncomingGatePass } from '@/services/store-admin/incoming-gate-pass/useCreateIncomingGatePass';
import { toast } from 'sonner';
import { formatDate, formatDateToISO } from '@/lib/helpers';

// Common potato varieties
const POTATO_VARIETIES: Option<string>[] = [
  { label: 'Lady Rosetta', value: 'Lady Rosetta' },
  { label: 'Sante', value: 'Sante' },
  { label: 'Frito Lay', value: 'Frito Lay' },
  { label: 'Diamond', value: 'Diamond' },
  { label: 'Kufri Pukhraj', value: 'Kufri Pukhraj' },
  { label: 'Kufri Jyoti', value: 'Kufri Jyoti' },
  { label: 'Kufri Bahar', value: 'Kufri Bahar' },
  { label: 'Other', value: 'Other' },
];

export const IncomingForm = memo(function IncomingForm() {
  const navigate = useNavigate();
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('incoming-gate-pass');
  const {
    data: farmerLinks,
    isLoading: isLoadingFarmers,
    refetch: refetchFarmers,
  } = useGetAllFarmers();
  const { mutate: createIncomingGatePass, isPending } =
    useCreateIncomingGatePass();

  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  // Format voucher number for display
  const voucherNumberDisplay = useMemo(() => {
    if (!voucherNumber) return null;
    return `#${voucherNumber}`;
  }, [voucherNumber]);

  // Use voucher number directly as gatePassNo
  const gatePassNo = voucherNumber ?? 0;

  // Transform farmer links to SearchSelector options
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

  const formSchema = useMemo(
    () =>
      z.object({
        farmerStorageLinkId: z.string().min(1, 'Please select a farmer'),
        date: z.string().min(1, 'Date is required'),
        variety: z.string().min(1, 'Please select a variety'),
        truckNumber: z
          .string()
          .transform((val) => val.trim().toUpperCase())
          .refine((val) => val.length > 0, {
            message: 'Truck number is required',
          }),
        bagsReceived: z
          .number()
          .min(0, 'Bags received must be non-negative')
          .int('Bags received must be a whole number'),
        weightSlip: z.object({
          slipNumber: z.string().trim(),
          grossWeightKg: z.number().min(0, 'Gross weight must be non-negative'),
          tareWeightKg: z.number().min(0, 'Tare weight must be non-negative'),
        }),
        remarks: z
          .string()
          .trim()
          .max(500, 'Remarks must not exceed 500 characters'),
        manualGatePassNumber: z.union([z.number(), z.undefined()]),
      }),
    []
  );

  const form = useForm({
    defaultValues: {
      farmerStorageLinkId: '',
      date: formatDate(new Date()),
      variety: '',
      truckNumber: '',
      bagsReceived: 0,
      weightSlip: { slipNumber: '', grossWeightKg: 0, tareWeightKg: 0 },
      remarks: '',
      manualGatePassNumber: undefined as number | undefined,
    },
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (!gatePassNo) {
        return;
      }

      const payload: Parameters<typeof createIncomingGatePass>[0] = {
        farmerStorageLinkId: value.farmerStorageLinkId,
        gatePassNo,
        date: formatDateToISO(value.date),
        variety: value.variety,
        truckNumber: value.truckNumber,
        bagsReceived: value.bagsReceived,
        status: 'OPEN',
      };
      if (
        value.weightSlip?.slipNumber?.trim() !== undefined &&
        value.weightSlip.slipNumber.trim() !== ''
      ) {
        payload.weightSlip = {
          slipNumber: value.weightSlip.slipNumber.trim(),
          grossWeightKg: value.weightSlip.grossWeightKg,
          tareWeightKg: value.weightSlip.tareWeightKg,
        };
      }
      if (value.remarks?.trim()) payload.remarks = value.remarks.trim();
      if (value.manualGatePassNumber != null)
        payload.manualGatePassNumber = value.manualGatePassNumber;

      createIncomingGatePass(payload, {
        onSuccess: () => {
          form.reset();
          setSelectedFarmerId('');
          setIsSummarySheetOpen(false);
          navigate({ to: '/store-admin/daybook' });
        },
      });
    },
  });

  const handleFarmerSelect = (value: string) => {
    setSelectedFarmerId(value);
    form.setFieldValue('farmerStorageLinkId', value);
  };

  const handleFarmerAdded = () => {
    refetchFarmers();
  };

  // Get selected farmer details for summary
  const selectedFarmer = useMemo(() => {
    if (!selectedFarmerId || !farmerLinks) return null;
    return farmerLinks.find((link) => link._id === selectedFarmerId) ?? null;
  }, [selectedFarmerId, farmerLinks]);

  // Handle Next button click - validate and open summary sheet
  const handleNextClick = () => {
    form.validateAllFields('submit');
    const formState = form.state;
    if (formState.isValid) {
      setIsSummarySheetOpen(true);
    }
  };

  // Handle final submission from summary sheet
  const handleFinalSubmit = () => {
    form.handleSubmit();
  };

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Create Incoming Order
        </h1>

        {/* Voucher Number Badge */}
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

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          {/* Farmer Selection */}
          <form.Field
            name="farmerStorageLinkId"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <FieldLabel
                        htmlFor="farmer-select"
                        className="font-custom mb-2 block text-base font-semibold"
                      >
                        Enter Account Name (search and select)
                      </FieldLabel>
                      <SearchSelector
                        id="farmer-select"
                        options={farmerOptions}
                        placeholder="Search or Create Farmer"
                        searchPlaceholder="Search by name, account number, or mobile..."
                        onSelect={handleFarmerSelect}
                        defaultValue={selectedFarmerId}
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
                      errors={
                        field.state.meta.errors as Array<
                          { message?: string } | undefined
                        >
                      }
                    />
                  )}
                </Field>
              );
            }}
          />

          {/* Variety Selection */}
          <form.Field
            name="variety"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <div className="border-primary/30 bg-primary/5 space-y-2 rounded-lg border p-4">
                    <FieldLabel
                      htmlFor="variety-select"
                      className="font-custom block text-base font-semibold"
                    >
                      Select Variety
                    </FieldLabel>
                    <p className="font-custom text-sm text-[#6f6f6f]">
                      Choose the potato variety for this order
                    </p>
                    <SearchSelector
                      id="variety-select"
                      options={POTATO_VARIETIES}
                      placeholder="Select a variety"
                      searchPlaceholder="Search variety..."
                      onSelect={(value) => field.handleChange(value)}
                      defaultValue={field.state.value}
                      className="w-full"
                      buttonClassName="w-full justify-between"
                    />
                  </div>
                  {isInvalid && (
                    <FieldError
                      errors={
                        field.state.meta.errors as Array<
                          { message?: string } | undefined
                        >
                      }
                    />
                  )}
                </Field>
              );
            }}
          />

          {/* Date Selection */}
          <form.Field
            name="date"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <DatePicker
                    value={field.state.value}
                    onChange={(value) => field.handleChange(value)}
                    label="Date of Submission"
                    id="date-of-submission"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={
                        field.state.meta.errors as Array<
                          { message?: string } | undefined
                        >
                      }
                    />
                  )}
                </Field>
              );
            }}
          />

          {/* Truck Number */}
          <form.Field
            name="truckNumber"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel
                    htmlFor={field.name}
                    className="font-custom text-base font-semibold"
                  >
                    Truck Number
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="Enter truck number"
                    className="font-custom"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={
                        field.state.meta.errors as Array<
                          { message?: string } | undefined
                        >
                      }
                    />
                  )}
                </Field>
              );
            }}
          />

          {/* Bags Received */}
          <form.Field
            name="bagsReceived"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel
                    htmlFor={field.name}
                    className="font-custom text-base font-semibold"
                  >
                    Bags Received
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    min="0"
                    step="1"
                    value={
                      field.state.value === 0 ? '' : (field.state.value ?? '')
                    }
                    onBlur={field.handleBlur}
                    onFocus={(e) => {
                      if (field.state.value === 0) e.target.select();
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '' || raw === '-') {
                        field.handleChange(0);
                        return;
                      }
                      const parsed = parseInt(raw, 10);
                      field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                    }}
                    aria-invalid={isInvalid}
                    placeholder="0"
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  {isInvalid && (
                    <FieldError
                      errors={
                        field.state.meta.errors as Array<
                          { message?: string } | undefined
                        >
                      }
                    />
                  )}
                </Field>
              );
            }}
          />

          {/* Weight Slip */}
          <div className="border-primary/30 bg-primary/5 space-y-3 rounded-lg border p-4">
            <p className="font-custom text-base font-semibold">Weight Slip</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <form.Field
                name="weightSlip.slipNumber"
                children={(field) => (
                  <Field>
                    <FieldLabel
                      htmlFor="weight-slip-number"
                      className="font-custom text-sm font-medium"
                    >
                      Slip Number
                    </FieldLabel>
                    <Input
                      id="weight-slip-number"
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Enter slip number"
                      className="font-custom"
                    />
                  </Field>
                )}
              />
              <form.Field
                name="weightSlip.grossWeightKg"
                children={(field) => (
                  <Field>
                    <FieldLabel
                      htmlFor="weight-gross"
                      className="font-custom text-sm font-medium"
                    >
                      Gross (kg)
                    </FieldLabel>
                    <Input
                      id="weight-gross"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        field.state.value === undefined ||
                        field.state.value === null ||
                        field.state.value === 0
                          ? ''
                          : field.state.value
                      }
                      onBlur={field.handleBlur}
                      onFocus={(e) => {
                        if (field.state.value === 0) e.target.select();
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '' || raw === '-') {
                          field.handleChange(0);
                          return;
                        }
                        const parsed = parseFloat(raw);
                        field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                      }}
                      placeholder="0"
                      className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </Field>
                )}
              />
              <form.Field
                name="weightSlip.tareWeightKg"
                children={(field) => (
                  <Field>
                    <FieldLabel
                      htmlFor="weight-tare"
                      className="font-custom text-sm font-medium"
                    >
                      Tare (kg)
                    </FieldLabel>
                    <Input
                      id="weight-tare"
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        field.state.value === undefined ||
                        field.state.value === null ||
                        field.state.value === 0
                          ? ''
                          : field.state.value
                      }
                      onBlur={field.handleBlur}
                      onFocus={(e) => {
                        if (field.state.value === 0) e.target.select();
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '' || raw === '-') {
                          field.handleChange(0);
                          return;
                        }
                        const parsed = parseFloat(raw);
                        field.handleChange(Number.isNaN(parsed) ? 0 : parsed);
                      }}
                      placeholder="0"
                      className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </Field>
                )}
              />
            </div>
          </div>

          {/* Manual Gate Pass Number */}
          <form.Field
            name="manualGatePassNumber"
            children={(field) => (
              <Field>
                <FieldLabel
                  htmlFor="manualGatePassNumber"
                  className="font-custom text-base font-semibold"
                >
                  Manual Gate Pass Number
                </FieldLabel>
                <Input
                  id="manualGatePassNumber"
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
                  placeholder="Optional"
                  className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </Field>
            )}
          />

          {/* Remarks */}
          <form.Field
            name="remarks"
            children={(field) => (
              <Field>
                <FieldLabel
                  htmlFor="remarks"
                  className="font-custom text-base font-semibold"
                >
                  Remarks
                </FieldLabel>
                <textarea
                  id="remarks"
                  name={field.name}
                  value={field.state.value ?? ''}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Max 500 characters"
                  maxLength={500}
                  rows={3}
                  className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </Field>
            )}
          />
        </FieldGroup>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="font-custom"
            onClick={() => {
              form.reset();
              setSelectedFarmerId('');
              toast.info('Form reset');
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            disabled={isPending || isLoadingVoucher || !gatePassNo}
            onClick={handleNextClick}
          >
            Next
          </Button>
        </div>
      </form>

      {/* Summary Sheet */}
      <SummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        selectedFarmer={selectedFarmer}
        formValues={{
          date: form.state.values.date,
          variety: form.state.values.variety,
          truckNumber: form.state.values.truckNumber,
          bagsReceived: form.state.values.bagsReceived,
          weightSlip: form.state.values.weightSlip,
          remarks: form.state.values.remarks,
          manualGatePassNumber: form.state.values.manualGatePassNumber,
        }}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        onSubmit={handleFinalSubmit}
      />
    </main>
  );
});

export default IncomingForm;
