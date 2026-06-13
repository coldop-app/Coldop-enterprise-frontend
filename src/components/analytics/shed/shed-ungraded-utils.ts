import type {
  ShedStockReportSourceVariety,
  ShedStockReportShedVariety,
} from '@/types/analytics';
import {
  isUngradedSize,
  normalizeSizeKey,
  sortSizeLabels,
  sumByNormalizedSize,
} from './shed-report-utils';
import type { ShedStockMetric } from './shed-stock-calculation';

export type UngradedBagsByVariety = ReadonlyMap<string, number>;

export function buildUngradedBagsByVariety(
  varieties: ReadonlyArray<ShedStockReportSourceVariety>
): UngradedBagsByVariety {
  const map = new Map<string, number>();
  for (const { variety, totalBags, sizes } of varieties) {
    let bags = Number(totalBags ?? 0);
    if (bags === 0 && sizes.length > 0) {
      bags = sizes.reduce((sum, row) => sum + Number(row.bags ?? 0), 0);
    }
    if (bags > 0) {
      map.set(variety, bags);
    }
  }
  return map;
}

export function buildNotInternalUngradedBagsByVariety(
  varieties: ReadonlyArray<ShedStockReportSourceVariety>
): UngradedBagsByVariety {
  const map = new Map<string, number>();
  for (const { variety, sizes } of varieties) {
    let total = 0;
    for (const { size, bags } of sizes) {
      if (isUngradedSize(size)) {
        total += Number(bags ?? 0);
      }
    }
    if (total > 0) {
      map.set(variety, total);
    }
  }
  return map;
}

export function getUngradedTableBags(
  map: UngradedBagsByVariety,
  variety: string
): number {
  return map.get(variety) ?? 0;
}

export function getNotInternalUngradedBags(
  map: UngradedBagsByVariety,
  variety: string
): number {
  return map.get(variety) ?? 0;
}

export function getApiUngradedMetricValue(
  variety: ShedStockReportShedVariety,
  metric: ShedStockMetric
): number {
  return sumByNormalizedSize(variety.sizes, 'ungraded', (row) =>
    Number(row[metric] ?? 0)
  );
}

export function varietyHasUngradedColumnData(
  variety: ShedStockReportShedVariety,
  ungradedTable: UngradedBagsByVariety,
  notInternalUngraded: UngradedBagsByVariety,
  metric: ShedStockMetric
): boolean {
  if (getUngradedTableBags(ungradedTable, variety.variety) > 0) return true;
  if (getNotInternalUngradedBags(notInternalUngraded, variety.variety) > 0) {
    return true;
  }
  for (const row of variety.sizes) {
    if (isUngradedSize(row.size) && Number(row[metric] ?? 0) !== 0) {
      return true;
    }
  }
  return false;
}

/**
 * Shed stock value for the ungraded column: physical ungraded bags in the shed
 * (ungraded table) combined with the graded-formula slice for ungraded dispatch
 * (API shedStock size row, driven by not-internally-transferred ungraded).
 */
export function getUngradedShedStockCellValue(
  variety: ShedStockReportShedVariety,
  ungradedTable: UngradedBagsByVariety,
  notInternalUngraded: UngradedBagsByVariety
): number {
  const physicalUngraded = getUngradedTableBags(ungradedTable, variety.variety);
  const notInternal = getNotInternalUngradedBags(
    notInternalUngraded,
    variety.variety
  );

  if (physicalUngraded > 0 || notInternal > 0) {
    return physicalUngraded - notInternal;
  }

  return getApiUngradedMetricValue(variety, 'shedStock');
}

/**
 * Row total on the Shed Stock tab includes physical ungraded bags per variety.
 */
export function getShedStockVarietyTotal(
  variety: ShedStockReportShedVariety,
  ungradedTable: UngradedBagsByVariety
): number {
  return (
    variety.shedStock + getUngradedTableBags(ungradedTable, variety.variety)
  );
}

export function sumUngradedTableBags(map: UngradedBagsByVariety): number {
  let total = 0;
  for (const bags of map.values()) {
    total += bags;
  }
  return total;
}

export function collectUngradedColumnLabels(
  varieties: ShedStockReportShedVariety[],
  ungradedTable: UngradedBagsByVariety,
  notInternalUngraded: UngradedBagsByVariety,
  metric: ShedStockMetric
): string[] {
  const hasData = varieties.some((variety) =>
    varietyHasUngradedColumnData(
      variety,
      ungradedTable,
      notInternalUngraded,
      metric
    )
  );
  return hasData ? ['Ungraded'] : [];
}

function createEmptyShedVariety(variety: string): ShedStockReportShedVariety {
  return {
    variety,
    gradingInitial: 0,
    stored: 0,
    dispatched: 0,
    internallyTransferred: 0,
    notInternallyTransferred: 0,
    shedStock: 0,
    sizes: [],
  };
}

/** Append stub shed rows for varieties that only appear in the ungraded table. */
export function mergeShedVarietiesWithUngraded(
  shedVarieties: ShedStockReportShedVariety[],
  ungradedVarieties: ReadonlyArray<ShedStockReportSourceVariety>
): ShedStockReportShedVariety[] {
  const existing = new Set(shedVarieties.map((row) => row.variety));
  const merged = [...shedVarieties];

  for (const { variety, totalBags, sizes } of ungradedVarieties) {
    if (existing.has(variety)) continue;

    let bags = Number(totalBags ?? 0);
    if (bags === 0 && sizes.length > 0) {
      bags = sizes.reduce((sum, row) => sum + Number(row.bags ?? 0), 0);
    }

    if (bags > 0) {
      merged.push(createEmptyShedVariety(variety));
      existing.add(variety);
    }
  }

  return merged;
}

/**
 * Size columns for a metric tab, including an Ungraded column when ungraded-table
 * or dispatch data exists even if the API shed-stock sizes omit that label.
 */
export function resolveEffectiveSizesForMetric(
  sizes: string[],
  varieties: ShedStockReportShedVariety[],
  metric: ShedStockMetric,
  ungradedTable: UngradedBagsByVariety,
  notInternalUngraded: UngradedBagsByVariety
): string[] {
  const withData = new Set<string>();

  for (const variety of varieties) {
    for (const sizeRow of variety.sizes) {
      if (Number(sizeRow[metric]) !== 0) {
        withData.add(normalizeSizeKey(sizeRow.size));
      }
    }

    if (
      varietyHasUngradedColumnData(
        variety,
        ungradedTable,
        notInternalUngraded,
        metric
      )
    ) {
      withData.add('ungraded');
    }
  }

  const filtered = sizes.filter((size) => withData.has(normalizeSizeKey(size)));

  if (withData.has('ungraded') && !filtered.some(isUngradedSize)) {
    filtered.push('Ungraded');
  }

  return sortSizeLabels(filtered);
}
