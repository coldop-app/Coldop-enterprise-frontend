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
  entries: FarmerSeedEntryByStorageLink[] | null | undefined
): FarmerSeedBagSize[] {
  if (!entries?.length) return [];
  return entries
    .filter(
      (entry) =>
        normalizeVariety(variety) === normalizeVariety(entry.variety) &&
        entry.bagSizes?.length
    )
    .flatMap((entry) => entry.bagSizes);
}
