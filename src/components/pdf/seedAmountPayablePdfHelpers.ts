import type {
  FarmerSeedBagSize,
  FarmerSeedEntryByStorageLink,
} from '@/types/farmer-seed';

function normalizeVariety(v: string | undefined | null): string {
  return (v ?? '').trim().toLowerCase();
}

/**
 * Farmer seed records for this variety, ordered by date then id (stable separate “seed given” lines).
 */
export function getFarmerSeedEntriesForVarietyOrdered(
  variety: string | null,
  entries: FarmerSeedEntryByStorageLink[] | null | undefined
): FarmerSeedEntryByStorageLink[] {
  if (!entries?.length) return [];
  const v = normalizeVariety(variety);
  return entries
    .filter(
      (entry) =>
        v === normalizeVariety(entry.variety) &&
        (entry.bagSizes?.length ?? 0) > 0
    )
    .slice()
    .sort((a, b) => {
      const da = (a.date ?? '').trim();
      const db = (b.date ?? '').trim();
      if (da !== db) return da.localeCompare(db);
      return String(a._id).localeCompare(String(b._id));
    });
}

/** Drop duplicate API rows so the same seed entry is not listed twice in PDF tables. */
export function dedupeFarmerSeedEntriesById(
  entries: FarmerSeedEntryByStorageLink[]
): FarmerSeedEntryByStorageLink[] {
  const seen = new Set<string>();
  const out: FarmerSeedEntryByStorageLink[] = [];
  for (const e of entries) {
    const id = String(e._id ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(e);
  }
  return out;
}

/**
 * Merge bag lines that share the same name (case-insensitive) for variety-wise clubbed totals.
 */
export function mergeFarmerSeedBagsByName(
  bags: FarmerSeedBagSize[]
): FarmerSeedBagSize[] {
  const map = new Map<string, FarmerSeedBagSize>();
  for (const bag of bags) {
    const key = (bag.name ?? '').trim().toLowerCase();
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...bag,
        name: bag.name?.trim() ? bag.name.trim() : bag.name,
      });
      continue;
    }
    const q1 = Number(existing.quantity);
    const q2 = Number(bag.quantity);
    const q1n = Number.isFinite(q1) ? q1 : 0;
    const q2n = Number.isFinite(q2) ? q2 : 0;
    const sumQty = q1n + q2n;
    const r1 = Number(existing.rate);
    const r2 = Number(bag.rate);
    const weightedRate =
      sumQty > 0 &&
      Number.isFinite(r1) &&
      Number.isFinite(r2) &&
      Number.isFinite(q1n) &&
      Number.isFinite(q2n)
        ? (q1n * r1 + q2n * r2) / sumQty
        : Number.isFinite(r1)
          ? r1
          : r2;
    existing.quantity = sumQty;
    existing.rate = weightedRate;
    existing.acres = (existing.acres ?? 0) + (bag.acres ?? 0);
    const ar1 = existing.amountReceived ?? 0;
    const ar2 = bag.amountReceived ?? 0;
    existing.amountReceived =
      Number.isFinite(ar1) || Number.isFinite(ar2) ? ar1 + ar2 : undefined;
  }
  return [...map.values()];
}

/**
 * Bag size rows from farmer seed for this grading subsection when the seed record variety matches.
 * @deprecated Prefer `getFarmerSeedEntriesForVarietyOrdered` + per-entry bag lines for PDFs that need separate seed-given rows.
 */
export function getFarmerSeedBagSizesForVariety(
  variety: string | null,
  entries: FarmerSeedEntryByStorageLink[] | null | undefined
): FarmerSeedBagSize[] {
  return getFarmerSeedEntriesForVarietyOrdered(variety, entries).flatMap(
    (entry) => entry.bagSizes ?? []
  );
}
