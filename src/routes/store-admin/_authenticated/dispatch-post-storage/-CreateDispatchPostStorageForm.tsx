import { memo, useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { toast } from 'sonner';

import { DatePicker } from '@/components/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { formatDateToISO } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { queryClient } from '@/lib/queryClient';
import {
  isCreateDispatchPostStorageSuccess,
  useCreateDispatchPostStorage,
} from '@/services/store-admin/dispatch-post-storage/useCreateDispatchPostStorage';
import { useGetReceiptVoucherNumber } from '@/services/store-admin/general/useGetVoucherNumber';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import {
  STORAGE_GATE_PASSES_FOR_FARMER_QUERY_PARAMS,
  storageGatePassesForFarmerQueryOptions,
} from '@/services/store-admin/storage-gate-pass/useGetStorageGatePassesForFarmer';
import {
  createDispatchPostStorageFormSchema,
  getCreateDispatchPostStorageDefaults,
  isFieldInvalid,
  parseOptionalPositiveNumber,
  type FieldErrors,
} from './-form-schema';
import { StorageGatePassesSection } from './-StorageGatePassesSection';
import { buildStorageGatePassesFromAllocations } from './-storage-gate-pass-matrix-utils';
import { DispatchPostStorageSummarySheet } from './-SummarySheet';

export const CreateDispatchPostStorageForm = memo(
  function CreateDispatchPostStorageForm() {
    const { data: voucherNumber, isLoading: isLoadingVoucher } =
      useGetReceiptVoucherNumber('dispatch-post-storage');
    const { data: farmerLinks, isLoading: isLoadingFarmers } =
      useGetAllFarmers();
    const { mutate: createDispatchPostStorage, isPending: isCreating } =
      useCreateDispatchPostStorage();
    const [reviewOpen, setReviewOpen] = useState(false);

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
      defaultValues: getCreateDispatchPostStorageDefaults(),
      validators: {
        onSubmit: createDispatchPostStorageFormSchema as never,
      },
      onSubmit: async () => {
        setReviewOpen(true);
      },
    });

    const voucherNumberDisplay =
      voucherNumber != null ? `#${voucherNumber}` : null;
    const displayGatePassNo = isLoadingVoucher
      ? '…'
      : (voucherNumberDisplay ?? '—');

    const getFarmerLabel = (farmerStorageLinkId: string) =>
      farmerOptions.find((option) => option.value === farmerStorageLinkId)
        ?.label ?? farmerStorageLinkId;

    const handleCreate = async () => {
      if (voucherNumber == null) {
        toast.error('Voucher number is not available yet. Please try again.');
        return;
      }

      const values = form.state.values;
      let passes;
      try {
        const result = await queryClient.ensureQueryData(
          storageGatePassesForFarmerQueryOptions(
            values.farmerStorageLinkId,
            STORAGE_GATE_PASSES_FOR_FARMER_QUERY_PARAMS
          )
        );
        passes = result.data;
      } catch {
        toast.error('Could not load storage gate passes. Please try again.');
        return;
      }

      const mapped = buildStorageGatePassesFromAllocations(
        values.allocations,
        passes
      );
      if (!mapped.ok) {
        const messages = {
          empty: 'Please allocate at least one quantity.',
          unresolved:
            'Some allocated slots could not be matched to a storage gate pass. Refresh and try again.',
          'mixed-variety':
            'All allocated storage gate passes must be the same variety.',
        } as const;
        toast.error(messages[mapped.reason]);
        return;
      }

      createDispatchPostStorage(
        {
          farmerStorageLinkId: values.farmerStorageLinkId,
          gatePassNo: voucherNumber,
          date: formatDateToISO(values.date),
          variety: mapped.variety,
          from: values.from,
          to: values.to,
          storageGatePasses: mapped.storageGatePasses,
          truckNumber: values.truckNumber.trim() || undefined,
          remarks: values.remarks.trim() || undefined,
          manualGatePassNumber: values.manualGatePassNumber,
          idempotencyKey: crypto.randomUUID(),
        },
        {
          onSuccess: (data) => {
            if (!isCreateDispatchPostStorageSuccess(data)) return;
            setReviewOpen(false);
          },
        }
      );
    };

    return (
      <Card className="mx-auto w-full max-w-7xl shadow-sm">
        <CardHeader className="bg-muted/30 border-b pb-6">
          <CardTitle className="font-custom text-xl font-semibold tracking-tight sm:text-2xl">
            Dispatch (Post Storage){' '}
            <span className="text-primary font-mono text-xl tabular-nums sm:text-2xl">
              {displayGatePassNo}
            </span>
          </CardTitle>
          <CardDescription className="font-custom text-base">
            Record stock leaving storage for a farmer account.
          </CardDescription>
        </CardHeader>

        <form
          id="create-dispatch-post-storage-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <CardContent className="pt-8 pb-8">
            <FieldGroup className="@container/field-group gap-10">
              <FieldSet>
                <FieldLegend className="font-custom text-base font-semibold">
                  Outgoing details
                </FieldLegend>
                <FieldDescription className="font-custom">
                  Select the farmer account and outgoing date.
                </FieldDescription>
                <FieldGroup className="mt-5 grid grid-cols-1 gap-6">
                  <form.Field name="farmerStorageLinkId">
                    {(field) => {
                      const isInvalid = isFieldInvalid(field.state.meta);
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel
                            htmlFor="dispatch-post-storage-farmer"
                            className="font-custom"
                          >
                            Farmer
                          </FieldLabel>
                          <SearchSelector
                            id="dispatch-post-storage-farmer"
                            options={farmerOptions}
                            placeholder={
                              isLoadingFarmers
                                ? 'Loading farmers…'
                                : 'Search farmers…'
                            }
                            searchPlaceholder="Search by name, account number, or mobile..."
                            value={field.state.value}
                            onSelect={(value) => {
                              field.handleChange(value ?? '');
                              form.setFieldValue('allocations', {});
                            }}
                            loading={isLoadingFarmers}
                            loadingMessage="Loading farmers…"
                            emptyMessage="No farmers found."
                            className="w-full"
                            buttonClassName="w-full justify-between h-11"
                            disabled={isLoadingFarmers}
                          />
                          <FieldDescription className="font-custom">
                            Farmer account stock is outgoing from.
                          </FieldDescription>
                          {isInvalid ? (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="date">
                    {(field) => {
                      const isInvalid = isFieldInvalid(field.state.meta);
                      return (
                        <Field
                          data-invalid={isInvalid}
                          className="@md/field-group:max-w-sm"
                        >
                          <DatePicker
                            id={field.name}
                            label="Date"
                            value={field.state.value}
                            onChange={(value) => field.handleChange(value)}
                          />
                          {isInvalid ? (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="manualGatePassNumber">
                    {(field) => {
                      const isInvalid = isFieldInvalid(field.state.meta);
                      return (
                        <Field
                          data-invalid={isInvalid}
                          className="@md/field-group:max-w-sm"
                        >
                          <FieldLabel
                            htmlFor={field.name}
                            className="font-custom"
                          >
                            Manual gate pass no.
                          </FieldLabel>
                          <Input
                            type="number"
                            min={0}
                            id={field.name}
                            name={field.name}
                            value={
                              field.state.value != null
                                ? String(field.state.value)
                                : ''
                            }
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(
                                parseOptionalPositiveNumber(e.target.value)
                              )
                            }
                            onWheel={blurTargetOnNumberWheel}
                            onKeyDown={preventArrowUpDownOnNumericInput}
                            inputMode="numeric"
                            placeholder="Optional"
                            aria-invalid={isInvalid}
                            className={cn(
                              'font-custom h-11 text-base tabular-nums',
                              businessNumberSpinnerClassName
                            )}
                          />
                          <FieldDescription className="font-custom">
                            Optional reference number if used on the physical
                            pass.
                          </FieldDescription>
                          {isInvalid ? (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend className="font-custom text-base font-semibold">
                  Route & vehicle
                </FieldLegend>
                <FieldDescription className="font-custom">
                  Source, destination, and truck for this outgoing dispatch.
                </FieldDescription>
                <FieldGroup className="mt-5 grid grid-cols-1 gap-6 @md/field-group:grid-cols-3">
                  <form.Field name="from">
                    {(field) => {
                      const isInvalid = isFieldInvalid(field.state.meta);
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel
                            htmlFor={field.name}
                            className="font-custom"
                          >
                            From
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="e.g. Kapur Cold Storage"
                            autoComplete="off"
                            aria-invalid={isInvalid}
                            className="font-custom h-11 text-base"
                          />
                          {isInvalid ? (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="to">
                    {(field) => {
                      const isInvalid = isFieldInvalid(field.state.meta);
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel
                            htmlFor={field.name}
                            className="font-custom"
                          >
                            To
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="e.g. Azadpur Mandi"
                            autoComplete="off"
                            aria-invalid={isInvalid}
                            className="font-custom h-11 text-base"
                          />
                          {isInvalid ? (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="truckNumber">
                    {(field) => {
                      const isInvalid = isFieldInvalid(field.state.meta);
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel
                            htmlFor={field.name}
                            className="font-custom"
                          >
                            Truck number
                          </FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(e.target.value.toUpperCase())
                            }
                            placeholder="Optional"
                            autoComplete="off"
                            aria-invalid={isInvalid}
                            className="font-custom h-11 text-base uppercase"
                          />
                          <FieldDescription className="font-custom">
                            Optional vehicle registration for this dispatch.
                          </FieldDescription>
                          {isInvalid ? (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </FieldSet>

              <form.Subscribe
                selector={(state) => state.values.farmerStorageLinkId}
              >
                {(farmerStorageLinkId) => (
                  <FieldSet>
                    <FieldLegend className="font-custom text-base font-semibold">
                      Storage gate passes
                    </FieldLegend>
                    <FieldDescription className="font-custom">
                      Select vouchers and quantities to mark as outgoing.
                    </FieldDescription>
                    <div className="mt-5">
                      <form.Field name="allocations">
                        {(allocField) => (
                          <StorageGatePassesSection
                            key={farmerStorageLinkId || 'no-farmer'}
                            farmerStorageLinkId={farmerStorageLinkId}
                            allocations={allocField.state.value}
                            onAllocationsChange={allocField.handleChange}
                            farmerPromptLabel="farmer"
                          />
                        )}
                      </form.Field>
                    </div>
                  </FieldSet>
                )}
              </form.Subscribe>

              <FieldSet>
                <FieldLegend className="font-custom text-base font-semibold">
                  Additional notes
                </FieldLegend>
                <FieldGroup className="mt-5">
                  <form.Field name="remarks">
                    {(field) => {
                      const isInvalid = isFieldInvalid(field.state.meta);
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name} className="sr-only">
                            Remarks
                          </FieldLabel>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Add any additional comments or observations (optional)"
                            className="font-custom min-h-30 resize-y text-base"
                          />
                          {isInvalid ? (
                            <FieldError
                              errors={field.state.meta.errors as FieldErrors}
                            />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
          </CardContent>

          <CardFooter className="bg-muted/30 justify-end gap-3 border-t py-6">
            <Button
              variant="outline"
              type="button"
              className="font-custom"
              onClick={() => {
                form.reset(getCreateDispatchPostStorageDefaults());
                setReviewOpen(false);
              }}
            >
              Reset form
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  type="submit"
                  className="font-custom font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Validating…' : 'Review'}
                </Button>
              )}
            </form.Subscribe>
          </CardFooter>
        </form>

        <form.Subscribe selector={(state) => state.values}>
          {(values) => (
            <DispatchPostStorageSummarySheet
              open={reviewOpen}
              onOpenChange={setReviewOpen}
              voucherNumberDisplay={voucherNumberDisplay}
              farmerLabel={getFarmerLabel(values.farmerStorageLinkId)}
              values={values}
              isPending={isCreating}
              onBack={() => setReviewOpen(false)}
              onSubmit={() => {
                void handleCreate();
              }}
            />
          )}
        </form.Subscribe>
      </Card>
    );
  }
);
