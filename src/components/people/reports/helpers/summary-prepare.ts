import { GRADING_BAG_SIZE_COLUMN_ORDER } from '@/components/analytics/grading/report/column-meta';
import {
  getBagWeightsFromStore,
  roundMax2,
} from '@/components/daybook/grading-calculations';
import type { PreferencesData } from '@/services/store-admin/preferences/useGetPreferences';
import type {
  GradingGatePass,
  GradingGatePassOrderDetail,
} from '@/types/grading-gate-pass';
import {
  gradingOrderDetailBagTypeKey,
  gradingOrderDetailSizeKey,
} from '@/components/people/reports/helpers/grading-prepare';

/** Column order for bag sizes in accounting summary (matches grading / API). */
export const SUMMARY_GRADING_BAG_SIZE_ORDER: readonly string[] =
  GRADING_BAG_SIZE_COLUMN_ORDER;

const CANON_ORDER_SET = new Set<string>(SUMMARY_GRADING_BAG_SIZE_ORDER);

/** Avoid repeated `indexOf` on canonical order during composite-key sorts. */
const SUMMARY_SIZE_ORDER_INDEX = new Map<string, number>(
  SUMMARY_GRADING_BAG_SIZE_ORDER.map((label, i) => [label, i])
);

/** Row order for TYPE when present (aligned with grading striping). */
const BAG_TYPE_ROW_ORDER = ['JUTE', 'LENO'] as const;

function normalizeBuyBackSizeToken(raw: string): string {
  return raw
    .trim()
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\s+/g, ' ');
}

function compactBuyBackSizeKey(raw: string): string {
  return normalizeBuyBackSizeToken(raw).replace(/\s+/g, '').toLowerCase();
}

/**
 * Looks up buy-back rate for a variety/size using cold-storage preferences (`custom.buyBackCost`).
 * Tolerates en-dash vs hyphen in size keys (e.g. prefs `25–30` vs canonical `25-30`).
 */
export function resolveBuyBackRateFromPreferences(
  preferences: PreferencesData | null | undefined,
  varietyRaw: string,
  sizeLabel: string
): number | null {
  const variety = varietyRaw.trim();
  const sizeTrim = sizeLabel.trim();
  const list = preferences?.custom?.buyBackCost;
  if (!list?.length || !variety || !sizeTrim) {
    return null;
  }

  const entry =
    list.find((e) => e.variety === variety) ??
    list.find((e) => e.variety.trim().toLowerCase() === variety.toLowerCase());
  if (!entry) return null;

  const sizes = entry.sizeRates ?? {};
  const targetNorm = normalizeBuyBackSizeToken(sizeTrim);
  const targetCompact = compactBuyBackSizeKey(sizeTrim);

  if (Object.prototype.hasOwnProperty.call(sizes, sizeTrim)) {
    const v = Number(sizes[sizeTrim]);
    return Number.isFinite(v) ? v : null;
  }
  for (const [k, val] of Object.entries(sizes)) {
    if (normalizeBuyBackSizeToken(k) === targetNorm) {
      const v = Number(val);
      return Number.isFinite(v) ? v : null;
    }
  }
  for (const [k, val] of Object.entries(sizes)) {
    if (compactBuyBackSizeKey(k) === targetCompact) {
      const v = Number(val);
      return Number.isFinite(v) ? v : null;
    }
  }
  return null;
}

export type GradingBagTypeQtySummaryRow = {
  id: string;
  /** Uppercase bag type key (UNKNOWN → blank in UI). */
  typeLabel: string;
  /** Bag counts by size; summary table uses one size per row (single key). */
  bagsBySize: Record<string, number>;
  /**
   * Rounded wt/bag (kg) for this grouped bucket — same segment as composite key (`type|size|weight|variety`).
   * Matches PDF Summary “Wt/Bag” column.
   */
  weightPerBagKg: number;
  /**
   * Gross graded kg (before bardana): `qty * weightPerBagKg` (`grossKg` in grading metrics).
   * Shown as **Weight Received (kg)** in the accounting summary table.
   */
  weightReceivedKg: number;
  /**
   * Bardana deduction in kg for this grouped line (`deductionKg` in grading metrics).
   */
  bardanaWeightKg: number;
  /**
   * Net kg after bardana: `weightReceivedKg - bardanaWeightKg` (`netKg` in grading metrics).
   */
  actualWeightKg: number;
  /** Grading gate pass variety (composite key segment). */
  varietyLabel: string;
  /**
   * Buy-back rate for this variety + size from preferences `custom.buyBackCost`; `null` if missing.
   */
  rate: number | null;
  /**
   * `actualWeightKg * rate` (rounded to 2dp). Null when rate is unavailable.
   */
  amountPayable: number | null;
  /**
   * Share of this row in total graded actual weight.
   * Formula: `actualWeightKg / totalActualWeightKg * 100` (rounded to 2dp).
   */
  gradedSizesPercent: number;
};

/** Sum bags per size column across summary rows (for footer alignment). */
export type GradingSummaryColumnTotals = Record<string, number>;

/**
 * Builds `type|size|weight|variety`. Size and type use the same rules as grading prep.
 */
function compositeGroupingKey(
  gp: GradingGatePass,
  od: GradingGatePassOrderDetail
): string {
  const typeSeg = gradingOrderDetailBagTypeKey(od.bagType ?? '');
  const sizeSeg = gradingOrderDetailSizeKey(od.size ?? '');
  const wRaw = Number(od.weightPerBagKg);
  const w = Number.isFinite(wRaw) ? roundMax2(wRaw) : 0;
  const varietySeg = (gp.variety ?? '').trim();
  return `${typeSeg}|${sizeSeg}|${w}|${varietySeg}`;
}

function parseCompositeKeyFull(key: string): {
  typeSeg: string;
  sizeSeg: string;
  weightSeg: string;
  varietySeg: string;
} | null {
  const parts = key.split('|');
  if (parts.length < 4) return null;
  const typeSeg = parts[0];
  const sizeSeg = parts[1];
  const weightSeg = parts[2];
  const varietySeg = parts.slice(3).join('|');
  if (!sizeSeg.trim()) return null;
  return { typeSeg, sizeSeg, weightSeg, varietySeg };
}

function sizeOrderIndex(sizeLabel: string): number {
  return (
    SUMMARY_SIZE_ORDER_INDEX.get(sizeLabel) ??
    SUMMARY_GRADING_BAG_SIZE_ORDER.length + 1
  );
}

function compareParsedCompositeForRowOrder(
  pa: NonNullable<ReturnType<typeof parseCompositeKeyFull>>,
  pb: NonNullable<ReturnType<typeof parseCompositeKeyFull>>
): number {
  const sa = sizeOrderIndex(pa.sizeSeg);
  const sb = sizeOrderIndex(pb.sizeSeg);
  if (sa !== sb) return sa - sb;
  if (pa.sizeSeg !== pb.sizeSeg) {
    return pa.sizeSeg.localeCompare(pb.sizeSeg);
  }

  const typeCmp = compareTypeRowKeys(pa.typeSeg, pb.typeSeg);
  if (typeCmp !== 0) return typeCmp;

  const wa = Number(pa.weightSeg);
  const wb = Number(pb.weightSeg);
  const wna = Number.isFinite(wa) ? wa : 0;
  const wnb = Number.isFinite(wb) ? wb : 0;
  if (wna !== wnb) return wna - wnb;

  return pa.varietySeg.localeCompare(pb.varietySeg);
}

function stableRowIdFromCompositeKey(compositeKey: string): string {
  const safe = compositeKey.replace(/[^a-zA-Z0-9]+/g, '_');
  if (safe.length <= 120) {
    return `summary-line-${safe}`;
  }
  let h = 0;
  for (let i = 0; i < compositeKey.length; i++) {
    h = (Math.imul(31, h) + compositeKey.charCodeAt(i)) | 0;
  }
  return `summary-line-h${(h >>> 0).toString(16)}`;
}

/**
 * Accumulates grouped quantities keyed by `type|size|weight|variety`. Per key:
 * `totals[key] = (totals[key] ?? 0) + (increment ?? 0)`.
 */
export function buildGradingGroupedQuantityMap(
  gradingGatePasses: GradingGatePass[] | null | undefined
): Map<string, number> {
  const grouped = new Map<string, number>();
  const list = gradingGatePasses ?? [];

  for (const gp of list) {
    for (const od of gp.orderDetails ?? []) {
      const sizeSeg = gradingOrderDetailSizeKey(od.size ?? '');
      if (!sizeSeg.trim()) continue;

      const key = compositeGroupingKey(gp, od);

      const incRaw = od.initialQuantity;
      const increment =
        incRaw === null || incRaw === undefined ? 0 : Number(incRaw);

      grouped.set(key, (grouped.get(key) ?? 0) + increment);
    }
  }

  return grouped;
}

/**
 * `totalsBySize[size] = (current ?? 0) + (qty ?? 0)` for every grouped line.
 */
export function totalsBySizeFromGroupedMap(
  groupedMap: Map<string, number>
): GradingSummaryColumnTotals {
  const totals: GradingSummaryColumnTotals = {};

  for (const [compositeKey, qty] of groupedMap) {
    const full = parseCompositeKeyFull(compositeKey);
    if (!full || !full.sizeSeg.trim()) continue;
    const increment = qty === null || qty === undefined ? 0 : Number(qty);

    totals[full.sizeSeg] = (totals[full.sizeSeg] ?? 0) + increment;
  }

  return totals;
}

/** Stable label order: canonical columns first, then other sizes seen (sorted). */
export function orderedSizeLabelsFromTotals(
  columnTotals: GradingSummaryColumnTotals
): string[] {
  const extras = Object.keys(columnTotals).filter(
    (k) => !CANON_ORDER_SET.has(k)
  );
  extras.sort((a, b) => a.localeCompare(b));
  return [...SUMMARY_GRADING_BAG_SIZE_ORDER, ...extras];
}

/** Only columns whose summed bags ≠ 0 (same UX as grading table size visibility). */
export function visibleSummarySizeLabels(
  allLabelsOrdered: readonly string[],
  columnTotals: GradingSummaryColumnTotals
): string[] {
  return allLabelsOrdered.filter((label) => {
    const n = Number(columnTotals[label]) || 0;
    return n !== 0;
  });
}

function compareTypeRowKeys(a: string, b: string): number {
  const ia = BAG_TYPE_ROW_ORDER.indexOf(
    a as (typeof BAG_TYPE_ROW_ORDER)[number]
  );
  const ib = BAG_TYPE_ROW_ORDER.indexOf(
    b as (typeof BAG_TYPE_ROW_ORDER)[number]
  );
  const aKnown = ia >= 0;
  const bKnown = ib >= 0;
  if (aKnown && bKnown) return ia - ib;
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  return a.localeCompare(b);
}

function typeLabelForRow(typeSeg: string): string {
  if (!typeSeg || typeSeg === 'UNKNOWN') return '';
  return typeSeg;
}

/** Footer / visibility: summed across aggregated summary rows (= grouped map totals by size). */
export function aggregateSummaryBagsTotals(
  rows: GradingBagTypeQtySummaryRow[],
  allLabelsOrdered: readonly string[]
): GradingSummaryColumnTotals {
  const totals: GradingSummaryColumnTotals = {};
  for (const label of allLabelsOrdered) {
    totals[label] = 0;
  }
  for (const row of rows) {
    for (const [label, qty] of Object.entries(row.bagsBySize)) {
      const increment = qty === null || qty === undefined ? 0 : Number(qty);
      totals[label] = (totals[label] ?? 0) + increment;
    }
  }
  return totals;
}

/**
 * One table row per grouped bucket: only the bucket's size column is filled (matches “staircase” summary).
 */
function sparseSummaryRowsFromGroupedMap(
  groupedMap: Map<string, number>,
  preferences: PreferencesData | null | undefined
): GradingBagTypeQtySummaryRow[] {
  if (groupedMap.size === 0) return [];

  type ParsedEntry = {
    compositeKey: string;
    full: NonNullable<ReturnType<typeof parseCompositeKeyFull>>;
  };
  const decoded: ParsedEntry[] = [];
  for (const compositeKey of groupedMap.keys()) {
    const full = parseCompositeKeyFull(compositeKey);
    if (full) decoded.push({ compositeKey, full });
  }
  decoded.sort((a, b) => compareParsedCompositeForRowOrder(a.full, b.full));

  const usedIds = new Set<string>();
  const bagWeights = getBagWeightsFromStore();
  const buyBackRateCache = new Map<string, number | null>();

  const rows: GradingBagTypeQtySummaryRow[] = [];
  for (const { compositeKey, full } of decoded) {
    const qtyRaw = groupedMap.get(compositeKey);
    const qty = qtyRaw === null || qtyRaw === undefined ? 0 : Number(qtyRaw);
    if (qty === 0) continue;

    const wFromKey = Number(full.weightSeg);
    const weightPerBagKg = Number.isFinite(wFromKey) ? roundMax2(wFromKey) : 0;
    const bagWeightByType = bagWeights[full.typeSeg] ?? 0;
    const weightReceivedKg = roundMax2(qty * weightPerBagKg);
    const bardanaWeightKg = roundMax2(qty * bagWeightByType);
    const actualWeightKg = roundMax2(weightReceivedKg - bardanaWeightKg);
    const varietyLabel = full.varietySeg.trim();
    const rateCacheKey = `${varietyLabel}\0${full.sizeSeg}`;
    let rate = buyBackRateCache.get(rateCacheKey);
    if (rate === undefined) {
      rate = resolveBuyBackRateFromPreferences(
        preferences,
        varietyLabel,
        full.sizeSeg
      );
      buyBackRateCache.set(rateCacheKey, rate);
    }
    const amountPayable =
      rate == null ? null : roundMax2(actualWeightKg * Number(rate));

    let id = stableRowIdFromCompositeKey(compositeKey);
    let n = 1;
    while (usedIds.has(id)) {
      id = `${stableRowIdFromCompositeKey(compositeKey)}__${n}`;
      n += 1;
    }
    usedIds.add(id);

    rows.push({
      id,
      typeLabel: typeLabelForRow(full.typeSeg),
      bagsBySize: { [full.sizeSeg]: qty },
      weightPerBagKg,
      weightReceivedKg,
      bardanaWeightKg,
      actualWeightKg,
      varietyLabel,
      rate,
      amountPayable,
      gradedSizesPercent: 0,
    });
  }

  const totalActualWeightKg = rows.reduce(
    (sum, row) => sum + (Number(row.actualWeightKg) || 0),
    0
  );

  return rows.map((row) => ({
    ...row,
    gradedSizesPercent:
      totalActualWeightKg > 0
        ? roundMax2((row.actualWeightKg / totalActualWeightKg) * 100)
        : 0,
  }));
}

/**
 * Single pipeline: grouped map (`type|size|weight|variety` → qty), totals by size, ordered labels,
 * and one sparse row per bucket (single size column per row).
 */
export function prepareAccountingGradingSummary(
  gradingGatePasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined
): {
  groupedMap: Map<string, number>;
  rows: GradingBagTypeQtySummaryRow[];
  columnTotals: GradingSummaryColumnTotals;
  orderedSizeLabels: string[];
} {
  const groupedMap = buildGradingGroupedQuantityMap(gradingGatePasses);
  const columnTotals = totalsBySizeFromGroupedMap(groupedMap);
  return {
    groupedMap,
    rows: sparseSummaryRowsFromGroupedMap(groupedMap, preferences),
    columnTotals,
    orderedSizeLabels: orderedSizeLabelsFromTotals(columnTotals),
  };
}

/**
 * Same as {@link prepareAccountingGradingSummary} rows (sparse); rebuilds the grouped map.
 */
export function prepareGradingBagTypeSummaryRows(
  gradingGatePasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined
): GradingBagTypeQtySummaryRow[] {
  return sparseSummaryRowsFromGroupedMap(
    buildGradingGroupedQuantityMap(gradingGatePasses),
    preferences
  );
}

export function orderedSummarySizeLabelsFromSummaryRows(
  rows: GradingBagTypeQtySummaryRow[]
): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    for (const k of Object.keys(row.bagsBySize)) seen.add(k);
  }
  const extras = [...seen].filter((k) => !CANON_ORDER_SET.has(k));
  extras.sort((a, b) => a.localeCompare(b));
  return [...SUMMARY_GRADING_BAG_SIZE_ORDER, ...extras];
}
