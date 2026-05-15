import type { AggregationFn } from '@tanstack/react-table';
import { roundMax2 } from '@/components/daybook/grading-calculations';
import type { PreferencesData } from '@/services/store-admin/preferences/useGetPreferences';
import {
  type ContractFarmingReportData,
  type ContractFarmingReportFarmer,
} from '@/services/store-admin/general/useGetContractFarmingReport';
import { usePreferencesStore } from '@/stores/store';

import type { FlattenedRow } from './types';
import { GRADE_BAG_COLUMN_KEY_PREFIX } from './types';

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
 * Looks up buy-back rate for a variety/size using only cold-storage preferences
 * (`custom.buyBackCost`). No constants/default-rate fallbacks are used.
 */
function resolveBuyBackRateFromPreferences(
  preferences: PreferencesData | null | undefined,
  varietyRaw: string,
  sizeLabel: string
): number | null {
  const variety = varietyRaw.trim();
  const sizeTrim = sizeLabel.trim();
  const list = preferences?.custom?.buyBackCost;
  if (!list?.length || !variety || !sizeTrim) return null;

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

/** Dedupe key for variety-level metrics (must match footer rollup). */
export function varietyMetricDedupeKey(row: FlattenedRow): string {
  return `${String(row.accountNumber)}\x00${row.varietyName}`;
}

/**
 * Sums a column once per farmer×variety when the same variety-level value is repeated
 * on every size row (prevents double-counting under TanStack `sum`).
 */
export const sumVarietyMetrics: AggregationFn<FlattenedRow> = (
  columnId,
  leafRows
) => {
  const seen = new Set<string>();
  let sum = 0;
  let any = false;
  for (const leaf of leafRows) {
    const key = varietyMetricDedupeKey(leaf.original);
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = leaf.getValue(columnId);
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (raw != null && raw !== '' && Number.isFinite(num)) {
      sum += num;
      any = true;
    }
  }
  return any ? sum : null;
};

/**
 * Averages a column once per farmer×variety when the value repeats per size row.
 * Intended for percentage metrics so grouped rows show mean %, not summed %.
 */
export const averageVarietyMetrics: AggregationFn<FlattenedRow> = (
  columnId,
  leafRows
) => {
  const seen = new Set<string>();
  let sum = 0;
  let count = 0;
  for (const leaf of leafRows) {
    const key = varietyMetricDedupeKey(leaf.original);
    if (seen.has(key)) continue;
    seen.add(key);
    const raw = leaf.getValue(columnId);
    const num = typeof raw === 'number' ? raw : Number(raw);
    if (raw != null && raw !== '' && Number.isFinite(num)) {
      sum += num;
      count += 1;
    }
  }
  return count > 0 ? sum / count : null;
};

const BAG_SIZE_DISPLAY_ORDER = [
  'Below 25',
  '25–30',
  'Below 30',
  '30–35',
  '30–40',
  '35–40',
  'Below 40',
  '40–45',
  '40-50',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Below 40 (mm)',
  'Above 50 (mm)',
  'Cut',
] as const;

function normalizeRangeLabel(label: string) {
  return label.replace(/-/g, '–').toLowerCase().trim();
}

const BAG_SIZE_ORDER_INDEX = new Map<string, number>(
  BAG_SIZE_DISPLAY_ORDER.map((size, index) => [
    normalizeRangeLabel(size),
    index,
  ])
);

const BELOW_40_GRADE_VALUES = new Set([
  normalizeRangeLabel('Below 25'),
  normalizeRangeLabel('25–30'),
  normalizeRangeLabel('Below 30'),
  normalizeRangeLabel('30–35'),
  normalizeRangeLabel('30–40'),
  normalizeRangeLabel('35–40'),
]);

const ABOVE_50_GRADE_VALUES = new Set([
  normalizeRangeLabel('50–55'),
  normalizeRangeLabel('Above 50'),
  normalizeRangeLabel('Above 55'),
]);

const BELOW_40_GROUP_GRADE = 'Below 40';
/** Grouped bag-size column id suffix — bags + net weight (kg) render stacked in the report. */
export const CONTRACT_FARMING_BELOW_40_GROUP_GRADE = BELOW_40_GROUP_GRADE;
const ABOVE_50_GROUP_GRADE = 'Above 50';

function toGroupedGrade(grade: string): string {
  const normalized = normalizeRangeLabel(grade);
  if (BELOW_40_GRADE_VALUES.has(normalized)) return BELOW_40_GROUP_GRADE;
  if (ABOVE_50_GRADE_VALUES.has(normalized)) return ABOVE_50_GROUP_GRADE;
  return grade;
}

function getGroupedGradeOrderIndex(grade: string): number | undefined {
  const orderGrade =
    grade === BELOW_40_GROUP_GRADE
      ? 'Below 40'
      : grade === ABOVE_50_GROUP_GRADE
        ? 'Above 50'
        : grade;
  return BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(orderGrade));
}

export function buildGradeHeaders(allGrades: readonly string[]): string[] {
  return [
    ...new Set(
      [...allGrades]
        .sort((a, b) => {
          const aOrder = BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(a));
          const bOrder = BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(b));

          if (aOrder !== undefined && bOrder !== undefined) {
            return aOrder - bOrder;
          }
          if (aOrder !== undefined) return -1;
          if (bOrder !== undefined) return 1;
          return a.localeCompare(b);
        })
        .map((grade) => toGroupedGrade(grade))
    ),
  ].sort((a, b) => {
    const aOrder = getGroupedGradeOrderIndex(a);
    const bOrder = getGroupedGradeOrderIndex(b);

    if (aOrder !== undefined && bOrder !== undefined) {
      return aOrder - bOrder;
    }
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return a.localeCompare(b);
  });
}

/** Sort key: after 35–40 (6), before 40–45 (7) in {@link BAG_SIZE_DISPLAY_ORDER}. */
const BELOW_40_AGGREGATE_SORT_KEY = 6.5;

/** Sort key: after 45–50 (9), before 50–55 (10); Above 50 aggregate sits before Cut. */
const ABOVE_50_AGGREGATE_SORT_KEY = 9.5;

/** Cut is always last among bag-size / grading columns. */
const CUT_GRADE_SORT_KEY = 100;

function getContractFarmingGradeHeaderSortKey(grade: string): number {
  if (grade === BELOW_40_GROUP_GRADE) return BELOW_40_AGGREGATE_SORT_KEY;
  if (grade === ABOVE_50_GROUP_GRADE) return ABOVE_50_AGGREGATE_SORT_KEY;
  if (normalizeRangeLabel(grade) === 'cut') return CUT_GRADE_SORT_KEY;

  const idx = getGroupedGradeOrderIndex(grade);
  if (idx !== undefined) return idx;

  return 75;
}

/**
 * Stable column order for contract farming grading: **Below 40 (MM)** immediately before
 * **40–45 (MM)**, **Above 50 (MM)** after **45–50** and before **Cut** (report + Excel).
 */
export function orderContractFarmingGradeHeaders(
  gradeHeaders: readonly string[]
): string[] {
  return [...gradeHeaders].sort((a, b) => {
    const da = getContractFarmingGradeHeaderSortKey(a);
    const db = getContractFarmingGradeHeaderSortKey(b);
    if (da !== db) return da - db;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export function getGradeBagCount(
  row: FlattenedRow,
  gradeHeader: string
): number | null {
  if (gradeHeader === BELOW_40_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!BELOW_40_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.bags ?? 0);
      },
      0
    );
    return total;
  }

  if (gradeHeader === ABOVE_50_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!ABOVE_50_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.bags ?? 0);
      },
      0
    );
    return total;
  }

  return row.gradeData[gradeHeader]?.bags ?? null;
}

export function getGradeNetWeightKg(
  row: FlattenedRow,
  gradeHeader: string
): number | null {
  if (gradeHeader === BELOW_40_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!BELOW_40_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.netWeightKg ?? 0);
      },
      0
    );
    return total;
  }

  if (gradeHeader === ABOVE_50_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!ABOVE_50_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.netWeightKg ?? 0);
      },
      0
    );
    return total;
  }

  return row.gradeData[gradeHeader]?.netWeightKg ?? null;
}

export function getGradeWeightPercent(
  row: FlattenedRow,
  gradeHeader: string
): number | null {
  const totalWeight = getTotalGradeNetWeightKgSum(row);
  if (totalWeight <= 0) return null;
  const gradeWeight = getGradeNetWeightKg(row, gradeHeader) ?? 0;
  return (gradeWeight / totalWeight) * 100;
}

/** Sum of bag counts across all grades (may be 0). */
function getTotalGradeBagsSum(row: FlattenedRow): number {
  return Object.values(row.gradeData).reduce(
    (sum, value) => sum + (value?.bags ?? 0),
    0
  );
}

export function getTotalGradeBags(row: FlattenedRow): number | null {
  const total = getTotalGradeBagsSum(row);
  return total > 0 ? total : null;
}

export function getTotalGradeNetWeightKg(row: FlattenedRow): number | null {
  const total = getTotalGradeNetWeightKgSum(row);
  return total > 0 ? total : null;
}

function getTotalGradeNetWeightKgSum(row: FlattenedRow): number {
  return Object.values(row.gradeData).reduce(
    (sum, value) => sum + (value?.netWeightKg ?? 0),
    0
  );
}

/** Buy-back net weight, or incoming net when buy-back is missing (same units as graded net kg). */
export function getInboundNetWeightKgForReport(
  row: FlattenedRow
): number | null {
  const buyBack = row.buyBackNetWeightKg;
  if (buyBack !== null && buyBack !== undefined && !Number.isNaN(buyBack)) {
    return buyBack;
  }
  const incoming = row.incomingNetWeightKg;
  if (incoming !== null && incoming !== undefined && !Number.isNaN(incoming)) {
    return incoming;
  }
  return null;
}

/** Wastage (kg) = inbound net (buy-back or incoming) minus total net weight after grading. */
export function getWastageKg(row: FlattenedRow): number | null {
  const inbound = getInboundNetWeightKgForReport(row);
  if (inbound === null) return null;
  return inbound - getTotalGradeNetWeightKgSum(row);
}

/** Output % = net weight after grading ÷ net incoming weight × 100 (incoming = same baseline as wastage). */
export function getOutputPercentage(row: FlattenedRow): number | null {
  const netIncoming = getInboundNetWeightKgForReport(row);
  if (netIncoming === null || netIncoming <= 0) return null;
  const gradedKg = getTotalGradeNetWeightKgSum(row);
  return (gradedKg / netIncoming) * 100;
}

/**
 * Portfolio output % over deduped farmer×variety rows: sum(graded kg) ÷ sum(inbound kg) × 100.
 * Only rows with finite inbound > 0 contribute to both sums.
 */
export function getPooledOutputPercentage(
  rows: readonly FlattenedRow[]
): number | null {
  let sumGraded = 0;
  let sumInbound = 0;
  for (const row of rows) {
    const inbound = getInboundNetWeightKgForReport(row);
    if (inbound === null || inbound <= 0) continue;
    sumInbound += inbound;
    sumGraded += getTotalGradeNetWeightKgSum(row);
  }
  if (sumInbound <= 0) return null;
  return (sumGraded / sumInbound) * 100;
}

/**
 * ₹ buy-back payable from graded net kg × cold-storage prefs `custom.buyBackCost` rate per variety + size —
 * same rounding pattern as accounting summary ({@link roundMax2} on each grade line).
 */
export function getBuyBackAmountFromGradeData(
  row: FlattenedRow,
  preferencesOverride?: PreferencesData | null
): number | null {
  const preferences =
    preferencesOverride ?? usePreferencesStore.getState().preferences;
  let total = 0;
  let hasPositiveNet = false;

  for (const [sizeLabel, value] of Object.entries(row.gradeData)) {
    const netKg = Number(value?.netWeightKg ?? 0);
    if (!Number.isFinite(netKg) || netKg <= 0) continue;
    hasPositiveNet = true;
    const rate = resolveBuyBackRateFromPreferences(
      preferences,
      row.varietyName,
      sizeLabel
    );
    if (rate === null) return null;
    total += roundMax2(netKg * Number(rate));
  }

  if (!hasPositiveNet) return null;
  return roundMax2(total);
}

/** Buy-back ₹ from grading − total seed ₹ for the variety ({@link roundMax2}); null when buy-back ₹ unknown. */
export function getNetAmountRupee(
  row: FlattenedRow,
  preferencesOverride?: PreferencesData | null
): number | null {
  const buyBack = getBuyBackAmountFromGradeData(row, preferencesOverride);
  if (buyBack === null) return null;
  const seedTotal = Number(row.varietyTotalSeedAmountPayable ?? 0);
  const safeSeed = Number.isFinite(seedTotal) ? seedTotal : 0;
  return roundMax2(buyBack - safeSeed);
}

/** ₹ net per acre = Net Amount ÷ variety total acres ({@link roundMax2}). */
export function getNetAmountPerAcreRupee(
  row: FlattenedRow,
  preferencesOverride?: PreferencesData | null
): number | null {
  const net = getNetAmountRupee(row, preferencesOverride);
  if (net === null) return null;
  const acres = row.varietyTotalAcres;
  if (!acres || acres <= 0) return null;
  return roundMax2(net / acres);
}

/** Quintals / acre: net grading weight (kg) → quintals (÷100), divided by variety total acres. */
export function getAverageQuintalPerAcre(row: FlattenedRow): number | null {
  const netKg = getTotalGradeNetWeightKg(row);
  if (netKg === null || netKg <= 0) return null;
  const acres = row.varietyTotalAcres;
  if (!acres || acres <= 0) return null;
  return netKg / 100 / acres;
}

export type AverageQuintalPerAcreBreakdownGradeLine = {
  grade: string;
  netWeightKg: number;
};

export type AverageQuintalPerAcreBreakdownIssue =
  | 'none'
  | 'no_graded_weight'
  | 'no_acres';

export type AverageQuintalPerAcreBreakdown = {
  farmerName: string;
  varietyName: string;
  accountNumber: number;
  gradeLines: AverageQuintalPerAcreBreakdownGradeLine[];
  totalNetWeightKg: number;
  quintals: number;
  varietyTotalAcres: number;
  result: number | null;
  issue: AverageQuintalPerAcreBreakdownIssue;
};

/** Inputs and steps behind {@link getAverageQuintalPerAcre} for the calculation dialog. */
export function getAverageQuintalPerAcreBreakdown(
  row: FlattenedRow
): AverageQuintalPerAcreBreakdown {
  const gradeLines = Object.entries(row.gradeData)
    .map(([grade, value]) => ({
      grade,
      netWeightKg: Number(value?.netWeightKg ?? 0),
    }))
    .filter((line) => line.netWeightKg > 0)
    .sort((a, b) => b.netWeightKg - a.netWeightKg);

  const totalNetWeightKg = getTotalGradeNetWeightKgSum(row);
  const quintals = totalNetWeightKg / 100;
  const varietyTotalAcres = row.varietyTotalAcres;
  const result = getAverageQuintalPerAcre(row);

  let issue: AverageQuintalPerAcreBreakdownIssue = 'none';
  if (totalNetWeightKg <= 0) issue = 'no_graded_weight';
  else if (!varietyTotalAcres || varietyTotalAcres <= 0) issue = 'no_acres';

  return {
    farmerName: row.farmerName,
    varietyName: row.varietyName,
    accountNumber: row.accountNumber,
    gradeLines,
    totalNetWeightKg,
    quintals,
    varietyTotalAcres,
    result,
    issue,
  };
}

export type ContractFarmingReportRowContext = {
  farmerName: string;
  varietyName: string;
  accountNumber: number;
};

function reportRowContext(row: FlattenedRow): ContractFarmingReportRowContext {
  return {
    farmerName: row.farmerName,
    varietyName: row.varietyName,
    accountNumber: row.accountNumber,
  };
}

type GradeNetWeightContributor = { grade: string; netWeightKg: number };

function getGradeNetWeightContributors(
  row: FlattenedRow,
  gradeHeader: string
): GradeNetWeightContributor[] {
  const lines: GradeNetWeightContributor[] = [];

  if (gradeHeader === BELOW_40_GROUP_GRADE) {
    for (const [grade, value] of Object.entries(row.gradeData)) {
      if (!BELOW_40_GRADE_VALUES.has(normalizeRangeLabel(grade))) continue;
      const netWeightKg = Number(value?.netWeightKg ?? 0);
      if (netWeightKg > 0) lines.push({ grade, netWeightKg });
    }
  } else if (gradeHeader === ABOVE_50_GROUP_GRADE) {
    for (const [grade, value] of Object.entries(row.gradeData)) {
      if (!ABOVE_50_GRADE_VALUES.has(normalizeRangeLabel(grade))) continue;
      const netWeightKg = Number(value?.netWeightKg ?? 0);
      if (netWeightKg > 0) lines.push({ grade, netWeightKg });
    }
  } else {
    const direct = row.gradeData[gradeHeader];
    if (direct && Number(direct.netWeightKg ?? 0) > 0) {
      lines.push({
        grade: gradeHeader,
        netWeightKg: Number(direct.netWeightKg),
      });
    } else {
      for (const [grade, value] of Object.entries(row.gradeData)) {
        if (normalizeRangeLabel(grade) !== normalizeRangeLabel(gradeHeader)) {
          continue;
        }
        const netWeightKg = Number(value?.netWeightKg ?? 0);
        if (netWeightKg > 0) lines.push({ grade, netWeightKg });
      }
    }
  }

  return lines.sort((a, b) => b.netWeightKg - a.netWeightKg);
}

export type GradeWeightPercentBreakdownIssue = 'none' | 'no_total_weight';

export type GradeWeightPercentBreakdown = ContractFarmingReportRowContext & {
  gradeHeader: string;
  contributors: GradeNetWeightContributor[];
  gradeNetWeightKg: number;
  totalNetWeightKg: number;
  result: number | null;
  issue: GradeWeightPercentBreakdownIssue;
};

export function getGradeWeightPercentBreakdown(
  row: FlattenedRow,
  gradeHeader: string
): GradeWeightPercentBreakdown {
  const contributors = getGradeNetWeightContributors(row, gradeHeader);
  const gradeNetWeightKg = contributors.reduce((s, c) => s + c.netWeightKg, 0);
  const totalNetWeightKg = getTotalGradeNetWeightKgSum(row);
  const result = getGradeWeightPercent(row, gradeHeader);
  const issue: GradeWeightPercentBreakdownIssue =
    totalNetWeightKg <= 0 ? 'no_total_weight' : 'none';

  return {
    ...reportRowContext(row),
    gradeHeader,
    contributors,
    gradeNetWeightKg,
    totalNetWeightKg,
    result,
    issue,
  };
}

export type WastageBreakdownIssue = 'none' | 'no_inbound';

export type WastageBreakdown = ContractFarmingReportRowContext & {
  inboundKg: number | null;
  inboundSource: 'buyBack' | 'incoming' | null;
  totalGradedKg: number;
  result: number | null;
  issue: WastageBreakdownIssue;
};

export function getWastageKgBreakdown(row: FlattenedRow): WastageBreakdown {
  const buyBack = row.buyBackNetWeightKg;
  const incoming = row.incomingNetWeightKg;
  let inboundSource: WastageBreakdown['inboundSource'] = null;
  let inboundKg: number | null = null;

  if (buyBack !== null && buyBack !== undefined && !Number.isNaN(buyBack)) {
    inboundSource = 'buyBack';
    inboundKg = buyBack;
  } else if (
    incoming !== null &&
    incoming !== undefined &&
    !Number.isNaN(incoming)
  ) {
    inboundSource = 'incoming';
    inboundKg = incoming;
  }

  const totalGradedKg = getTotalGradeNetWeightKgSum(row);
  const result = getWastageKg(row);
  const issue: WastageBreakdownIssue =
    inboundKg === null ? 'no_inbound' : 'none';

  return {
    ...reportRowContext(row),
    inboundKg,
    inboundSource,
    totalGradedKg,
    result,
    issue,
  };
}

export type OutputPercentageBreakdownIssue = 'none' | 'no_inbound';

export type OutputPercentageBreakdown = ContractFarmingReportRowContext & {
  inboundKg: number | null;
  inboundSource: 'buyBack' | 'incoming' | null;
  totalGradedKg: number;
  result: number | null;
  issue: OutputPercentageBreakdownIssue;
};

export function getOutputPercentageBreakdown(
  row: FlattenedRow
): OutputPercentageBreakdown {
  const wastage = getWastageKgBreakdown(row);
  return {
    ...reportRowContext(row),
    inboundKg: wastage.inboundKg,
    inboundSource: wastage.inboundSource,
    totalGradedKg: wastage.totalGradedKg,
    result: getOutputPercentage(row),
    issue:
      wastage.inboundKg === null || wastage.inboundKg <= 0
        ? 'no_inbound'
        : 'none',
  };
}

export type BuyBackAmountBreakdownLine = {
  grade: string;
  netWeightKg: number;
  ratePerKg: number | null;
  lineAmount: number | null;
};

export type BuyBackAmountBreakdownIssue =
  | 'none'
  | 'no_graded_weight'
  | 'missing_rate';

export type BuyBackAmountBreakdown = ContractFarmingReportRowContext & {
  lines: BuyBackAmountBreakdownLine[];
  result: number | null;
  issue: BuyBackAmountBreakdownIssue;
};

export function getBuyBackAmountBreakdown(
  row: FlattenedRow,
  preferencesOverride?: PreferencesData | null
): BuyBackAmountBreakdown {
  const preferences =
    preferencesOverride ?? usePreferencesStore.getState().preferences;
  const lines: BuyBackAmountBreakdownLine[] = [];
  let missingRate = false;
  let hasPositiveNet = false;

  for (const [grade, value] of Object.entries(row.gradeData)) {
    const netWeightKg = Number(value?.netWeightKg ?? 0);
    if (!Number.isFinite(netWeightKg) || netWeightKg <= 0) continue;
    hasPositiveNet = true;
    const ratePerKg = resolveBuyBackRateFromPreferences(
      preferences,
      row.varietyName,
      grade
    );
    if (ratePerKg === null) missingRate = true;
    const lineAmount =
      ratePerKg === null ? null : roundMax2(netWeightKg * Number(ratePerKg));
    lines.push({ grade, netWeightKg, ratePerKg, lineAmount });
  }

  lines.sort((a, b) => b.netWeightKg - a.netWeightKg);

  let issue: BuyBackAmountBreakdownIssue = 'none';
  if (!hasPositiveNet) issue = 'no_graded_weight';
  else if (missingRate) issue = 'missing_rate';

  return {
    ...reportRowContext(row),
    lines,
    result: getBuyBackAmountFromGradeData(row, preferencesOverride),
    issue,
  };
}

export type SeedAmountBreakdownIssue = 'none' | 'zero_amount';

export type SeedAmountBreakdown = ContractFarmingReportRowContext & {
  sizeName: string;
  sizeQuantity: number;
  sizeAcres: number;
  sizeAmountPayable: number;
  varietyTotalSeedAmountPayable: number;
  result: number | null;
  issue: SeedAmountBreakdownIssue;
};

export function getSeedAmountBreakdown(row: FlattenedRow): SeedAmountBreakdown {
  const sizeAmountPayable = Number(row.sizeAmountPayable ?? 0);
  const varietyTotalSeedAmountPayable = Number(
    row.varietyTotalSeedAmountPayable ?? 0
  );
  const result = sizeAmountPayable > 0 ? sizeAmountPayable : null;

  return {
    ...reportRowContext(row),
    sizeName: row.sizeName,
    sizeQuantity: row.sizeQuantity,
    sizeAcres: row.sizeAcres,
    sizeAmountPayable,
    varietyTotalSeedAmountPayable: Number.isFinite(
      varietyTotalSeedAmountPayable
    )
      ? varietyTotalSeedAmountPayable
      : 0,
    result,
    issue: sizeAmountPayable > 0 ? 'none' : 'zero_amount',
  };
}

export type NetAmountPerAcreBreakdownIssue =
  | 'none'
  | 'missing_buy_back'
  | 'no_acres';

export type NetAmountPerAcreBreakdown = ContractFarmingReportRowContext & {
  buyBackAmount: number | null;
  varietyTotalSeedAmountPayable: number;
  netAmount: number | null;
  varietyTotalAcres: number;
  result: number | null;
  issue: NetAmountPerAcreBreakdownIssue;
};

export function getNetAmountPerAcreBreakdown(
  row: FlattenedRow,
  preferencesOverride?: PreferencesData | null
): NetAmountPerAcreBreakdown {
  const buyBack = getBuyBackAmountFromGradeData(row, preferencesOverride);
  const varietyTotalSeedAmountPayable = Number(
    row.varietyTotalSeedAmountPayable ?? 0
  );
  const safeSeed = Number.isFinite(varietyTotalSeedAmountPayable)
    ? varietyTotalSeedAmountPayable
    : 0;
  const netAmount = buyBack !== null ? roundMax2(buyBack - safeSeed) : null;
  const varietyTotalAcres = row.varietyTotalAcres;
  const result = getNetAmountPerAcreRupee(row, preferencesOverride);

  let issue: NetAmountPerAcreBreakdownIssue = 'none';
  if (buyBack === null) issue = 'missing_buy_back';
  else if (!varietyTotalAcres || varietyTotalAcres <= 0) issue = 'no_acres';

  return {
    ...reportRowContext(row),
    buyBackAmount: buyBack,
    varietyTotalSeedAmountPayable: safeSeed,
    netAmount,
    varietyTotalAcres,
    result,
    issue,
  };
}

/** Matches footer: total deduped net ₹ ÷ sum of size acres on all leaf rows. */
export const aggregateNetAmountPerAcre: AggregationFn<FlattenedRow> = (
  _columnId,
  leafRows
) => {
  const seen = new Set<string>();
  let sumNet = 0;
  let sumAcres = 0;
  for (const leaf of leafRows) {
    sumAcres += leaf.original.sizeAcres;
  }
  for (const leaf of leafRows) {
    const o = leaf.original;
    const key = varietyMetricDedupeKey(o);
    if (seen.has(key)) continue;
    seen.add(key);
    const n = getNetAmountRupee(o);
    if (n != null) sumNet += n;
  }
  if (sumAcres <= 0) return null;
  return roundMax2(sumNet / sumAcres);
};

/** Grouped aggregation: acre-weighted mean of per-variety quintal/acre (Σ q×acres / Σ variety total acres on deduped rows). Table footer Total uses total graded kg ÷ 100 ÷ sum of planted size acres instead when ungrouped. */
export const aggregateAvgQuintalPerAcre: AggregationFn<FlattenedRow> = (
  _columnId,
  leafRows
) => {
  const seen = new Set<string>();
  let weighted = 0;
  let sumVarietyAcres = 0;
  for (const leaf of leafRows) {
    const o = leaf.original;
    const key = varietyMetricDedupeKey(o);
    if (seen.has(key)) continue;
    seen.add(key);
    const q = getAverageQuintalPerAcre(o);
    const ac = o.varietyTotalAcres;
    if (q != null && ac > 0) {
      weighted += q * ac;
      sumVarietyAcres += ac;
    }
  }
  return sumVarietyAcres > 0 ? weighted / sumVarietyAcres : null;
};

export function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function normalizeReportData(
  data: ContractFarmingReportData | undefined
) {
  return (
    data ?? {
      farmers: [],
      meta: { allGrades: [], allVarieties: [] },
    }
  );
}

export function flattenRows(
  farmers: ContractFarmingReportFarmer[],
  gradeHeaders: readonly string[]
): FlattenedRow[] {
  const rows: FlattenedRow[] = [];

  farmers.forEach((farmer, farmerIndex) => {
    const farmerVarieties = farmer.varieties ?? [];

    farmerVarieties.forEach((variety, varietyIndex) => {
      const sizes = variety.seed?.sizes ?? [];
      const normalizedSizes =
        sizes.length > 0
          ? [...sizes].sort((a, b) => {
              const aOrder = BAG_SIZE_ORDER_INDEX.get(
                normalizeRangeLabel(a.name)
              );
              const bOrder = BAG_SIZE_ORDER_INDEX.get(
                normalizeRangeLabel(b.name)
              );

              if (aOrder !== undefined && bOrder !== undefined) {
                return aOrder - bOrder;
              }
              if (aOrder !== undefined) return -1;
              if (bOrder !== undefined) return 1;
              return a.name.localeCompare(b.name);
            })
          : [{ name: '-', quantity: 0, acres: 0, amountPayable: 0 }];
      const acresSum = normalizedSizes.reduce((sum, s) => sum + s.acres, 0);
      const varietyTotalAcres = variety.seed?.totalAcres ?? acresSum;
      const amountSum = normalizedSizes.reduce(
        (sum, s) => sum + (s.amountPayable ?? 0),
        0
      );
      const varietyTotalSeedAmountPayable =
        variety.seed?.totalAmountPayable ?? amountSum;
      const gradeData = variety.grading ?? {};
      const varietyRowKey = `${farmer.id}-${variety.name}-${farmerIndex}-${varietyIndex}`;
      const mergedRowSpan = normalizedSizes.length;

      normalizedSizes.forEach((size, sizeIndex) => {
        const base: FlattenedRow = {
          rowId: `${farmer.id}-${variety.name}-${sizeIndex}-${farmerIndex}-${varietyIndex}`,
          varietyRowKey,
          mergedRowSpan,
          isFirstOfMergedBlock: sizeIndex === 0,
          sizeRowIndex: sizeIndex,
          farmerName: farmer.name,
          mobileNumber: farmer.mobileNumber,
          farmerMobile: farmer.mobileNumber,
          accountNumber: farmer.accountNumber,
          farmerAccount: farmer.accountNumber,
          address: farmer.address,
          farmerAddress: farmer.address,
          varietyName: variety.name,
          generation: variety.seed?.generation ?? '-',
          sizeName: size.name,
          sizeQuantity: size.quantity,
          sizeAcres: size.acres,
          sizeAmountPayable: size.amountPayable,
          sizeAmount: size.amountPayable,
          buyBackBags: variety.buyBack?.bags ?? null,
          buyBackNetWeightKg: variety.buyBack?.netWeightKg ?? null,
          incomingNetWeightKg: variety.incomingNetWeightKg ?? null,
          gradeData,
          varietyTotalAcres,
          varietyTotalSeedAmountPayable,
        };

        for (const grade of gradeHeaders) {
          const k = `${GRADE_BAG_COLUMN_KEY_PREFIX}${grade}`;
          (base as unknown as Record<string, number | null>)[k] =
            getGradeBagCount(base, grade);
        }

        rows.push(base);
      });
    });
  });

  return rows;
}
