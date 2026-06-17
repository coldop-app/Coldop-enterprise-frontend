import type { Row, SortingFn } from '@tanstack/react-table';
import { roundMax2 } from '@/components/daybook/grading-calculations';
import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  NET_PROFIT_TO_COMPANY_COLUMN_ID,
  NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  SEED_AMOUNT_COLUMN_ID,
  TOTAL_ACRES_PLANTED_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_NET_WEIGHT_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
  WASTAGE_KG_COLUMN_ID,
  buildDefaultContractFarmingColumnOrder,
  isNumericSortColumnId,
} from './columns';
import { getDisplayFamilyBlockKey } from './contract-farming-display-span-metadata';
import {
  type ContractFarmingSortContext,
  getSortBlockKey,
} from './contract-farming-sort-context';
import {
  getAverageQuintalPerAcre,
  getBuyBackAmountFromGradeData,
  getGradeBagCount,
  getGradeNetWeightKg,
  getNetAmountRupee,
  getPooledOutputPercentage,
  getTotalGradeBags,
  getTotalGradeNetWeightKg,
  getWastageKg,
  varietyMetricDedupeKey,
} from './contract-farming-report-calculations';
import type { FlattenedRow } from './types';

export type BlockSortValue = string | number | null;

export type BlockSortValuesByKey = Map<string, Record<string, BlockSortValue>>;

export function compareBlockInternalOrder(
  a: FlattenedRow,
  b: FlattenedRow
): number {
  const varietyCmp = a.varietyName.localeCompare(b.varietyName);
  if (varietyCmp !== 0) return varietyCmp;
  return a.sizeRowIndex - b.sizeRowIndex;
}

function compareNullableNumbers(
  a: number | null | undefined,
  b: number | null | undefined
): number {
  const aMissing = a == null || !Number.isFinite(a);
  const bMissing = b == null || !Number.isFinite(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function compareTextValues(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function compareSortableValues(
  columnId: string,
  a: BlockSortValue,
  b: BlockSortValue
): number {
  if (isNumericSortColumnId(columnId) || columnId === 'familyKey') {
    const numA = typeof a === 'number' ? a : Number(a);
    const numB = typeof b === 'number' ? b : Number(b);
    const aMissing = a == null || a === '' || !Number.isFinite(numA);
    const bMissing = b == null || b === '' || !Number.isFinite(numB);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return compareNullableNumbers(numA, numB);
  }

  const textA = a == null ? '' : String(a);
  const textB = b == null ? '' : String(b);
  return compareTextValues(textA, textB);
}

function dedupeBlockRows(blockRows: FlattenedRow[]): FlattenedRow[] {
  const seen = new Set<string>();
  const out: FlattenedRow[] = [];
  for (const row of blockRows) {
    const key = varietyMetricDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function sumDedupedNumeric(
  blockRows: FlattenedRow[],
  getValue: (row: FlattenedRow) => number | null | undefined
): number | null {
  const seen = new Set<string>();
  let sum = 0;
  let any = false;
  for (const row of blockRows) {
    const key = varietyMetricDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const value = getValue(row);
    if (value != null && Number.isFinite(value)) {
      sum += value;
      any = true;
    }
  }
  return any ? sum : null;
}

function averageDedupedNumeric(
  blockRows: FlattenedRow[],
  getValue: (row: FlattenedRow) => number | null | undefined
): number | null {
  const seen = new Set<string>();
  let sum = 0;
  let count = 0;
  for (const row of blockRows) {
    const key = varietyMetricDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const value = getValue(row);
    if (value != null && Number.isFinite(value)) {
      sum += value;
      count += 1;
    }
  }
  return count > 0 ? sum / count : null;
}

function minTextValue(
  blockRows: FlattenedRow[],
  getValue: (row: FlattenedRow) => string
): string {
  if (blockRows.length === 0) return '';
  return blockRows.map(getValue).sort((a, b) => compareTextValues(a, b))[0]!;
}

function sumSizeField(
  blockRows: FlattenedRow[],
  getValue: (row: FlattenedRow) => number
): number {
  return blockRows.reduce((sum, row) => sum + getValue(row), 0);
}

function blockNetAmountPerAcre(blockRows: FlattenedRow[]): number | null {
  const seen = new Set<string>();
  let sumNet = 0;
  let sumAcres = 0;
  for (const row of blockRows) {
    sumAcres += row.sizeAcres;
  }
  for (const row of blockRows) {
    const key = varietyMetricDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const net = getNetAmountRupee(row);
    if (net != null) sumNet += net;
  }
  if (sumAcres <= 0) return null;
  return roundMax2(sumNet / sumAcres);
}

function blockAverageQuintalPerAcre(blockRows: FlattenedRow[]): number | null {
  const seen = new Set<string>();
  let weighted = 0;
  let sumVarietyAcres = 0;
  for (const row of blockRows) {
    const key = varietyMetricDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    const q = getAverageQuintalPerAcre(row);
    const acres = row.varietyTotalAcres;
    if (q != null && acres > 0) {
      weighted += q * acres;
      sumVarietyAcres += acres;
    }
  }
  return sumVarietyAcres > 0 ? weighted / sumVarietyAcres : null;
}

function blockGradeWeightPercent(
  blockRows: FlattenedRow[],
  grade: string
): number | null {
  const deduped = dedupeBlockRows(blockRows);
  const denominator = deduped.reduce(
    (sum, row) => sum + (getTotalGradeNetWeightKg(row) ?? 0),
    0
  );
  if (denominator <= 0) return null;
  const numerator = deduped.reduce(
    (sum, row) => sum + (getGradeNetWeightKg(row, grade) ?? 0),
    0
  );
  return (numerator / denominator) * 100;
}

function getBlockColumnSortValue(
  columnId: string,
  blockRows: FlattenedRow[],
  gradeHeaders: readonly string[]
): BlockSortValue {
  if (blockRows.length === 0) return null;

  const primary = blockRows[0]!;

  switch (columnId) {
    case 'familyKey':
      return primary.familyKey ?? 0;
    case 'farmer':
      return primary.farmerName;
    case 'farmerMobile':
      return primary.mobileNumber;
    case 'address':
      return primary.address;
    case 'variety':
      return minTextValue(blockRows, (row) => row.varietyName);
    case 'generation':
      return minTextValue(blockRows, (row) => row.generation);
    case 'size':
      return minTextValue(blockRows, (row) => row.sizeName);
    case 'qty':
      return sumSizeField(blockRows, (row) => row.sizeQuantity);
    case 'acres':
      return sumSizeField(blockRows, (row) => row.sizeAcres);
    case TOTAL_ACRES_PLANTED_COLUMN_ID:
      return sumSizeField(blockRows, (row) => row.sizeAcres);
    case 'bbBags':
      return sumDedupedNumeric(blockRows, (row) => row.buyBackBags);
    case 'bbNetWeight':
      return sumDedupedNumeric(blockRows, (row) => row.buyBackNetWeightKg);
    case SEED_AMOUNT_COLUMN_ID:
      return sumSizeField(blockRows, (row) => row.sizeAmountPayable);
    case NET_AMOUNT_COLUMN_ID:
      return sumDedupedNumeric(blockRows, (row) => getNetAmountRupee(row));
    case NET_AMOUNT_PER_ACRE_COLUMN_ID:
      return blockNetAmountPerAcre(blockRows);
    case NET_PROFIT_TO_COMPANY_COLUMN_ID:
      return sumDedupedNumeric(blockRows, (row) => row.netProfitToCompany);
    case NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID:
      return sumDedupedNumeric(
        blockRows,
        (row) => row.netProfitToCompanyPerAcre
      );
    case TOTAL_GRADED_BAGS_COLUMN_ID:
      return sumDedupedNumeric(blockRows, (row) => getTotalGradeBags(row));
    case TOTAL_GRADED_NET_WEIGHT_COLUMN_ID:
      return sumDedupedNumeric(blockRows, (row) =>
        getTotalGradeNetWeightKg(row)
      );
    case AVG_QUINTAL_PER_ACRE_COLUMN_ID:
      return blockAverageQuintalPerAcre(blockRows);
    case WASTAGE_KG_COLUMN_ID:
      return averageDedupedNumeric(blockRows, (row) => getWastageKg(row));
    case OUTPUT_PERCENTAGE_COLUMN_ID:
      return getPooledOutputPercentage(dedupeBlockRows(blockRows));
    case BUY_BACK_AMOUNT_COLUMN_ID:
      return sumDedupedNumeric(blockRows, (row) =>
        getBuyBackAmountFromGradeData(row)
      );
    default:
      break;
  }

  if (columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)) {
    const grade = columnId.slice(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX.length);
    return blockGradeWeightPercent(blockRows, grade);
  }

  if (columnId.startsWith(VARIETY_LEVEL_NET_WEIGHT_COLUMN_PREFIX)) {
    const grade = columnId.slice(VARIETY_LEVEL_NET_WEIGHT_COLUMN_PREFIX.length);
    return sumDedupedNumeric(blockRows, (row) =>
      getGradeNetWeightKg(row, grade)
    );
  }

  if (
    columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX) &&
    !columnId.slice(VARIETY_LEVEL_COLUMN_PREFIX.length).startsWith('__')
  ) {
    const grade = columnId.slice(VARIETY_LEVEL_COLUMN_PREFIX.length);
    return sumDedupedNumeric(blockRows, (row) => getGradeBagCount(row, grade));
  }

  void gradeHeaders;
  return null;
}

export function buildBlockSortValuesByKey(
  rows: FlattenedRow[],
  gradeHeaders: readonly string[],
  sortContext: ContractFarmingSortContext = { varietyFilterActive: false }
): BlockSortValuesByKey {
  const columnIds = buildDefaultContractFarmingColumnOrder(gradeHeaders);
  const valuesByKey: BlockSortValuesByKey = new Map();

  for (const columnId of columnIds) {
    const rowsByBlock = new Map<string, FlattenedRow[]>();
    for (const row of rows) {
      const blockKey = getSortBlockKey(row, columnId, sortContext);
      const blockRows = rowsByBlock.get(blockKey) ?? [];
      blockRows.push(row);
      rowsByBlock.set(blockKey, blockRows);
    }

    for (const [blockKey, blockRows] of rowsByBlock) {
      let values = valuesByKey.get(blockKey);
      if (!values) {
        values = {};
        valuesByKey.set(blockKey, values);
      }
      values[columnId] = getBlockColumnSortValue(
        columnId,
        blockRows,
        gradeHeaders
      );
    }
  }

  return valuesByKey;
}

export function createBlockAwareSortingFn(
  getBlockSortValues: () => BlockSortValuesByKey,
  sortContext: ContractFarmingSortContext = { varietyFilterActive: false }
): SortingFn<FlattenedRow> {
  return (rowA, rowB, columnId) => {
    const a = rowA.original;
    const b = rowB.original;
    const blockA = getSortBlockKey(a, columnId, sortContext);
    const blockB = getSortBlockKey(b, columnId, sortContext);

    if (blockA === blockB) {
      return compareBlockInternalOrder(a, b);
    }

    const blockSortValues = getBlockSortValues();
    const valuesA = blockSortValues.get(blockA);
    const valuesB = blockSortValues.get(blockB);
    const valA = valuesA?.[columnId] ?? null;
    const valB = valuesB?.[columnId] ?? null;
    const cmp = compareSortableValues(columnId, valA, valB);
    if (cmp !== 0) return cmp;

    return compareTextValues(blockA, blockB);
  };
}

/** Sort flattened rows using block-aware semantics (for tests and tooling). */
export function sortFlattenedRowsByColumn(
  rows: FlattenedRow[],
  columnId: string,
  gradeHeaders: readonly string[],
  desc = false
): FlattenedRow[] {
  const blockSortValues = buildBlockSortValuesByKey(rows, gradeHeaders);
  const sortingFn = createBlockAwareSortingFn(() => blockSortValues);
  const asRows = rows.map(
    (original) =>
      ({
        original,
        id: original.rowId,
      }) as Row<FlattenedRow>
  );

  const sorted = [...asRows].sort((rowA, rowB) => {
    const cmp = sortingFn(rowA, rowB, columnId);
    return desc ? -cmp : cmp;
  });

  return sorted.map((row) => row.original);
}

export function getSplitDisplayBlocks(
  rows: FlattenedRow[]
): Array<{ key: string; count: number }> {
  const firstOfBlockByKey = new Map<string, number>();
  let previousKey: string | null = null;

  for (const row of rows) {
    const blockKey = getDisplayFamilyBlockKey(row);
    if (blockKey !== previousKey) {
      firstOfBlockByKey.set(
        blockKey,
        (firstOfBlockByKey.get(blockKey) ?? 0) + 1
      );
      previousKey = blockKey;
    }
  }

  return [...firstOfBlockByKey.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count }));
}
