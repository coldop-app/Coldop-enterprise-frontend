import { memo, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Trash2,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  blurTargetOnNumberWheel,
  businessNumberSpinnerClassName,
  preventArrowUpDownOnNumericInput,
} from '@/lib/business-number-input';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/date-picker';
import {
  SearchSelector,
  type Option,
} from '@/components/forms/search-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { BAG_TYPES, GRADER_OPTIONS, GRADING_SIZES } from '@/lib/constants';
import { formatDate, formatDateToISO } from '@/lib/helpers';
import { useEditGradingGatePass } from '@/services/store-admin/grading-gate-pass/useEditGradingGatePass';
import { useStore } from '@/stores/store';
import type { GradingGatePass } from '@/types/grading-gate-pass';

import {
  GradingSummarySheet,
  type GradingSummaryFormValues,
} from './-SummarySheet';

const KNOWN_GRADERS_SET = new Set<string>(GRADER_OPTIONS);
const GRADER_SELECT_CUSTOM = '__custom__';

function isoToDdMmYy(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(new Date());
  return formatDate(d);
}

function getFarmerFromPass(
  pass: GradingGatePass
): GradingSummaryFormValues['farmer'] {
  const first = pass.incomingGatePassIds?.[0];
  const link = first?.farmerStorageLinkId;
  if (link && typeof link === 'object' && link.farmerId) {
    return {
      name: link.farmerId.name,
      accountNumber: link.accountNumber,
      mobileNumber: link.farmerId.mobileNumber,
      address: link.farmerId.address,
    };
  }
  return {
    name: '—',
    accountNumber: undefined,
    mobileNumber: undefined,
    address: undefined,
  };
}

function getGradedByLabel(pass: GradingGatePass): string | undefined {
  const c = pass.createdBy;
  if (c && typeof c === 'object' && 'name' in c) return String(c.name);
  return undefined;
}

function buildIncomingLines(
  pass: GradingGatePass
): GradingSummaryFormValues['incomingLines'] {
  return (pass.incomingGatePassIds ?? []).map((g) => {
    const gw = g.weightSlip?.grossWeightKg;
    const tw = g.weightSlip?.tareWeightKg;
    let netWeightKg: number | undefined;
    if (
      gw != null &&
      tw != null &&
      Number.isFinite(gw) &&
      Number.isFinite(tw)
    ) {
      netWeightKg = gw - tw;
    }
    return {
      gatePassNo: g.gatePassNo,
      manualGatePassNumber: g.manualGatePassNumber,
      truckNumber: g.truckNumber,
      bagsReceived: g.bagsReceived,
      netWeightKg,
      remarks: g.remarks,
    };
  });
}

const orderRowSchema = z.object({
  size: z.string().trim().min(1, 'Size is required'),
  bagType: z.string().trim().min(1, 'Bag type is required'),
  quantity: z.number().nonnegative(),
  weightPerBagKg: z.number().positive('Weight per bag must be positive'),
});

const fullFormSchema = z.object({
  manualGatePassNumber: z.union([z.number().nonnegative(), z.undefined()]),
  date: z.string().trim().min(1, 'Date is required'),
  graderKnownKey: z.string(),
  graderCustom: z.string(),
  remarks: z.string().max(500).default(''),
  orderDetails: z.array(orderRowSchema).min(1, 'Add at least one size row'),
});

const stepOneSchema = z
  .object({
    manualGatePassNumber: fullFormSchema.shape.manualGatePassNumber,
    date: fullFormSchema.shape.date,
    graderKnownKey: z.string(),
    graderCustom: z.string(),
    remarks: fullFormSchema.shape.remarks,
  })
  .superRefine((data, ctx) => {
    if (
      data.graderKnownKey === GRADER_SELECT_CUSTOM &&
      !data.graderCustom.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a custom grader name',
        path: ['graderCustom'],
      });
    }
  });

function resolveGrader(knownKey: string, custom: string): string {
  if (knownKey === GRADER_SELECT_CUSTOM || knownKey.trim() === '') {
    return custom.trim();
  }
  return knownKey.trim();
}

type GradingEditFormProps = {
  pass: GradingGatePass;
  selectedIncomingGatePassIds?: string[];
  selectedVariety?: string;
};

export const GradingEditForm = memo(function GradingEditForm({
  pass,
  selectedIncomingGatePassIds,
  selectedVariety,
}: GradingEditFormProps) {
  const { mutate: editGradingGatePass, isPending } = useEditGradingGatePass();
  const setDaybookTab = useStore((s) => s.setDaybookActiveTab);
  const [step, setStep] = useState<0 | 1>(1);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const confirmSaveRef = useRef(false);

  const effectiveIncomingPasses = useMemo(() => {
    const selectedIds = selectedIncomingGatePassIds ?? [];
    if (selectedIds.length === 0) return pass.incomingGatePassIds ?? [];
    const selectedSet = new Set(selectedIds);
    return (pass.incomingGatePassIds ?? []).filter((gp) =>
      selectedSet.has(gp._id)
    );
  }, [pass.incomingGatePassIds, selectedIncomingGatePassIds]);

  const effectivePass = useMemo(
    () => ({ ...pass, incomingGatePassIds: effectiveIncomingPasses }),
    [pass, effectiveIncomingPasses]
  );

  const farmerDisplay = useMemo(
    () => getFarmerFromPass(effectivePass),
    [effectivePass]
  );

  const sizeOptions: Option<string>[] = useMemo(
    () =>
      GRADING_SIZES.map((s) => ({
        value: s,
        label: s,
        searchableText: s,
      })),
    []
  );

  const defaultKnownGrader = (() => {
    const g = pass.grader?.trim();
    if (!g) return GRADER_OPTIONS[0] ?? GRADER_SELECT_CUSTOM;
    return KNOWN_GRADERS_SET.has(g) ? g : GRADER_SELECT_CUSTOM;
  })();

  const initialOrderDetails =
    pass.orderDetails?.length > 0
      ? pass.orderDetails.map((r) => ({
          size: r.size,
          bagType: r.bagType,
          quantity: Number(r.currentQuantity ?? r.initialQuantity ?? 0),
          weightPerBagKg: r.weightPerBagKg,
        }))
      : [
          {
            size: GRADING_SIZES.includes('Below 30')
              ? 'Below 30'
              : (GRADING_SIZES[0] ?? ''),
            bagType: 'LENO',
            quantity: 0,
            weightPerBagKg: 56,
          },
        ];

  const resolvedVariety = selectedVariety?.trim() || pass.variety?.trim() || '';

  const form = useForm({
    defaultValues: {
      manualGatePassNumber:
        pass.manualGatePassNumber != null && pass.manualGatePassNumber >= 0
          ? pass.manualGatePassNumber
          : undefined,
      date: isoToDdMmYy(pass.date),
      graderKnownKey: defaultKnownGrader,
      graderCustom:
        defaultKnownGrader === GRADER_SELECT_CUSTOM
          ? (pass.grader?.trim() ?? '')
          : '',
      remarks: pass.remarks?.trim() ?? '',
      orderDetails: initialOrderDetails,
    },
    validators: {
      onSubmit: fullFormSchema as never,
    },
    onSubmit: async ({ value }) => {
      const grader = resolveGrader(value.graderKnownKey, value.graderCustom);
      const detailErrors = fullFormSchema.shape.orderDetails.safeParse(
        value.orderDetails
      );
      if (!detailErrors.success) {
        toast.error('Please fix size rows.');
        setStep(1);
        return;
      }

      const body = detailErrors.data;

      const totalQty = body.reduce((s, r) => s + (r.quantity || 0), 0);
      if (totalQty <= 0) {
        toast.error('Enter at least one bag quantity in the size breakdown.');
        setStep(1);
        return;
      }

      if (!confirmSaveRef.current) {
        setSummaryOpen(true);
        return;
      }

      confirmSaveRef.current = false;

      editGradingGatePass(
        {
          gradingGatePassId: pass._id,
          manualGatePassNumber: value.manualGatePassNumber,
          date: formatDateToISO(value.date),
          variety: resolvedVariety,
          allocationStatus: 'UNALLOCATED',
          grader: grader || undefined,
          remarks: value.remarks.trim() || undefined,
          orderDetails: body.map((r) => ({
            size: r.size,
            bagType: r.bagType,
            currentQuantity: r.quantity,
            initialQuantity: r.quantity,
            weightPerBagKg: r.weightPerBagKg,
          })),
        },
        {
          onSuccess: (data) => {
            const ok =
              (typeof data.success === 'boolean' && data.success) ||
              data.status?.toLowerCase() === 'success';
            if (!ok) return;
            setSummaryOpen(false);
          },
        }
      );
    },
  });

  const handleNext = () => {
    const v = form.state.values;
    const parsed = stepOneSchema.safeParse({
      manualGatePassNumber: v.manualGatePassNumber,
      date: v.date,
      graderKnownKey: v.graderKnownKey,
      graderCustom: v.graderCustom,
      remarks: v.remarks,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please fix step 1.');
      return;
    }
    setStep(1);
  };

  const summaryValues: GradingSummaryFormValues = useMemo(() => {
    const v = form.state.values;
    const grader = resolveGrader(v.graderKnownKey, v.graderCustom);
    return {
      gatePassNo: pass.gatePassNo,
      manualGatePassNumber: v.manualGatePassNumber,
      dateDisplay: v.date?.trim() ? v.date : isoToDdMmYy(pass.date),
      variety: resolvedVariety,
      grader,
      remarks: v.remarks,
      allocationStatus: 'UNALLOCATED',
      orderDetails: v.orderDetails ?? [],
      farmer: farmerDisplay,
      incomingLines: buildIncomingLines(effectivePass),
      gradedByLabel: getGradedByLabel(pass),
    };
  }, [effectivePass, farmerDisplay, form.state.values, pass, resolvedVariety]);

  return (
    <main className="font-custom mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            className="font-custom -ml-2 gap-2"
            asChild
          >
            <Link
              to="/store-admin/daybook"
              onClick={() => setDaybookTab('grading')}
              className="focus-visible:ring-primary focus-visible:ring-offset-background rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <ArrowLeft className="size-4" />
              Daybook
            </Link>
          </Button>
          <div>
            <h1 className="font-custom text-3xl font-bold tracking-tighter text-[#333] sm:text-4xl">
              Edit grading voucher
            </h1>
            <p className="text-muted-foreground font-custom mt-1 max-w-xl text-sm leading-relaxed">
              Update grading header in step one, then size breakdown and bag
              weights in step two.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="font-custom h-9 gap-2 px-3 text-sm font-semibold"
          >
            System #{pass.gatePassNo}
          </Badge>
          {pass.manualGatePassNumber != null ? (
            <Badge variant="secondary" className="font-custom h-9 px-3 text-sm">
              Manual #{pass.manualGatePassNumber}
            </Badge>
          ) : null}
        </div>
      </div>

      <Card className="border-primary/15 mb-10 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="border-primary bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold shadow-md transition-colors">
              1
            </div>
            <div className="min-w-0">
              <p className="font-custom text-foreground font-semibold">
                Order details
              </p>
              <p className="text-muted-foreground font-custom text-xs leading-snug">
                Bags by size, type, quantities and kg per bag
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FieldGroup className="gap-8">
          {step === 0 ? (
            <div className="space-y-6">
              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="font-custom flex items-center gap-2 text-lg">
                    <Truck className="text-muted-foreground size-5" />
                    Linked incoming passes
                  </CardTitle>
                  <CardDescription className="font-custom">
                    Read-only reference from the vouchers linked to this grading
                    pass.
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-3 pt-5">
                  <Card className="border-primary/20 bg-muted/20">
                    <CardContent className="space-y-1 p-4">
                      <p className="font-custom text-muted-foreground text-[10px] font-semibold uppercase">
                        Farmer
                      </p>
                      <p className="font-custom text-base font-semibold">
                        {farmerDisplay.name}
                      </p>
                      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                        {farmerDisplay.accountNumber != null ? (
                          <span>Account #{farmerDisplay.accountNumber}</span>
                        ) : null}
                        {farmerDisplay.mobileNumber ? (
                          <span>{farmerDisplay.mobileNumber}</span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                  <ul className="space-y-2">
                    {effectiveIncomingPasses.map((gp, idx) => (
                      <Card key={`${gp._id}-${idx}`} className="shadow-sm">
                        <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4 text-sm">
                          <div className="min-w-0">
                            <Badge
                              variant="outline"
                              className="font-custom mb-1"
                            >
                              Incoming GP #{gp.gatePassNo}
                            </Badge>
                            {gp.location ? (
                              <p className="text-muted-foreground text-xs">
                                {gp.location}
                              </p>
                            ) : null}
                          </div>
                          <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs font-medium tabular-nums">
                            {gp.truckNumber ? (
                              <span>{gp.truckNumber}</span>
                            ) : null}
                            {gp.bagsReceived != null ? (
                              <span>{gp.bagsReceived} bags</span>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="font-custom text-lg">
                    Grading voucher
                  </CardTitle>
                  <CardDescription className="font-custom">
                    Identifiers and grading metadata — same shapes as stored on
                    the grading pass.
                  </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
                  <form.Field
                    name="manualGatePassNumber"
                    children={(field) => (
                      <Field
                        data-invalid={
                          !!(
                            field.state.meta.errors?.length &&
                            field.state.meta.isTouched
                          )
                        }
                      >
                        <FieldLabel
                          htmlFor={field.name}
                          className="font-custom font-semibold"
                        >
                          Manual gate pass no.
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          id={field.name}
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
                            const parsed = Number.parseInt(raw, 10);
                            field.handleChange(
                              Number.isNaN(parsed) ? undefined : parsed
                            );
                          }}
                          onWheel={blurTargetOnNumberWheel}
                          onKeyDown={preventArrowUpDownOnNumericInput}
                          className={cn(
                            'font-custom',
                            businessNumberSpinnerClassName
                          )}
                          aria-invalid={
                            !!(
                              field.state.meta.errors?.length &&
                              field.state.meta.isTouched
                            )
                          }
                        />
                      </Field>
                    )}
                  />

                  <form.Field
                    name="date"
                    children={(field) => (
                      <Field>
                        <FieldLabel className="font-custom font-semibold">
                          Date
                        </FieldLabel>
                        <DatePicker
                          id={`grading-edit-date`}
                          compact
                          label=""
                          value={field.state.value}
                          onChange={field.handleChange}
                        />
                      </Field>
                    )}
                  />

                  <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                    <form.Field
                      name="graderKnownKey"
                      children={(graderKnown) => (
                        <Field>
                          <FieldLabel className="font-custom font-semibold">
                            Grader
                          </FieldLabel>
                          <Select
                            value={
                              KNOWN_GRADERS_SET.has(
                                String(graderKnown.state.value ?? '')
                              ) ||
                              graderKnown.state.value === GRADER_SELECT_CUSTOM
                                ? graderKnown.state.value
                                : GRADER_SELECT_CUSTOM
                            }
                            onValueChange={(v) => {
                              graderKnown.handleChange(v);
                              if (v !== GRADER_SELECT_CUSTOM) {
                                form.setFieldValue('graderCustom', '');
                              }
                            }}
                          >
                            <SelectTrigger className="font-custom focus-visible:ring-primary h-11 w-full">
                              <SelectValue placeholder="Choose grader" />
                            </SelectTrigger>
                            <SelectContent>
                              {GRADER_OPTIONS.map((g) => (
                                <SelectItem
                                  key={g}
                                  value={g}
                                  className="font-custom"
                                >
                                  {g}
                                </SelectItem>
                              ))}
                              <SelectItem
                                value={GRADER_SELECT_CUSTOM}
                                className="font-custom"
                              >
                                Other (custom name)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />
                    <form.Field
                      name="graderCustom"
                      children={(field) =>
                        form.state.values.graderKnownKey ===
                          GRADER_SELECT_CUSTOM ||
                        ((form.state.values.graderKnownKey || '').trim() !==
                          '' &&
                          !KNOWN_GRADERS_SET.has(
                            form.state.values.graderKnownKey ?? ''
                          )) ? (
                          <Field>
                            <FieldLabel
                              htmlFor={field.name}
                              className="font-custom font-semibold"
                            >
                              Custom grader name
                            </FieldLabel>
                            <Input
                              id={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder="Enter grader name"
                              className="font-custom focus-visible:ring-primary h-11"
                            />
                          </Field>
                        ) : null
                      }
                    />
                  </div>

                  <form.Field
                    name="remarks"
                    children={(field) => (
                      <Field className="sm:col-span-2">
                        <FieldLabel
                          htmlFor={field.name}
                          className="font-custom font-semibold"
                        >
                          Remarks
                        </FieldLabel>
                        <Textarea
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          rows={3}
                          placeholder="Grade location, loader notes…"
                          className="font-custom focus-visible:ring-primary min-h-[5rem]"
                        />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="font-custom focus-visible:ring-primary sm:min-w-32"
                  onClick={() =>
                    window.history.length > 1
                      ? window.history.back()
                      : undefined
                  }
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="font-custom focus-visible:ring-primary font-bold shadow-md"
                  onClick={handleNext}
                >
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                  <div>
                    <CardTitle className="font-custom flex items-center gap-2 text-lg">
                      <ClipboardList className="text-muted-foreground size-5" />
                      Size breakdown
                    </CardTitle>
                    <CardDescription className="font-custom">
                      One quantity per row (saved as both current and initial on
                      the voucher) plus kg per bag.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-custom focus-visible:ring-primary shrink-0 gap-2"
                    onClick={() =>
                      form.setFieldValue('orderDetails', [
                        ...(form.state.values.orderDetails ?? []),
                        {
                          size: GRADING_SIZES[4] ?? '30–40',
                          bagType: 'JUTE',
                          quantity: 0,
                          weightPerBagKg: 50.5,
                        },
                      ])
                    }
                  >
                    <Plus className="size-4" />
                    Add row
                  </Button>
                </CardHeader>
                <Separator />

                <CardContent className="space-y-4 pt-6">
                  <div className="border-border rounded-lg border md:hidden">
                    <form.Subscribe
                      selector={(s) => s.values.orderDetails}
                      children={(rows) =>
                        rows.map((row, index) => (
                          <Card
                            key={`m-${index}`}
                            className="rounded-none border-0 shadow-none not-last:border-b first:rounded-t-lg last:rounded-b-lg"
                          >
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <Badge
                                  variant="secondary"
                                  className="font-custom text-xs"
                                >
                                  Row {index + 1}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  className="font-custom text-muted-foreground hover:text-destructive"
                                  aria-label={`Remove row ${index + 1}`}
                                  onClick={() =>
                                    form.setFieldValue(
                                      'orderDetails',
                                      (
                                        form.state.values.orderDetails ?? []
                                      ).filter((_, i) => i !== index)
                                    )
                                  }
                                  disabled={
                                    (form.state.values.orderDetails?.length ??
                                      0) <= 1
                                  }
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <Label className="font-custom mb-2 block text-xs font-medium">
                                    Size
                                  </Label>
                                  <SearchSelector
                                    id={`grading-size-${index}-m`}
                                    options={sizeOptions}
                                    placeholder="Size"
                                    searchPlaceholder="Search size…"
                                    value={row.size}
                                    onSelect={(v) =>
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? { ...r, size: v ?? r.size }
                                            : r
                                        )
                                      )
                                    }
                                    buttonClassName="font-custom h-10 w-full justify-between rounded-md border"
                                  />
                                </div>
                                <div>
                                  <Label className="font-custom mb-2 block text-xs font-medium">
                                    Bag type
                                  </Label>
                                  <Select
                                    value={row.bagType}
                                    onValueChange={(bag) =>
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? { ...r, bagType: bag }
                                            : r
                                        )
                                      )
                                    }
                                  >
                                    <SelectTrigger className="font-custom h-10 w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {BAG_TYPES.map((b) => (
                                        <SelectItem
                                          key={b}
                                          value={b}
                                          className="font-custom"
                                        >
                                          {b}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="font-custom mb-2 block text-xs font-medium">
                                    Quantity
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={
                                      row.quantity === 0 ? '' : row.quantity
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const n =
                                        raw === ''
                                          ? 0
                                          : Number.parseInt(raw, 10);
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? {
                                                ...r,
                                                quantity: Number.isNaN(n)
                                                  ? 0
                                                  : Math.max(0, n),
                                              }
                                            : r
                                        )
                                      );
                                    }}
                                    onWheel={blurTargetOnNumberWheel}
                                    onKeyDown={preventArrowUpDownOnNumericInput}
                                    className={cn(
                                      'font-custom h-10',
                                      businessNumberSpinnerClassName
                                    )}
                                  />
                                </div>
                                <div>
                                  <Label className="font-custom mb-2 block text-xs font-medium">
                                    Kg per bag
                                  </Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={
                                      (row.weightPerBagKg ?? 0) === 0
                                        ? ''
                                        : row.weightPerBagKg
                                    }
                                    onWheel={blurTargetOnNumberWheel}
                                    onKeyDown={preventArrowUpDownOnNumericInput}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      let weightPerBagKg = 0;
                                      if (raw !== '') {
                                        const n = Number.parseFloat(raw);
                                        if (!Number.isNaN(n) && n > 0) {
                                          weightPerBagKg = Math.max(0.01, n);
                                        }
                                      }
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? { ...r, weightPerBagKg }
                                            : r
                                        )
                                      );
                                    }}
                                    className={cn(
                                      'font-custom h-10',
                                      businessNumberSpinnerClassName
                                    )}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      }
                    />
                  </div>

                  <div className="border-border hidden overflow-hidden rounded-xl border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                          <TableHead className="font-custom px-4 text-[10px] font-semibold tracking-wide uppercase">
                            Size
                          </TableHead>
                          <TableHead className="font-custom px-4 text-[10px] font-semibold tracking-wide uppercase">
                            Bag
                          </TableHead>
                          <TableHead className="font-custom px-4 text-[10px] font-semibold tracking-wide uppercase md:text-center">
                            Quantity
                          </TableHead>
                          <TableHead className="font-custom px-4 text-[10px] font-semibold tracking-wide uppercase lg:text-center">
                            Kg / bag
                          </TableHead>
                          <TableHead className="font-custom px-4 text-[10px] font-semibold tracking-wide uppercase lg:w-28">
                            <span className="sr-only md:not-sr-only">
                              Remove
                            </span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <form.Subscribe
                          selector={(s) => s.values.orderDetails}
                          children={(rows) =>
                            rows.map((row, index) => (
                              <TableRow
                                key={`d-${index}`}
                                className="hover:bg-muted/30"
                              >
                                <TableCell className="px-4 py-3 align-middle">
                                  <SearchSelector
                                    id={`grading-size-${index}-d`}
                                    options={sizeOptions}
                                    placeholder="Size"
                                    searchPlaceholder="Search…"
                                    value={row.size}
                                    onSelect={(v) =>
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? { ...r, size: v ?? r.size }
                                            : r
                                        )
                                      )
                                    }
                                    buttonClassName="font-custom h-10 w-[min(12rem,32vw)] max-w-full justify-between rounded-md border"
                                  />
                                </TableCell>
                                <TableCell className="px-4 py-3 align-middle">
                                  <Select
                                    value={row.bagType}
                                    onValueChange={(bag) =>
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? { ...r, bagType: bag }
                                            : r
                                        )
                                      )
                                    }
                                  >
                                    <SelectTrigger className="font-custom h-10 min-w-[5.5rem]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {BAG_TYPES.map((b) => (
                                        <SelectItem
                                          key={b}
                                          value={b}
                                          className="font-custom"
                                        >
                                          {b}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="px-4 py-3 align-middle md:text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={
                                      row.quantity === 0 ? '' : row.quantity
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const n =
                                        raw === ''
                                          ? 0
                                          : Number.parseInt(raw, 10);
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? {
                                                ...r,
                                                quantity: Number.isNaN(n)
                                                  ? 0
                                                  : Math.max(0, n),
                                              }
                                            : r
                                        )
                                      );
                                    }}
                                    onWheel={blurTargetOnNumberWheel}
                                    onKeyDown={preventArrowUpDownOnNumericInput}
                                    className={cn(
                                      'font-custom inline-flex h-10 w-[4.75rem] text-center md:mx-auto',
                                      businessNumberSpinnerClassName
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="px-4 py-3 align-middle lg:text-center">
                                  <Input
                                    type="number"
                                    min={0}
                                    step="any"
                                    value={
                                      (row.weightPerBagKg ?? 0) === 0
                                        ? ''
                                        : row.weightPerBagKg
                                    }
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      let weightPerBagKg = 0;
                                      if (raw !== '') {
                                        const n = Number.parseFloat(raw);
                                        if (!Number.isNaN(n) && n > 0) {
                                          weightPerBagKg = Math.max(0.01, n);
                                        }
                                      }
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).map((r, i) =>
                                          i === index
                                            ? { ...r, weightPerBagKg }
                                            : r
                                        )
                                      );
                                    }}
                                    onWheel={blurTargetOnNumberWheel}
                                    onKeyDown={preventArrowUpDownOnNumericInput}
                                    className={cn(
                                      'font-custom inline-flex h-10 w-[5rem] lg:mx-auto',
                                      businessNumberSpinnerClassName
                                    )}
                                  />
                                </TableCell>
                                <TableCell className="px-4 py-3 text-center align-middle">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    className="font-custom text-muted-foreground hover:text-destructive"
                                    aria-label={`Remove row ${index + 1}`}
                                    disabled={
                                      (form.state.values.orderDetails?.length ??
                                        0) <= 1
                                    }
                                    onClick={() =>
                                      form.setFieldValue(
                                        'orderDetails',
                                        (
                                          form.state.values.orderDetails ?? []
                                        ).filter((_, i) => i !== index)
                                      )
                                    }
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          }
                        />
                      </TableBody>
                    </Table>
                  </div>

                  <form.Subscribe
                    selector={(state) => state.values.orderDetails}
                    children={(orderDetails) => {
                      const totalBags = (orderDetails ?? []).reduce(
                        (s, r) => s + (Number(r.quantity) || 0),
                        0
                      );
                      return (
                        <Card className="bg-muted/15 border-none shadow-inner">
                          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 font-medium">
                            <span className="text-muted-foreground font-custom text-sm">
                              Total bags across sizes
                            </span>
                            <Badge
                              variant="default"
                              className="font-custom h-10 min-w-[3.75rem] justify-center px-4 text-lg font-bold shadow-sm"
                            >
                              {totalBags}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    }}
                  />
                </CardContent>
              </Card>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="font-custom focus-visible:ring-primary font-medium"
                  asChild
                >
                  <Link
                    to="/store-admin/daybook"
                    onClick={() => setDaybookTab('grading')}
                  >
                    Back
                  </Link>
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    className="font-custom focus-visible:ring-primary"
                    onClick={() => form.reset()}
                  >
                    Reset form
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="font-custom focus-visible:ring-primary font-bold shadow-lg"
                  >
                    Review
                    <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </FieldGroup>
      </form>

      <GradingSummarySheet
        open={summaryOpen}
        summary={summaryValues}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open) confirmSaveRef.current = false;
          setSummaryOpen(open);
        }}
        onConfirm={() => {
          confirmSaveRef.current = true;
          setSummaryOpen(false);
          void form.handleSubmit();
        }}
      />
    </main>
  );
});
