import { Fragment, memo, useMemo, useState } from 'react';
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
import { useGetReceiptVoucherNumber } from '@/services/store-admin/functions/useGetVoucherNumber';
import { useCreateGradingGatePass } from '@/services/store-admin/grading-gate-pass/useCreateGradingGatePass';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';
import { formatDate, formatDateToISO } from '@/lib/helpers';

import { GRADING_SIZES, BAG_TYPES } from './constants';
import { GradingSummarySheet } from './summary-sheet';
import type { CreateGradingGatePassOrderDetail } from '@/types/grading-gate-pass';

export interface SizeEntry {
  size: string;
  quantity: number;
  bagType: string;
  weightPerBagKg: number;
}

export interface GradingGatePassFormProps {
  incomingGatePassId: string;
  variety: string;
  onSuccess?: () => void;
}

const defaultSizeEntries: SizeEntry[] = GRADING_SIZES.map((size) => ({
  size,
  quantity: 0,
  bagType: 'JUTE',
  weightPerBagKg: 0,
}));

function buildFormSchema() {
  return z.object({
    date: z.string().min(1, 'Date is required'),
    sizeEntries: z.array(
      z.object({
        size: z.string(),
        quantity: z.number().min(0, 'Must be 0 or more'),
        bagType: z.enum(['JUTE', 'LENO']),
        weightPerBagKg: z.number().min(0, 'Must be 0 or more'),
      })
    ),
    remarks: z
      .string()
      .trim()
      .max(500, 'Remarks must not exceed 500 characters'),
    manualGatePassNumber: z.union([z.number(), z.undefined()]),
  });
}

export const GradingGatePassForm = memo(function GradingGatePassForm({
  incomingGatePassId,
  variety,
  onSuccess,
}: GradingGatePassFormProps) {
  const { admin } = useStore();
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('grading-gate-pass');
  const { mutate: createGradingGatePass, isPending } =
    useCreateGradingGatePass();

  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  const formSchema = useMemo(() => buildFormSchema(), []);

  const form = useForm({
    defaultValues: {
      date: formatDate(new Date()),
      sizeEntries: defaultSizeEntries,
      remarks: '',
      manualGatePassNumber: undefined as number | undefined,
    },
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (!admin?._id || !voucherNumber) return;

      const orderDetails: CreateGradingGatePassOrderDetail[] = value.sizeEntries
        .filter((row) => row.quantity > 0)
        .map((row) => ({
          size: row.size,
          bagType: row.bagType as 'JUTE' | 'LENO',
          currentQuantity: row.quantity,
          initialQuantity: row.quantity,
          weightPerBagKg: row.weightPerBagKg,
        }));

      createGradingGatePass(
        {
          incomingGatePassId,
          gradedById: admin._id,
          gatePassNo: voucherNumber,
          date: formatDateToISO(value.date),
          variety,
          orderDetails,
          allocationStatus: 'UNALLOCATED',
          remarks: value.remarks.trim() || undefined,
          ...(value.manualGatePassNumber != null && {
            manualGatePassNumber: value.manualGatePassNumber,
          }),
        },
        {
          onSuccess: () => {
            form.reset();
            setIsSummarySheetOpen(false);
            onSuccess?.();
          },
        }
      );
    },
  });

  const voucherNumberDisplay =
    voucherNumber != null ? `#${voucherNumber}` : null;
  const gatePassNo = voucherNumber ?? 0;

  const handleNextClick = () => {
    form.validateAllFields('submit');
    if (form.state.isValid) setIsSummarySheetOpen(true);
  };

  const handleFinalSubmit = () => form.handleSubmit();

  return (
    <div className="font-custom flex flex-col">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleNextClick();
        }}
        className="space-y-6"
      >
        <FieldGroup className="space-y-6">
          {/* Date */}
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
                    label="Date"
                    id="grading-date"
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

          {/* Size-wise entries — elegant layout with horizontal spacing, mobile friendly */}
          <div className="space-y-4">
            <h3 className="font-custom text-foreground text-base font-semibold sm:text-lg">
              Enter Quantities
            </h3>
            <p className="text-muted-foreground font-custom text-sm">
              Please select a variety first to enter quantities.
            </p>

            {/* Quantities grid: mobile cards, desktop table-like */}
            <div className="space-y-4 md:space-y-0">
              {/* Desktop: single grid with header + rows for alignment */}
              <div className="hidden md:grid md:grid-cols-[minmax(5rem,1fr)_7rem_8rem_6rem] md:gap-x-6 md:gap-y-3 lg:grid-cols-[minmax(6rem,1.25fr)_8rem_9rem_7rem] lg:gap-x-8 lg:gap-y-4">
                <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                  Size
                </span>
                <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                  Qty
                </span>
                <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                  Bag Type
                </span>
                <span className="font-custom text-muted-foreground border-border/60 border-b pb-2 text-xs font-medium tracking-wide uppercase">
                  Wt (kg)
                </span>
                {GRADING_SIZES.map((sizeLabel, index) => (
                  <Fragment key={sizeLabel}>
                    <span className="font-custom text-foreground text-sm font-medium md:text-base">
                      {sizeLabel}
                    </span>
                    <form.Field
                      name={`sizeEntries[${index}].quantity`}
                      children={(field) => (
                        <Field className="min-w-0">
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="Qty"
                            value={
                              field.state.value === 0
                                ? ''
                                : (field.state.value ?? '')
                            }
                            onBlur={field.handleBlur}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '' || raw === '-') {
                                field.handleChange(0);
                                return;
                              }
                              const parsed = parseInt(raw, 10);
                              field.handleChange(
                                Number.isNaN(parsed) ? 0 : parsed
                              );
                            }}
                            className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </Field>
                      )}
                    />
                    <form.Field
                      name={`sizeEntries[${index}].bagType`}
                      children={(field) => (
                        <Field className="min-w-0">
                          <select
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            className="border-input bg-background focus-visible:ring-primary font-custom h-9 w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          >
                            {BAG_TYPES.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                    />
                    <form.Field
                      name={`sizeEntries[${index}].weightPerBagKg`}
                      children={(field) => (
                        <Field className="min-w-0">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            placeholder="Wt"
                            value={
                              field.state.value === 0 ||
                              field.state.value === undefined
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
                              field.handleChange(
                                Number.isNaN(parsed) ? 0 : parsed
                              );
                            }}
                            className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </Field>
                      )}
                    />
                  </Fragment>
                ))}
              </div>

              {/* Mobile: card per size */}
              <div className="space-y-4 md:hidden">
                {GRADING_SIZES.map((sizeLabel, index) => (
                  <div
                    key={sizeLabel}
                    className="border-border/40 bg-muted/20 flex flex-col gap-4 rounded-lg border p-4"
                  >
                    <span className="font-custom text-foreground text-base font-semibold">
                      {sizeLabel}
                    </span>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <form.Field
                        name={`sizeEntries[${index}].quantity`}
                        children={(field) => (
                          <Field>
                            <label
                              htmlFor={`qty-m-${index}`}
                              className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                            >
                              Quantity
                            </label>
                            <Input
                              id={`qty-m-${index}`}
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Qty"
                              value={
                                field.state.value === 0
                                  ? ''
                                  : (field.state.value ?? '')
                              }
                              onBlur={field.handleBlur}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '' || raw === '-') {
                                  field.handleChange(0);
                                  return;
                                }
                                const parsed = parseInt(raw, 10);
                                field.handleChange(
                                  Number.isNaN(parsed) ? 0 : parsed
                                );
                              }}
                              className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </Field>
                        )}
                      />
                      <form.Field
                        name={`sizeEntries[${index}].bagType`}
                        children={(field) => (
                          <Field>
                            <label
                              htmlFor={`bag-m-${index}`}
                              className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                            >
                              Bag Type
                            </label>
                            <select
                              id={`bag-m-${index}`}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              className="border-input bg-background focus-visible:ring-primary font-custom h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            >
                              {BAG_TYPES.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </Field>
                        )}
                      />
                      <form.Field
                        name={`sizeEntries[${index}].weightPerBagKg`}
                        children={(field) => (
                          <Field>
                            <label
                              htmlFor={`wt-m-${index}`}
                              className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                            >
                              Weight (kg)
                            </label>
                            <Input
                              id={`wt-m-${index}`}
                              type="number"
                              min={0}
                              step={0.01}
                              placeholder="Wt"
                              value={
                                field.state.value === 0 ||
                                field.state.value === undefined
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
                                field.handleChange(
                                  Number.isNaN(parsed) ? 0 : parsed
                                );
                              }}
                              className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <span className="text-muted-foreground block text-xs">
              Quantity / Approx Weight (kg)
            </span>
          </div>

          {/* Manual Gate Pass Number */}
          <form.Field
            name="manualGatePassNumber"
            children={(field) => (
              <Field>
                <FieldLabel
                  htmlFor="grading-manualGatePassNumber"
                  className="font-custom text-base font-semibold"
                >
                  Manual Gate Pass Number
                </FieldLabel>
                <Input
                  id="grading-manualGatePassNumber"
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
                  htmlFor="grading-remarks"
                  className="font-custom text-base font-semibold"
                >
                  Remarks
                </FieldLabel>
                <textarea
                  id="grading-remarks"
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

        {/* Actions — full width on mobile, inline on desktop */}
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-4">
          <Button
            type="button"
            variant="outline"
            className="font-custom order-2 w-full sm:order-1 sm:w-auto"
            onClick={() => {
              form.reset();
              toast.info('Form reset');
            }}
            disabled={isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="font-custom order-1 w-full px-8 font-bold sm:order-2 sm:w-auto"
            disabled={isPending || isLoadingVoucher || !gatePassNo}
          >
            Next
          </Button>
        </div>
      </form>

      {/* Summary Sheet */}
      <GradingSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        variety={variety}
        formValues={{
          date: form.state.values.date,
          sizeEntries: form.state.values.sizeEntries,
          remarks: form.state.values.remarks,
          manualGatePassNumber: form.state.values.manualGatePassNumber,
        }}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        onSubmit={handleFinalSubmit}
      />
    </div>
  );
});
