/**
 * Shared normalization and label→column-id mapping for bag size strings
 * (storage gate pass, nikasi gate pass, preferences).
 */

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

const BAG_SIZE_LABEL_TO_COLUMN_ID = new Map([
  [normalizeBagSizeLabel('Below 25'), 'bagBelow25'],
  [normalizeBagSizeLabel('25–30'), 'bag25to30'],
  [normalizeBagSizeLabel('Below 30'), 'bagBelow30'],
  [normalizeBagSizeLabel('30–35'), 'bag30to35'],
  [normalizeBagSizeLabel('30–40'), 'bag30to40'],
  [normalizeBagSizeLabel('35–40'), 'bag35to40'],
  [normalizeBagSizeLabel('40–45'), 'bag40to45'],
  [normalizeBagSizeLabel('45–50'), 'bag45to50'],
  [normalizeBagSizeLabel('50–55'), 'bag50to55'],
  [normalizeBagSizeLabel('Above 50'), 'bagAbove50'],
  [normalizeBagSizeLabel('Above 55'), 'bagAbove55'],
  [normalizeBagSizeLabel('Cut'), 'bagCut'],
]);

/** Maps a raw size string (e.g. from API) to the analytics column id, or undefined if unknown. */
export function resolveBagSizeColumnId(size: string): string | undefined {
  return BAG_SIZE_LABEL_TO_COLUMN_ID.get(
    normalizeBagSizeLabel(String(size || ''))
  );
}
