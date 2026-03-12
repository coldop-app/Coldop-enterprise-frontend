import { Fragment, memo, useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  useGetIncomingGatePasses,
  INCOMING_GATE_PASS_STATUS_NOT_GRADED,
} from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { toast } from 'sonner';
import { formatDate, formatDateToISO } from '@/lib/helpers';

import { GRADING_SIZES, BAG_TYPES, GRADER_OPTIONS } from './constants';
import { GradingFormStep1 } from './GradingFormStep1';
import { GradingSummarySheet } from './summary-sheet';
import type { CreateGradingGatePassOrderDetail } from '@/types/grading-gate-pass';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';

export interface SizeEntry {
  size: string;
  quantity: number;
  bagType: string;
  weightPerBagKg: number;
}

export interface ExtraSizeEntry {
  id: string;
  size: string;
  quantity: number;
  bagType: string;
  weightPerBagKg: number;
}

export interface GradingGatePassFormProps {
  farmerStorageLinkId?: string;
  incomingGatePassId?: string;
  variety?: string;
  onSuccess?: () => void;
}

const defaultSizeEntries: SizeEntry[] = GRADING_SIZES.map((size) => ({
  size,
  quantity: 0,
  bagType: 'JUTE',
  weightPerBagKg: 0,
}));

function getBagsFromPass(pass: IncomingGatePassWithLink): number {
  if (pass.bagsReceived != null) return pass.bagsReceived;
  if (pass.bagSizes?.length)
    return pass.bagSizes.reduce((sum, b) => sum + b.initialQuantity, 0);
  return 0;
}

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
    extraSizeEntries: z.array(
      z.object({
        id: z.string(),
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
    grader: z.string(),
  });
}

export const GradingGatePassForm = memo(function GradingGatePassForm({
  farmerStorageLinkId: propFarmerStorageLinkId,
  incomingGatePassId: propIncomingGatePassId,
  variety: propVariety,
  onSuccess,
}: GradingGatePassFormProps) {
  const { data: voucherNumber, isLoading: isLoadingVoucher } =
    useGetReceiptVoucherNumber('grading-gate-pass');
  const { mutate: createGradingGatePass, isPending } =
    useCreateGradingGatePass();
  const { data: incomingResult } = useGetIncomingGatePasses({
    page: 1,
    limit: 1000,
    sortOrder: 'desc',
    status: INCOMING_GATE_PASS_STATUS_NOT_GRADED,
  });
  const incomingGatePassesList = incomingResult?.data ?? [];

  const [step, setStep] = useState(1);
  const [incomingGatePassIds, setIncomingGatePassIds] = useState<string[]>(
    () => (propIncomingGatePassId ? [propIncomingGatePassId] : [])
  );
  const [isSummarySheetOpen, setIsSummarySheetOpen] = useState(false);

  const formSchema = useMemo(() => buildFormSchema(), []);

  const selectedIncomingPasses = useMemo(
    () =>
      incomingGatePassIds.length === 0
        ? []
        : incomingGatePassesList.filter((p) =>
            incomingGatePassIds.includes(p._id)
          ),
    [incomingGatePassesList, incomingGatePassIds]
  );

  const resolvedContext = useMemo(() => {
    const first = selectedIncomingPasses[0];
    const linkId =
      typeof first?.farmerStorageLinkId === 'string'
        ? first.farmerStorageLinkId
        : (first?.farmerStorageLinkId as { _id?: string })?._id;
    return {
      farmerStorageLinkId: propFarmerStorageLinkId ?? linkId,
      variety: propVariety ?? first?.variety ?? '',
    };
  }, [propFarmerStorageLinkId, propVariety, selectedIncomingPasses]);

  const form = useForm({
    defaultValues: {
      date: formatDate(new Date()),
      sizeEntries: defaultSizeEntries,
      extraSizeEntries: [] as ExtraSizeEntry[],
      remarks: '',
      manualGatePassNumber: undefined as number | undefined,
      grader: '',
    },
    validators: {
      onChange: formSchema,
      onBlur: formSchema,
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (!voucherNumber) return;

      const { farmerStorageLinkId: resolvedLinkId, variety: resolvedVariety } =
        resolvedContext;
      if (!resolvedLinkId || !resolvedVariety) {
        toast.error(
          'Select at least one incoming gate pass to create a grading voucher.'
        );
        return;
      }
      if (incomingGatePassIds.length === 0) {
        toast.error(
          'Select at least one incoming gate pass to create a grading voucher.'
        );
        return;
      }

      const fromFixed = value.sizeEntries
        .filter((row) => row.quantity > 0)
        .map((row) => ({
          size: row.size,
          bagType: row.bagType as 'JUTE' | 'LENO',
          currentQuantity: row.quantity,
          initialQuantity: row.quantity,
          weightPerBagKg: row.weightPerBagKg,
        }));
      const fromExtra = (value.extraSizeEntries ?? [])
        .filter((row) => row.quantity > 0)
        .map((row) => ({
          size: row.size,
          bagType: row.bagType as 'JUTE' | 'LENO',
          currentQuantity: row.quantity,
          initialQuantity: row.quantity,
          weightPerBagKg: row.weightPerBagKg,
        }));
      const orderDetails: CreateGradingGatePassOrderDetail[] = [
        ...fromFixed,
        ...fromExtra,
      ];

      createGradingGatePass(
        {
          farmerStorageLinkId: resolvedLinkId,
          incomingGatePassIds,
          gatePassNo: voucherNumber,
          date: formatDateToISO(value.date),
          variety: resolvedVariety,
          orderDetails,
          allocationStatus: 'UNALLOCATED',
          remarks: value.remarks.trim() || undefined,
          ...(value.manualGatePassNumber != null && {
            manualGatePassNumber: value.manualGatePassNumber,
          }),
          ...(value.grader?.trim() && { grader: value.grader.trim() }),
        },
        {
          onSuccess: () => {
            form.reset();
            form.setFieldValue('extraSizeEntries', []);
            setIncomingGatePassIds([]);
            setStep(1);
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

  const totalBagsSelected = useMemo(
    () =>
      selectedIncomingPasses.reduce((sum, p) => sum + getBagsFromPass(p), 0),
    [selectedIncomingPasses]
  );

  const handleReviewClick = () => {
    form.validateAllFields('submit');
    if (form.state.isValid) setIsSummarySheetOpen(true);
  };

  const handleFinalSubmit = () => form.handleSubmit();

  const numberInputProps = {
    onWheel: (e: React.WheelEvent<HTMLInputElement>) => e.currentTarget.blur(),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
    },
  };

  return (
    <div className="font-custom flex flex-col">
      {step === 1 && (
        <GradingFormStep1
          initialSelectedIds={
            incomingGatePassIds.length > 0
              ? incomingGatePassIds
              : propIncomingGatePassId
                ? [propIncomingGatePassId]
                : undefined
          }
          onNext={(ids) => {
            setIncomingGatePassIds(ids);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleReviewClick();
          }}
          className="space-y-6"
        >
          {selectedIncomingPasses.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
                  Selected incoming gate passes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-0 pb-6">
                <div className="border-border/60 overflow-hidden rounded-lg border">
                  <table className="font-custom w-full text-sm">
                    <thead>
                      <tr className="border-border/60 bg-muted/50">
                        <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                          Gate Pass #
                        </th>
                        <th className="text-muted-foreground px-4 py-3 text-right font-semibold">
                          Bags
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedIncomingPasses.map((pass) => (
                        <tr
                          key={pass._id}
                          className="border-border/40 border-b last:border-0"
                        >
                          <td className="text-foreground px-4 py-2.5 font-medium">
                            #{pass.gatePassNo}
                          </td>
                          <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                            {getBagsFromPass(pass)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-border/60 bg-muted/30 font-semibold">
                        <td className="text-foreground px-4 py-3">
                          Total
                          {selectedIncomingPasses.length > 1 && (
                            <span className="text-muted-foreground ml-1 font-normal">
                              ({selectedIncomingPasses.length} passes)
                            </span>
                          )}
                        </td>
                        <td className="text-foreground px-4 py-3 text-right tabular-nums">
                          {totalBagsSelected}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <FieldGroup className="space-y-6">
            <form.Field
              name="grader"
              children={(field) => (
                <Field>
                  <FieldLabel
                    htmlFor="grading-grader"
                    className="font-custom text-base font-semibold"
                  >
                    Grader
                  </FieldLabel>
                  <select
                    id="grading-grader"
                    value={field.state.value ?? ''}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="border-input bg-background focus-visible:ring-primary font-custom h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    <option value="">Select grader</option>
                    {GRADER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            />

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
                    {...numberInputProps}
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
                    placeholder=""
                    className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </Field>
              )}
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

            <div className="space-y-4">
              <h3 className="font-custom text-foreground text-base font-semibold sm:text-lg">
                Enter Quantities
              </h3>
              <p className="text-muted-foreground font-custom text-sm">
                Enter size-wise quantities and weights for this grading pass.
              </p>

              <div className="space-y-4 md:space-y-0">
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
                              {...numberInputProps}
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
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                              {...numberInputProps}
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
                  <form.Subscribe
                    selector={(state) => state.values.extraSizeEntries ?? []}
                  >
                    {(extraSizeEntries) => {
                      const addExtraRow = () => {
                        const next: ExtraSizeEntry[] = [
                          ...extraSizeEntries,
                          {
                            id: crypto.randomUUID(),
                            size: GRADING_SIZES[0] ?? '',
                            quantity: 0,
                            bagType: 'JUTE',
                            weightPerBagKg: 0,
                          },
                        ];
                        form.setFieldValue('extraSizeEntries', next);
                      };
                      const updateExtraRow = (
                        id: string,
                        updates: Partial<ExtraSizeEntry>
                      ) => {
                        const next = extraSizeEntries.map((row) =>
                          row.id === id ? { ...row, ...updates } : row
                        );
                        form.setFieldValue('extraSizeEntries', next);
                      };
                      const removeExtraRow = (id: string) => {
                        form.setFieldValue(
                          'extraSizeEntries',
                          extraSizeEntries.filter((row) => row.id !== id)
                        );
                      };
                      return (
                        <>
                          {extraSizeEntries.map((row) => (
                            <Fragment key={row.id}>
                              <select
                                aria-label="Size"
                                value={row.size}
                                onChange={(e) =>
                                  updateExtraRow(row.id, {
                                    size: e.target.value,
                                  })
                                }
                                className="border-input bg-background focus-visible:ring-primary font-custom col-span-1 h-9 w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                              >
                                {GRADING_SIZES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                              <div className="min-w-0">
                                <Input
                                  type="number"
                                  min={0}
                                  step={1}
                                  placeholder="Qty"
                                  value={row.quantity === 0 ? '' : row.quantity}
                                  onBlur={() => {}}
                                  {...numberInputProps}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '' || raw === '-') {
                                      updateExtraRow(row.id, {
                                        quantity: 0,
                                      });
                                      return;
                                    }
                                    const parsed = parseInt(raw, 10);
                                    updateExtraRow(row.id, {
                                      quantity: Number.isNaN(parsed)
                                        ? 0
                                        : parsed,
                                    });
                                  }}
                                  className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                              <div className="min-w-0">
                                <select
                                  value={row.bagType}
                                  onChange={(e) =>
                                    updateExtraRow(row.id, {
                                      bagType: e.target.value,
                                    })
                                  }
                                  className="border-input bg-background focus-visible:ring-primary font-custom h-9 w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                >
                                  {BAG_TYPES.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex min-w-0 items-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  placeholder="Wt"
                                  value={
                                    row.weightPerBagKg === 0 ||
                                    row.weightPerBagKg === undefined
                                      ? ''
                                      : row.weightPerBagKg
                                  }
                                  onBlur={() => {}}
                                  {...numberInputProps}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '' || raw === '-') {
                                      updateExtraRow(row.id, {
                                        weightPerBagKg: 0,
                                      });
                                      return;
                                    }
                                    const parsed = parseFloat(raw);
                                    updateExtraRow(row.id, {
                                      weightPerBagKg: Number.isNaN(parsed)
                                        ? 0
                                        : parsed,
                                    });
                                  }}
                                  className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => removeExtraRow(row.id)}
                                  aria-label={`Remove ${row.size || 'size'} row`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Fragment>
                          ))}
                          <div className="col-span-4 lg:col-span-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addExtraRow}
                              className="font-custom"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Size
                            </Button>
                          </div>
                        </>
                      );
                    }}
                  </form.Subscribe>
                </div>

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
                                {...numberInputProps}
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
                                {...numberInputProps}
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
                  <form.Subscribe
                    selector={(state) => state.values.extraSizeEntries ?? []}
                  >
                    {(extraSizeEntries) => {
                      const addExtraRow = () => {
                        const next: ExtraSizeEntry[] = [
                          ...extraSizeEntries,
                          {
                            id: crypto.randomUUID(),
                            size: GRADING_SIZES[0] ?? '',
                            quantity: 0,
                            bagType: 'JUTE',
                            weightPerBagKg: 0,
                          },
                        ];
                        form.setFieldValue('extraSizeEntries', next);
                      };
                      const updateExtraRow = (
                        id: string,
                        updates: Partial<ExtraSizeEntry>
                      ) => {
                        const next = extraSizeEntries.map((row) =>
                          row.id === id ? { ...row, ...updates } : row
                        );
                        form.setFieldValue('extraSizeEntries', next);
                      };
                      const removeExtraRow = (id: string) => {
                        form.setFieldValue(
                          'extraSizeEntries',
                          extraSizeEntries.filter((row) => row.id !== id)
                        );
                      };
                      return (
                        <>
                          {extraSizeEntries.map((row) => (
                            <div
                              key={row.id}
                              className="border-border/40 bg-muted/20 flex flex-col gap-4 rounded-lg border p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <select
                                  aria-label="Size"
                                  value={row.size}
                                  onChange={(e) =>
                                    updateExtraRow(row.id, {
                                      size: e.target.value,
                                    })
                                  }
                                  className="border-input bg-background focus-visible:ring-primary font-custom flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
                                  aria-label={`Remove ${row.size || 'size'} row`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <Field>
                                  <label
                                    htmlFor={`eq-qty-m-${row.id}`}
                                    className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                                  >
                                    Quantity
                                  </label>
                                  <Input
                                    id={`eq-qty-m-${row.id}`}
                                    type="number"
                                    min={0}
                                    step={1}
                                    placeholder="Qty"
                                    value={
                                      row.quantity === 0 ? '' : row.quantity
                                    }
                                    {...numberInputProps}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === '' || raw === '-') {
                                        updateExtraRow(row.id, {
                                          quantity: 0,
                                        });
                                        return;
                                      }
                                      const parsed = parseInt(raw, 10);
                                      updateExtraRow(row.id, {
                                        quantity: Number.isNaN(parsed)
                                          ? 0
                                          : parsed,
                                      });
                                    }}
                                    className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                </Field>
                                <Field>
                                  <label
                                    htmlFor={`eq-bag-m-${row.id}`}
                                    className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                                  >
                                    Bag Type
                                  </label>
                                  <select
                                    id={`eq-bag-m-${row.id}`}
                                    value={row.bagType}
                                    onChange={(e) =>
                                      updateExtraRow(row.id, {
                                        bagType: e.target.value,
                                      })
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
                                <Field>
                                  <label
                                    htmlFor={`eq-wt-m-${row.id}`}
                                    className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                                  >
                                    Weight (kg)
                                  </label>
                                  <Input
                                    id={`eq-wt-m-${row.id}`}
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    placeholder="Wt"
                                    value={
                                      row.weightPerBagKg === 0 ||
                                      row.weightPerBagKg === undefined
                                        ? ''
                                        : row.weightPerBagKg
                                    }
                                    {...numberInputProps}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === '' || raw === '-') {
                                        updateExtraRow(row.id, {
                                          weightPerBagKg: 0,
                                        });
                                        return;
                                      }
                                      const parsed = parseFloat(raw);
                                      updateExtraRow(row.id, {
                                        weightPerBagKg: Number.isNaN(parsed)
                                          ? 0
                                          : parsed,
                                      });
                                    }}
                                    className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                </Field>
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addExtraRow}
                            className="font-custom w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Size
                          </Button>
                        </>
                      );
                    }}
                  </form.Subscribe>
                </div>
              </div>

              <form.Subscribe
                selector={(state) => ({
                  sizeEntries: state.values.sizeEntries ?? [],
                  extraSizeEntries: state.values.extraSizeEntries ?? [],
                })}
              >
                {({ sizeEntries, extraSizeEntries }) => {
                  const fromFixed = (sizeEntries ?? []).reduce(
                    (sum, row) => sum + (row.quantity ?? 0),
                    0
                  );
                  const fromExtra = (extraSizeEntries ?? []).reduce(
                    (sum, row) => sum + (row.quantity ?? 0),
                    0
                  );
                  const totalBagsEntered = fromFixed + fromExtra;
                  return (
                    <div className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-2.5">
                      <span className="font-custom text-foreground text-sm font-semibold">
                        Total bags
                      </span>
                      <span className="font-custom font-medium tabular-nums">
                        {totalBagsEntered}
                      </span>
                    </div>
                  );
                }}
              </form.Subscribe>

              <span className="text-muted-foreground block text-xs">
                Quantity / Approx Weight (kg)
              </span>
            </div>

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

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              type="button"
              variant="outline"
              className="font-custom order-3 w-full sm:order-1 sm:w-auto"
              onClick={() => setStep(1)}
              disabled={isPending}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="outline"
              className="font-custom order-2 w-full sm:order-2 sm:w-auto"
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
              className="font-custom order-1 w-full px-8 font-bold sm:order-3 sm:w-auto"
              disabled={isPending || isLoadingVoucher || !gatePassNo}
            >
              Review & Create
            </Button>
          </div>
        </form>
      )}

      <GradingSummarySheet
        open={isSummarySheetOpen}
        onOpenChange={setIsSummarySheetOpen}
        voucherNumberDisplay={voucherNumberDisplay}
        variety={resolvedContext.variety}
        formValues={{
          date: form.state.values.date,
          sizeEntries: [
            ...(form.state.values.sizeEntries ?? []),
            ...(form.state.values.extraSizeEntries ?? []),
          ],
          remarks: form.state.values.remarks,
          manualGatePassNumber: form.state.values.manualGatePassNumber,
          grader: form.state.values.grader,
        }}
        isPending={isPending}
        isLoadingVoucher={isLoadingVoucher}
        gatePassNo={gatePassNo}
        onSubmit={handleFinalSubmit}
      />
    </div>
  );
});
