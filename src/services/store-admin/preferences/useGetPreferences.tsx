import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export interface PreferenceOption {
  label: string;
  value: string;
}

export interface BagConfig {
  juteBagWeight: number;
  lenoBagWeight: number;
  bagTypes: string[];
}

export interface BuyBackCost {
  variety: string;
  sizeRates: Record<string, number>;
}

/** One graded size row for standard seed yield / rate (per variety) */
export interface StandardSeedBagSizeRow {
  name: string;
  ratePerBag: number;
  bagsPerAcre: number;
}

export interface StandardSeedBagsPerAcreEntry {
  variety: string;
  sizes: StandardSeedBagSizeRow[];
}

export interface PreferencesCustomData {
  potatoVarieties: PreferenceOption[];
  farmerSeedGenerations: PreferenceOption[];
  graderOptions: string[];
  incomingLocations: string[];
  bagConfig: BagConfig;
  /** Per variety: standard bags/acre and rate per bag by graded size */
  standardSeedBagsPerAcre: StandardSeedBagsPerAcreEntry[];
  buyBackCost: BuyBackCost[];
}

export interface PreferencesData {
  _id: string;
  coldStorageId: string;
  bagSizes: string[];
  reportFormat: string;
  custom: PreferencesCustomData;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetPreferencesApiResponse {
  success: boolean;
  data: PreferencesData | null;
  message?: string;
}

function dashKeyVariants(label: string): string[] {
  return [label, label.replace(/-/g, '–'), label.replace(/–/g, '-')].filter(
    (v, i, a) => a.indexOf(v) === i
  );
}

function pickNumericFromMap(
  map: Record<string, number>,
  key: string
): number | undefined {
  for (const k of dashKeyVariants(key)) {
    if (map[k] !== undefined) return map[k];
  }
  return undefined;
}

function findSizeRow(
  sizes: StandardSeedBagSizeRow[],
  sizeName: string
): StandardSeedBagSizeRow | undefined {
  const variants = new Set(dashKeyVariants(sizeName));
  return sizes.find((s) => variants.has(s.name));
}

/** Lookup standard bags/acre for a variety and graded size (hyphen / en-dash tolerant). */
export function getBagsPerAcreForVarietySize(
  entries: StandardSeedBagsPerAcreEntry[] | undefined,
  variety: string,
  sizeName: string
): number {
  if (!entries?.length || !variety?.trim() || !sizeName) return 0;
  const v = variety.trim();
  const entry =
    entries.find((e) => e.variety === v) ??
    entries.find((e) => e.variety.trim() === v) ??
    entries.find((e) => e.variety.toLowerCase() === v.toLowerCase());
  if (!entry) return 0;
  const row = findSizeRow(entry.sizes, sizeName);
  const n = Number(row?.bagsPerAcre);
  return Number.isFinite(n) ? n : 0;
}

/** Lookup standard rate per bag (₹) for a variety and graded size (hyphen / en-dash tolerant). */
export function getRatePerBagForVarietySize(
  entries: StandardSeedBagsPerAcreEntry[] | undefined,
  variety: string,
  sizeName: string
): number {
  if (!entries?.length || !variety?.trim() || !sizeName) return 0;
  const v = variety.trim();
  const entry =
    entries.find((e) => e.variety === v) ??
    entries.find((e) => e.variety.trim() === v) ??
    entries.find((e) => e.variety.toLowerCase() === v.toLowerCase());
  if (!entry) return 0;
  const row = findSizeRow(entry.sizes, sizeName);
  const n = Number(row?.ratePerBag);
  return Number.isFinite(n) ? n : 0;
}

/** Variety block from `standardSeedBagsPerAcre` (exact / trim / case-insensitive). */
export function getStandardSeedEntryForVariety(
  entries: StandardSeedBagsPerAcreEntry[] | undefined,
  variety: string
): StandardSeedBagsPerAcreEntry | undefined {
  if (!entries?.length || !variety?.trim()) return undefined;
  const v = variety.trim();
  return (
    entries.find((e) => e.variety === v) ??
    entries.find((e) => e.variety.trim() === v) ??
    entries.find((e) => e.variety.toLowerCase() === v.toLowerCase())
  );
}

/** Build / merge standardSeedBagsPerAcre from API + bag sizes + varieties */
export function normalizeStandardSeedBagsPerAcre(
  custom: Record<string, unknown>,
  bagSizes: string[],
  potatoVarieties: PreferenceOption[]
): StandardSeedBagsPerAcreEntry[] {
  const rawNew = custom.standardSeedBagsPerAcre;
  const fromApi =
    Array.isArray(rawNew) &&
    rawNew.every(
      (e) =>
        e &&
        typeof e === 'object' &&
        typeof (e as StandardSeedBagsPerAcreEntry).variety === 'string' &&
        Array.isArray((e as StandardSeedBagsPerAcreEntry).sizes)
    )
      ? (rawNew as StandardSeedBagsPerAcreEntry[])
      : [];

  const oldFlat = custom.standardBagsPerAcre;
  const oldMap: Record<string, number> =
    oldFlat &&
    typeof oldFlat === 'object' &&
    !Array.isArray(oldFlat) &&
    oldFlat !== null
      ? (oldFlat as Record<string, number>)
      : {};

  const byVariety = new Map<string, StandardSeedBagsPerAcreEntry>();

  for (const row of fromApi) {
    const v = row.variety?.trim() ?? '';
    if (!v) continue;
    byVariety.set(v, {
      variety: v,
      sizes: (row.sizes ?? []).map((s) => ({
        name: String(s.name ?? ''),
        ratePerBag: Number(s.ratePerBag) || 0,
        bagsPerAcre: Number(s.bagsPerAcre) || 0,
      })),
    });
  }

  const legacyFlatOnly = fromApi.length === 0 && Object.keys(oldMap).length > 0;

  for (const { value } of potatoVarieties) {
    const key = value.trim();
    if (!key) continue;
    if (!byVariety.has(key)) {
      byVariety.set(key, {
        variety: key,
        sizes: bagSizes.map((name) => ({
          name,
          ratePerBag: 0,
          bagsPerAcre: legacyFlatOnly
            ? (pickNumericFromMap(oldMap, name) ?? 0)
            : 0,
        })),
      });
    }
  }

  const result: StandardSeedBagsPerAcreEntry[] = potatoVarieties
    .map(({ value }) => byVariety.get(value.trim()))
    .filter((e): e is StandardSeedBagsPerAcreEntry => Boolean(e));

  for (const entry of result) {
    const merged: StandardSeedBagSizeRow[] = [];
    for (const name of bagSizes) {
      const existing = findSizeRow(entry.sizes, name);
      merged.push({
        name,
        ratePerBag: existing?.ratePerBag ?? 0,
        bagsPerAcre:
          existing?.bagsPerAcre ??
          (legacyFlatOnly ? (pickNumericFromMap(oldMap, name) ?? 0) : 0),
      });
    }
    entry.sizes = merged;
  }

  return result;
}

export function normalizePreferences(
  preferences: PreferencesData,
  fallback?: PreferencesData
): PreferencesData {
  const custom = preferences.custom ?? ({} as PreferencesData['custom']);
  const fallbackCustom = fallback?.custom;
  const bagConfig =
    custom.bagConfig ?? ({} as PreferencesData['custom']['bagConfig']);
  const fallbackBagConfig = fallbackCustom?.bagConfig;

  const bagSizes = preferences.bagSizes ?? fallback?.bagSizes ?? [];
  const potatoVarieties =
    custom.potatoVarieties ?? fallbackCustom?.potatoVarieties ?? [];

  const customRecord = custom as unknown as Record<string, unknown>;

  const mergedCustom = {
    ...custom,
    potatoVarieties,
    farmerSeedGenerations:
      custom.farmerSeedGenerations ??
      fallbackCustom?.farmerSeedGenerations ??
      [],
    graderOptions: custom.graderOptions ?? fallbackCustom?.graderOptions ?? [],
    incomingLocations:
      custom.incomingLocations ?? fallbackCustom?.incomingLocations ?? [],
    bagConfig: {
      ...bagConfig,
      juteBagWeight:
        bagConfig.juteBagWeight ?? fallbackBagConfig?.juteBagWeight ?? 0,
      lenoBagWeight:
        bagConfig.lenoBagWeight ?? fallbackBagConfig?.lenoBagWeight ?? 0,
      bagTypes: bagConfig.bagTypes ?? fallbackBagConfig?.bagTypes ?? [],
    },
    standardSeedBagsPerAcre: normalizeStandardSeedBagsPerAcre(
      customRecord,
      bagSizes,
      potatoVarieties
    ),
    buyBackCost: custom.buyBackCost ?? fallbackCustom?.buyBackCost ?? [],
  };

  const { standardBagsPerAcre: _legacyStandardBags, ...customWithoutLegacy } =
    mergedCustom as unknown as Record<string, unknown>;

  return {
    ...preferences,
    bagSizes,
    reportFormat: preferences.reportFormat ?? fallback?.reportFormat ?? '',
    custom: customWithoutLegacy as unknown as PreferencesCustomData,
  };
}

/** Query key factory - use for invalidation and consistent cache keys */
export const preferencesKeys = {
  all: ['store-admin', 'preferences'] as const,
  detail: () => [...preferencesKeys.all, 'detail'] as const,
};

/** Fetcher used by queryOptions and prefetch */
async function fetchPreferences(): Promise<PreferencesData> {
  const { data } =
    await storeAdminAxiosClient.get<GetPreferencesApiResponse>('/preferences');

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch preferences');
  }

  return normalizePreferences(data.data);
}

/** Query options - use with useQuery, prefetchQuery, or in loaders */
export const preferencesQueryOptions = () =>
  queryOptions({
    queryKey: preferencesKeys.detail(),
    queryFn: fetchPreferences,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

/** GET /preferences */
export function useGetPreferences() {
  return useQuery(preferencesQueryOptions());
}

/** Prefetch preferences - e.g. on route hover or before navigation */
export function prefetchPreferences() {
  return queryClient.prefetchQuery(preferencesQueryOptions());
}
