import {
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import type { GradingOrderDetailRow } from './types';

const roundTo2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * Grading voucher calculations — full flow
 * =========================================
 *
 * 1. NET WEIGHT (incomingNetKg)
 *    - Source: weight slip (supplied from API/parent). Not computed here.
 *    - Represents total net incoming weight in kg for the grading entry.
 *
 * 2. TOTAL GRADED WEIGHT (totalGradedWeightKg)
 *    - Computed from grading order details.
 *    - For each detail row: line total = initialQuantity × weightPerBagKg (kg).
 *    - Total graded weight = sum of all line totals.
 *    Formula: totalGradedWeightKg = Σ (initialQuantity × weightPerBagKg).
 *
 * 3. TOTAL GRADED WEIGHT % (totalGradedWeightPercent)
 *    - Graded weight as a percentage of net incoming weight.
 *    Formula: totalGradedWeightPercent = (totalGradedWeightKg / incomingNetKg) × 100.
 *
 * 4. WASTAGE (wastageKg, wastagePercent)
 *    - Supplied from API/parent; not computed in this file.
 *    - Entry-level wastage (kg) formula (for reference):
 *      wastageKg = [Net weight − (incoming bags × 700 g)] − [graded weight − (60 g × graded bags)]
 *      i.e. (incoming “product” weight) − (graded “product” weight).
 *    - Wastage % = (wastageKg / incomingNetKg) × 100.
 *
 * 5. PERCENT SUM (graded % + wastage %)
 *    - Sum of total graded weight % and wastage %.
 *    - Ideally equals 100% (all net weight is either graded output or wastage).
 *    Formula: percentSum = totalGradedWeightPercent + wastagePercent.
 *
 * 6. DISCREPANCY
 *    - Check: |percentSum − 100| ≤ PERCENT_TOLERANCE.
 *    - If outside tolerance: hasDiscrepancy = true, discrepancyValue = 100 − percentSum.
 *    - discrepancyValue > 0 means graded + wastage % is short of 100%; < 0 means over 100%.
 */

/** Tolerance (in percentage points) for treating graded + wastage % as equal to 100. */
export const PERCENT_TOLERANCE = 0.1;

/** Bag weight in kg from bag type (JUTE 0.7 kg, LENO 0.06 kg). Default LENO if unknown. */
export function getBagWeightKg(bagType: string | null | undefined): number {
  const t = bagType?.toUpperCase();
  return t === 'JUTE' ? JUTE_BAG_WEIGHT : LENO_BAG_WEIGHT;
}

export interface GradingOrderTotals {
  totalQty: number;
  totalInitial: number;
  /** Total graded product weight (kg) after subtracting bag weight per row. */
  totalGradedWeightKg: number;
  /** Total graded weight (kg) before bag deduction (sum of qty × weightPerBagKg). */
  totalGradedWeightGrossKg: number;
  /** Total bag weight deducted (kg) from graded lines (per row: qty × JUTE/LENO weight). */
  totalBagWeightDeductionKg: number;
}

/**
 * Step 1 — Compute totals from grading order details (bag-weight adjusted).
 *
 * Per row: line gross = qty × weightPerBagKg; bag deduction = qty × getBagWeightKg(bagType); line product = line gross − bag deduction.
 * totalGradedWeightKg = Σ line product; totalGradedWeightGrossKg = Σ line gross; totalBagWeightDeductionKg = Σ bag deduction.
 */
export function computeGradingOrderTotals(
  orderDetails: GradingOrderDetailRow[] | null | undefined
): GradingOrderTotals {
  const details = orderDetails ?? [];
  let totalQty = 0;
  let totalInitial = 0;
  let totalGradedWeightKg = 0;
  let totalGradedWeightGrossKg = 0;
  let totalBagWeightDeductionKg = 0;
  for (const od of details) {
    const qty = roundTo2(od.initialQuantity ?? 0);
    const wt = roundTo2(od.weightPerBagKg ?? 0);
    const bagWt = roundTo2(getBagWeightKg(od.bagType));
    totalQty += od.currentQuantity ?? 0;
    totalInitial += qty;
    const lineGross = roundTo2(qty * wt);
    const lineBagDeduction = roundTo2(qty * bagWt);
    totalGradedWeightGrossKg = roundTo2(totalGradedWeightGrossKg + lineGross);
    totalBagWeightDeductionKg = roundTo2(
      totalBagWeightDeductionKg + lineBagDeduction
    );
    totalGradedWeightKg = roundTo2(
      totalGradedWeightKg + roundTo2(lineGross - lineBagDeduction)
    );
  }
  return {
    totalQty,
    totalInitial: roundTo2(totalInitial),
    totalGradedWeightKg: roundTo2(totalGradedWeightKg),
    totalGradedWeightGrossKg: roundTo2(totalGradedWeightGrossKg),
    totalBagWeightDeductionKg: roundTo2(totalBagWeightDeductionKg),
  };
}

/**
 * Net product (kg) = Net weight − (incoming bags × JUTE bag weight).
 * Incoming bags are jute (700 g). Returns undefined if incomingNetKg or incomingBagsCount is missing.
 */
export function computeIncomingNetProductKg(
  incomingNetKg: number | null | undefined,
  incomingBagsCount: number | null | undefined
): number | undefined {
  if (
    incomingNetKg == null ||
    incomingBagsCount == null ||
    incomingBagsCount < 0
  ) {
    return undefined;
  }
  return roundTo2(
    roundTo2(incomingNetKg) - roundTo2(incomingBagsCount * JUTE_BAG_WEIGHT)
  );
}

/**
 * Step 3 — Total graded weight (product) as % of net product.
 * Formula: (totalGradedWeightKg / incomingNetProductKg) × 100.
 */
export function computeTotalGradedWeightPercent(
  totalGradedWeightKg: number,
  incomingNetProductKg: number | null | undefined
): number | undefined {
  if (
    incomingNetProductKg == null ||
    incomingNetProductKg <= 0 ||
    totalGradedWeightKg <= 0
  ) {
    return undefined;
  }
  return roundTo2(
    (roundTo2(totalGradedWeightKg) / roundTo2(incomingNetProductKg)) * 100
  );
}

/**
 * Wastage as % of net product: (wastageKg / incomingNetProductKg) × 100.
 * Used so that graded % + wastage % (of net product) = 100%.
 */
export function computeWastagePercentOfNetProduct(
  wastageKg: number | null | undefined,
  incomingNetProductKg: number | null | undefined
): number | undefined {
  if (
    wastageKg == null ||
    incomingNetProductKg == null ||
    incomingNetProductKg <= 0
  ) {
    return undefined;
  }
  return roundTo2((roundTo2(wastageKg) / roundTo2(incomingNetProductKg)) * 100);
}

export interface DiscrepancyResult {
  /** Graded % + wastage % (step 5). */
  percentSum: number | undefined;
  /** True if |percentSum − 100| > PERCENT_TOLERANCE. */
  hasDiscrepancy: boolean;
  /** 100 − percentSum when there is a discrepancy (step 6). */
  discrepancyValue: number | undefined;
}

/**
 * Steps 5 & 6 — Percent sum and discrepancy.
 *
 * Step 5: percentSum = totalGradedWeightPercent + wastagePercent.
 * Step 6: hasDiscrepancy = |percentSum − 100| > PERCENT_TOLERANCE;
 *         discrepancyValue = 100 − percentSum (when hasDiscrepancy).
 *
 * Positive discrepancyValue => sum is below 100%; negative => above 100%.
 */
export function computeDiscrepancy(
  totalGradedWeightPercent: number | undefined,
  wastagePercent: number | undefined
): DiscrepancyResult {
  const percentSum =
    totalGradedWeightPercent != null && wastagePercent != null
      ? roundTo2(totalGradedWeightPercent) + roundTo2(wastagePercent)
      : undefined;
  const hasDiscrepancy =
    percentSum != null && Math.abs(percentSum - 100) > PERCENT_TOLERANCE;
  const discrepancyValue =
    hasDiscrepancy && percentSum != null
      ? roundTo2(100 - percentSum)
      : undefined;
  return { percentSum, hasDiscrepancy, discrepancyValue };
}
