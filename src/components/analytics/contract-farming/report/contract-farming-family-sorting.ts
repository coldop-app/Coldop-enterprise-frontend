import type { SortingFn } from '@tanstack/react-table';
import type { FlattenedRow } from './types';

export function isFamilyGroupedRow(row: FlattenedRow): boolean {
  const familyKey = row.familyKey ?? 0;
  return familyKey > 0 && row.varietyRowKey.startsWith('family-');
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

export function compareFamilyInternalOrder(
  a: FlattenedRow,
  b: FlattenedRow
): number {
  const varietyCmp = a.varietyName.localeCompare(b.varietyName);
  if (varietyCmp !== 0) return varietyCmp;
  return a.sizeRowIndex - b.sizeRowIndex;
}

/**
 * Sorts by a family-level aggregate when rows belong to a grouped family block,
 * keeping all rows in the same family contiguous after TanStack sort.
 */
export function createFamilyAwareNumericSortingFn(
  getValue: (row: FlattenedRow) => number | null,
  getFamilySortValue: (row: FlattenedRow) => number | null | undefined
): SortingFn<FlattenedRow> {
  return (rowA, rowB) => {
    const a = rowA.original;
    const b = rowB.original;
    const aGrouped = isFamilyGroupedRow(a);
    const bGrouped = isFamilyGroupedRow(b);
    const familyA = a.familyKey ?? 0;
    const familyB = b.familyKey ?? 0;

    if (aGrouped && bGrouped && familyA === familyB) {
      return compareFamilyInternalOrder(a, b);
    }

    const valA = aGrouped ? (getFamilySortValue(a) ?? null) : getValue(a);
    const valB = bGrouped ? (getFamilySortValue(b) ?? null) : getValue(b);
    const cmp = compareNullableNumbers(valA, valB);
    if (cmp !== 0) return cmp;

    if (aGrouped && bGrouped) return familyA - familyB;
    if (aGrouped !== bGrouped) {
      return aGrouped ? -1 : 1;
    }

    return compareFamilyInternalOrder(a, b);
  };
}
