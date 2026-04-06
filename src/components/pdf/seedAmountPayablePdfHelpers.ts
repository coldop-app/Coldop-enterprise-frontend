import type {
  FarmerSeedBagSize,
  FarmerSeedEntryByStorageLink,
} from '@/types/farmer-seed';

function normalizeVariety(v: string | undefined | null): string {
  return (v ?? '').trim().toLowerCase();
}

/**
 * Bag size rows from farmer seed for this grading subsection when the seed record variety matches.
 */
export function getFarmerSeedBagSizesForVariety(
  variety: string | null,
  entry: FarmerSeedEntryByStorageLink | null | undefined
): FarmerSeedBagSize[] {
  if (!entry?.bagSizes?.length) return [];
  if (normalizeVariety(variety) !== normalizeVariety(entry.variety)) return [];
  return entry.bagSizes;
}
