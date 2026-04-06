import {
  GRADING_SIZES,
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import { getBuyBackRate } from '@/components/pdf/gradingVoucherCalculations';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';

/** Per (type, weightKey) allocated values for summary right-hand columns */
export interface SummaryRightValues {
  wtReceivedAfterGrading: number;
  lessBardanaAfterGrading: number;
  actualWtOfPotato: number;
  rate: number | undefined;
  amountPayable: number;
}

/** Totals for right-hand columns (must match main table totals). */
export interface SummaryTotals {
  totalWtReceivedAfterGrading: number;
  totalLessBardanaAfterGrading: number;
  totalActualWtOfPotato: number;
  totalAmountPayable: number;
}

/** Key: "bagType|size|weightKey|variety" (weightKey = weight.toFixed(2)), value: total bag count */
export function buildGroupedMap(rows: StockLedgerRow[]): Map<string, number> {
  const map = new Map<string, number>();
  const add = (key: string, count: number) => {
    map.set(key, (map.get(key) ?? 0) + count);
  };
  const weightKey = (w: number | undefined) =>
    w != null && !Number.isNaN(w) ? w.toFixed(2) : '0.00';
  const varietyKey = (v: string | undefined) => (v ?? '').trim() || '';

  for (const row of rows) {
    const variety = varietyKey(row.variety);
    const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
    if (hasSplit) {
      for (const size of GRADING_SIZES) {
        const juteQty = row.sizeBagsJute?.[size] ?? 0;
        const juteWt = row.sizeWeightPerBagJute?.[size];
        if (juteQty > 0) {
          add(`JUTE|${size}|${weightKey(juteWt)}|${variety}`, juteQty);
        }
        const lenoQty = row.sizeBagsLeno?.[size] ?? 0;
        const lenoWt = row.sizeWeightPerBagLeno?.[size];
        if (lenoQty > 0) {
          add(`LENO|${size}|${weightKey(lenoWt)}|${variety}`, lenoQty);
        }
      }
    } else {
      const bagType = (row.bagType ?? 'JUTE').toUpperCase();
      for (const size of GRADING_SIZES) {
        const qty = row.sizeBags?.[size] ?? 0;
        const wt = row.sizeWeightPerBag?.[size];
        if (qty > 0) {
          add(`${bagType}|${size}|${weightKey(wt)}|${variety}`, qty);
        }
      }
    }
  }
  return map;
}

/** One row per (type, weightKey, size, variety) with count > 0 — one consolidated quantity per bag size per row. */
export interface SummaryRow {
  type: string;
  weightKey: string;
  weightNum: number;
  size: string;
  variety: string;
  count: number;
}

/** B30 size (displayed as "B30") — grouped first in summary, then other sizes follow in size order. */
const B30_SIZE = 'Below 30';

export function getSummaryRows(map: Map<string, number>): SummaryRow[] {
  const sizeOrder = new Map<string, number>(
    GRADING_SIZES.map((s, i) => [s, i])
  );
  /** B30 first (0), then other sizes in GRADING_SIZES order (1, 2, …). */
  const getSizeSortOrder = (size: string): number => {
    if (size === B30_SIZE) return 0;
    return (sizeOrder.get(size) ?? 99) + 1;
  };
  const rows: SummaryRow[] = [];
  for (const [key, count] of map) {
    if (count <= 0) continue;
    const parts = key.split('|');
    const type = parts[0] ?? 'JUTE';
    const size = parts[1] ?? '';
    const weightKey = parts[2] ?? '0.00';
    const variety = parts[3] ?? '';
    const weightNum = parseFloat(weightKey);
    rows.push({
      type,
      weightKey,
      weightNum: Number.isNaN(weightNum) ? 0 : weightNum,
      size,
      variety,
      count,
    });
  }
  rows.sort((a, b) => {
    const orderA = getSizeSortOrder(a.size);
    const orderB = getSizeSortOrder(b.size);
    if (orderA !== orderB) return orderA - orderB;
    if (a.type !== b.type) return a.type === 'JUTE' ? -1 : 1;
    if (a.weightNum !== b.weightNum) return a.weightNum - b.weightNum;
    return (a.variety || '').localeCompare(b.variety || '');
  });
  return rows;
}

/**
 * Per-row calculations for the summary table:
 * 1. Weight recd = wt bag × no. of bags in the row
 * 2. Less bardana = no. of bags × 0.7 (JUTE) or 0.06 (LENO)
 * 3. Actual weight = (1) − (2)
 * 4. Rate = from BUY_BACK_COST as per size and variety (constants)
 * 5. Amount payable = (3) × (4)
 */
function computeSummaryRightValuesForRow(row: SummaryRow): SummaryRightValues {
  const bagWt = row.type === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
  const weightRecd = row.weightNum * row.count;
  const lessBardana = row.count * bagWt;
  const actualWt = weightRecd - lessBardana;
  const rate = getBuyBackRate(row.variety || undefined, row.size);
  const amountPayable = actualWt * rate;
  return {
    wtReceivedAfterGrading: weightRecd,
    lessBardanaAfterGrading: lessBardana,
    actualWtOfPotato: actualWt,
    rate: rate > 0 ? rate : undefined,
    amountPayable,
  };
}

/** Build right-hand column values for each summary row using the standard formulas. */
export function buildSummaryRightValuesByRow(
  summaryRows: SummaryRow[]
): Map<string, SummaryRightValues> {
  const result = new Map<string, SummaryRightValues>();
  for (const row of summaryRows) {
    const rowKey = `${row.type}|${row.weightKey}|${row.size}|${row.variety}`;
    result.set(rowKey, computeSummaryRightValuesForRow(row));
  }
  return result;
}

/** Totals for right-hand columns: sum of per-row values (same formulas as rows). */
export function computeSummaryTotalsFromRows(
  summaryRows: SummaryRow[],
  rightValuesByRow: Map<string, SummaryRightValues>
): SummaryTotals {
  let totalWtReceivedAfterGrading = 0;
  let totalLessBardanaAfterGrading = 0;
  let totalActualWtOfPotato = 0;
  let totalAmountPayable = 0;
  for (const row of summaryRows) {
    const rowKey = `${row.type}|${row.weightKey}|${row.size}|${row.variety}`;
    const entry = rightValuesByRow.get(rowKey);
    if (entry) {
      totalWtReceivedAfterGrading += entry.wtReceivedAfterGrading;
      totalLessBardanaAfterGrading += entry.lessBardanaAfterGrading;
      totalActualWtOfPotato += entry.actualWtOfPotato;
      totalAmountPayable += entry.amountPayable;
    }
  }
  return {
    totalWtReceivedAfterGrading,
    totalLessBardanaAfterGrading,
    totalActualWtOfPotato,
    totalAmountPayable,
  };
}

/**
 * Same total as the Summary table “AMT PAY.” total row for these stock-ledger rows
 * (used by Seed Amount Payable PDF net block).
 */
export function computeSummaryAmountPayableTotal(
  rows: StockLedgerRow[]
): number {
  const groupedMap = buildGroupedMap(rows);
  const summaryRows = getSummaryRows(groupedMap);
  const summaryRightValuesByRow = buildSummaryRightValuesByRow(summaryRows);
  const summaryTotals = computeSummaryTotalsFromRows(
    summaryRows,
    summaryRightValuesByRow
  );
  return summaryTotals.totalAmountPayable;
}
