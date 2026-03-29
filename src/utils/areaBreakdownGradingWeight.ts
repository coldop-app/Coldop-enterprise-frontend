import {
  GRADING_SIZES,
  JUTE_BAG_WEIGHT,
} from '@/components/forms/grading/constants';

/**
 * Normalize grading size labels for map lookup (match size-distribution API normalization).
 */
export function normalizeGradingSizeKey(size: string): string {
  return size.trim().replace(/-/g, '–');
}

/**
 * Representative gross weight (kg) per jute bag by grading size, used when the API does not
 * send `weightExcludingBardanaKg` per line. Net potato kg uses the same rule as
 * {@link computeSizeDistribution}: `bags × (grossPerBag − JUTE_BAG_WEIGHT)`.
 */
const DEFAULT_GROSS_WEIGHT_KG_PER_BAG: Record<string, number> =
  Object.fromEntries(
    (
      [
        ['Below 25', 49],
        ['25–30', 49.5],
        ['Below 30', 50],
        ['30–35', 50.5],
        ['35–40', 51],
        ['30–40', 50.5],
        ['40–45', 52],
        ['45–50', 53],
        ['50–55', 54],
        ['Above 50', 54.5],
        ['Above 55', 55],
        ['Cut', 45],
      ] as const
    ).map(([k, v]) => [k, v])
  );

/** Fallback gross kg/bag when size is unknown */
const DEFAULT_GROSS_FALLBACK_KG = 51;

for (const s of GRADING_SIZES) {
  const k = s as string;
  if (DEFAULT_GROSS_WEIGHT_KG_PER_BAG[k] == null) {
    DEFAULT_GROSS_WEIGHT_KG_PER_BAG[k] = DEFAULT_GROSS_FALLBACK_KG;
  }
}

export function getDefaultGrossWeightKgPerBagForGradingSize(
  size: string
): number {
  const key = normalizeGradingSizeKey(size);
  return DEFAULT_GROSS_WEIGHT_KG_PER_BAG[key] ?? DEFAULT_GROSS_FALLBACK_KG;
}

/**
 * Net potato weight (kg) for a stock line, excluding bardana (jute tare), when only bag count
 * and size are known — mirrors per-row logic in farmer profile size distribution.
 */
export function netPotatoKgFromBagsForGradingSize(
  bags: number,
  size: string
): number {
  if (bags <= 0) return 0;
  const gross = getDefaultGrossWeightKgPerBagForGradingSize(size);
  const netPerBag = Math.max(0, gross - JUTE_BAG_WEIGHT);
  return bags * netPerBag;
}
