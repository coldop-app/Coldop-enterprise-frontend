import type { Row } from '@tanstack/react-table';
import { roundMax2 } from '@/components/daybook/grading-calculations';
import type { PreferencesData } from '@/services/store-admin/preferences/useGetPreferences';

import {
  getBuyBackAmountFromGradeData,
  getGradeNetWeightKg,
  getNetAmountRupee,
  getPooledOutputPercentage,
  getTotalGradeBags,
  getTotalGradeNetWeightKg,
  getWastageKg,
} from './contract-farming-report-calculations';
import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  NET_PROFIT_TO_COMPANY_COLUMN_ID,
  NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
  WASTAGE_KG_COLUMN_ID,
  isContractFarmingSplitSpanColumn,
  isNumericSortColumnId,
} from './columns';
import type { FlattenedRow } from './types';

const VARIETY_LEVEL_TOTAL_COLUMN_IDS = new Set<string>([
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
]);

const VARIETY_LEVEL_AVERAGE_COLUMN_IDS = new Set<string>([
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  WASTAGE_KG_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
]);

const FARMER_LEVEL_TOTAL_COLUMN_IDS = new Set<string>([
  NET_PROFIT_TO_COMPANY_COLUMN_ID,
  NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID,
]);

function getFarmerFooterKey(row: FlattenedRow): string {
  const familyKey = row.familyKey ?? 0;
  if (familyKey > 0 && row.varietyRowKey.startsWith('family-')) {
    return `family:${familyKey}`;
  }
  return `farmer:${row.farmerId}`;
}

function getVarietyAggregationKey(row: FlattenedRow): string {
  if (row.varietyRowKey.startsWith('family-')) {
    return row.varietyRowKey;
  }
  return `${row.accountNumber}|${row.varietyName}`;
}

export type ContractFarmingFooterTotals = {
  totalsByColumn: Record<string, number>;
  perAcreByColumn: Record<string, number>;
  totalPlantedAcres: number;
};

/**
 * Footer totals for the contract farming TanStack table (and Excel export):
 * pooled grade %, variety-level sums, and a per-planted-acre row derived from the same totals.
 */
export function computeContractFarmingFooterTotals(
  filteredRows: Row<FlattenedRow>[],
  preferences: PreferencesData | null,
  visibleColumnIds: string[]
): ContractFarmingFooterTotals {
  const totals: Record<string, number> = {};
  const perAcreByColumn: Record<string, number> = {};
  const numericVisibleColumnIds = visibleColumnIds.filter((columnId) =>
    isNumericSortColumnId(columnId)
  );
  const uniqueVarietyRows = new Map<string, FlattenedRow>();
  const uniqueFarmerRows = new Map<string, FlattenedRow>();

  numericVisibleColumnIds.forEach((columnId) => {
    totals[columnId] = 0;
    perAcreByColumn[columnId] = 0;
  });

  for (const row of filteredRows) {
    const varietyKey = getVarietyAggregationKey(row.original);
    if (!uniqueVarietyRows.has(varietyKey)) {
      uniqueVarietyRows.set(varietyKey, row.original);
    }
    const farmerKey = getFarmerFooterKey(row.original);
    if (!uniqueFarmerRows.has(farmerKey)) {
      uniqueFarmerRows.set(farmerKey, row.original);
    }
  }

  for (const row of filteredRows) {
    for (const columnId of numericVisibleColumnIds) {
      if (
        VARIETY_LEVEL_TOTAL_COLUMN_IDS.has(columnId) ||
        VARIETY_LEVEL_AVERAGE_COLUMN_IDS.has(columnId) ||
        FARMER_LEVEL_TOTAL_COLUMN_IDS.has(columnId) ||
        columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)
      ) {
        continue;
      }
      if (
        !isContractFarmingSplitSpanColumn(columnId) &&
        !row.original.isFirstOfMergedBlock
      ) {
        continue;
      }
      const raw = row.getValue(columnId);
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(value)) {
        totals[columnId] += value;
      }
    }
  }

  const varietyRows = Array.from(uniqueVarietyRows.values());

  if (numericVisibleColumnIds.includes(TOTAL_GRADED_BAGS_COLUMN_ID)) {
    totals[TOTAL_GRADED_BAGS_COLUMN_ID] = varietyRows.reduce(
      (sum, row) => sum + (getTotalGradeBags(row) ?? 0),
      0
    );
  }
  if (numericVisibleColumnIds.includes(TOTAL_GRADED_NET_WEIGHT_COLUMN_ID)) {
    totals[TOTAL_GRADED_NET_WEIGHT_COLUMN_ID] = varietyRows.reduce(
      (sum, row) => sum + (getTotalGradeNetWeightKg(row) ?? 0),
      0
    );
  }
  if (numericVisibleColumnIds.includes(BUY_BACK_AMOUNT_COLUMN_ID)) {
    totals[BUY_BACK_AMOUNT_COLUMN_ID] = varietyRows.reduce(
      (sum, row) =>
        sum + (getBuyBackAmountFromGradeData(row, preferences) ?? 0),
      0
    );
  }
  if (numericVisibleColumnIds.includes(NET_AMOUNT_COLUMN_ID)) {
    totals[NET_AMOUNT_COLUMN_ID] = varietyRows.reduce(
      (sum, row) => sum + (getNetAmountRupee(row, preferences) ?? 0),
      0
    );
  }

  let totalPlantedAcres = totals['acres'] ?? 0;
  if (totalPlantedAcres <= 0) {
    for (const tableRow of filteredRows) {
      const acres = tableRow.original.sizeAcres;
      if (typeof acres === 'number' && Number.isFinite(acres)) {
        totalPlantedAcres += acres;
      }
    }
  }

  if (numericVisibleColumnIds.includes(NET_AMOUNT_PER_ACRE_COLUMN_ID)) {
    const totalNet = varietyRows.reduce(
      (sum, row) => sum + (getNetAmountRupee(row, preferences) ?? 0),
      0
    );
    totals[NET_AMOUNT_PER_ACRE_COLUMN_ID] =
      totalPlantedAcres > 0 && Number.isFinite(totalNet)
        ? roundMax2(totalNet / totalPlantedAcres)
        : 0;
  }

  const farmerRows = Array.from(uniqueFarmerRows.values());

  if (numericVisibleColumnIds.includes(NET_PROFIT_TO_COMPANY_COLUMN_ID)) {
    totals[NET_PROFIT_TO_COMPANY_COLUMN_ID] = farmerRows.reduce(
      (sum, row) => sum + (row.netProfitToCompany ?? 0),
      0
    );
  }
  if (
    numericVisibleColumnIds.includes(NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID)
  ) {
    const totalNetProfit = numericVisibleColumnIds.includes(
      NET_PROFIT_TO_COMPANY_COLUMN_ID
    )
      ? totals[NET_PROFIT_TO_COMPANY_COLUMN_ID]
      : farmerRows.reduce((sum, row) => sum + (row.netProfitToCompany ?? 0), 0);
    totals[NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID] =
      totalPlantedAcres > 0 && Number.isFinite(totalNetProfit)
        ? roundMax2(totalNetProfit / totalPlantedAcres)
        : 0;
  }

  const totalGradedNetKgPortfolio = numericVisibleColumnIds.includes(
    TOTAL_GRADED_NET_WEIGHT_COLUMN_ID
  )
    ? totals[TOTAL_GRADED_NET_WEIGHT_COLUMN_ID]
    : varietyRows.reduce((s, r) => s + (getTotalGradeNetWeightKg(r) ?? 0), 0);

  const pooledOutputPctPortfolio = getPooledOutputPercentage(varietyRows);

  const averageOverVarieties = (values: Array<number | null | undefined>) => {
    let sum = 0;
    let count = 0;
    values.forEach((value) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        sum += value;
        count += 1;
      }
    });
    return count > 0 ? sum / count : 0;
  };

  if (numericVisibleColumnIds.includes(AVG_QUINTAL_PER_ACRE_COLUMN_ID)) {
    totals[AVG_QUINTAL_PER_ACRE_COLUMN_ID] =
      totalPlantedAcres > 0 && Number.isFinite(totalGradedNetKgPortfolio)
        ? roundMax2(totalGradedNetKgPortfolio / 100 / totalPlantedAcres)
        : 0;
  }
  if (numericVisibleColumnIds.includes(WASTAGE_KG_COLUMN_ID)) {
    totals[WASTAGE_KG_COLUMN_ID] = averageOverVarieties(
      varietyRows.map((row) => getWastageKg(row))
    );
  }
  if (numericVisibleColumnIds.includes(OUTPUT_PERCENTAGE_COLUMN_ID)) {
    totals[OUTPUT_PERCENTAGE_COLUMN_ID] =
      pooledOutputPctPortfolio != null &&
      Number.isFinite(pooledOutputPctPortfolio)
        ? pooledOutputPctPortfolio
        : 0;
  }

  const pooledGradeWeightDenominatorKg = varietyRows.reduce(
    (sum, row) => sum + (getTotalGradeNetWeightKg(row) ?? 0),
    0
  );
  for (const columnId of numericVisibleColumnIds) {
    if (!columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)) continue;
    const gradeHeader = columnId.slice(
      VARIETY_LEVEL_PERCENT_COLUMN_PREFIX.length
    );
    const numeratorKg = varietyRows.reduce(
      (sum, row) => sum + (getGradeNetWeightKg(row, gradeHeader) ?? 0),
      0
    );
    totals[columnId] =
      pooledGradeWeightDenominatorKg > 0
        ? (numeratorKg / pooledGradeWeightDenominatorKg) * 100
        : 0;
  }

  const sumWastageKg = varietyRows.reduce((sum, row) => {
    const w = getWastageKg(row);
    return sum + (typeof w === 'number' && Number.isFinite(w) ? w : 0);
  }, 0);

  const acres = totalPlantedAcres;

  for (const columnId of numericVisibleColumnIds) {
    if (columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)) {
      perAcreByColumn[columnId] = totals[columnId];
    } else if (columnId === OUTPUT_PERCENTAGE_COLUMN_ID) {
      perAcreByColumn[columnId] = totals[OUTPUT_PERCENTAGE_COLUMN_ID];
    } else if (
      columnId === NET_AMOUNT_PER_ACRE_COLUMN_ID ||
      columnId === NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID
    ) {
      perAcreByColumn[columnId] = totals[columnId];
    } else if (columnId === 'acres') {
      perAcreByColumn[columnId] = 1;
    } else if (columnId === AVG_QUINTAL_PER_ACRE_COLUMN_ID) {
      perAcreByColumn[columnId] = totals[AVG_QUINTAL_PER_ACRE_COLUMN_ID];
    } else if (columnId === WASTAGE_KG_COLUMN_ID) {
      perAcreByColumn[columnId] = acres > 0 ? sumWastageKg / acres : 0;
    } else {
      const t = totals[columnId];
      perAcreByColumn[columnId] =
        acres > 0 && Number.isFinite(t) ? t / acres : 0;
    }
  }

  return { totalsByColumn: totals, perAcreByColumn, totalPlantedAcres: acres };
}

/** Build Excel footer value arrays in visible column order (matches on-screen footer). */
export function buildContractFarmingExcelFooterRows(
  visibleColumnIds: string[],
  footer: ContractFarmingFooterTotals
): {
  totalsRow: Array<string | number>;
  perAcreRow: Array<string | number> | null;
} {
  const build = (label: string, source: Record<string, number>) =>
    visibleColumnIds.map((columnId, index) => {
      if (index === 0) return label;
      if (!isNumericSortColumnId(columnId)) return '';
      const v = source[columnId];
      return Number.isFinite(v) ? v : '';
    });

  return {
    totalsRow: build('Total', footer.totalsByColumn),
    perAcreRow:
      footer.totalPlantedAcres > 0
        ? build('Per acre', footer.perAcreByColumn)
        : null,
  };
}
