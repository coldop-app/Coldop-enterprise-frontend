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

/** One row in finance report particulars (name + default rate). */
export interface FinanceParticularRow {
  name: string;
  rate: number;
}

/** Nested under `custom` — drives finance report calculations and the Finance preferences tab. */
export interface FinanceConstantsData {
  incomingBagsTimesRateParticularNames: string[];
  acresTimesRateParticularNames: string[];
  gradingBagsTimesRateParticularNames: string[];
  gradingBagSizes40mmAndAbove: string[];
  particulars: FinanceParticularRow[];
  actualCostWithoutSubsidy: BuyBackCost[];
  salePricePerBag: BuyBackCost[];
}

function cloneFinanceConstants(
  data: FinanceConstantsData
): FinanceConstantsData {
  return structuredClone(data);
}

/** Default finance constants (former `finance-constants.ts`); used when API omits or empties `financeConstants`. */
export const DEFAULT_FINANCE_CONSTANTS: FinanceConstantsData = Object.freeze({
  incomingBagsTimesRateParticularNames: [
    'Paladaar Charges From Field (Unloading Charges)',
    'Bardana (Multiple use) from field',
    'Sutli (Incoming Bags)',
    'Marka Expenses (Incoming Jute Bags)',
  ],
  acresTimesRateParticularNames: [
    'Roughing Charges',
    'Salary plus other employee expense',
    'Daily labour',
    'Room rent charges, Miscellaneous',
  ],
  gradingBagsTimesRateParticularNames: [
    'Grading Charges',
    'Paladaar Charges (Tanka + Tolai)',
    'Paladaar Charge Shifting after grading (Dhank)',
    'Sutli + Tag & Parchi after Grading',
    'Paladaar Charges after loading after grading',
    'Storage Charges',
  ],
  gradingBagSizes40mmAndAbove: [
    '40-45',
    '40-50',
    '45-50',
    '50-55',
    'Above 50',
    'Above 55',
    'Cut',
  ],
  particulars: [
    { name: 'Freight: Seed (Dispatched)', rate: 32124.0 },
    {
      name: 'Freight: Buy Back material (Trolly Charges Rs. 20/- Qtl)',
      rate: 20,
    },
    { name: 'Roughing Charges', rate: 1000 },
    {
      name: 'Paladaar Charges From Field (Unloading Charges)',
      rate: 5.5,
    },
    { name: 'Bardana (Multiple use) from field', rate: 33.6 },
    { name: 'Sutli (Incoming Bags)', rate: 0.95 },
    { name: 'Marka Expenses (Incoming Jute Bags)', rate: 0.96 },
    { name: 'Grading Charges', rate: 14.2 },
    { name: 'Paladaar Charges (Tanka + Tolai)', rate: 3 },
    {
      name: 'Paladaar Charge Shifting after grading (Dhank)',
      rate: 5.5,
    },
    { name: 'Sutli + Tag & Parchi after Grading', rate: 2.9 },
    {
      name: 'Paladaar Charges after loading after grading',
      rate: 5.5,
    },
    { name: 'Storage Charges', rate: 200 },
    { name: 'Multiplication Expenses', rate: 0 },
    { name: 'Salary plus other employee expense', rate: 2000 },
    { name: 'Daily labour', rate: 3.43 },
    { name: 'Room rent charges, Miscellaneous', rate: 200 },
  ],
  actualCostWithoutSubsidy: [
    {
      variety: 'Himalini',
      sizeRates: {
        'Below 25': 15.25,
        '25–30': 15.25,
        'Below 30': 15.25,
        '30–35': 15.25,
        '35–40': 15.25,
        '30–40': 15.25,
        '40–45': 12.25,
        '40–50': 11.25,
        '45–50': 10.25,
        '50–55': 8.75,
        'Above 50': 8.75,
        'Above 55': 8.75,
        Cut: 3,
      },
    },
    {
      variety: 'Jyoti',
      sizeRates: {
        'Below 25': 15.25,
        '25–30': 15.25,
        'Below 30': 15.25,
        '30–35': 15.25,
        '35–40': 15.25,
        '30–40': 15.25,
        '40–45': 12.25,
        '40–50': 11.25,
        '45–50': 10.25,
        '50–55': 8.75,
        'Above 50': 8.75,
        'Above 55': 8.75,
        Cut: 3,
      },
    },
    {
      variety: 'B101',
      sizeRates: {
        'Below 25': 19.25,
        '25–30': 19.25,
        'Below 30': 19.25,
        '30–35': 19.25,
        '35–40': 19.25,
        '30–40': 19.25,
        '40–45': 16.25,
        '40–50': 14.75,
        '45–50': 13.25,
        '50–55': 8.25,
        'Above 50': 8.25,
        'Above 55': 8.25,
        Cut: 3,
      },
    },
  ],
  salePricePerBag: [
    {
      variety: 'Himalini',
      sizeRates: {
        'Below 25': 1740,
        '25–30': 1740,
        'Below 30': 1740,
        '30–35': 1740,
        '35–40': 1740,
        '30–40': 1740,
        '40–45': 1160,
        '40–50': 500,
        '45–50': 940,
        '50–55': 500,
        'Above 50': 500,
        'Above 55': 500,
        Cut: 150,
      },
    },
    {
      variety: 'Jyoti',
      sizeRates: {
        'Below 25': 1740,
        '25–30': 1740,
        'Below 30': 1740,
        '30–35': 1740,
        '35–40': 1740,
        '30–40': 1740,
        '40–45': 1160,
        '40–50': 500,
        '45–50': 940,
        '50–55': 500,
        'Above 50': 500,
        'Above 55': 500,
        Cut: 150,
      },
    },
    {
      variety: 'B101',
      sizeRates: {
        'Below 25': 1740,
        '25–30': 1740,
        'Below 30': 1740,
        '30–35': 1740,
        '35–40': 1740,
        '30–40': 1740,
        '40–45': 1160,
        '40–50': 500,
        '45–50': 940,
        '50–55': 500,
        'Above 50': 500,
        'Above 55': 500,
        Cut: 150,
      },
    },
  ],
}) as FinanceConstantsData;

function normalizeStringList(
  raw: unknown,
  fallback: readonly string[]
): string[] {
  if (!Array.isArray(raw)) return [...fallback];
  const next = raw
    .map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim()))
    .filter(Boolean);
  return next.length > 0 ? next : [...fallback];
}

function normalizeFinanceParticulars(
  raw: unknown,
  fallback: FinanceParticularRow[]
): FinanceParticularRow[] {
  if (!Array.isArray(raw)) {
    return fallback.map((row) => ({ ...row }));
  }
  const rows: FinanceParticularRow[] = [];
  for (const p of raw) {
    if (!p || typeof p !== 'object') continue;
    const name = String((p as FinanceParticularRow).name ?? '').trim();
    if (!name) continue;
    rows.push({
      name,
      rate: Number((p as FinanceParticularRow).rate) || 0,
    });
  }
  return rows.length > 0 ? rows : [...fallback];
}

function normalizeSizeRatesRecord(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

/** Merge API variety/size tables with defaults (defaults define order; API overrides and adds varieties). */
function mergeVarietySizeRateTables(
  fromApi: unknown,
  defaults: BuyBackCost[]
): BuyBackCost[] {
  const base = defaults.map((row) => ({
    variety: row.variety.trim(),
    sizeRates: { ...row.sizeRates },
  }));

  if (!Array.isArray(fromApi) || fromApi.length === 0) return base;

  const byVariety = new Map<string, BuyBackCost>();
  for (const row of base) {
    byVariety.set(row.variety.trim(), {
      variety: row.variety.trim(),
      sizeRates: { ...row.sizeRates },
    });
  }

  for (const item of fromApi) {
    if (!item || typeof item !== 'object') continue;
    const variety = String((item as BuyBackCost).variety ?? '').trim();
    if (!variety) continue;
    const patch = normalizeSizeRatesRecord((item as BuyBackCost).sizeRates);
    const prev = byVariety.get(variety);
    if (prev) {
      byVariety.set(variety, {
        variety,
        sizeRates: { ...prev.sizeRates, ...patch },
      });
    } else {
      byVariety.set(variety, { variety, sizeRates: patch });
    }
  }

  const ordered: BuyBackCost[] = [];
  const seen = new Set<string>();
  for (const row of base) {
    const v = row.variety.trim();
    ordered.push(byVariety.get(v)!);
    seen.add(v);
  }
  for (const [v, row] of byVariety) {
    if (!seen.has(v)) ordered.push(row);
  }
  return ordered;
}

export function normalizeFinanceConstants(raw: unknown): FinanceConstantsData {
  const defaults = cloneFinanceConstants(DEFAULT_FINANCE_CONSTANTS);

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const r = raw as Record<string, unknown>;
  const particularsRaw = r.particulars;
  const particulars = normalizeFinanceParticulars(
    particularsRaw,
    defaults.particulars
  );

  if (particulars.length === 0) {
    return defaults;
  }

  return {
    incomingBagsTimesRateParticularNames: normalizeStringList(
      r.incomingBagsTimesRateParticularNames,
      defaults.incomingBagsTimesRateParticularNames
    ),
    acresTimesRateParticularNames: normalizeStringList(
      r.acresTimesRateParticularNames,
      defaults.acresTimesRateParticularNames
    ),
    gradingBagsTimesRateParticularNames: normalizeStringList(
      r.gradingBagsTimesRateParticularNames,
      defaults.gradingBagsTimesRateParticularNames
    ),
    gradingBagSizes40mmAndAbove: normalizeStringList(
      r.gradingBagSizes40mmAndAbove,
      defaults.gradingBagSizes40mmAndAbove
    ),
    particulars,
    actualCostWithoutSubsidy: mergeVarietySizeRateTables(
      r.actualCostWithoutSubsidy,
      defaults.actualCostWithoutSubsidy
    ),
    salePricePerBag: mergeVarietySizeRateTables(
      r.salePricePerBag,
      defaults.salePricePerBag
    ),
  };
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
  financeConstants: FinanceConstantsData;
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

/** Resolved finance constants for reports (always defined after `normalizePreferences`). */
export function getFinanceConstants(
  preferences: PreferencesData | null | undefined
): FinanceConstantsData {
  return (
    preferences?.custom?.financeConstants ??
    cloneFinanceConstants(DEFAULT_FINANCE_CONSTANTS)
  );
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
  const fallbackCustomRecord = fallbackCustom as unknown as
    | Record<string, unknown>
    | undefined;

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
    financeConstants: normalizeFinanceConstants(
      customRecord.financeConstants ?? fallbackCustomRecord?.financeConstants
    ),
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
