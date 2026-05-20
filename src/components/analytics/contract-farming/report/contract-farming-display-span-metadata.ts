import type { Row } from '@tanstack/react-table';
import type { FlattenedRow } from './types';

export type DisplaySpanMetadata = {
  mergedRowSpan: number;
  isFirstOfMergedBlock: boolean;
  familyMergedRowSpan: number;
  isFirstOfFamilyBlock: boolean;
};

export function getDisplayFamilyBlockKey(row: FlattenedRow): string {
  const familyKey = row.familyKey ?? 0;
  if (familyKey > 0) {
    return `family:${familyKey}`;
  }
  const fallbackFarmerId = row.varietyRowKey.split('|')[0] ?? row.rowId;
  return `farmer:${row.farmerId ?? fallbackFarmerId}`;
}

/**
 * Leaf data rows in the same order Excel export emits them (depth-first under
 * TanStack group rows). For a fully flat table this is `rows` unchanged.
 */
export function collectLeafRowsInExportOrder(
  tableRows: Row<FlattenedRow>[]
): Row<FlattenedRow>[] {
  const out: Row<FlattenedRow>[] = [];
  for (const row of tableRows) {
    if (row.getIsGrouped() && row.subRows.length > 0) {
      out.push(...collectLeafRowsInExportOrder(row.subRows));
    } else {
      out.push(row);
    }
  }
  return out;
}

/**
 * Recompute family / variety merge flags from the current row order (after
 * sort/filter). Matches the on-screen table when spans are applied to leaf rows.
 */
export function buildDisplaySpanMetadataByRowId(
  rows: Row<FlattenedRow>[]
): Map<string, DisplaySpanMetadata> {
  const metadataByRowId = new Map<string, DisplaySpanMetadata>();
  const mergedRowSpanByRowId = new Map<string, number>();
  const familyMergedRowSpanByRowId = new Map<string, number>();
  const firstMergedBlockRowIds = new Set<string>();
  const firstFamilyBlockRowIds = new Set<string>();

  for (let index = 0; index < rows.length; ) {
    const current = rows[index]!;
    const varietyKey = current.original.varietyRowKey;
    let span = 1;
    for (let lookahead = index + 1; lookahead < rows.length; lookahead += 1) {
      if (rows[lookahead]!.original.varietyRowKey !== varietyKey) break;
      span += 1;
    }
    firstMergedBlockRowIds.add(current.id);
    mergedRowSpanByRowId.set(current.id, span);
    for (let offset = 1; offset < span; offset += 1) {
      mergedRowSpanByRowId.set(rows[index + offset]!.id, span);
    }
    index += span;
  }

  for (let index = 0; index < rows.length; ) {
    const current = rows[index]!;
    const familyBlockKey = getDisplayFamilyBlockKey(current.original);
    let span = 1;
    for (let lookahead = index + 1; lookahead < rows.length; lookahead += 1) {
      if (
        getDisplayFamilyBlockKey(rows[lookahead]!.original) !== familyBlockKey
      )
        break;
      span += 1;
    }
    firstFamilyBlockRowIds.add(current.id);
    familyMergedRowSpanByRowId.set(current.id, span);
    for (let offset = 1; offset < span; offset += 1) {
      familyMergedRowSpanByRowId.set(rows[index + offset]!.id, span);
    }
    index += span;
  }

  rows.forEach((row) => {
    metadataByRowId.set(row.id, {
      mergedRowSpan: mergedRowSpanByRowId.get(row.id) ?? 1,
      isFirstOfMergedBlock: firstMergedBlockRowIds.has(row.id),
      familyMergedRowSpan: familyMergedRowSpanByRowId.get(row.id) ?? 1,
      isFirstOfFamilyBlock: firstFamilyBlockRowIds.has(row.id),
    });
  });

  return metadataByRowId;
}
