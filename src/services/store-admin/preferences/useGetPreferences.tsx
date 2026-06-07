import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

/** Canonical keys under `custom` (legacy fields such as `standardBagsPerAcre` are not supported). */
const CANONICAL_CUSTOM_KEYS = new Set([
  'potatoVarieties',
  'farmerSeedGenerations',
  'graderOptions',
  'incomingLocations',
  'bagConfig',
  'standardSeedBagsPerAcre',
  'buyBackCost',
  'financeConstants',
]);

/** Canonical keys under `custom.financeConstants` (legacy name-list fields are not supported). */
const CANONICAL_FINANCE_CONSTANTS_KEYS = new Set([
  'gradingBagSizes40mmAndAbove',
  'particulars',
  'actualCostWithoutSubsidy',
  'salePricePerBag',
]);

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

export type FinanceCostDriver =
  | 'Fixed'
  | 'Acres'
  | 'IncomingBags'
  | 'GradingBags'
  | 'SeedBags'
  | 'IncomingWeightWithoutBardana'
  | 'IncomingWeightWithBardana'
  | 'GradingWeightWithoutBardana'
  | 'GradingWeightWithBardana'
  | 'NetAmountPayable'
  | 'Buy-back-payable';

export const FINANCE_COST_DRIVER_OPTIONS: {
  value: FinanceCostDriver;
  label: string;
}[] = [
  { value: 'Fixed', label: 'Fixed' },
  { value: 'Acres', label: 'Acres' },
  { value: 'IncomingBags', label: 'Incoming bags' },
  { value: 'GradingBags', label: 'Grading bags' },
  { value: 'SeedBags', label: 'Number of seed bags' },
  {
    value: 'IncomingWeightWithoutBardana',
    label: 'Net incoming weight without bardana',
  },
  {
    value: 'IncomingWeightWithBardana',
    label: 'Net incoming weight with bardana',
  },
  {
    value: 'GradingWeightWithoutBardana',
    label: 'Net grading weight without bardana',
  },
  {
    value: 'GradingWeightWithBardana',
    label: 'Net grading weight with bardana',
  },
  { value: 'NetAmountPayable', label: 'Net Amount Payable' },
  { value: 'Buy-back-payable', label: 'Buy-back payable' },
];

const VALID_FINANCE_COST_DRIVERS = new Set<string>(
  FINANCE_COST_DRIVER_OPTIONS.map((o) => o.value)
);

/** One row in finance report particulars (name + default rate + cost driver). */
export interface FinanceParticularRow {
  name: string;
  rate: number;
  costDriver: FinanceCostDriver;
}

/**
 * Nested under `custom.financeConstants`.
 * `sizeRates` keys may use en-dashes (e.g. `25–30`) while `bagSizes` use hyphens (`25-30`).
 */
export interface FinanceConstantsData {
  gradingBagSizes40mmAndAbove: string[];
  particulars: FinanceParticularRow[];
  actualCostWithoutSubsidy: BuyBackCost[];
  salePricePerBag: BuyBackCost[];
}

export class PreferencesValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PreferencesValidationError';
  }
}

function resolveRequired<T>(
  primary: T | undefined,
  fallbackValue: T | undefined,
  field: string
): T {
  const value = primary ?? fallbackValue;
  if (value === undefined || value === null) {
    throw new PreferencesValidationError(`Missing ${field}`);
  }
  return value;
}

function requireNonEmptyStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new PreferencesValidationError(`Missing or invalid ${field}`);
  }
  const items = value
    .map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim()))
    .filter(Boolean);
  if (items.length === 0) {
    throw new PreferencesValidationError(`Empty ${field}`);
  }
  return items;
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new PreferencesValidationError(`Missing or invalid ${field}`);
  }
  return value
    .map((x) => (typeof x === 'string' ? x.trim() : String(x ?? '').trim()))
    .filter(Boolean);
}

function parsePreferenceOptions(
  value: unknown,
  field: string
): PreferenceOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PreferencesValidationError(`Missing or empty ${field}`);
  }
  const options: PreferenceOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      throw new PreferencesValidationError(`Invalid entry in ${field}`);
    }
    const label = String((item as PreferenceOption).label ?? '').trim();
    const val = String((item as PreferenceOption).value ?? '').trim();
    if (!label || !val) {
      throw new PreferencesValidationError(`Invalid entry in ${field}`);
    }
    options.push({ label, value: val });
  }
  return options;
}

function parseBagConfig(value: unknown, field = 'custom.bagConfig'): BagConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PreferencesValidationError(`Missing or invalid ${field}`);
  }
  const v = value as Record<string, unknown>;
  const bagTypes = requireStringArray(v.bagTypes, `${field}.bagTypes`);
  if (bagTypes.length === 0) {
    throw new PreferencesValidationError(`Empty ${field}.bagTypes`);
  }
  const juteBagWeight = Number(v.juteBagWeight);
  const lenoBagWeight = Number(v.lenoBagWeight);
  if (!Number.isFinite(juteBagWeight) || !Number.isFinite(lenoBagWeight)) {
    throw new PreferencesValidationError(`Invalid bag weights in ${field}`);
  }
  return { juteBagWeight, lenoBagWeight, bagTypes };
}

function normalizeCostDriverValue(raw: unknown): FinanceCostDriver | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (VALID_FINANCE_COST_DRIVERS.has(trimmed)) {
    return trimmed as FinanceCostDriver;
  }
  if (trimmed.toLowerCase() === 'buy-back-payable') {
    return 'Buy-back-payable';
  }
  return null;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PreferencesValidationError(`Missing or invalid ${field}`);
  }
  return value.trim();
}

function requireMetadata(
  preferences: PreferencesData,
  fallback?: PreferencesData
): Pick<
  PreferencesData,
  '_id' | 'coldStorageId' | 'createdAt' | 'updatedAt' | '__v'
> {
  if (fallback) {
    return {
      _id: preferences._id ?? fallback._id,
      coldStorageId: preferences.coldStorageId ?? fallback.coldStorageId,
      createdAt: preferences.createdAt ?? fallback.createdAt,
      updatedAt: preferences.updatedAt ?? fallback.updatedAt,
      __v: preferences.__v ?? fallback.__v,
    };
  }

  return {
    _id: requireNonEmptyString(preferences._id, '_id'),
    coldStorageId: requireNonEmptyString(
      preferences.coldStorageId,
      'coldStorageId'
    ),
    createdAt: requireNonEmptyString(preferences.createdAt, 'createdAt'),
    updatedAt: requireNonEmptyString(preferences.updatedAt, 'updatedAt'),
    __v: Number(preferences.__v) || 0,
  };
}

function validateVarietyTableCoverage(
  table: BuyBackCost[],
  potatoVarieties: PreferenceOption[],
  field: string
): BuyBackCost[] {
  const expected = new Set(
    potatoVarieties.map((v) => v.value.trim()).filter(Boolean)
  );
  const found = new Set(table.map((row) => row.variety.trim()).filter(Boolean));

  for (const variety of expected) {
    if (!found.has(variety)) {
      throw new PreferencesValidationError(
        `Missing ${field} entry for variety "${variety}"`
      );
    }
  }

  for (const variety of found) {
    if (!expected.has(variety)) {
      throw new PreferencesValidationError(
        `Unexpected ${field} entry for variety "${variety}"`
      );
    }
  }

  return table;
}

function parseFinanceParticulars(
  value: unknown,
  field: string
): FinanceParticularRow[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PreferencesValidationError(`Missing or empty ${field}`);
  }
  const rows: FinanceParticularRow[] = [];
  for (const p of value) {
    if (!p || typeof p !== 'object') {
      throw new PreferencesValidationError(`Invalid entry in ${field}`);
    }
    const item = p as FinanceParticularRow & { costDriver?: unknown };
    const name = String(item.name ?? '').trim();
    if (!name) {
      throw new PreferencesValidationError(`Missing name in ${field}`);
    }
    const costDriver = normalizeCostDriverValue(item.costDriver);
    if (!costDriver) {
      throw new PreferencesValidationError(
        `Missing or invalid costDriver for "${name}" in ${field}`
      );
    }
    rows.push({
      name,
      rate: Number(item.rate) || 0,
      costDriver,
    });
  }
  return rows;
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

/** Collapse en-dash / hyphen variants to a single comparable key. */
export function sizeRateCanonicalKey(raw: string): string {
  return raw.replace(/[–—−-]/g, '-').trim();
}

/** Resolve a rate for `canonicalSize`, preferring an exact key match over dash aliases. */
export function resolveSizeRateFromRecord(
  sizeRates: Record<string, number>,
  canonicalSize: string
): number | undefined {
  if (Object.prototype.hasOwnProperty.call(sizeRates, canonicalSize)) {
    const exact = Number(sizeRates[canonicalSize]);
    if (Number.isFinite(exact)) return exact;
  }

  const target = sizeRateCanonicalKey(canonicalSize);
  for (const [k, v] of Object.entries(sizeRates)) {
    if (k === canonicalSize) continue;
    if (sizeRateCanonicalKey(k) !== target) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  return undefined;
}

/** Keep one entry per `bagSizes` label (hyphen form); drop stale en-dash duplicates. */
export function canonicalizeSizeRatesRecord(
  sizeRates: Record<string, number>,
  canonicalSizes: string[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const size of canonicalSizes) {
    const rate = resolveSizeRateFromRecord(sizeRates, size);
    if (rate !== undefined) {
      out[size] = rate;
    }
  }
  return out;
}

export function canonicalizeVarietySizeRateTables(
  tables: BuyBackCost[],
  canonicalSizes: string[]
): BuyBackCost[] {
  return tables.map(({ variety, sizeRates }) => ({
    variety,
    sizeRates: canonicalizeSizeRatesRecord(sizeRates, canonicalSizes),
  }));
}

/** Set a size rate and remove dash-variant aliases for the same size. */
export function applySizeRateUpdate(
  sizeRates: Record<string, number>,
  size: string,
  rate: number
): Record<string, number> {
  const target = sizeRateCanonicalKey(size);
  const next: Record<string, number> = {};
  for (const [k, v] of Object.entries(sizeRates)) {
    if (sizeRateCanonicalKey(k) !== target) {
      next[k] = v;
    }
  }
  next[size] = rate;
  return next;
}

/** Normalize sizeRates on PATCH payloads so en-dash keys are not sent alongside hyphens. */
export function canonicalizeCustomSizeRates(
  custom: Record<string, unknown>,
  bagSizes: string[]
): Record<string, unknown> {
  const next = { ...custom };

  if (Array.isArray(next.buyBackCost)) {
    next.buyBackCost = canonicalizeVarietySizeRateTables(
      next.buyBackCost.map((item) => {
        const row = item as BuyBackCost;
        return {
          variety: String(row.variety ?? ''),
          sizeRates: normalizeSizeRatesRecord(row.sizeRates),
        };
      }),
      bagSizes
    );
  }

  const financeConstants = next.financeConstants;
  if (
    financeConstants &&
    typeof financeConstants === 'object' &&
    !Array.isArray(financeConstants)
  ) {
    const fc = { ...(financeConstants as Record<string, unknown>) };

    for (const table of [
      'actualCostWithoutSubsidy',
      'salePricePerBag',
    ] as const) {
      if (!Array.isArray(fc[table])) continue;
      fc[table] = canonicalizeVarietySizeRateTables(
        (fc[table] as BuyBackCost[]).map((item) => ({
          variety: String(item.variety ?? ''),
          sizeRates: normalizeSizeRatesRecord(item.sizeRates),
        })),
        bagSizes
      );
    }

    next.financeConstants = fc;
  }

  return next;
}

function parseVarietySizeRateTables(
  value: unknown,
  field: string
): BuyBackCost[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PreferencesValidationError(`Missing or empty ${field}`);
  }
  const rows: BuyBackCost[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      throw new PreferencesValidationError(`Invalid entry in ${field}`);
    }
    const variety = String((item as BuyBackCost).variety ?? '').trim();
    if (!variety) {
      throw new PreferencesValidationError(`Missing variety in ${field}`);
    }
    rows.push({
      variety,
      sizeRates: normalizeSizeRatesRecord((item as BuyBackCost).sizeRates),
    });
  }
  return rows;
}

export function normalizeFinanceConstants(raw: unknown): FinanceConstantsData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new PreferencesValidationError('Missing custom.financeConstants');
  }
  const r = raw as Record<string, unknown>;

  for (const key of Object.keys(r)) {
    if (!CANONICAL_FINANCE_CONSTANTS_KEYS.has(key)) {
      throw new PreferencesValidationError(
        `Unsupported field custom.financeConstants.${key}`
      );
    }
  }

  return {
    gradingBagSizes40mmAndAbove: requireNonEmptyStringArray(
      r.gradingBagSizes40mmAndAbove,
      'custom.financeConstants.gradingBagSizes40mmAndAbove'
    ),
    particulars: parseFinanceParticulars(
      r.particulars,
      'custom.financeConstants.particulars'
    ),
    actualCostWithoutSubsidy: parseVarietySizeRateTables(
      r.actualCostWithoutSubsidy,
      'custom.financeConstants.actualCostWithoutSubsidy'
    ),
    salePricePerBag: parseVarietySizeRateTables(
      r.salePricePerBag,
      'custom.financeConstants.salePricePerBag'
    ),
  };
}

/** Canonical `custom` block returned by GET/PATCH `/preferences`. */
export interface PreferencesCustomData {
  potatoVarieties: PreferenceOption[];
  farmerSeedGenerations: PreferenceOption[];
  graderOptions: string[];
  incomingLocations: string[];
  bagConfig: BagConfig;
  /** Per variety: standard bags/acre and rate per bag by graded size (`name` matches `bagSizes`). */
  standardSeedBagsPerAcre: StandardSeedBagsPerAcreEntry[];
  buyBackCost: BuyBackCost[];
  financeConstants: FinanceConstantsData;
}

/** Cold-storage preferences document (API shape after normalization). */
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

/** Resolved finance constants for reports (requires normalized preferences). */
export function getFinanceConstants(
  preferences: PreferencesData | null | undefined
): FinanceConstantsData {
  if (!preferences?.custom?.financeConstants) {
    throw new PreferencesValidationError(
      'Finance constants are missing from preferences'
    );
  }
  return preferences.custom.financeConstants;
}

function dashKeyVariants(label: string): string[] {
  return [label, label.replace(/-/g, '–'), label.replace(/–/g, '-')].filter(
    (v, i, a) => a.indexOf(v) === i
  );
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

/** Align standardSeedBagsPerAcre from API with bag sizes and varieties. */
export function normalizeStandardSeedBagsPerAcre(
  raw: unknown,
  bagSizes: string[],
  potatoVarieties: PreferenceOption[]
): StandardSeedBagsPerAcreEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new PreferencesValidationError(
      'Missing or empty custom.standardSeedBagsPerAcre'
    );
  }

  const byVariety = new Map<string, StandardSeedBagsPerAcreEntry>();
  for (const row of raw) {
    if (!row || typeof row !== 'object') {
      throw new PreferencesValidationError(
        'Invalid entry in custom.standardSeedBagsPerAcre'
      );
    }
    const variety = String(
      (row as StandardSeedBagsPerAcreEntry).variety ?? ''
    ).trim();
    if (!variety) {
      throw new PreferencesValidationError(
        'Missing variety in custom.standardSeedBagsPerAcre'
      );
    }
    if (!Array.isArray((row as StandardSeedBagsPerAcreEntry).sizes)) {
      throw new PreferencesValidationError(
        `Missing sizes for variety "${variety}" in custom.standardSeedBagsPerAcre`
      );
    }
    byVariety.set(variety, {
      variety,
      sizes: (row as StandardSeedBagsPerAcreEntry).sizes.map((s) => ({
        name: String(s.name ?? ''),
        ratePerBag: Number(s.ratePerBag) || 0,
        bagsPerAcre: Number(s.bagsPerAcre) || 0,
      })),
    });
  }

  const result: StandardSeedBagsPerAcreEntry[] = [];
  for (const { value } of potatoVarieties) {
    const key = value.trim();
    if (!key) continue;
    const entry = byVariety.get(key);
    if (!entry) {
      throw new PreferencesValidationError(
        `Missing standardSeedBagsPerAcre entry for variety "${key}"`
      );
    }
    result.push({
      variety: key,
      sizes: bagSizes.map((name) => {
        const existing = findSizeRow(entry.sizes, name);
        return {
          name,
          ratePerBag: existing?.ratePerBag ?? 0,
          bagsPerAcre: existing?.bagsPerAcre ?? 0,
        };
      }),
    });
  }

  return result;
}

export function normalizePreferences(
  preferences: PreferencesData,
  fallback?: PreferencesData
): PreferencesData {
  const bagSizes = resolveRequired(
    preferences.bagSizes,
    fallback?.bagSizes,
    'bagSizes'
  );
  if (!Array.isArray(bagSizes) || bagSizes.length === 0) {
    throw new PreferencesValidationError('Missing or empty bagSizes');
  }

  const reportFormat = resolveRequired(
    preferences.reportFormat,
    fallback?.reportFormat,
    'reportFormat'
  );
  if (typeof reportFormat !== 'string' || !reportFormat.trim()) {
    throw new PreferencesValidationError('Missing or invalid reportFormat');
  }

  const custom = preferences.custom ?? fallback?.custom;
  if (!custom) {
    throw new PreferencesValidationError('Missing custom');
  }
  const fallbackCustom = fallback?.custom;

  if (!fallback) {
    for (const key of Object.keys(custom as object)) {
      if (!CANONICAL_CUSTOM_KEYS.has(key)) {
        throw new PreferencesValidationError(`Unsupported field custom.${key}`);
      }
    }
  }

  const potatoVarieties = parsePreferenceOptions(
    custom.potatoVarieties ?? fallbackCustom?.potatoVarieties,
    'custom.potatoVarieties'
  );

  const farmerSeedGenerations = parsePreferenceOptions(
    custom.farmerSeedGenerations ?? fallbackCustom?.farmerSeedGenerations,
    'custom.farmerSeedGenerations'
  );

  const graderOptions = requireStringArray(
    custom.graderOptions ?? fallbackCustom?.graderOptions,
    'custom.graderOptions'
  );

  const incomingLocations = requireStringArray(
    custom.incomingLocations ?? fallbackCustom?.incomingLocations,
    'custom.incomingLocations'
  );

  const bagConfig = parseBagConfig(
    custom.bagConfig ?? fallbackCustom?.bagConfig
  );

  const buyBackCost = validateVarietyTableCoverage(
    canonicalizeVarietySizeRateTables(
      parseVarietySizeRateTables(
        custom.buyBackCost ?? fallbackCustom?.buyBackCost,
        'custom.buyBackCost'
      ),
      bagSizes
    ),
    potatoVarieties,
    'custom.buyBackCost'
  );

  const financeConstantsRaw =
    custom.financeConstants ?? fallbackCustom?.financeConstants;
  const financeConstants = normalizeFinanceConstants(financeConstantsRaw);
  const actualCostWithoutSubsidy = validateVarietyTableCoverage(
    canonicalizeVarietySizeRateTables(
      financeConstants.actualCostWithoutSubsidy,
      bagSizes
    ),
    potatoVarieties,
    'custom.financeConstants.actualCostWithoutSubsidy'
  );
  const salePricePerBag = validateVarietyTableCoverage(
    canonicalizeVarietySizeRateTables(
      financeConstants.salePricePerBag,
      bagSizes
    ),
    potatoVarieties,
    'custom.financeConstants.salePricePerBag'
  );

  const standardSeedBagsPerAcre = normalizeStandardSeedBagsPerAcre(
    custom.standardSeedBagsPerAcre ?? fallbackCustom?.standardSeedBagsPerAcre,
    bagSizes,
    potatoVarieties
  );

  const metadata = requireMetadata(preferences, fallback);

  return {
    ...metadata,
    bagSizes,
    reportFormat: reportFormat.trim(),
    custom: {
      potatoVarieties,
      farmerSeedGenerations,
      graderOptions,
      incomingLocations,
      bagConfig,
      standardSeedBagsPerAcre,
      buyBackCost,
      financeConstants: {
        ...financeConstants,
        actualCostWithoutSubsidy,
        salePricePerBag,
      },
    },
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
