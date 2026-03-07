import { memo, useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  User,
  Package,
  Layers,
  AlertTriangle,
  Calculator,
  ArrowDownToLine,
} from 'lucide-react';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { PassVoucherData } from './types';
import type { GradingOrderDetailRow } from './types';
import { totalBagsFromOrderDetails, type VoucherFarmerInfo } from './types';
import {
  computeGradingOrderTotals,
  computeIncomingNetProductKg,
  computeTotalGradedWeightPercent,
  computeWastagePercentOfNetProduct,
  computeDiscrepancy,
  getBagWeightKg,
} from './grading-voucher-calculations';
import { Spinner } from '@/components/ui/spinner';
import { GradingVoucherCalculationsDialog } from './grading-voucher-calculations-dialog';
import { useStore } from '@/stores/store';
import { JUTE_BAG_WEIGHT } from '@/components/forms/grading/constants';

/** Format number for display without rounding (full precision). */
function formatNumber(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 10 });
}

/** Format wastage values to 2 decimal places. */
function formatWastage(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Format weight % values to 2 decimal places. */
function formatWeightPercent(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Weight slip on an incoming gate pass (from weight slip details) */
export interface IncomingWeightSlip {
  grossWeightKg?: number;
  tareWeightKg?: number;
}

/** Incoming gate pass ref shown in grading voucher (source of graded material) */
export interface IncomingGatePassRef {
  _id: string;
  gatePassNo: number;
  manualGatePassNumber?: number;
  bagsReceived?: number;
  location?: string;
  /** Present when populated from weight slip details; net = grossWeightKg − tareWeightKg */
  weightSlip?: IncomingWeightSlip;
}

export interface GradingVoucherProps extends VoucherFarmerInfo {
  voucher: PassVoucherData;
  farmerStorageLinkId?: string;
  wastageKg?: number;
  wastagePercent?: number;
  incomingNetKg?: number;
  incomingBagsCount?: number;
  /** Incoming gate passes from which this grading was done */
  incomingGatePassIds?: IncomingGatePassRef[];
}

const GradingVoucher = memo(function GradingVoucher({
  voucher,
  farmerName,
  farmerAccount,
  farmerStorageLinkId: _farmerStorageLinkId,
  wastageKg,
  wastagePercent,
  incomingNetKg,
  incomingBagsCount,
  incomingGatePassIds = [],
}: GradingVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const admin = useStore((s) => s.admin);
  const isAdmin = admin?.role === 'Admin';

  const bags = totalBagsFromOrderDetails(voucher.orderDetails);
  const allocationStatus = voucher.allocationStatus ?? '';
  const gradedBy = voucher.createdBy;
  const gradedByName = voucher.grader ?? gradedBy?.name;

  const details = (voucher.orderDetails ?? []) as GradingOrderDetailRow[];
  const {
    totalQty,
    totalInitial,
    totalGradedWeightKg,
    totalGradedWeightGrossKg,
    totalBagWeightDeductionKg,
  } = useMemo(
    () => computeGradingOrderTotals(voucher.orderDetails),
    [voucher.orderDetails]
  );
  const allOrderDetails = details;

  const incomingNetProductKg = computeIncomingNetProductKg(
    incomingNetKg,
    incomingBagsCount
  );

  /** Total incoming bags (from props or sum of gate passes) for bardana deduction. */
  const totalIncomingBags =
    incomingBagsCount ??
    (incomingGatePassIds.length > 0
      ? incomingGatePassIds.reduce(
          (sum, ref) => sum + (ref.bagsReceived ?? 0),
          0
        )
      : undefined);

  const hasIncomingWeightSlips = incomingGatePassIds.some(
    (ref) =>
      ref.weightSlip?.grossWeightKg != null &&
      ref.weightSlip?.tareWeightKg != null
  );
  const totalIncomingNetFromSlips = hasIncomingWeightSlips
    ? incomingGatePassIds.reduce((sum, ref) => {
        const ws = ref.weightSlip;
        if (ws?.grossWeightKg != null && ws?.tareWeightKg != null) {
          return sum + (ws.grossWeightKg - ws.tareWeightKg);
        }
        return sum;
      }, 0)
    : undefined;

  const effectiveIncomingNetKg =
    incomingNetKg ??
    (totalIncomingNetFromSlips && totalIncomingNetFromSlips > 0
      ? totalIncomingNetFromSlips
      : undefined);

  /** Incoming net product (kg): incoming weight minus bardana (incoming bags × JUTE_BAG_WEIGHT). */
  const effectiveIncomingNetProductKg =
    effectiveIncomingNetKg != null && totalIncomingBags != null
      ? effectiveIncomingNetKg - totalIncomingBags * JUTE_BAG_WEIGHT
      : incomingNetProductKg;

  const effectiveGradingWastageKg =
    effectiveIncomingNetProductKg != null && effectiveIncomingNetProductKg > 0
      ? Math.max(0, effectiveIncomingNetProductKg - totalGradedWeightKg)
      : undefined;
  const effectiveGradingWastagePercent =
    effectiveIncomingNetProductKg != null &&
    effectiveIncomingNetProductKg > 0 &&
    effectiveGradingWastageKg != null
      ? (effectiveGradingWastageKg / effectiveIncomingNetProductKg) * 100
      : undefined;

  const totalGradedWeightPercent = computeTotalGradedWeightPercent(
    totalGradedWeightKg,
    effectiveIncomingNetProductKg ?? incomingNetProductKg
  );
  const wastagePercentOfNetProduct = computeWastagePercentOfNetProduct(
    wastageKg,
    effectiveIncomingNetProductKg ?? incomingNetProductKg
  );
  const { percentSum, hasDiscrepancy, discrepancyValue } = computeDiscrepancy(
    totalGradedWeightPercent,
    wastagePercentOfNetProduct
  );

  const handlePrint = async () => {
    // Open window synchronously so mobile popup blockers allow it
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsPrinting(true);
    try {
      const [{ pdf }, { GradingVoucherPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/GradingVoucherPdf'),
      ]);

      const blob = await pdf(
        <GradingVoucherPdf
          voucher={voucher}
          farmerName={farmerName}
          farmerAccount={farmerAccount}
          orderDetails={allOrderDetails}
          totals={{
            totalQty,
            totalInitial,
            totalGradedWeightKg,
            totalGradedWeightGrossKg,
            totalBagWeightDeductionKg,
          }}
          totalGradedWeightPercent={totalGradedWeightPercent}
          wastageKg={wastageKg}
          wastagePercentOfNetProduct={wastagePercentOfNetProduct}
          hasDiscrepancy={hasDiscrepancy}
          discrepancyValue={discrepancyValue}
          percentSum={percentSum}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-4 pt-2 pb-4">
        <CardHeader className="px-0 pt-3 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  GGP{' '}
                  <span className="text-primary">
                    #{voucher.gatePassNo ?? '—'}
                  </span>
                  {voucher.manualGatePassNumber != null && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · Manual #{voucher.manualGatePassNumber}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {formatVoucherDate(voucher.date)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="px-2 py-0.5 text-[10px] font-medium"
              >
                {formatNumber(bags)} bags
              </Badge>
              {allocationStatus && (
                <Badge
                  variant="outline"
                  className="px-2 py-0.5 text-[10px] font-medium capitalize"
                >
                  {allocationStatus.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailRow label="Farmer" value={farmerName ?? '—'} icon={User} />
          <DetailRow label="Account" value={`#${farmerAccount ?? '—'}`} />
          <DetailRow
            label="Variety"
            value={voucher.variety ?? '—'}
            icon={Package}
          />
          <DetailRow label="Grader" value={gradedByName ?? '—'} icon={Layers} />
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((p) => !p)}
              className="hover:bg-accent h-9 min-h-9 px-3 text-xs sm:h-8 sm:min-h-0"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  More
                </>
              )}
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalculationsOpen(true)}
                className="font-custom h-9 min-h-9 gap-1.5 px-3 text-xs sm:h-8 sm:min-h-0"
                aria-label="Show calculations"
              >
                <Calculator className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Show calculations</span>
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint()}
            disabled={isPrinting}
            className="h-9 w-9 shrink-0 p-0 sm:h-8 sm:w-8"
            aria-label={isPrinting ? 'Generating PDF…' : 'Print gate pass'}
          >
            {isPrinting ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <GradingVoucherCalculationsDialog
          open={calculationsOpen}
          onOpenChange={setCalculationsOpen}
          gatePassNo={voucher.gatePassNo}
          allOrderDetails={allOrderDetails}
          totalQty={totalQty}
          totalInitial={totalInitial}
          totalGradedWeightKg={totalGradedWeightKg}
          totalGradedWeightGrossKg={totalGradedWeightGrossKg}
          totalBagWeightDeductionKg={totalBagWeightDeductionKg}
          incomingNetKg={incomingNetKg}
          incomingBagsCount={incomingBagsCount ?? totalIncomingBags}
          incomingNetProductKg={
            effectiveIncomingNetProductKg ?? incomingNetProductKg
          }
          totalGradedWeightPercent={totalGradedWeightPercent}
          wastageKg={wastageKg}
          wastagePercent={wastagePercentOfNetProduct}
          percentSum={percentSum}
          hasDiscrepancy={hasDiscrepancy}
          discrepancyValue={discrepancyValue}
        />

        {isExpanded && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              {incomingGatePassIds.length > 0 && (
                <>
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                      <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
                      Incoming Gate Passes
                    </h4>
                    <div className="bg-muted/30 overflow-x-auto rounded-lg p-3">
                      <table className="font-custom w-full min-w-[280px] text-sm">
                        <thead>
                          <tr className="text-muted-foreground/70 border-b text-left text-[10px] font-medium tracking-wider uppercase">
                            <th className="pr-3 pb-2">Gate Pass No.</th>
                            <th className="pr-3 pb-2">Manual No.</th>
                            <th className="pr-3 pb-2">Location</th>
                            <th className="pb-2 text-right">Bags Received</th>
                            {hasIncomingWeightSlips && (
                              <>
                                <th className="pb-2 text-right">Gross (kg)</th>
                                <th className="pb-2 text-right">Tare (kg)</th>
                                <th className="pb-2 text-right">Net (kg)</th>
                                <th className="pb-2 text-right">
                                  Bardana (kg)
                                </th>
                                <th className="pb-2 text-right">
                                  Net product (kg)
                                </th>
                              </>
                            )}
                            {!hasIncomingWeightSlips &&
                              totalIncomingBags != null && (
                                <th className="pb-2 text-right">
                                  Bardana (kg)
                                </th>
                              )}
                          </tr>
                        </thead>
                        <tbody>
                          {incomingGatePassIds.map((ref) => {
                            const ws = ref.weightSlip;
                            const bags = ref.bagsReceived ?? 0;
                            const bardanaKg = bags * JUTE_BAG_WEIGHT;
                            const netKg =
                              ws?.grossWeightKg != null &&
                              ws?.tareWeightKg != null
                                ? ws.grossWeightKg - ws.tareWeightKg
                                : null;
                            const netProductKg =
                              netKg != null ? netKg - bardanaKg : null;
                            return (
                              <tr
                                key={ref._id}
                                className="border-border/40 border-b last:border-b-0"
                              >
                                <td className="py-2.5 pr-3 font-medium tabular-nums">
                                  #{ref.gatePassNo ?? '—'}
                                </td>
                                <td className="py-2.5 pr-3 tabular-nums">
                                  {ref.manualGatePassNumber != null
                                    ? `#${ref.manualGatePassNumber}`
                                    : '—'}
                                </td>
                                <td className="py-2.5 pr-3 text-left">
                                  {ref.location ?? '—'}
                                </td>
                                <td className="py-2.5 text-right font-medium tabular-nums">
                                  {formatNumber(bags)}
                                </td>
                                {hasIncomingWeightSlips && (
                                  <>
                                    <td className="py-2.5 pr-3 text-right tabular-nums">
                                      {ws?.grossWeightKg != null
                                        ? formatNumber(ws.grossWeightKg)
                                        : '—'}
                                    </td>
                                    <td className="py-2.5 pr-3 text-right tabular-nums">
                                      {ws?.tareWeightKg != null
                                        ? formatNumber(ws.tareWeightKg)
                                        : '—'}
                                    </td>
                                    <td className="py-2.5 text-right font-medium tabular-nums">
                                      {netKg != null
                                        ? formatNumber(netKg)
                                        : '—'}
                                    </td>
                                    <td className="text-muted-foreground py-2.5 pr-3 text-right tabular-nums">
                                      {formatNumber(bardanaKg)}
                                    </td>
                                    <td className="py-2.5 text-right font-medium tabular-nums">
                                      {netProductKg != null
                                        ? formatNumber(netProductKg)
                                        : '—'}
                                    </td>
                                  </>
                                )}
                                {!hasIncomingWeightSlips &&
                                  totalIncomingBags != null && (
                                    <td className="text-muted-foreground py-2.5 text-right tabular-nums">
                                      {formatNumber(bardanaKg)}
                                    </td>
                                  )}
                              </tr>
                            );
                          })}
                          <tr className="border-border/60 bg-muted/50 text-primary border-t-2 font-semibold">
                            <td className="py-2.5 pr-3" colSpan={3}>
                              Total bags
                            </td>
                            <td className="py-2.5 text-right tabular-nums">
                              {formatNumber(
                                incomingGatePassIds.reduce(
                                  (sum, ref) => sum + (ref.bagsReceived ?? 0),
                                  0
                                )
                              )}
                            </td>
                            {hasIncomingWeightSlips && (
                              <>
                                <td className="py-2.5 pr-3" colSpan={2} />
                                <td className="py-2.5 text-right tabular-nums">
                                  {typeof totalIncomingNetFromSlips === 'number'
                                    ? formatNumber(totalIncomingNetFromSlips)
                                    : '—'}
                                </td>
                                <td className="text-muted-foreground py-2.5 pr-3 text-right tabular-nums">
                                  {totalIncomingBags != null
                                    ? formatNumber(
                                        totalIncomingBags * JUTE_BAG_WEIGHT
                                      )
                                    : '—'}
                                </td>
                                <td className="py-2.5 text-right tabular-nums">
                                  {effectiveIncomingNetProductKg != null
                                    ? formatNumber(
                                        effectiveIncomingNetProductKg
                                      )
                                    : '—'}
                                </td>
                              </>
                            )}
                            {!hasIncomingWeightSlips &&
                              totalIncomingBags != null && (
                                <td className="text-muted-foreground py-2.5 text-right tabular-nums">
                                  {formatNumber(
                                    totalIncomingBags * JUTE_BAG_WEIGHT
                                  )}
                                </td>
                              )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <Separator />
                </>
              )}
              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Order Details
                </h4>
                <div className="bg-muted/30 overflow-x-auto rounded-lg p-3">
                  <table className="font-custom w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="text-muted-foreground/70 border-b text-left text-[10px] font-medium tracking-wider uppercase">
                        <th className="pr-3 pb-2">Size</th>
                        <th className="pr-3 pb-2">Bag Type</th>
                        <th className="pr-3 pb-2 text-right">Qty</th>
                        <th className="pr-3 pb-2 text-right">Weight %</th>
                        <th className="pb-2 text-right">Wt/Bag (kg)</th>
                        <th className="pb-2 text-right">Bag wt (kg)</th>
                        <th className="pb-2 text-right">Deduction (kg)</th>
                        <th className="pb-2 text-right">Net (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalGradedWeight =
                          totalGradedWeightGrossKg > 0
                            ? totalGradedWeightGrossKg
                            : 0;
                        return (
                          <>
                            {allOrderDetails.map((od, idx) => {
                              const qty = od.initialQuantity ?? 0;
                              const wt = od.weightPerBagKg ?? 0;
                              const bagWt = getBagWeightKg(od.bagType);
                              const rowGross = qty * wt;
                              const rowDeduction = qty * bagWt;
                              const rowNet = rowGross - rowDeduction;
                              const weightPct =
                                totalGradedWeight > 0
                                  ? (rowGross / totalGradedWeight) * 100
                                  : 0;
                              return (
                                <tr
                                  key={`${od.size}-${od.bagType}-${idx}`}
                                  className="border-border/40 border-b"
                                >
                                  <td className="py-2 pr-3 font-medium">
                                    {od.size ?? '—'}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {od.bagType ?? '—'}
                                  </td>
                                  <td className="py-2 pr-3 text-right font-medium">
                                    {formatNumber(qty)}
                                  </td>
                                  <td className="py-2 pr-3 text-right tabular-nums">
                                    {formatWeightPercent(weightPct)}%
                                  </td>
                                  <td className="py-2 pr-3 text-right">
                                    {formatNumber(wt)}
                                  </td>
                                  <td className="text-muted-foreground py-2 pr-3 text-right tabular-nums">
                                    {formatNumber(bagWt)}
                                  </td>
                                  <td className="text-muted-foreground py-2 pr-3 text-right tabular-nums">
                                    {formatNumber(rowDeduction)}
                                  </td>
                                  <td className="py-2 text-right font-medium tabular-nums">
                                    {formatNumber(rowNet)}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-border/60 bg-muted/50 text-primary border-t-2 font-semibold">
                              <td className="py-2.5 pr-3" colSpan={2}>
                                Total
                              </td>
                              <td className="py-2.5 pr-3 text-right">
                                {formatNumber(totalInitial)}
                              </td>
                              <td className="py-2.5 pr-3 text-right tabular-nums">
                                {totalGradedWeight > 0
                                  ? `${formatWeightPercent(100)}%`
                                  : '—'}
                              </td>
                              <td className="py-2.5 pr-3 text-right font-medium">
                                {formatNumber(totalGradedWeightGrossKg)}
                              </td>
                              <td className="py-2.5 pr-3" />
                              <td className="text-muted-foreground py-2.5 pr-3 text-right tabular-nums">
                                {formatNumber(totalBagWeightDeductionKg)}
                              </td>
                              <td className="py-2.5 text-right font-medium tabular-nums">
                                {formatNumber(totalGradedWeightKg)}
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>

              <Separator />
              <section>
                <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                  Total graded weight
                </h4>
                <div className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2.5">
                  <Package
                    className="text-primary h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <span className="text-primary font-custom text-sm font-medium tabular-nums">
                    {formatWastage(totalGradedWeightKg)} kg
                    {totalGradedWeightPercent !== undefined && (
                      <>
                        {' '}
                        <span className="text-primary/90">
                          ({formatWeightPercent(totalGradedWeightPercent)}% of
                          net)
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </section>

              {effectiveIncomingNetKg != null && effectiveIncomingNetKg > 0 && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                      Grading wastage
                    </h4>
                    <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5">
                      <Package
                        className="h-4 w-4 shrink-0 text-amber-600"
                        aria-hidden
                      />
                      <span className="font-custom text-sm font-medium text-amber-700 tabular-nums dark:text-amber-600">
                        {effectiveGradingWastageKg != null &&
                          `${formatWastage(effectiveGradingWastageKg)} kg`}
                        {effectiveGradingWastageKg != null &&
                          effectiveGradingWastagePercent != null &&
                          ' · '}
                        {effectiveGradingWastagePercent != null && (
                          <>
                            {formatWastage(effectiveGradingWastagePercent)}% of
                            incoming (net)
                          </>
                        )}
                      </span>
                    </div>
                  </section>
                </>
              )}

              {wastageKg !== undefined && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                      Wastage
                    </h4>
                    <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-lg border px-3 py-2.5">
                      <AlertTriangle
                        className="text-destructive h-4 w-4 shrink-0"
                        aria-hidden
                      />
                      <span className="text-destructive font-custom text-sm font-medium tabular-nums">
                        {formatWastage(wastageKg)} kg
                        {wastagePercent !== undefined && (
                          <>
                            {' '}
                            <span className="text-destructive/90">
                              ({formatWastage(wastagePercent)}% of net)
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </section>
                </>
              )}

              {hasDiscrepancy &&
                discrepancyValue !== undefined &&
                percentSum != null && (
                  <>
                    <Separator />
                    <section>
                      <h4 className="text-destructive mb-2 text-xs font-semibold tracking-wider uppercase">
                        Discrepancy
                      </h4>
                      <div className="border-destructive bg-destructive/10 flex items-center gap-2 rounded-lg border-2 px-3 py-2.5">
                        <AlertTriangle
                          className="text-destructive h-4 w-4 shrink-0"
                          aria-hidden
                        />
                        <span className="text-destructive font-custom text-sm font-semibold tabular-nums">
                          Graded + Wastage = {formatNumber(percentSum)}%
                          (expected 100%). Discrepancy:{' '}
                          {discrepancyValue >= 0 ? '+' : ''}
                          {formatNumber(discrepancyValue)}%
                        </span>
                      </div>
                    </section>
                  </>
                )}

              {voucher.remarks != null && voucher.remarks !== '' && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Remarks
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground text-sm font-medium">
                        {voucher.remarks}
                      </p>
                    </div>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
});

export { GradingVoucher };
