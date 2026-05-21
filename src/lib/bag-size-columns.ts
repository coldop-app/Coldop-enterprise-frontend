/**
 * Shared normalization and label→column-id mapping for bag size strings
 * (storage gate pass, nikasi gate pass, preferences).
 */

export type BagSizeColumnConfigEntry = { id: string; label: string };

export function normalizeBagSizeLabel(value: string): string {
  return value
    .replace(/\bmm\b/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/[–—−-]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const BAG_SIZE_LABEL_TO_COLUMN_ID = new Map<string, string>([
  [normalizeBagSizeLabel('Below 25'), 'bagBelow25'],
  [normalizeBagSizeLabel('25–30'), 'bag25to30'],
  [normalizeBagSizeLabel('Below 30'), 'bagBelow30'],
  [normalizeBagSizeLabel('30–35'), 'bag30to35'],
  [normalizeBagSizeLabel('30–40'), 'bag30to40'],
  [normalizeBagSizeLabel('35–40'), 'bag35to40'],
  [normalizeBagSizeLabel('40–45'), 'bag40to45'],
  [normalizeBagSizeLabel('40–50'), 'bag40to50'],
  [normalizeBagSizeLabel('45–50'), 'bag45to50'],
  [normalizeBagSizeLabel('50–55'), 'bag50to55'],
  [normalizeBagSizeLabel('Above 50'), 'bagAbove50'],
  [normalizeBagSizeLabel('Above 55'), 'bagAbove55'],
  [normalizeBagSizeLabel('Cut'), 'bagCut'],
  [normalizeBagSizeLabel('ungraded'), 'bagUngraded'],
]);

export const DEFAULT_BAG_SIZE_COLUMN_CONFIG: BagSizeColumnConfigEntry[] = [
  { id: 'bagBelow25', label: 'Below 25' },
  { id: 'bag25to30', label: '25–30' },
  { id: 'bagBelow30', label: 'Below 30' },
  { id: 'bag30to35', label: '30–35' },
  { id: 'bag30to40', label: '30–40' },
  { id: 'bag35to40', label: '35–40' },
  { id: 'bag40to45', label: '40–45' },
  { id: 'bag45to50', label: '45–50' },
  { id: 'bag50to55', label: '50–55' },
  { id: 'bagAbove50', label: 'Above 50' },
  { id: 'bagAbove55', label: 'Above 55' },
  { id: 'bagCut', label: 'Cut' },
];

function slugToColumnId(normalizedLabel: string): string {
  const slug = normalizedLabel
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug ? `bagSize__${slug}` : 'bagSize__unknown';
}

/** Stable column id for a preference or API bag size label. */
export function preferenceLabelToColumnId(label: string): string {
  const normalized = normalizeBagSizeLabel(String(label || ''));
  if (!normalized) return slugToColumnId('unknown');
  return (
    BAG_SIZE_LABEL_TO_COLUMN_ID.get(normalized) ?? slugToColumnId(normalized)
  );
}

/** Maps a raw size string (e.g. from API) to the analytics column id. */
export function resolveBagSizeColumnId(size: string): string {
  return preferenceLabelToColumnId(size);
}

/** Display label for report table / filters (ungraded has no mm suffix). */
export function formatBagSizeDisplayLabel(label: string): string {
  const trimmed = String(label || '').trim();
  if (!trimmed) return trimmed;
  if (normalizeBagSizeLabel(trimmed) === 'ungraded') return trimmed;
  return `${trimmed} (mm)`;
}

/** Build column config from cold-storage preferences (all labels, preference order). */
export function buildBagSizeColumnConfigFromPreferences(
  preferenceBagSizes: string[] | undefined
): BagSizeColumnConfigEntry[] {
  const sizes = preferenceBagSizes?.filter((s) => String(s || '').trim());
  if (!sizes?.length) return [...DEFAULT_BAG_SIZE_COLUMN_CONFIG];

  const deduped = new Map<string, BagSizeColumnConfigEntry>();
  for (const label of sizes) {
    const trimmed = String(label).trim();
    if (!trimmed) continue;
    const id = preferenceLabelToColumnId(trimmed);
    if (!deduped.has(id)) {
      deduped.set(id, { id, label: trimmed });
    }
  }
  return Array.from(deduped.values());
}

/** Merge preference config with API-only bag sizes not already in config. */
export function mergeBagSizeColumnConfigWithApiSizes(
  preferenceConfig: BagSizeColumnConfigEntry[],
  apiSizeLabels: Iterable<string>
): BagSizeColumnConfigEntry[] {
  const byId = new Map(preferenceConfig.map((entry) => [entry.id, entry]));
  const extras: BagSizeColumnConfigEntry[] = [];

  for (const rawLabel of apiSizeLabels) {
    const trimmed = String(rawLabel || '').trim();
    if (!trimmed) continue;
    const id = preferenceLabelToColumnId(trimmed);
    if (byId.has(id)) continue;
    byId.set(id, { id, label: trimmed });
    extras.push({ id, label: trimmed });
  }

  return [...preferenceConfig, ...extras];
}

const UNGRADED_COLUMN_ID = 'bagUngraded';

/** Keep only bag size columns that have at least one non-zero value in `rows`. */
export function filterBagSizeColumnConfigWithData<TRow>(
  config: BagSizeColumnConfigEntry[],
  rows: ReadonlyArray<TRow>,
  getValue: (row: TRow, columnId: string) => number = (row, columnId) =>
    Number((row as Record<string, unknown>)[columnId] ?? 0)
): BagSizeColumnConfigEntry[] {
  if (config.length === 0 || rows.length === 0) return [];

  const idsWithData = new Set<string>();
  for (const { id } of config) {
    for (const row of rows) {
      if (getValue(row, id) > 0) {
        idsWithData.add(id);
        break;
      }
    }
  }

  return config.filter(({ id }) => idsWithData.has(id));
}

/** Puts ungraded bag size column(s) before all other bag size columns. */
export function sortBagSizeColumnConfigWithUngradedFirst(
  config: BagSizeColumnConfigEntry[]
): BagSizeColumnConfigEntry[] {
  const ungraded: BagSizeColumnConfigEntry[] = [];
  const rest: BagSizeColumnConfigEntry[] = [];

  for (const entry of config) {
    if (
      entry.id === UNGRADED_COLUMN_ID ||
      normalizeBagSizeLabel(entry.label) === 'ungraded'
    ) {
      ungraded.push(entry);
    } else {
      rest.push(entry);
    }
  }

  return [...ungraded, ...rest];
}
