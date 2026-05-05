import type { AggregationFn } from '@tanstack/react-table';
import { roundMax2 } from '@/components/daybook/grading-calculations';
import { resolveBuyBackRateFromPreferences } from '@/components/people/reports/helpers/summary-prepare';
import {
  type ContractFarmingReportData,
  type ContractFarmingReportFarmer,
} from '@/services/store-admin/general/useGetContractFarmingReport';
import { usePreferencesStore } from '@/stores/store';

import type { FlattenedRow } from './types';
import { GRADE_BAG_COLUMN_KEY_PREFIX } from './types';

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
function getInboundNetWeightKgForWastage(row: FlattenedRow): number | null {
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
  const inbound = getInboundNetWeightKgForWastage(row);
  if (inbound === null) return null;
  return inbound - getTotalGradeNetWeightKgSum(row);
}

/** Output % = net weight after grading ÷ net incoming weight × 100 (incoming = same baseline as wastage). */
export function getOutputPercentage(row: FlattenedRow): number | null {
  const netIncoming = getInboundNetWeightKgForWastage(row);
  if (netIncoming === null || netIncoming <= 0) return null;
  const gradedKg = getTotalGradeNetWeightKgSum(row);
  return (gradedKg / netIncoming) * 100;
}

/**
 * ₹ buy-back payable from graded net kg × cold-storage prefs `custom.buyBackCost` rate per variety + size —
 * same rounding pattern as accounting summary ({@link roundMax2} on each grade line).
 */
export function getBuyBackAmountFromGradeData(
  row: FlattenedRow
): number | null {
  const preferences = usePreferencesStore.getState().preferences;
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
export function getNetAmountRupee(row: FlattenedRow): number | null {
  const buyBack = getBuyBackAmountFromGradeData(row);
  if (buyBack === null) return null;
  const seedTotal = Number(row.varietyTotalSeedAmountPayable ?? 0);
  const safeSeed = Number.isFinite(seedTotal) ? seedTotal : 0;
  return roundMax2(buyBack - safeSeed);
}

/** ₹ net per acre = Net Amount ÷ variety total acres ({@link roundMax2}). */
export function getNetAmountPerAcreRupee(row: FlattenedRow): number | null {
  const net = getNetAmountRupee(row);
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

/** Matches footer weighted average quintal / acre across deduped farmer×variety rows. */
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

      normalizedSizes.forEach((size, sizeIndex) => {
        const base: FlattenedRow = {
          rowId: `${farmer.id}-${variety.name}-${sizeIndex}-${farmerIndex}-${varietyIndex}`,
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
