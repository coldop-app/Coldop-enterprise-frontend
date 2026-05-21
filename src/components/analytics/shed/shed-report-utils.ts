/** Normalize size labels for consistent column ordering (en-dash vs hyphen, casing). */
export function normalizeSizeKey(size: string): string {
  return size.replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim().toLowerCase();
}

const SIZE_SORT_ORDER: string[] = [
  'below 25',
  '25-30',
  'below 30',
  '30-35',
  '30-40',
  '35-40',
  '40-45',
  '40-50',
  '45-50',
  '50-55',
  'above 50',
  'above 55',
  'cut',
  'ungraded',
];

function sizeSortIndex(size: string): number {
  const key = normalizeSizeKey(size);
  const idx = SIZE_SORT_ORDER.indexOf(key);
  return idx === -1 ? SIZE_SORT_ORDER.length : idx;
}

/** Sort size column headers for shed report tables. */
export function sortSizeLabels(sizes: Iterable<string>): string[] {
  const unique = [...new Set(sizes)];
  return unique.sort((a, b) => {
    const indexDiff = sizeSortIndex(a) - sizeSortIndex(b);
    if (indexDiff !== 0) return indexDiff;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export function collectSizeLabelsFromRows(
  rows: ReadonlyArray<{
    sizes: ReadonlyArray<{ size: string; bags?: number }>;
  }>
): string[] {
  const labels: string[] = [];
  for (const row of rows) {
    for (const { size, bags } of row.sizes) {
      if (Number(bags ?? 0) > 0) labels.push(size);
    }
  }
  return sortSizeLabels(labels);
}

/** Restrict size columns to labels with at least one non-zero bag count in `rows`. */
export function filterSizeLabelsWithData(
  sizes: string[],
  rows: ReadonlyArray<{
    sizes: ReadonlyArray<{ size: string; bags: number }>;
  }>
): string[] {
  if (sizes.length === 0 || rows.length === 0) return [];

  const withData = new Set<string>();
  for (const row of rows) {
    for (const { size, bags } of row.sizes) {
      if (Number(bags) > 0) withData.add(size);
    }
  }

  return sizes.filter((size) => withData.has(size));
}
