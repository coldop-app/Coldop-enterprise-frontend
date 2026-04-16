import type {
  ContractFarmingFarmerRow,
  ContractFarmingGradingBucket,
  ContractFarmingSizeRow,
} from '@/types/analytics';
import { BUY_BACK_COST } from '@/components/forms/grading/constants';

/** Indian numbering: lakh/crore-style grouping (e.g. 1,00,000). */
export const CONTRACT_FARMING_IN_LOCALE = 'en-IN';

/**
 * Parses account number from API (JSON number or numeric string). Preserves fractional parts.
 */
export function parseAccountNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return null;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Account numbers may include fractional parts (e.g. 50.1). Do not round to integers.
 */
export function formatAccountNumberForDisplay(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    maximumFractionDigits: 10,
    minimumFractionDigits: 0,
    useGrouping: false,
  });
}

/** Display helper: accepts API number or string (e.g. `"50.1"`). */
export function formatAccountNumberField(value: unknown): string {
  const n = parseAccountNumber(value);
  return n == null ? '—' : formatAccountNumberForDisplay(n);
}

/**
 * Integer part of account number for family grouping (e.g. 50, 50.1, 50.2 → 50).
 * `null` when the value cannot be parsed.
 */
export function accountFamilyBaseKey(value: unknown): number | null {
  const n = parseAccountNumber(value);
  if (n == null || !Number.isFinite(n)) return null;
  return Math.floor(n);
}

/** True when the account is not a whole number (e.g. 50.1); whole numbers like 50 are false. */
export function accountNumberHasDecimalPart(value: unknown): boolean {
  const n = parseAccountNumber(value);
  if (n == null || !Number.isFinite(n)) return false;
  return !Number.isInteger(n);
}

/**
 * Family subtotal rows only when at least one member has a fractional account (50.1, 50.2, …).
 */
export function familyGroupHasDecimalAccountMember(
  farmers: ContractFarmingFarmerRow[]
): boolean {
  return farmers.some((f) => accountNumberHasDecimalPart(f.accountNumber));
}

/**
 * Sort contract-farming farmers: same family (shared floor account) together, then
 * by account number within the family, then by name. Rows without a parseable
 * account sort last, by name.
 */
export function compareContractFarmingFarmersByFamilyAccount(
  a: ContractFarmingFarmerRow,
  b: ContractFarmingFarmerRow
): number {
  const na = parseAccountNumber(a.accountNumber);
  const nb = parseAccountNumber(b.accountNumber);
  const familyA = accountFamilyBaseKey(a.accountNumber);
  const familyB = accountFamilyBaseKey(b.accountNumber);

  if (familyA !== familyB) {
    if (familyA == null && familyB == null) return a.name.localeCompare(b.name);
    if (familyA == null) return 1;
    if (familyB == null) return -1;
    return familyA - familyB;
  }

  if (na == null && nb == null) return a.name.localeCompare(b.name);
  if (na == null) return 1;
  if (nb == null) return -1;
  if (na !== nb) return na - nb;
  return a.name.localeCompare(b.name);
}

/**
 * Splits farmers into consecutive runs with the same account family base (`Math.floor`).
 * Farmers without a parseable account each become their own single-farmer group (not a shared family).
 */
export function groupFarmersByAccountFamily(
  rows: ContractFarmingFarmerRow[]
): ContractFarmingFarmerRow[][] {
  if (rows.length === 0) return [];
  const groups: ContractFarmingFarmerRow[][] = [];
  let current: ContractFarmingFarmerRow[] = [];
  let currentKey: number | null = null;
  let hasOpenFamily = false;

  for (const farmer of rows) {
    const key = accountFamilyBaseKey(farmer.accountNumber);
    if (key === null) {
      if (hasOpenFamily && current.length > 0) {
        groups.push(current);
        current = [];
        hasOpenFamily = false;
      }
      groups.push([farmer]);
      continue;
    }
    if (!hasOpenFamily || key !== currentKey) {
      if (hasOpenFamily && current.length > 0) groups.push(current);
      current = [farmer];
      currentKey = key;
      hasOpenFamily = true;
    } else {
      current.push(farmer);
    }
  }
  if (hasOpenFamily && current.length > 0) groups.push(current);
  return groups;
}

export type ContractFarmingReportDigitalVarietyGroup = {
  variety: string;
  rows: ContractFarmingFarmerRow[];
};

/**
 * Expands farmers into one row per seed size line (or one row when there are no sizes).
 * `sizeLineIndex` is the index within `farmer.sizes` (0 when there are no sizes).
 */
export function expandFarmerRowsForSizes(farmers: ContractFarmingFarmerRow[]): {
  farmer: ContractFarmingFarmerRow;
  size: ContractFarmingSizeRow | null;
  sizeLineIndex: number;
}[] {
  return farmers.flatMap((farmer) => {
    if (farmer.sizes.length === 0) {
      return [
        {
          farmer,
          size: null as ContractFarmingSizeRow | null,
          sizeLineIndex: 0,
        },
      ];
    }
    return farmer.sizes.map((size, sizeLineIndex) => ({
      farmer,
      size,
      sizeLineIndex,
    }));
  });
}

/** Acres for one seed line: API `sizes[].acres`; if no size lines, farmer-level `acresPlanted`. */
export function acresPlantedForSeedLine(
  farmer: ContractFarmingFarmerRow,
  size: ContractFarmingSizeRow | null
): number {
  if (size != null && Number.isFinite(size.acres)) {
    return size.acres;
  }
  return Number.isFinite(farmer.acresPlanted) ? farmer.acresPlanted : 0;
}

/**
 * Generation for the seed line at `sizeLineIndex` (not consolidated "G2, G3"):
 * pairs with `sizes[i]` when lengths match; repeats a single generation across lines when only one.
 */
export function generationLabelForSeedLine(
  farmer: ContractFarmingFarmerRow,
  sizeLineIndex: number
): string {
  const gens = farmer.generations ?? [];
  const sizes = farmer.sizes ?? [];
  if (gens.length === 0) return '—';
  if (sizes.length === 0) {
    return gens.join(', ');
  }
  if (gens.length === sizes.length) {
    return gens[sizeLineIndex] ?? '—';
  }
  if (gens.length === 1) {
    return gens[0] ?? '—';
  }
  if (sizeLineIndex < gens.length) {
    return gens[sizeLineIndex] ?? '—';
  }
  return '—';
}

/**
 * Grading size columns for contract farming (display header + API key variants).
 * Order matches product spec; keys use en-dash as in grading forms (`30–40`) with hyphen fallbacks.
 */
export const CONTRACT_FARMING_GRADING_COLUMNS: {
  header: string;
  matchKeys: string[];
}[] = [
  { header: 'Below 25', matchKeys: ['Below 25'] },
  { header: '25-30', matchKeys: ['25–30', '25-30'] },
  { header: 'Below 30', matchKeys: ['Below 30'] },
  { header: '30-35', matchKeys: ['30–35', '30-35'] },
  { header: '30-40', matchKeys: ['30–40', '30-40'] },
  { header: '35-40', matchKeys: ['35–40', '35-40'] },
  { header: '40-45', matchKeys: ['40–45', '40-45'] },
  { header: '45-50', matchKeys: ['45–50', '45-50'] },
  { header: '50-55', matchKeys: ['50–55', '50-55'] },
  { header: 'Above 50', matchKeys: ['Above 50'] },
  { header: 'Above 55', matchKeys: ['Above 55'] },
  { header: 'Cut', matchKeys: ['Cut'] },
];

const BELOW_40_BUCKET_HEADERS = new Set([
  'Below 25',
  '25-30',
  'Below 30',
  '30-35',
  '30-40',
  '35-40',
]);
const RANGE_40_TO_50_BUCKET_HEADERS = new Set(['40-45', '45-50']);
const CUT_BUCKET_HEADERS = new Set(['Cut']);

function normalizeGradingSizeKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ');
}

/** Match report section variety to `buy-back-bags` and nested `grading` keys. */
function normalizeReportVarietyKey(s: string): string {
  return s.trim().toLowerCase();
}

function toGradingBucket(obj: object): ContractFarmingGradingBucket {
  const r = obj as Record<string, unknown>;
  return {
    initialBags: typeof r.initialBags === 'number' ? r.initialBags : 0,
    netWeightKg: typeof r.netWeightKg === 'number' ? r.netWeightKg : 0,
  };
}

/**
 * Flattens `grading` into one map keyed by size label.
 * Supports nested API shape: sub-variety (e.g. B101, Himalini) → size → bucket,
 * merging duplicate size keys across sub-varieties by summing bags and weights.
 * Also supports a flat map: size → bucket.
 */
export function mergeGradingSizeMaps(
  farmer: ContractFarmingFarmerRow
): Record<string, ContractFarmingGradingBucket> {
  const out: Record<string, ContractFarmingGradingBucket> = {};
  const g = farmer.grading;
  if (!g || typeof g !== 'object') return out;

  const add = (sizeKey: string, b: ContractFarmingGradingBucket) => {
    const prev = out[sizeKey];
    const ib = Number.isFinite(b.initialBags) ? b.initialBags : 0;
    const nw = Number.isFinite(b.netWeightKg) ? b.netWeightKg : 0;
    if (prev) {
      const pib = Number.isFinite(prev.initialBags) ? prev.initialBags : 0;
      const pnw = Number.isFinite(prev.netWeightKg) ? prev.netWeightKg : 0;
      out[sizeKey] = {
        initialBags: pib + ib,
        netWeightKg: pnw + nw,
      };
    } else {
      out[sizeKey] = { initialBags: ib, netWeightKg: nw };
    }
  };

  for (const [topKey, inner] of Object.entries(g)) {
    if (!inner || typeof inner !== 'object') continue;
    const innerRec = inner as Record<string, unknown>;
    const looksLikeBucket =
      typeof innerRec.initialBags === 'number' ||
      typeof innerRec.netWeightKg === 'number';
    if (looksLikeBucket) {
      add(topKey, toGradingBucket(inner));
      continue;
    }
    for (const [sizeKey, bucket] of Object.entries(innerRec)) {
      if (
        bucket &&
        typeof bucket === 'object' &&
        ('initialBags' in bucket || 'netWeightKg' in bucket)
      ) {
        add(sizeKey, bucket as ContractFarmingGradingBucket);
      }
    }
  }
  return out;
}

/**
 * Like `mergeGradingSizeMaps`, but for nested `{ variety → size → bucket }` grading only merges
 * the subtree for `reportVariety` (the current `byVariety` table). Flat `size → bucket` shape is unchanged.
 */
export function mergeGradingSizeMapsForReportVariety(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): Record<string, ContractFarmingGradingBucket> {
  const want = normalizeReportVarietyKey(reportVariety);
  const g = farmer.grading;
  if (!g || typeof g !== 'object') return {};

  let hasNestedVarietyBranch = false;
  for (const [, inner] of Object.entries(g)) {
    if (!inner || typeof inner !== 'object') continue;
    const innerRec = inner as Record<string, unknown>;
    const looksLikeBucket =
      typeof innerRec.initialBags === 'number' ||
      typeof innerRec.netWeightKg === 'number';
    if (!looksLikeBucket) {
      hasNestedVarietyBranch = true;
      break;
    }
  }

  if (!hasNestedVarietyBranch) {
    return mergeGradingSizeMaps(farmer);
  }

  const filtered: ContractFarmingFarmerRow['grading'] = {};
  for (const [topKey, inner] of Object.entries(g)) {
    if (normalizeReportVarietyKey(topKey) !== want) continue;
    filtered[topKey] = inner;
  }
  return mergeGradingSizeMaps({ ...farmer, grading: filtered });
}

export function findGradingBucket(
  bySize: Record<string, ContractFarmingGradingBucket> | undefined,
  matchKeys: string[]
): ContractFarmingGradingBucket | undefined {
  if (!bySize) return undefined;
  const entries = Object.entries(bySize);
  const normMap = new Map(
    entries.map(([k, v]) => [normalizeGradingSizeKey(k), v])
  );
  for (const mk of matchKeys) {
    const hit = normMap.get(normalizeGradingSizeKey(mk));
    if (hit) return hit;
  }
  for (const mk of matchKeys) {
    const want = normalizeGradingSizeKey(mk);
    for (const [k, v] of entries) {
      if (normalizeGradingSizeKey(k) === want) return v;
    }
  }
  return undefined;
}

export function formatGradingBagsQty(
  bucket: ContractFarmingGradingBucket | undefined
): string {
  if (bucket == null) return '—';
  const n = bucket.initialBags;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    maximumFractionDigits: 0,
  });
}

/** Sum of `initialBags` across merged grading size buckets. */
export function formatTotalGradingBags(
  bySize: Record<string, ContractFarmingGradingBucket>
): string {
  if (Object.keys(bySize).length === 0) return '—';
  const n = Object.values(bySize).reduce((sum, b) => {
    const q = b.initialBags;
    return sum + (Number.isFinite(q) ? q : 0);
  }, 0);
  return n.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    maximumFractionDigits: 0,
  });
}

/** Sum of `netWeightKg` across all grading buckets (nested sub-varieties merged by size). */
export function formatNetWeightAfterGrading(
  bySize: Record<string, ContractFarmingGradingBucket>
): string {
  if (Object.keys(bySize).length === 0) return '—';
  const n = Object.values(bySize).reduce((sum, b) => {
    const w = b.netWeightKg;
    return sum + (Number.isFinite(w) ? w : 0);
  }, 0);
  return n.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    maximumFractionDigits: 2,
  });
}

export function computeYieldPerAcreQuintals(
  bySize: Record<string, ContractFarmingGradingBucket>,
  acresPlanted: number
): number | null {
  if (!Number.isFinite(acresPlanted) || acresPlanted <= 0) return null;
  const netWeightAfterGradingKg = Object.values(bySize).reduce(
    (sum, bucket) => {
      const weight = bucket.netWeightKg;
      return sum + (Number.isFinite(weight) ? weight : 0);
    },
    0
  );
  return netWeightAfterGradingKg / acresPlanted / 100;
}

export function formatYieldPerAcreQuintals(
  value: number | null | undefined
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentage(value: number): string {
  return `${value.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Shares of grading by size band, as % of total graded **net weight (kg)** — same idea as
 * Farmer Stock Ledger summary `% of Graded Sizes` (weight-based, not bag-count-based).
 */
export function computeGradingRangePercentages(
  bySize: Record<string, ContractFarmingGradingBucket>
): {
  below40: number | null;
  range40To50: number | null;
  above50: number | null;
  cut: number | null;
} {
  let below40 = 0;
  let range40To50 = 0;
  let above50 = 0;
  let cut = 0;
  let total = 0;

  CONTRACT_FARMING_GRADING_COLUMNS.forEach((col) => {
    const bucket = findGradingBucket(bySize, col.matchKeys);
    const w =
      bucket && Number.isFinite(bucket.netWeightKg) ? bucket.netWeightKg : 0;
    total += w;
    if (BELOW_40_BUCKET_HEADERS.has(col.header)) {
      below40 += w;
      return;
    }
    if (RANGE_40_TO_50_BUCKET_HEADERS.has(col.header)) {
      range40To50 += w;
      return;
    }
    if (CUT_BUCKET_HEADERS.has(col.header)) {
      cut += w;
      return;
    }
    above50 += w;
  });

  if (total <= 0) {
    return { below40: null, range40To50: null, above50: null, cut: null };
  }

  return {
    below40: (below40 / total) * 100,
    range40To50: (range40To50 / total) * 100,
    above50: (above50 / total) * 100,
    cut: (cut / total) * 100,
  };
}

export function formatGradingRangePercentage(
  value: number | null | undefined
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatPercentage(value);
}

/** ₹/kg style rate from `BUY_BACK_COST` for a potato variety + grading size label. */
function resolveBuyBackRatePerKg(
  potatoVariety: string,
  sizeKey: string
): number | undefined {
  const v = potatoVariety.trim();
  const entry = BUY_BACK_COST.find(
    (e) => e.variety.toLowerCase() === v.toLowerCase()
  );
  if (!entry) return undefined;
  const rates = entry.sizeRates as Record<string, number>;
  if (Object.prototype.hasOwnProperty.call(rates, sizeKey))
    return rates[sizeKey];
  const want = normalizeGradingSizeKey(sizeKey);
  for (const [k, val] of Object.entries(rates)) {
    if (normalizeGradingSizeKey(k) === want) return val;
  }
  return undefined;
}

/**
 * Σ (netWeightKg × buy-back rate) per bucket. `null` when there is no grading data.
 */
export function computeBuyBackAmountNumber(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): number | null {
  const g = farmer.grading;
  if (!g || typeof g !== 'object' || Object.keys(g).length === 0) return null;

  let total = 0;

  for (const [topKey, inner] of Object.entries(g)) {
    if (!inner || typeof inner !== 'object') continue;
    const innerRec = inner as Record<string, unknown>;
    const looksLikeBucket =
      typeof innerRec.initialBags === 'number' ||
      typeof innerRec.netWeightKg === 'number';

    if (looksLikeBucket) {
      const bucket = toGradingBucket(inner);
      const nw = Number.isFinite(bucket.netWeightKg) ? bucket.netWeightKg : 0;
      const rate = resolveBuyBackRatePerKg(reportVariety, topKey);
      if (rate != null && Number.isFinite(rate)) total += nw * rate;
      continue;
    }

    if (
      normalizeReportVarietyKey(topKey) !==
      normalizeReportVarietyKey(reportVariety)
    ) {
      continue;
    }

    for (const [sizeKey, bucket] of Object.entries(innerRec)) {
      if (
        !bucket ||
        typeof bucket !== 'object' ||
        !('initialBags' in bucket || 'netWeightKg' in bucket)
      ) {
        continue;
      }
      const b = bucket as ContractFarmingGradingBucket;
      const nw = Number.isFinite(b.netWeightKg) ? b.netWeightKg : 0;
      const rate = resolveBuyBackRatePerKg(topKey, sizeKey);
      if (rate != null && Number.isFinite(rate)) total += nw * rate;
    }
  }

  return total;
}

export function formatBuyBackAmount(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): string {
  const n = computeBuyBackAmountNumber(farmer, reportVariety);
  if (n === null) return '—';
  return n.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Sum of `amountPayable` across `sizes`; `null` when there are no size lines. */
export function computeTotalSeedAmountNumber(
  farmer: ContractFarmingFarmerRow
): number | null {
  const sizes = farmer.sizes ?? [];
  if (sizes.length === 0) return null;
  return sizes.reduce((sum, s) => {
    const a = s.amountPayable;
    return sum + (Number.isFinite(a) ? a : 0);
  }, 0);
}

export function formatTotalSeedAmount(
  farmer: ContractFarmingFarmerRow
): string {
  const n = computeTotalSeedAmountNumber(farmer);
  if (n === null) return '—';
  return n.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Buy back amount − total seed amount (treat missing operands as 0 unless both missing). */
export function formatNetAmountPayable(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): string {
  const buyBack = computeBuyBackAmountNumber(farmer, reportVariety);
  const seed = computeTotalSeedAmountNumber(farmer);
  if (buyBack === null && seed === null) return '—';
  const net = (buyBack ?? 0) - (seed ?? 0);
  return net.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Acres for per-acre net: sum of `sizes[].acres`, else `acresPlanted` when that sum is 0. */
export function resolveAcresForNetPerAcre(
  farmer: ContractFarmingFarmerRow
): number {
  const sizes = farmer.sizes ?? [];
  const sum = sizes.reduce(
    (s, x) => s + (Number.isFinite(x.acres) ? x.acres : 0),
    0
  );
  if (sum > 0) return sum;
  return Number.isFinite(farmer.acresPlanted) ? farmer.acresPlanted : 0;
}

/** Net amount payable ÷ acres (from seed size lines when present). */
export function formatNetAmountPerAcre(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): string {
  const buyBack = computeBuyBackAmountNumber(farmer, reportVariety);
  const seed = computeTotalSeedAmountNumber(farmer);
  if (buyBack === null && seed === null) return '—';
  const net = (buyBack ?? 0) - (seed ?? 0);
  const acres = resolveAcresForNetPerAcre(farmer);
  if (acres <= 0) return '—';
  const per = net / acres;
  return per.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type VarietyTableTotals = {
  acresPlanted: number;
  seedBags: number;
  buyBackBags: number;
  buyBackNetWeightKg: number;
  gradingByColumn: number[];
  totalGradingBags: number;
  below40Percent: number | null;
  range40To50Percent: number | null;
  above50Percent: number | null;
  cutPercent: number | null;
  netWeightAfterGrading: number;
  buyBackAmount: number;
  totalSeedAmount: number;
  netAmountPayable: number;
  netAmountPerAcre: number;
  yieldPerAcreQuintals: number | null;
};

/**
 * Bags and weight for the current report section only (`buy-back-bags` is keyed by potato variety).
 */
export function aggregateBuyBackBagsForReportVariety(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): {
  totalBags: number;
  totalNetWeightKg: number;
} {
  const want = normalizeReportVarietyKey(reportVariety);
  const bags = farmer['buy-back-bags'] ?? {};
  for (const [k, v] of Object.entries(bags)) {
    if (normalizeReportVarietyKey(k) === want) {
      return {
        totalBags: Number.isFinite(v.bags) ? v.bags : 0,
        totalNetWeightKg: Number.isFinite(v.netWeightKg) ? v.netWeightKg : 0,
      };
    }
  }
  return { totalBags: 0, totalNetWeightKg: 0 };
}

/** Whether `buy-back-bags` has an entry for this report variety (case-insensitive key). */
export function hasBuyBackBagsEntryForReportVariety(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): boolean {
  const want = normalizeReportVarietyKey(reportVariety);
  return Object.keys(farmer['buy-back-bags'] ?? {}).some(
    (k) => normalizeReportVarietyKey(k) === want
  );
}

/** Sums numeric columns once per farmer (not per expanded size row). */
export function computeVarietyTableTotals(
  farmers: ContractFarmingFarmerRow[],
  variety: string
): VarietyTableTotals {
  const gradingSums = CONTRACT_FARMING_GRADING_COLUMNS.map(() => 0);
  /** Per-column sums of net weight (kg) for % bands — same basis as `computeGradingRangePercentages`. */
  const gradingWeightSums = CONTRACT_FARMING_GRADING_COLUMNS.map(() => 0);
  let acresPlanted = 0;
  let seedBags = 0;
  let buyBackBags = 0;
  let buyBackNetWeightKg = 0;
  let totalGradingBags = 0;
  let netWeightAfterGrading = 0;
  let buyBackAmount = 0;
  let totalSeedAmount = 0;
  let netAmountPayable = 0;
  let sumAcresForNetPerAcre = 0;

  for (const farmer of farmers) {
    const sizes = farmer.sizes ?? [];
    if (sizes.length > 0) {
      for (const s of sizes) {
        acresPlanted += Number.isFinite(s.acres) ? s.acres : 0;
      }
    } else {
      acresPlanted += Number.isFinite(farmer.acresPlanted)
        ? farmer.acresPlanted
        : 0;
    }
    for (const s of sizes) {
      seedBags += Number.isFinite(s.quantity) ? s.quantity : 0;
    }

    const bbAgg = aggregateBuyBackBagsForReportVariety(farmer, variety);
    buyBackBags += bbAgg.totalBags;
    buyBackNetWeightKg += bbAgg.totalNetWeightKg;

    const gradingBySize = mergeGradingSizeMapsForReportVariety(farmer, variety);
    CONTRACT_FARMING_GRADING_COLUMNS.forEach((col, i) => {
      const bucket = findGradingBucket(gradingBySize, col.matchKeys);
      const q = bucket?.initialBags;
      const add = typeof q === 'number' && Number.isFinite(q) ? q : 0;
      gradingSums[i] = (gradingSums[i] ?? 0) + add;
      const w = bucket?.netWeightKg;
      const addW = typeof w === 'number' && Number.isFinite(w) ? w : 0;
      gradingWeightSums[i] = (gradingWeightSums[i] ?? 0) + addW;
    });

    totalGradingBags += Object.values(gradingBySize).reduce(
      (s, b) => s + (Number.isFinite(b.initialBags) ? b.initialBags : 0),
      0
    );
    netWeightAfterGrading += Object.values(gradingBySize).reduce(
      (s, b) => s + (Number.isFinite(b.netWeightKg) ? b.netWeightKg : 0),
      0
    );

    const bba = computeBuyBackAmountNumber(farmer, variety);
    buyBackAmount += bba ?? 0;

    const seedAmt = computeTotalSeedAmountNumber(farmer);
    totalSeedAmount += seedAmt ?? 0;

    netAmountPayable += (bba ?? 0) - (seedAmt ?? 0);
    sumAcresForNetPerAcre += resolveAcresForNetPerAcre(farmer);
  }

  const netAmountPerAcre =
    sumAcresForNetPerAcre > 0 ? netAmountPayable / sumAcresForNetPerAcre : 0;
  /** Total net weight (kg) across all grading buckets — denominator for % bands (weight-based). */
  const totalGradedNetWeightKg = netWeightAfterGrading;
  const below40WeightKg = CONTRACT_FARMING_GRADING_COLUMNS.reduce(
    (sum, col, i) => {
      if (!BELOW_40_BUCKET_HEADERS.has(col.header)) return sum;
      return sum + (gradingWeightSums[i] ?? 0);
    },
    0
  );
  const range40To50WeightKg = CONTRACT_FARMING_GRADING_COLUMNS.reduce(
    (sum, col, i) => {
      if (!RANGE_40_TO_50_BUCKET_HEADERS.has(col.header)) return sum;
      return sum + (gradingWeightSums[i] ?? 0);
    },
    0
  );
  const cutWeightKg = CONTRACT_FARMING_GRADING_COLUMNS.reduce((sum, col, i) => {
    if (!CUT_BUCKET_HEADERS.has(col.header)) return sum;
    return sum + (gradingWeightSums[i] ?? 0);
  }, 0);
  const above50WeightKg = CONTRACT_FARMING_GRADING_COLUMNS.reduce(
    (sum, col, i) => {
      if (
        BELOW_40_BUCKET_HEADERS.has(col.header) ||
        RANGE_40_TO_50_BUCKET_HEADERS.has(col.header) ||
        CUT_BUCKET_HEADERS.has(col.header)
      ) {
        return sum;
      }
      return sum + (gradingWeightSums[i] ?? 0);
    },
    0
  );
  const yieldPerAcreQuintals =
    acresPlanted > 0 ? netWeightAfterGrading / acresPlanted / 100 : null;

  return {
    acresPlanted,
    seedBags,
    buyBackBags,
    buyBackNetWeightKg,
    gradingByColumn: gradingSums,
    totalGradingBags,
    below40Percent:
      totalGradedNetWeightKg > 0
        ? (below40WeightKg / totalGradedNetWeightKg) * 100
        : null,
    range40To50Percent:
      totalGradedNetWeightKg > 0
        ? (range40To50WeightKg / totalGradedNetWeightKg) * 100
        : null,
    above50Percent:
      totalGradedNetWeightKg > 0
        ? (above50WeightKg / totalGradedNetWeightKg) * 100
        : null,
    cutPercent:
      totalGradedNetWeightKg > 0
        ? (cutWeightKg / totalGradedNetWeightKg) * 100
        : null,
    netWeightAfterGrading,
    buyBackAmount,
    totalSeedAmount,
    netAmountPayable,
    netAmountPerAcre,
    yieldPerAcreQuintals,
  };
}

/** Maps aggregated totals to table column ids (footer row or family subtotal row). */
export function formatVarietyTableTotalsForFooterColumns(
  totals: VarietyTableTotals,
  options: {
    nameLabel: string;
    /** Shown in Account no.; default em dash. */
    accountLabel?: string;
  }
): Record<string, string> {
  const { nameLabel, accountLabel = '—' } = options;
  const out: Record<string, string> = {
    sNo: '',
    name: nameLabel,
    accountNumber: accountLabel,
    address: '—',
    acresPlanted: totals.acresPlanted.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 2,
      }
    ),
    generation: '—',
    sizeName: '—',
    seedBags: totals.seedBags.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
      maximumFractionDigits: 0,
    }),
    buyBackBags: totals.buyBackBags.toLocaleString(CONTRACT_FARMING_IN_LOCALE, {
      maximumFractionDigits: 0,
    }),
    wtWithoutBardana: totals.buyBackNetWeightKg.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 2,
      }
    ),
    totalGradingBags: totals.totalGradingBags.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        maximumFractionDigits: 0,
      }
    ),
    below40Percent: formatGradingRangePercentage(totals.below40Percent),
    range40To50Percent: formatGradingRangePercentage(totals.range40To50Percent),
    above50Percent: formatGradingRangePercentage(totals.above50Percent),
    cutPercent: formatGradingRangePercentage(totals.cutPercent),
    netWeightAfterGrading: totals.netWeightAfterGrading.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      { maximumFractionDigits: 2 }
    ),
    buyBackAmount: totals.buyBackAmount.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    totalSeedAmount: totals.totalSeedAmount.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    netAmountPayable: totals.netAmountPayable.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    netAmountPerAcre: totals.netAmountPerAcre.toLocaleString(
      CONTRACT_FARMING_IN_LOCALE,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ),
    yieldPerAcreQuintals: formatYieldPerAcreQuintals(
      totals.yieldPerAcreQuintals
    ),
  };

  for (const [index, col] of CONTRACT_FARMING_GRADING_COLUMNS.entries()) {
    out[`grading:${col.header}`] = (
      totals.gradingByColumn[index] ?? 0
    ).toLocaleString(CONTRACT_FARMING_IN_LOCALE, { maximumFractionDigits: 0 });
  }

  return out;
}
