import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/date-picker';
import { toDatePickerDisplayValue } from '@/lib/helpers';
import { usePreferencesStore } from '@/stores/store';
import { toast } from 'sonner';
import type {
  EditGradingGatePassInput,
  GradingGatePass,
  GradingGatePassIncomingRef,
  GradingGatePassOrderDetail,
} from '@/types/grading-gate-pass';
import {
  GradingSummarySheet,
  type GradingSummaryFormValues,
} from './-SummarySheet';
import { useEditGradingGatePass } from '@/services/store-admin/grading-gate-pass/useEditGradingGatePass';

const FALLBACK_GRADING_SIZES = [
  'Ration',
  'Seed',
  'Goli',
  'Number-8',
  'Number-10',
  'Number-12',
  'Number-6/4',
  'Cut',
] as const;
const FALLBACK_BAG_TYPES = ['JUTE', 'PP', 'HDPE'] as const;

type SelectedIncomingPassRow = {
  id: string;
  label: string;
  bags: number;
};

type GradingDetailsStepProps = {
  gradingGatePass?: GradingGatePass;
  selectedFarmerName?: string;
  selectedVariety?: string;
  selectedFarmerStorageLinkId?: string;
  isMarkedAsNull?: boolean;
  remarksFocusTrigger?: number;
};

const getIncomingPassLabel = (pass: GradingGatePassIncomingRef): string => {
  if (pass.manualGatePassNumber != null) {
    return String(pass.manualGatePassNumber);
  }
  if (pass.gatePassNo != null) {
    return String(pass.gatePassNo);
  }
  return '--';
};

const normalizeOrderDetails = (details: GradingGatePassOrderDetail[]) =>
  details.map((detail) => ({
    size: detail.size,
    bagType: detail.bagType,
    currentQuantity: detail.currentQuantity,
    initialQuantity: detail.initialQuantity,
    weightPerBagKg: detail.weightPerBagKg,
  }));

const hasMeaningfulOrderDetailValue = (detail: {
  currentQuantity: number;
  weightPerBagKg: number;
}) => detail.currentQuantity > 0 || detail.weightPerBagKg > 0;

const GradingDetailsStep = ({
  gradingGatePass,
  selectedFarmerName,
  selectedVariety,
  selectedFarmerStorageLinkId,
  isMarkedAsNull = false,
  remarksFocusTrigger = 0,
}: GradingDetailsStepProps) => {
  const { mutateAsync: editGradingGatePass, isPending: isSubmitting } =
    useEditGradingGatePass();
  const preferences = usePreferencesStore((s) => s.preferences);

  const graderOptions = useMemo(
    () =>
      (preferences?.custom.graderOptions ?? [])
        .map((g) => g.trim())
        .filter((g) => g.length > 0),
    [preferences?.custom.graderOptions]
  );

  const bagTypes = useMemo(() => {
    const fromPrefs = (preferences?.custom.bagConfig.bagTypes ?? [])
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    return fromPrefs.length > 0 ? fromPrefs : [...FALLBACK_BAG_TYPES];
  }, [preferences?.custom.bagConfig.bagTypes]);

  const gradingSizes = useMemo(() => {
    const fromPrefs = (preferences?.bagSizes ?? [])
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return fromPrefs.length > 0 ? fromPrefs : [...FALLBACK_GRADING_SIZES];
  }, [preferences?.bagSizes]);

  const orderDetailBySize = useMemo(() => {
    const map = new Map<string, GradingGatePassOrderDetail>();
    (gradingGatePass?.orderDetails ?? []).forEach((detail) => {
      if (detail?.size) map.set(detail.size, detail);
    });
    return map;
  }, [gradingGatePass?.orderDetails]);

  const selectedIncomingPasses: SelectedIncomingPassRow[] = useMemo(
    () =>
      (gradingGatePass?.incomingGatePassIds ?? []).map((pass) => ({
        id: pass._id,
        label: getIncomingPassLabel(pass),
        bags: pass.bagsReceived ?? 0,
      })),
    [gradingGatePass?.incomingGatePassIds]
  );

  const totalIncomingBags = useMemo(
    () => selectedIncomingPasses.reduce((sum, p) => sum + (p.bags || 0), 0),
    [selectedIncomingPasses]
  );

  const totalGradedBags = useMemo(
    () =>
      (gradingGatePass?.orderDetails ?? []).reduce(
        (sum, detail) => sum + (detail?.currentQuantity ?? 0),
        0
      ),
    [gradingGatePass?.orderDetails]
  );

  const initialDate = toDatePickerDisplayValue(gradingGatePass?.date);

  const [date, setDate] = useState<string>(initialDate);
  const [grader, setGrader] = useState(gradingGatePass?.grader ?? '');
  const [manualGatePassNumber, setManualGatePassNumber] = useState(
    gradingGatePass?.manualGatePassNumber != null
      ? String(gradingGatePass.manualGatePassNumber)
      : ''
  );
  const [remarks, setRemarks] = useState(gradingGatePass?.remarks ?? '');
  const remarksInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<
    Partial<EditGradingGatePassInput>
  >({});
  const [pendingSummary, setPendingSummary] =
    useState<GradingSummaryFormValues | null>(null);

  const initialGrader = gradingGatePass?.grader ?? '';
  const initialManualGatePassNumber =
    gradingGatePass?.manualGatePassNumber != null
      ? String(gradingGatePass.manualGatePassNumber)
      : '';
  const initialRemarks = gradingGatePass?.remarks ?? '';
  const initialVariety = gradingGatePass?.variety ?? '';
  const initialFarmerStorageLinkId =
    typeof gradingGatePass?.farmerStorageLinkId === 'string'
      ? gradingGatePass.farmerStorageLinkId
      : (gradingGatePass?.farmerStorageLinkId?._id ?? '');
  const [orderDetailsState, setOrderDetailsState] = useState(() =>
    gradingSizes.map((sizeLabel) => {
      const detail = orderDetailBySize.get(sizeLabel);
      return {
        size: sizeLabel,
        bagType: detail?.bagType ?? bagTypes[0] ?? '',
        currentQuantity: detail?.currentQuantity ?? 0,
        initialQuantity: detail?.initialQuantity ?? 0,
        weightPerBagKg: detail?.weightPerBagKg ?? 0,
      };
    })
  );

  const orderDetailStateBySize = useMemo(
    () => new Map(orderDetailsState.map((detail) => [detail.size, detail])),
    [orderDetailsState]
  );

  useEffect(() => {
    if (!isMarkedAsNull) return;
    const focusTimer = requestAnimationFrame(() => {
      remarksInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(focusTimer);
  }, [isMarkedAsNull, remarksFocusTrigger]);

  const setOrderDetailField = (
    size: string,
    field: 'currentQuantity' | 'weightPerBagKg' | 'bagType',
    value: number | string
  ) => {
    setOrderDetailsState((prev) =>
      prev.map((detail) =>
        detail.size === size ? { ...detail, [field]: value } : detail
      )
    );
  };

  const buildOrderDetailsPayload = () =>
    orderDetailsState
      .filter((detail) => hasMeaningfulOrderDetailValue(detail))
      .map((detail) => ({
        size: detail.size,
        bagType: detail.bagType,
        currentQuantity: detail.currentQuantity,
        initialQuantity: detail.initialQuantity,
        weightPerBagKg: detail.weightPerBagKg,
      }));

  const initialOrderDetails = normalizeOrderDetails(
    gradingGatePass?.orderDetails ?? []
  ).filter((detail) => hasMeaningfulOrderDetailValue(detail));

  const buildDiffPayload = (): Partial<EditGradingGatePassInput> => {
    if (isMarkedAsNull) {
      return {
        isMarkedNull: true,
        remarks: remarks.trim(),
      };
    }

    const payload: Partial<EditGradingGatePassInput> = {};

    if (grader !== initialGrader) {
      payload.grader = grader || undefined;
    }

    const nextManualGatePassNumber =
      manualGatePassNumber.trim() === ''
        ? undefined
        : Number(manualGatePassNumber);
    const previousManualGatePassNumber =
      initialManualGatePassNumber.trim() === ''
        ? undefined
        : Number(initialManualGatePassNumber);
    if (nextManualGatePassNumber !== previousManualGatePassNumber) {
      payload.manualGatePassNumber = nextManualGatePassNumber;
    }

    if (date !== initialDate) {
      payload.date = date || undefined;
    }

    if (remarks !== initialRemarks) {
      payload.remarks = remarks || undefined;
    }

    const nextVariety = (selectedVariety ?? '').trim();
    if (nextVariety !== initialVariety) {
      payload.variety = nextVariety || undefined;
    }

    const nextFarmerStorageLinkId = (selectedFarmerStorageLinkId ?? '').trim();
    if (nextFarmerStorageLinkId !== initialFarmerStorageLinkId) {
      payload.farmerStorageLinkId = nextFarmerStorageLinkId || undefined;
    }

    const nextOrderDetails = buildOrderDetailsPayload();
    if (
      JSON.stringify(nextOrderDetails) !== JSON.stringify(initialOrderDetails)
    ) {
      payload.orderDetails = nextOrderDetails;
    }

    return payload;
  };

  const buildSummaryValues = (): GradingSummaryFormValues => {
    const farmerStorageLink =
      typeof gradingGatePass?.farmerStorageLinkId === 'string'
        ? undefined
        : gradingGatePass?.farmerStorageLinkId;
    const farmer = farmerStorageLink?.farmerId;

    return {
      gatePassNo: gradingGatePass?.gatePassNo ?? 0,
      manualGatePassNumber:
        manualGatePassNumber.trim() === ''
          ? undefined
          : Number(manualGatePassNumber),
      dateDisplay: date || '—',
      variety: gradingGatePass?.variety ?? '—',
      grader,
      remarks,
      allocationStatus: gradingGatePass?.allocationStatus ?? 'UNALLOCATED',
      orderDetails: buildOrderDetailsPayload().map((detail) => ({
        size: detail.size,
        bagType: detail.bagType,
        quantity: detail.currentQuantity,
        weightPerBagKg: detail.weightPerBagKg,
      })),
      farmer: {
        name: farmer?.name ?? '—',
        accountNumber: farmerStorageLink?.accountNumber,
        mobileNumber: farmer?.mobileNumber,
        address: farmer?.address,
      },
      incomingLines: (gradingGatePass?.incomingGatePassIds ?? []).map(
        (line) => ({
          gatePassNo: line.gatePassNo,
          manualGatePassNumber: line.manualGatePassNumber,
          truckNumber: line.truckNumber,
          bagsReceived: line.bagsReceived,
          remarks: line.remarks,
        })
      ),
      gradedByLabel:
        typeof gradingGatePass?.createdBy === 'object'
          ? gradingGatePass.createdBy.name
          : undefined,
    };
  };

  const onConfirmUpdate = async () => {
    if (!gradingGatePass?._id) {
      toast.error('Missing grading gate pass id');
      return;
    }

    if (Object.keys(pendingPayload).length === 0) {
      toast.info('No changes to update');
      setIsSummaryOpen(false);
      return;
    }

    try {
      await editGradingGatePass({
        gradingGatePassId: gradingGatePass._id,
        ...pendingPayload,
      });
      setIsSummaryOpen(false);
    } catch {
      // Error toast is handled in useEditGradingGatePass
    }
  };

  return (
    <>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();

          const payload = buildDiffPayload();
          const summary = buildSummaryValues();

          setPendingPayload(payload);
          setPendingSummary(summary);
          setIsSummaryOpen(true);
        }}
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
                        key={pass.id}
                        className="border-border/40 border-b last:border-0"
                      >
                        <td className="text-foreground px-4 py-2.5 font-medium">
                          #{pass.label}
                        </td>
                        <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                          {pass.bags}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-border/60 bg-muted/30 font-semibold">
                      <td className="text-foreground px-4 py-3">Total</td>
                      <td className="text-foreground px-4 py-3 text-right tabular-nums">
                        {totalIncomingBags}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="font-custom text-foreground text-base font-semibold sm:text-lg">
              Selected farmer and variety
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="bg-background rounded-lg border border-white/60 p-3 shadow-sm">
                <p className="font-custom text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Farmer
                </p>
                <p className="font-custom text-foreground mt-1 text-sm font-semibold sm:text-base">
                  {selectedFarmerName || '—'}
                </p>
              </div>

              <div className="bg-background rounded-lg border border-white/60 p-3 shadow-sm">
                <p className="font-custom text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Variety
                </p>
                <p className="font-custom text-foreground mt-1 text-sm font-semibold sm:text-base">
                  {selectedVariety || '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <FieldGroup className="space-y-6">
          <Field>
            <FieldLabel
              htmlFor="grading-grader"
              className="font-custom text-base font-semibold"
            >
              Grader
            </FieldLabel>
            <select
              id="grading-grader"
              value={grader}
              onChange={(e) => setGrader(e.target.value)}
              disabled={isMarkedAsNull}
              className="border-input bg-background focus-visible:ring-primary font-custom h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="">Select grader</option>
              {/* Preserve the existing grader value even if it's no longer in preferences */}
              {initialGrader && !graderOptions.includes(initialGrader) && (
                <option value={initialGrader}>{initialGrader}</option>
              )}
              {graderOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

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
              placeholder=""
              value={manualGatePassNumber}
              onChange={(e) => setManualGatePassNumber(e.target.value)}
              disabled={isMarkedAsNull}
              className="font-custom [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </Field>

          <Field>
            <div className={isMarkedAsNull ? 'pointer-events-none' : ''}>
              <DatePicker
                label="Date"
                id="grading-date"
                value={date}
                onChange={setDate}
              />
            </div>
          </Field>

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
                {gradingSizes.map((sizeLabel) => {
                  const detail = orderDetailBySize.get(sizeLabel);
                  const detailState =
                    orderDetailStateBySize.get(sizeLabel) ??
                    ({
                      size: sizeLabel,
                      bagType: bagTypes[0] ?? '',
                      currentQuantity: 0,
                      initialQuantity: 0,
                      weightPerBagKg: 0,
                    } as const);
                  const defaultBagType =
                    detailState.bagType &&
                    bagTypes.includes(detailState.bagType)
                      ? detailState.bagType
                      : (bagTypes[0] ?? '');
                  return (
                    <Fragment key={sizeLabel}>
                      <span className="font-custom text-foreground text-sm font-medium md:text-base">
                        {sizeLabel}
                      </span>
                      <Field className="min-w-0">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          placeholder="Qty"
                          value={detailState.currentQuantity || ''}
                          onChange={(e) =>
                            setOrderDetailField(
                              sizeLabel,
                              'currentQuantity',
                              Number(e.target.value || 0)
                            )
                          }
                          disabled={isMarkedAsNull}
                          className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </Field>
                      <Field className="min-w-0">
                        <select
                          value={defaultBagType}
                          onChange={(e) =>
                            setOrderDetailField(
                              sizeLabel,
                              'bagType',
                              e.target.value
                            )
                          }
                          disabled={isMarkedAsNull}
                          className="border-input bg-background focus-visible:ring-primary font-custom h-9 w-full rounded-md border px-3 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                        >
                          {/* Preserve the existing bag type if it's not in preferences */}
                          {detail?.bagType &&
                            !bagTypes.includes(detail.bagType) && (
                              <option value={detail.bagType}>
                                {detail.bagType}
                              </option>
                            )}
                          {bagTypes.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field className="min-w-0">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="Wt"
                          value={detailState.weightPerBagKg || ''}
                          onChange={(e) =>
                            setOrderDetailField(
                              sizeLabel,
                              'weightPerBagKg',
                              Number(e.target.value || 0)
                            )
                          }
                          disabled={isMarkedAsNull}
                          className="font-custom h-9 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                      </Field>
                    </Fragment>
                  );
                })}
                <div className="col-span-4 lg:col-span-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="font-custom"
                    disabled={isMarkedAsNull}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Size
                  </Button>
                </div>
              </div>

              <div className="space-y-4 md:hidden">
                {gradingSizes.map((sizeLabel, index) => {
                  const detail = orderDetailBySize.get(sizeLabel);
                  const detailState =
                    orderDetailStateBySize.get(sizeLabel) ??
                    ({
                      size: sizeLabel,
                      bagType: bagTypes[0] ?? '',
                      currentQuantity: 0,
                      initialQuantity: 0,
                      weightPerBagKg: 0,
                    } as const);
                  const defaultBagType =
                    detailState.bagType &&
                    bagTypes.includes(detailState.bagType)
                      ? detailState.bagType
                      : (bagTypes[0] ?? '');
                  return (
                    <div
                      key={sizeLabel}
                      className="border-border/40 bg-muted/20 flex flex-col gap-4 rounded-lg border p-4"
                    >
                      <span className="font-custom text-foreground text-base font-semibold">
                        {sizeLabel}
                      </span>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                            value={detailState.currentQuantity || ''}
                            onChange={(e) =>
                              setOrderDetailField(
                                sizeLabel,
                                'currentQuantity',
                                Number(e.target.value || 0)
                              )
                            }
                            disabled={isMarkedAsNull}
                            className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </Field>
                        <Field>
                          <label
                            htmlFor={`bag-m-${index}`}
                            className="text-muted-foreground font-custom mb-1 block text-xs font-medium"
                          >
                            Bag Type
                          </label>
                          <select
                            id={`bag-m-${index}`}
                            value={defaultBagType}
                            onChange={(e) =>
                              setOrderDetailField(
                                sizeLabel,
                                'bagType',
                                e.target.value
                              )
                            }
                            disabled={isMarkedAsNull}
                            className="border-input bg-background focus-visible:ring-primary font-custom h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                          >
                            {detail?.bagType &&
                              !bagTypes.includes(detail.bagType) && (
                                <option value={detail.bagType}>
                                  {detail.bagType}
                                </option>
                              )}
                            {bagTypes.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </Field>
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
                            value={detailState.weightPerBagKg || ''}
                            onChange={(e) =>
                              setOrderDetailField(
                                sizeLabel,
                                'weightPerBagKg',
                                Number(e.target.value || 0)
                              )
                            }
                            disabled={isMarkedAsNull}
                            className="font-custom h-10 w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-custom w-full"
                  disabled={isMarkedAsNull}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Size
                </Button>
              </div>
            </div>

            <div className="border-border/60 bg-muted/30 flex items-center justify-between rounded-lg border px-4 py-2.5">
              <span className="font-custom text-foreground text-sm font-semibold">
                Total bags
              </span>
              <span className="font-custom font-medium tabular-nums">
                {totalGradedBags}
              </span>
            </div>

            <span className="text-muted-foreground block text-xs">
              Quantity / Approx Weight (kg)
            </span>
          </div>

          <Field>
            <FieldLabel
              htmlFor="grading-remarks"
              className="font-custom text-base font-semibold"
            >
              Remarks
            </FieldLabel>
            <textarea
              ref={remarksInputRef}
              id="grading-remarks"
              placeholder="Max 500 characters"
              maxLength={500}
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-primary font-custom flex w-full rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>
        </FieldGroup>

        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end sm:gap-4">
          <Button
            type="button"
            variant="outline"
            className="font-custom order-3 w-full sm:order-1 sm:w-auto"
          >
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            className="font-custom order-2 w-full sm:order-2 sm:w-auto"
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="default"
            size="lg"
            className="font-custom order-1 w-full px-8 font-bold sm:order-3 sm:w-auto"
          >
            Review & Create
          </Button>
        </div>
      </form>

      {pendingSummary ? (
        <GradingSummarySheet
          open={isSummaryOpen}
          onOpenChange={setIsSummaryOpen}
          summary={pendingSummary}
          isPending={isSubmitting}
          onConfirm={onConfirmUpdate}
          confirmLabel="Update"
          pendingLabel="Updating..."
        />
      ) : null}
    </>
  );
};

export default GradingDetailsStep;
