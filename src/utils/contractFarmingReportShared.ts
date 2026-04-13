import type {
  ContractFarmingFarmerRow,
  ContractFarmingGradingBucket,
  ContractFarmingSizeRow,
} from '@/types/analytics';
import { BUY_BACK_COST } from '@/components/forms/grading/constants';

/** Indian numbering: lakh/crore-style grouping (e.g. 1,00,000). */
export const CONTRACT_FARMING_IN_LOCALE = 'en-IN';

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
  { header: 'Below 30', matchKeys: ['Below 30'] },
  { header: '30-40', matchKeys: ['30–40', '30-40'] },
  { header: '35-40', matchKeys: ['35–40', '35-40'] },
  { header: '40-45', matchKeys: ['40–45', '40-45'] },
  { header: '45-50', matchKeys: ['45–50', '45-50'] },
  { header: '50-55', matchKeys: ['50–55', '50-55'] },
  { header: 'Above 50', matchKeys: ['Above 50'] },
  { header: 'Above 55', matchKeys: ['Above 55'] },
  { header: 'Cut', matchKeys: ['Cut'] },
];

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
  netWeightAfterGrading: number;
  buyBackAmount: number;
  totalSeedAmount: number;
  netAmountPayable: number;
  netAmountPerAcre: number;
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

  return {
    acresPlanted,
    seedBags,
    buyBackBags,
    buyBackNetWeightKg,
    gradingByColumn: gradingSums,
    totalGradingBags,
    netWeightAfterGrading,
    buyBackAmount,
    totalSeedAmount,
    netAmountPayable,
    netAmountPerAcre,
  };
}
