import { normalizeBagSizeLabel } from '@/lib/bag-size-columns';
import type { CreateDispatchPostStorageStorageGatePass } from '@/types/dispatch-post-storage';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';

export type BagSlotDetail = {
  bagIndex: number;
  currentQuantity: number;
  initialQuantity: number;
  bagType: string;
  chamber: string;
  floor: string;
  row: string;
};

export type DatePassGroup = {
  dateKey: string;
  dateLabel: string;
  passes: StorageGatePassWithLink[];
};

const KEY_SEPARATOR = '::';

export function allocationKey(
  passId: string,
  sizeName: string,
  bagIndex: number
): string {
  return `${passId}${KEY_SEPARATOR}${sizeName}${KEY_SEPARATOR}${bagIndex}`;
}

export function parseAllocationKey(key: string): {
  passId: string;
  sizeName: string;
  bagIndex: number;
} | null {
  const parts = key.split(KEY_SEPARATOR);
  if (parts.length !== 3) return null;
  const [passId, sizeName, bagIndexRaw] = parts;
  const bagIndex = Number(bagIndexRaw);
  if (!passId || !sizeName || !Number.isInteger(bagIndex)) return null;
  return { passId, sizeName, bagIndex };
}

export function getBagSlotsForSize(
  pass: StorageGatePassWithLink,
  sizeName: string
): BagSlotDetail[] {
  return (pass.bagSizes ?? [])
    .map((bag, bagIndex) => ({ bag, bagIndex }))
    .filter(({ bag }) => bag.size === sizeName)
    .map(({ bag, bagIndex }) => ({
      bagIndex,
      currentQuantity: bag.currentQuantity ?? 0,
      initialQuantity: bag.initialQuantity ?? 0,
      bagType: bag.bagType ?? '',
      chamber: bag.chamber ?? '',
      floor: bag.floor ?? '',
      row: bag.row ?? '',
    }));
}

export function formatLocationShort(slot: {
  chamber: string;
  floor: string;
  row: string;
}): string {
  return `C${slot.chamber} / F${slot.floor} / R${slot.row}`;
}

function isUsableBagSize(size: string | undefined | null): boolean {
  const trimmed = size?.trim() ?? '';
  if (!trimmed) return false;
  const normalized = trimmed.toLowerCase();
  return normalized !== 'null' && normalized !== 'null bag size';
}

function localeCompareSize(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

/** Sort size labels by `preferences.bagSizes` order; unmatched sizes follow last. */
export function sortSizesByPreferenceOrder(
  sizes: string[],
  preferenceBagSizes?: string[]
): string[] {
  if (!preferenceBagSizes?.length) {
    return [...sizes].sort(localeCompareSize);
  }

  const indexByNormalized = new Map<string, number>();
  preferenceBagSizes.forEach((label, index) => {
    const key = normalizeBagSizeLabel(label);
    if (key && !indexByNormalized.has(key)) {
      indexByNormalized.set(key, index);
    }
  });

  return [...sizes].sort((a, b) => {
    const aIndex = indexByNormalized.get(normalizeBagSizeLabel(a));
    const bIndex = indexByNormalized.get(normalizeBagSizeLabel(b));
    const aInPrefs = aIndex !== undefined;
    const bInPrefs = bIndex !== undefined;
    if (aInPrefs && bInPrefs) return aIndex - bIndex;
    if (aInPrefs) return -1;
    if (bInPrefs) return 1;
    return localeCompareSize(a, b);
  });
}

export function uniqueSizesFromPasses(
  passes: StorageGatePassWithLink[],
  preferenceBagSizes?: string[]
): string[] {
  const sizes = new Set<string>();
  for (const pass of passes) {
    for (const bag of pass.bagSizes ?? []) {
      if (isUsableBagSize(bag.size)) sizes.add(bag.size.trim());
    }
  }
  return sortSizesByPreferenceOrder([...sizes], preferenceBagSizes);
}

export function uniqueVarietiesFromPasses(
  passes: StorageGatePassWithLink[]
): string[] {
  const varieties = new Set<string>();
  for (const pass of passes) {
    if (pass.variety?.trim()) varieties.add(pass.variety.trim());
  }
  return [...varieties].sort((a, b) => a.localeCompare(b));
}

export function uniqueLocationsFromPasses(passes: StorageGatePassWithLink[]): {
  chambers: string[];
  floors: string[];
  rows: string[];
} {
  const chambers = new Set<string>();
  const floors = new Set<string>();
  const rows = new Set<string>();
  for (const pass of passes) {
    for (const bag of pass.bagSizes ?? []) {
      if (bag.chamber?.trim()) chambers.add(bag.chamber.trim());
      if (bag.floor?.trim()) floors.add(bag.floor.trim());
      if (bag.row?.trim()) rows.add(bag.row.trim());
    }
  }
  const collator = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true });
  return {
    chambers: [...chambers].sort(collator),
    floors: [...floors].sort(collator),
    rows: [...rows].sort(collator),
  };
}

function toDateKey(value: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return 'unknown';
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateKey: string): string {
  if (dateKey === 'unknown') return 'Unknown date';
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function groupPassesByDate(
  passes: StorageGatePassWithLink[]
): DatePassGroup[] {
  const groups = new Map<string, StorageGatePassWithLink[]>();
  for (const pass of passes) {
    const dateKey = toDateKey(pass.date);
    const list = groups.get(dateKey);
    if (list) list.push(pass);
    else groups.set(dateKey, [pass]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, groupPasses]) => ({
      dateKey,
      dateLabel: formatDateLabel(dateKey),
      passes: groupPasses,
    }));
}

export function passMatchesLocationFilters(
  pass: StorageGatePassWithLink,
  filters: { chamber: string; floor: string; row: string }
): boolean {
  if (!filters.chamber && !filters.floor && !filters.row) return true;
  return (pass.bagSizes ?? []).some((bag) => {
    if (filters.chamber && bag.chamber?.trim() !== filters.chamber)
      return false;
    if (filters.floor && bag.floor?.trim() !== filters.floor) return false;
    if (filters.row && bag.row?.trim() !== filters.row) return false;
    return true;
  });
}

export function passMatchesSearch(
  pass: StorageGatePassWithLink,
  search: string
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const gatePassNo = String(pass.gatePassNo ?? '');
  const manual =
    pass.manualGatePassNumber != null ? String(pass.manualGatePassNumber) : '';
  return gatePassNo.includes(q) || manual.toLowerCase().includes(q);
}

export function allocationPassId(key: string): string | null {
  return parseAllocationKey(key)?.passId ?? null;
}

export function getAllocatableSlots(
  pass: StorageGatePassWithLink
): Array<{ sizeName: string; slot: BagSlotDetail }> {
  return (pass.bagSizes ?? [])
    .map((bag, bagIndex) => ({ bag, bagIndex }))
    .filter(
      ({ bag }) => isUsableBagSize(bag.size) && (bag.currentQuantity ?? 0) > 0
    )
    .map(({ bag, bagIndex }) => ({
      sizeName: bag.size.trim(),
      slot: {
        bagIndex,
        currentQuantity: bag.currentQuantity ?? 0,
        initialQuantity: bag.initialQuantity ?? 0,
        bagType: bag.bagType ?? '',
        chamber: bag.chamber ?? '',
        floor: bag.floor ?? '',
        row: bag.row ?? '',
      },
    }));
}

export function isPassFullyAllocated(
  pass: StorageGatePassWithLink,
  allocations: Record<string, number>
): boolean {
  const slots = getAllocatableSlots(pass);
  if (slots.length === 0) return false;
  return slots.every(
    ({ sizeName, slot }) =>
      (allocations[allocationKey(pass._id, sizeName, slot.bagIndex)] ?? 0) > 0
  );
}

export function allocateFullPass(
  pass: StorageGatePassWithLink,
  allocations: Record<string, number>
): Record<string, number> {
  const next = { ...allocations };
  for (const { sizeName, slot } of getAllocatableSlots(pass)) {
    next[allocationKey(pass._id, sizeName, slot.bagIndex)] =
      slot.currentQuantity;
  }
  return next;
}

export function clearPassAllocations(
  passId: string,
  allocations: Record<string, number>
): Record<string, number> {
  const next = { ...allocations };
  for (const key of Object.keys(next)) {
    if (allocationPassId(key) === passId) delete next[key];
  }
  return next;
}

export function listPositiveAllocations(
  allocations: Record<string, number>
): Array<{
  key: string;
  sizeName: string;
  bagIndex: number;
  quantity: number;
}> {
  return Object.entries(allocations)
    .filter(([, qty]) => (qty ?? 0) > 0)
    .map(([key, quantity]) => {
      const parsed = parseAllocationKey(key);
      return {
        key,
        sizeName: parsed?.sizeName ?? key,
        bagIndex: parsed?.bagIndex ?? 0,
        quantity,
      };
    });
}

export type BuildStorageGatePassesError = 'empty' | 'unresolved';

export type BuildStorageGatePassesResult =
  | {
      ok: true;
      storageGatePasses: CreateDispatchPostStorageStorageGatePass[];
    }
  | { ok: false; reason: BuildStorageGatePassesError };

/** Map matrix allocation keys to the create-dispatch `storageGatePasses` payload. */
export function buildStorageGatePassesFromAllocations(
  allocations: Record<string, number>,
  passes: StorageGatePassWithLink[]
): BuildStorageGatePassesResult {
  const passById = new Map(passes.map((pass) => [pass._id, pass]));
  const grouped = new Map<
    string,
    CreateDispatchPostStorageStorageGatePass['allocations']
  >();

  const positiveEntries = Object.entries(allocations).filter(
    ([, qty]) => (qty ?? 0) > 0
  );
  if (positiveEntries.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  for (const [key, quantity] of positiveEntries) {
    const parsed = parseAllocationKey(key);
    if (!parsed) return { ok: false, reason: 'unresolved' };

    const pass = passById.get(parsed.passId);
    const bag = pass?.bagSizes?.[parsed.bagIndex];
    if (!pass || !bag) return { ok: false, reason: 'unresolved' };

    const list = grouped.get(pass._id) ?? [];
    list.push({
      size: bag.size?.trim() || parsed.sizeName,
      quantityToAllocate: quantity,
      chamber: bag.chamber ?? '',
      floor: bag.floor ?? '',
      row: bag.row ?? '',
    });
    grouped.set(pass._id, list);
  }

  return {
    ok: true,
    storageGatePasses: [...grouped.entries()].map(
      ([storageGatePassId, passAllocations]) => ({
        storageGatePassId,
        allocations: passAllocations,
      })
    ),
  };
}
