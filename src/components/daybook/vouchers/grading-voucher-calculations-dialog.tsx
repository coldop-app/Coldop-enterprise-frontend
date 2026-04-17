import { memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import { getBagWeightKg } from './grading-voucher-calculations';
import type { GradingOrderDetailRow } from './types';

export interface GradingVoucherCalculationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gatePassNo: string | number | undefined;
  allOrderDetails: GradingOrderDetailRow[];
  totalQty: number;
  totalInitial: number;
  totalGradedWeightKg: number;
  totalGradedWeightGrossKg: number;
  totalBagWeightDeductionKg: number;
  incomingNetKg: number | undefined;
  incomingBagsCount: number | undefined;
  incomingNetProductKg: number | undefined;
  totalGradedWeightPercent: number | undefined;
  wastageKg: number | undefined;
  wastagePercent: number | undefined;
  percentSum: number | undefined;
  hasDiscrepancy: boolean;
  discrepancyValue: number | undefined;
}

const fmt = (n: number, decimals = 1) =>
  n.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const roundTo2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const GradingVoucherCalculationsDialog = memo(
  function GradingVoucherCalculationsDialog({
    open,
    onOpenChange,
    gatePassNo,
    allOrderDetails,
    totalQty: _totalQty,
    totalInitial,
    totalGradedWeightKg,
    totalGradedWeightGrossKg,
    totalBagWeightDeductionKg,
    incomingNetKg,
    incomingBagsCount,
    incomingNetProductKg,
    totalGradedWeightPercent,
    wastageKg,
    wastagePercent,
    percentSum,
    hasDiscrepancy,
    discrepancyValue,
  }: GradingVoucherCalculationsDialogProps) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="font-custom flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-custom text-lg font-bold">
              Calculations — GGP #{gatePassNo ?? '—'}
            </DialogTitle>
          </DialogHeader>
          <Tabs
            defaultValue="step1"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <TabsList className="font-custom bg-muted h-auto w-full flex-wrap gap-1 p-1">
              <TabsTrigger value="step1" className="text-xs">
                Step 1
              </TabsTrigger>
              <TabsTrigger value="step2" className="text-xs">
                Step 2
              </TabsTrigger>
              <TabsTrigger value="step3" className="text-xs">
                Step 3
              </TabsTrigger>
              <TabsTrigger value="step4" className="text-xs">
                Step 4
              </TabsTrigger>
              <TabsTrigger value="step5" className="text-xs">
                Step 5
              </TabsTrigger>
              <TabsTrigger value="step6" className="text-xs">
                Step 6
              </TabsTrigger>
            </TabsList>
            <div className="mt-3 flex-1 overflow-y-auto text-sm">
              <TabsContent value="step1" className="mt-0 outline-none">
                <h4 className="text-muted-foreground/80 mb-2 font-semibold">
                  Step 1: Total graded product weight (bag weight removed)
                </h4>
                <div className="bg-muted/30 space-y-3 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">
                    For each row: Line gross = Initial qty × Weight per bag
                    (kg). Bag deduction = Initial qty × Bag weight (JUTE{' '}
                    {JUTE_BAG_WEIGHT} kg, LENO {LENO_BAG_WEIGHT} kg). Line
                    product = Line gross − Bag deduction.
                  </p>
                  <p className="text-muted-foreground text-xs font-medium">
                    Per row:
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {allOrderDetails.map((od, idx) => {
                      const qty = roundTo2(od.initialQuantity ?? 0);
                      const wt = roundTo2(od.weightPerBagKg ?? 0);
                      const bagWt = roundTo2(getBagWeightKg(od.bagType));
                      const lineGross = roundTo2(qty * wt);
                      const bagDeduction = roundTo2(qty * bagWt);
                      const lineProduct = roundTo2(lineGross - bagDeduction);
                      const bagLabel =
                        (od.bagType?.toUpperCase() ?? '') === 'JUTE'
                          ? 'JUTE'
                          : 'LENO';
                      return (
                        <li
                          key={`${od.size}-${od.bagType}-${idx}`}
                          className="space-y-0.5 font-mono"
                        >
                          Row {idx + 1} — {od.size ?? '—'} ({od.bagType ?? '—'}
                          ): Line gross = {qty} × {fmt(wt, 2)} ={' '}
                          {fmt(lineGross, 2)} kg. Bag deduction = {qty} ×{' '}
                          {fmt(bagWt, 2)} ({bagLabel}) = {fmt(bagDeduction, 2)}{' '}
                          kg. Line product = {fmt(lineGross, 2)} −{' '}
                          {fmt(bagDeduction, 2)} = {fmt(lineProduct, 2)} kg
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-muted-foreground border-border/50 border-t pt-2 text-xs">
                    Totals:
                  </p>
                  <p className="font-mono text-xs">
                    Total graded gross = {fmt(totalGradedWeightGrossKg, 2)} kg.
                    Total bag deduction = {fmt(totalBagWeightDeductionKg, 2)}{' '}
                    kg.
                  </p>
                  <p className="text-primary font-medium">
                    Total graded product weight = Total gross − Total bag
                    deduction = {fmt(totalGradedWeightGrossKg, 2)} −{' '}
                    {fmt(totalBagWeightDeductionKg, 2)} ={' '}
                    {fmt(totalGradedWeightKg, 2)} kg
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      (Total bags: {totalInitial.toLocaleString('en-IN')})
                    </span>
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="step2" className="mt-0 outline-none">
                <h4 className="text-muted-foreground/80 mb-2 font-semibold">
                  Step 2: Net weight and net product (bag weight removed)
                </h4>
                {incomingNetKg != null && incomingNetKg > 0 ? (
                  <div className="bg-muted/30 space-y-2 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">
                      Net weight (from weight slip) is total incoming weight. We
                      subtract the weight of incoming bags (all jute,{' '}
                      {JUTE_BAG_WEIGHT} kg each) to get net product weight.
                    </p>
                    <p className="font-mono text-xs">
                      Step 2a: Net weight (from weight slip) ={' '}
                      {fmt(incomingNetKg, 2)} kg
                    </p>
                    {incomingBagsCount != null && incomingBagsCount >= 0 ? (
                      <>
                        <p className="font-mono text-xs">
                          Step 2b: Incoming bags × JUTE bag weight ={' '}
                          {incomingBagsCount.toLocaleString('en-IN')} ×{' '}
                          {fmt(JUTE_BAG_WEIGHT, 2)} ={' '}
                          {fmt(incomingBagsCount * JUTE_BAG_WEIGHT, 2)} kg
                        </p>
                        <p className="font-mono text-xs">
                          Step 2c: Net product = Net weight − (Incoming bags ×
                          JUTE) = {fmt(incomingNetKg, 2)} −{' '}
                          {fmt(incomingBagsCount * JUTE_BAG_WEIGHT, 2)} ={' '}
                          {incomingNetProductKg != null
                            ? fmt(incomingNetProductKg, 2)
                            : '—'}{' '}
                          kg
                        </p>
                        <p className="text-primary font-medium">
                          Net product = {fmt(incomingNetProductKg ?? 0, 2)} kg
                          <span className="text-muted-foreground font-normal">
                            {' '}
                            (used for graded % and wastage % in next steps)
                          </span>
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Incoming bag count not available; net product not
                        computed.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    No net weight data available for this entry.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="step3" className="mt-0 outline-none">
                <h4 className="text-muted-foreground/80 mb-2 font-semibold">
                  Step 3: Total graded weight as % of net product
                </h4>
                {totalGradedWeightPercent !== undefined &&
                incomingNetProductKg != null &&
                incomingNetProductKg > 0 ? (
                  <div className="bg-muted/30 space-y-2 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">
                      Formula: Total graded weight % = (Total graded product ÷
                      Net product) × 100. This is the share of net product that
                      became graded output (product only, bag weight removed).
                    </p>
                    <p className="font-mono text-xs">
                      Step 3a: Total graded product ÷ Net product ={' '}
                      {fmt(totalGradedWeightKg, 2)} ÷{' '}
                      {fmt(incomingNetProductKg, 2)} ={' '}
                      {fmt(
                        roundTo2(
                          roundTo2(totalGradedWeightKg) /
                            roundTo2(incomingNetProductKg)
                        ),
                        2
                      )}
                    </p>
                    <p className="font-mono text-xs">
                      Step 3b: × 100 = {fmt(totalGradedWeightPercent)}%
                    </p>
                    <p className="text-primary mt-1 font-medium">
                      Total graded weight % = {fmt(totalGradedWeightPercent)}%
                      <span className="text-muted-foreground font-normal">
                        {' '}
                        (of net product)
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Cannot compute (net product or graded product missing).
                  </p>
                )}
              </TabsContent>

              <TabsContent value="step4" className="mt-0 outline-none">
                <h4 className="text-muted-foreground/80 mb-2 font-semibold">
                  Step 4: Wastage (entry-level, product only)
                </h4>
                {wastageKg !== undefined ? (
                  <div className="border-destructive/30 bg-destructive/5 space-y-2 rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">
                      Wastage (kg) = Net product − Total graded product = [Net
                      weight − (incoming bags × 700 g)] − [Graded gross − (per
                      row: bags × JUTE/LENO bag weight)]. Wastage % of net
                      product = (Wastage kg ÷ Net product) × 100.
                    </p>
                    <p className="font-medium">
                      Wastage (kg) = {fmt(wastageKg, 2)} kg
                    </p>
                    {wastagePercent !== undefined &&
                    incomingNetProductKg != null &&
                    incomingNetProductKg > 0 ? (
                      <p className="font-mono text-xs">
                        Wastage % = (Wastage kg ÷ Net product) × 100 = (
                        {fmt(wastageKg, 2)} ÷ {fmt(incomingNetProductKg, 2)}) ×
                        100 = {fmt(wastagePercent)}% of net product
                      </p>
                    ) : (
                      wastagePercent !== undefined && (
                        <p className="font-mono text-xs">
                          Wastage % = {fmt(wastagePercent)}% of net product
                        </p>
                      )
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    No wastage data for this entry.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="step5" className="mt-0 outline-none">
                <h4 className="text-muted-foreground/80 mb-2 font-semibold">
                  Step 5: Graded % + Wastage %
                </h4>
                {percentSum != null ? (
                  <div className="bg-muted/30 space-y-2 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">
                      All net product is either graded output or wastage, so
                      Graded % + Wastage % (of net product) should equal 100%.
                    </p>
                    <p className="font-mono text-xs">
                      Step 5a: Graded % (from Step 3) ={' '}
                      {totalGradedWeightPercent != null
                        ? fmt(totalGradedWeightPercent)
                        : '—'}
                      %
                    </p>
                    <p className="font-mono text-xs">
                      Step 5b: Wastage % (from Step 4) ={' '}
                      {wastagePercent != null ? fmt(wastagePercent) : '—'}%
                    </p>
                    <p className="font-mono text-xs">
                      Step 5c: Sum = Graded % + Wastage % ={' '}
                      {totalGradedWeightPercent != null &&
                      wastagePercent != null
                        ? `${fmt(totalGradedWeightPercent)} + ${fmt(wastagePercent)}`
                        : '—'}{' '}
                      = {fmt(percentSum)}%
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Expected: 100%. Check in Step 6 whether this sum is within
                      tolerance.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Cannot compute (graded % or wastage % missing).
                  </p>
                )}
              </TabsContent>

              <TabsContent value="step6" className="mt-0 outline-none">
                <h4 className="text-muted-foreground/80 mb-2 font-semibold">
                  Step 6: Discrepancy
                </h4>
                {percentSum != null ? (
                  <div
                    className={
                      hasDiscrepancy
                        ? 'border-destructive bg-destructive/10 space-y-2 rounded-lg border-2 p-3'
                        : 'bg-muted/30 space-y-2 rounded-lg p-3'
                    }
                  >
                    <p className="text-muted-foreground text-xs">
                      Discrepancy = 100 − (Graded % + Wastage %). If |sum − 100|
                      is greater than 0.1%, the entry has a discrepancy.
                    </p>
                    <p className="font-mono text-xs">
                      Step 6a: Percent sum (from Step 5) = {fmt(percentSum)}%
                    </p>
                    <p className="font-mono text-xs">
                      Step 6b: Discrepancy = 100 − {fmt(percentSum)} ={' '}
                      {discrepancyValue !== undefined
                        ? `${discrepancyValue >= 0 ? '+' : ''}${fmt(discrepancyValue)}%`
                        : '—'}
                    </p>
                    {hasDiscrepancy && discrepancyValue !== undefined ? (
                      <>
                        <p className="text-destructive font-medium">
                          Result: Discrepancy of{' '}
                          {discrepancyValue >= 0 ? '+' : ''}
                          {fmt(discrepancyValue)}% — Graded % + Wastage % does
                          not equal 100% (within 0.1% tolerance).
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {discrepancyValue > 0
                            ? 'Positive value: sum is below 100%.'
                            : 'Negative value: sum is above 100%.'}
                        </p>
                      </>
                    ) : (
                      <p className="text-primary font-medium">
                        Result: No discrepancy — Graded % + Wastage % equals
                        100% (within 0.1% tolerance).
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Cannot check discrepancy (percent sum not available).
                  </p>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    );
  }
);

export { GradingVoucherCalculationsDialog };
