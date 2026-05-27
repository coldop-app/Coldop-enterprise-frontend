/** Normalize size labels for deduplication, ordering, and lookups. */
export function normalizeSizeKey(size: string): string {
  return size
    .replace(/\bmm\b/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/[–—−-]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
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

/** Preferred header text for a normalized size key. */
const CANONICAL_LABEL_BY_KEY: Record<string, string> = {
  'below 25': 'Below 25',
  '25-30': '25-30',
  'below 30': 'Below 30',
  '30-35': '30-35',
  '30-40': '30-40',
  '35-40': '35-40',
  '40-45': '40-45',
  '40-50': '40-50',
  '45-50': '45-50',
  '50-55': '50-55',
  'above 50': 'Above 50',
  'above 55': 'Above 55',
  cut: 'Cut',
  ungraded: 'Ungraded',
};

export function canonicalSizeLabel(size: string): string {
  const key = normalizeSizeKey(size);
  if (!key) return size.trim();
  return CANONICAL_LABEL_BY_KEY[key] ?? size.trim();
}

function sizeSortIndex(size: string): number {
  const key = normalizeSizeKey(size);
  const idx = SIZE_SORT_ORDER.indexOf(key);
  return idx === -1 ? SIZE_SORT_ORDER.length : idx;
}

/** Unique size column headers in display order (one column per normalized size). */
export function sortSizeLabels(sizes: Iterable<string>): string[] {
  const byKey = new Map<string, string>();
  for (const size of sizes) {
    const key = normalizeSizeKey(size);
    if (!key) continue;
    if (!byKey.has(key)) {
      byKey.set(key, canonicalSizeLabel(size));
    }
  }
  return [...byKey.values()].sort((a, b) => {
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
      if (Number(bags) > 0) withData.add(normalizeSizeKey(size));
    }
  }

  return sizes.filter((size) => withData.has(normalizeSizeKey(size)));
}

/** Sum numeric values for all size rows that match `sizeLabel` after normalization. */
export function sumByNormalizedSize<T extends { size: string }>(
  sizeRows: ReadonlyArray<T>,
  sizeLabel: string,
  getValue: (row: T) => number
): number {
  const targetKey = normalizeSizeKey(sizeLabel);
  let total = 0;
  for (const row of sizeRows) {
    if (normalizeSizeKey(row.size) === targetKey) {
      total += getValue(row);
    }
  }
  return total;
}
