import { useEffect, useMemo, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useNavigate, useParams } from '@tanstack/react-router';
import * as z from 'zod';
import { DatePicker } from '@/components/forms/date-picker';
import { POTATO_VARIETIES } from '@/components/forms/grading/constants';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatDateToISO } from '@/lib/helpers';
import { useGetAllFarmers } from '@/services/store-admin/functions/useGetAllFarmers';
import { useEditIncomingGatePass } from '@/services/store-admin/incoming-gate-pass/useEditIncomingGatePass';
import { useGetSingleIncomingGatePassById } from '@/services/store-admin/incoming-gate-pass/useGetSingleIncomingGatePassById';
import { useStore } from '@/stores/store';

const DEFAULT_INCOMING_LOCATIONS: Option<string>[] = [
  { label: 'Jindal Ice And Cold Store', value: 'Jindal Ice And Cold Store' },
  { label: 'Goyal Tarai Seed Shed', value: 'Goyal Tarai Seed Shed' },
];

const SICM_SIJS_COLD_STORAGE_ID = '69a9621f51f79389305a0f53';
const SICM_SIJS_LOCATIONS: Option<string>[] = [
  { label: 'SRCS', value: 'SRCS' },
  { label: 'SRS', value: 'SRS' },
];

const SingleIncomingGatePassScreen = () => {
  const reasonTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const navigate = useNavigate();
  const { id } = useParams({ strict: false });
  const incomingGatePassId = id ?? '';
  const { data, isLoading, isError, error } =
    useGetSingleIncomingGatePassById(incomingGatePassId);
  const { mutate: editIncomingGatePass, isPending } = useEditIncomingGatePass();
  const { data: farmerLinks, isLoading: isLoadingFarmers } = useGetAllFarmers();
  const coldStorageId = useStore(
    (s) => s.coldStorage?._id ?? s.admin?.coldStorageId
  );

  const locationOptions = useMemo(
    () =>
      coldStorageId === SICM_SIJS_COLD_STORAGE_ID
        ? SICM_SIJS_LOCATIONS
        : DEFAULT_INCOMING_LOCATIONS,
    [coldStorageId]
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

  const editFormSchema = z.object({
    farmerStorageLinkId: z.string().min(1, 'Please select a farmer'),
    date: z.string().min(1, 'Date is required'),
    variety: z.string().min(1, 'Please select a variety'),
    location: z.string().min(1, 'Please select a location'),
    truckNumber: z.string().trim().min(1, 'Truck number is required'),
    bagsReceived: z.number().min(0, 'Bags received must be non-negative'),
    manualGatePassNumber: z.union([z.number().min(0), z.undefined()]),
    weightSlip: z.object({
      slipNumber: z.string(),
      grossWeightKg: z.number().min(0, 'Gross weight must be non-negative'),
      tareWeightKg: z.number().min(0, 'Tare weight must be non-negative'),
    }),
    reason: z
      .string()
      .trim()
      .min(1, 'Reason is required')
      .max(500, 'Reason must not exceed 500 characters'),
  });

  const form = useForm({
    defaultValues: {
      farmerStorageLinkId: '',
      date: '',
      variety: '',
      location: '',
      truckNumber: '',
      bagsReceived: 0,
      manualGatePassNumber: undefined as number | undefined,
      weightSlip: {
        slipNumber: '',
        grossWeightKg: 0,
        tareWeightKg: 0,
      },
      reason: '',
    },
    validators: {
      onSubmit: editFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!incomingGatePassId) return;
      const trimmedReason = value.reason.trim();
      editIncomingGatePass(
        {
          id: incomingGatePassId,
          farmerStorageLinkId: value.farmerStorageLinkId,
          gatePassNo: data?.gatePassNo,
          manualGatePassNumber: value.manualGatePassNumber,
          // Date picker stores dd.mm.yyyy, so convert with helper before API call.
          date: value.date ? formatDateToISO(value.date) : undefined,
          variety: value.variety,
          location: value.location,
          truckNumber: value.truckNumber,
          bagsReceived: value.bagsReceived,
          weightSlip: value.weightSlip,
          status:
            (data?.status as 'OPEN' | 'CLOSED' | 'GRADED' | undefined) ??
            'OPEN',
          remarks: trimmedReason,
          reason: trimmedReason,
        },
        {
          onSuccess: (response) => {
            if (response.success) {
              navigate({ to: '/store-admin/daybook' });
            }
          },
        }
      );
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      farmerStorageLinkId: data.farmerStorageLinkId?._id ?? '',
      date: data.date ? formatDate(new Date(data.date)) : '',
      variety: data.variety ?? '',
      location: data.location ?? '',
      truckNumber: data.truckNumber ?? '',
      bagsReceived: data.bagsReceived ?? 0,
      manualGatePassNumber: data.manualGatePassNumber,
      weightSlip: {
        // Keep the existing slip number unchanged since this screen does not edit it.
        slipNumber: data.weightSlip?.slipNumber ?? '',
        grossWeightKg: data.weightSlip?.grossWeightKg ?? 0,
        tareWeightKg: data.weightSlip?.tareWeightKg ?? 0,
      },
      reason: '',
    });
  }, [data, form]);

  if (!incomingGatePassId) {
    return <div className="font-custom">Incoming gate pass id is missing.</div>;
  }

  if (isLoading) {
    return (
      <div className="font-custom flex items-center gap-2">
        <Spinner className="size-4" />
        Loading incoming gate pass...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="font-custom text-destructive text-sm">
        {error instanceof Error
          ? error.message
          : 'Failed to load incoming gate pass.'}
      </div>
    );
  }

  return (
    <main className="font-custom mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-12">
      <div className="mb-8 space-y-4">
        <h1 className="font-custom text-3xl font-bold text-[#333] sm:text-4xl dark:text-white">
          Edit Incoming Order
        </h1>
        <div className="bg-primary/20 inline-block rounded-full px-4 py-1.5">
          <span className="font-custom text-primary text-sm font-medium">
            VOUCHER NO: #{data?.gatePassNo ?? '-'}
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
        <div className="flex justify-start">
          <Button
            type="button"
            variant="destructive"
            className="font-custom"
            onClick={() => {
              form.setFieldValue('bagsReceived', 0);
              form.setFieldValue('weightSlip.grossWeightKg', 0);
              form.setFieldValue('weightSlip.tareWeightKg', 0);
              requestAnimationFrame(() => {
                reasonTextareaRef.current?.focus();
              });
            }}
            disabled={isPending}
          >
            Mark as null
          </Button>
        </div>

        <FieldGroup className="space-y-6">
          <form.Field
            name="farmerStorageLinkId"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap?.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
              return (
                <Field data-invalid={isInvalid}>
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
                    onSelect={(value) => field.handleChange(value)}
                    value={field.state.value}
                    loading={isLoadingFarmers}
                    loadingMessage="Loading farmers..."
                    emptyMessage="No farmers found"
                    className="w-full"
                    buttonClassName="w-full justify-between"
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

          <form.Field
            name="variety"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap?.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
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
                      value={field.state.value}
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

          <form.Field
            name="location"
            children={(field) => {
              const hasSubmitError = Boolean(
                field.state.meta.errorMap?.onSubmit
              );
              const invalidFromValidation =
                hasSubmitError ||
                (field.state.meta.isTouched && !field.state.meta.isValid);
              const isInvalid = invalidFromValidation && !field.state.value;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel
                    htmlFor="location-select"
                    className="font-custom text-base font-semibold"
                  >
                    Location
                  </FieldLabel>
                  <SearchSelector
                    id="location-select"
                    options={locationOptions}
                    placeholder="Select location"
                    searchPlaceholder="Search location..."
                    onSelect={(value) => field.handleChange(value)}
                    value={field.state.value}
                    className="w-full"
                    buttonClassName="w-full justify-between"
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
                  className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </Field>
            )}
          />

          <div className="border-primary/30 bg-primary/5 space-y-3 rounded-lg border p-4">
            <p className="font-custom text-base font-semibold">Weight Slip</p>
            <div className="grid gap-3 sm:grid-cols-2">
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
            <form.Subscribe
              selector={(state) => ({
                gross: state.values.weightSlip?.grossWeightKg ?? 0,
                tare: state.values.weightSlip?.tareWeightKg ?? 0,
              })}
            >
              {({ gross, tare }) => {
                const net = Math.max(0, gross - tare);
                return (
                  <p className="text-muted-foreground font-custom text-sm">
                    <span className="text-foreground font-medium">
                      Net (kg):
                    </span>{' '}
                    {net.toFixed(2)}
                  </p>
                );
              }}
            </form.Subscribe>
          </div>

          <form.Field
            name="reason"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel
                    htmlFor="reason"
                    className="font-custom text-base font-semibold"
                  >
                    Reason for Update
                  </FieldLabel>
                  <textarea
                    id="reason"
                    name={field.name}
                    ref={reasonTextareaRef}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Describe why this incoming order is being edited"
                    maxLength={500}
                    rows={3}
                    className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
        </FieldGroup>

        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            className="font-custom"
            onClick={() => navigate({ to: '/store-admin/daybook' })}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="font-custom px-8 font-bold"
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </main>
  );
};

export default SingleIncomingGatePassScreen;
