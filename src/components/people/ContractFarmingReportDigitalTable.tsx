import { memo } from 'react';
import type {
  ContractFarmingFarmerRow,
  ContractFarmingGradingBucket,
  ContractFarmingSizeRow,
} from '@/types/analytics';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BUY_BACK_COST } from '@/components/forms/grading/constants';

/** Indian numbering: lakh/crore-style grouping (e.g. 1,00,000). */
const IN_LOCALE = 'en-IN';

export type ContractFarmingReportDigitalVarietyGroup = {
  variety: string;
  rows: ContractFarmingFarmerRow[];
};

export interface ContractFarmingReportDigitalTableProps {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** One group per variety; each group renders its own table. */
  groups: ContractFarmingReportDigitalVarietyGroup[];
}

/**
 * Temporary on-screen table for contract farming analytics (People page).
 * Parent supplies data from `useGetContractFarmingReport`.
 */
function expandFarmerRowsForSizes(
  farmers: ContractFarmingFarmerRow[]
): { farmer: ContractFarmingFarmerRow; size: ContractFarmingSizeRow | null }[] {
  return farmers.flatMap((farmer) => {
    if (farmer.sizes.length === 0) {
      return [{ farmer, size: null as ContractFarmingSizeRow | null }];
    }
    return farmer.sizes.map((size) => ({ farmer, size }));
  });
}

/**
 * Grading size columns for contract farming (display header + API key variants).
 * Order matches product spec; keys use en-dash as in grading forms (`30–40`) with hyphen fallbacks.
 */
const CONTRACT_FARMING_GRADING_COLUMNS: {
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
function mergeGradingSizeMaps(
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

function findGradingBucket(
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

function formatGradingBagsQty(
  bucket: ContractFarmingGradingBucket | undefined
): string {
  if (bucket == null) return '—';
  const n = bucket.initialBags;
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(IN_LOCALE, { maximumFractionDigits: 0 });
}

/** Sum of `initialBags` across merged grading size buckets. */
function formatTotalGradingBags(
  bySize: Record<string, ContractFarmingGradingBucket>
): string {
  if (Object.keys(bySize).length === 0) return '—';
  const n = Object.values(bySize).reduce((sum, b) => {
    const q = b.initialBags;
    return sum + (Number.isFinite(q) ? q : 0);
  }, 0);
  return n.toLocaleString(IN_LOCALE, { maximumFractionDigits: 0 });
}

/** Sum of `netWeightKg` across all grading buckets (nested sub-varieties merged by size). */
function formatNetWeightAfterGrading(
  bySize: Record<string, ContractFarmingGradingBucket>
): string {
  if (Object.keys(bySize).length === 0) return '—';
  const n = Object.values(bySize).reduce((sum, b) => {
    const w = b.netWeightKg;
    return sum + (Number.isFinite(w) ? w : 0);
  }, 0);
  return n.toLocaleString(IN_LOCALE, { maximumFractionDigits: 2 });
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
function computeBuyBackAmountNumber(
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

function formatBuyBackAmount(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): string {
  const n = computeBuyBackAmountNumber(farmer, reportVariety);
  if (n === null) return '—';
  return n.toLocaleString(IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Sum of `amountPayable` across `sizes`; `null` when there are no size lines. */
function computeTotalSeedAmountNumber(
  farmer: ContractFarmingFarmerRow
): number | null {
  const sizes = farmer.sizes ?? [];
  if (sizes.length === 0) return null;
  return sizes.reduce((sum, s) => {
    const a = s.amountPayable;
    return sum + (Number.isFinite(a) ? a : 0);
  }, 0);
}

function formatTotalSeedAmount(farmer: ContractFarmingFarmerRow): string {
  const n = computeTotalSeedAmountNumber(farmer);
  if (n === null) return '—';
  return n.toLocaleString(IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Buy back amount − total seed amount (treat missing operands as 0 unless both missing). */
function formatNetAmountPayable(
  farmer: ContractFarmingFarmerRow,
  reportVariety: string
): string {
  const buyBack = computeBuyBackAmountNumber(farmer, reportVariety);
  const seed = computeTotalSeedAmountNumber(farmer);
  if (buyBack === null && seed === null) return '—';
  const net = (buyBack ?? 0) - (seed ?? 0);
  return net.toLocaleString(IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Acres for per-acre net: sum of `sizes[].acres`, else `acresPlanted` when that sum is 0. */
function resolveAcresForNetPerAcre(farmer: ContractFarmingFarmerRow): number {
  const sizes = farmer.sizes ?? [];
  const sum = sizes.reduce(
    (s, x) => s + (Number.isFinite(x.acres) ? x.acres : 0),
    0
  );
  if (sum > 0) return sum;
  return Number.isFinite(farmer.acresPlanted) ? farmer.acresPlanted : 0;
}

/** Net amount payable ÷ acres (from seed size lines when present). */
function formatNetAmountPerAcre(
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
  return per.toLocaleString(IN_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type VarietyTableTotals = {
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

/** Sums numeric columns once per farmer (not per expanded size row). */
function computeVarietyTableTotals(
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
    acresPlanted += Number.isFinite(farmer.acresPlanted)
      ? farmer.acresPlanted
      : 0;
    for (const s of farmer.sizes ?? []) {
      seedBags += Number.isFinite(s.quantity) ? s.quantity : 0;
    }

    const bbAgg = aggregateBuyBackBags(farmer);
    buyBackBags += bbAgg.totalBags;
    buyBackNetWeightKg += bbAgg.totalNetWeightKg;

    const gradingBySize = mergeGradingSizeMaps(farmer);
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

/** Sums `bags` and `netWeightKg` across all keys in `buy-back-bags`. */
function aggregateBuyBackBags(farmer: ContractFarmingFarmerRow): {
  totalBags: number;
  totalNetWeightKg: number;
} {
  const entries = Object.values(farmer['buy-back-bags'] ?? {});
  return entries.reduce(
    (acc, e) => ({
      totalBags: acc.totalBags + e.bags,
      totalNetWeightKg: acc.totalNetWeightKg + e.netWeightKg,
    }),
    { totalBags: 0, totalNetWeightKg: 0 }
  );
}

const varietyTableHead = (
  <>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 w-10 text-center text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      S. No.
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Name
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold backdrop-blur-sm">
      Acres planted
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-xs font-semibold backdrop-blur-sm">
      Generation
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Size name
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold backdrop-blur-sm">
      Seed bags
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold backdrop-blur-sm">
      Buy back bags
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold backdrop-blur-sm">
      Wt. without bardana
    </TableHead>
    {CONTRACT_FARMING_GRADING_COLUMNS.map((col) => (
      <TableHead
        key={col.header}
        className="font-custom bg-muted/95 sticky top-0 z-10 min-w-18 text-right text-xs font-semibold backdrop-blur-sm"
      >
        {col.header}
      </TableHead>
    ))}
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Total grading bags
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Net weight after grading (kg)
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Buy back amount
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Total seed amount
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Net amount payable
    </TableHead>
    <TableHead className="font-custom bg-muted/95 sticky top-0 z-10 text-right text-xs font-semibold whitespace-nowrap backdrop-blur-sm">
      Net amount / acre
    </TableHead>
  </>
);

export const ContractFarmingReportDigitalTable = memo(
  function ContractFarmingReportDigitalTable({
    isLoading,
    isError,
    error,
    groups,
  }: ContractFarmingReportDigitalTableProps) {
    const totalRows = groups.reduce(
      (n, g) => n + expandFarmerRowsForSizes(g.rows).length,
      0
    );

    return (
      <Card className="overflow-hidden rounded-xl border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="font-custom text-base font-semibold">
            Contract farming report
          </CardTitle>
          <CardDescription className="font-custom">
            Temporary Preview For Contract Farming Report Before Generating Pdf
            report
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-full rounded-md" />
              <Skeleton className="h-8 w-3/4 rounded-md" />
            </div>
          ) : isError ? (
            <p className="font-custom text-destructive text-sm">
              {error instanceof Error
                ? error.message
                : 'Could not load contract farming report.'}
            </p>
          ) : groups.length === 0 ? (
            <p className="font-custom text-muted-foreground text-sm">
              No contract farming rows returned.
            </p>
          ) : (
            <div className="max-h-[min(28rem,50vh)] space-y-6 overflow-auto pr-1">
              {groups.map(({ variety, rows }, groupIndex) => {
                const varietyTotals = computeVarietyTableTotals(rows, variety);
                return (
                  <section
                    key={variety}
                    className="space-y-2"
                    aria-labelledby={`cf-digital-variety-${groupIndex}`}
                  >
                    <h3
                      id={`cf-digital-variety-${groupIndex}`}
                      className="font-custom text-sm font-semibold text-[#333]"
                    >
                      {variety}
                    </h3>
                    <div className="overflow-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            {varietyTableHead}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expandFarmerRowsForSizes(rows).map(
                            ({ farmer, size }, idx) => {
                              const buyBack = aggregateBuyBackBags(farmer);
                              const hasBuyBack =
                                Object.keys(farmer['buy-back-bags'] ?? {})
                                  .length > 0;
                              const gradingBySize =
                                mergeGradingSizeMaps(farmer);
                              return (
                                <TableRow
                                  key={`${variety}-${farmer.id}-${size?.name ?? 'no-size'}-${idx}`}
                                >
                                  <TableCell className="font-custom text-muted-foreground text-center text-xs tabular-nums">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell className="font-custom max-w-48 truncate text-xs">
                                    {farmer.name}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs tabular-nums">
                                    {farmer.acresPlanted.toLocaleString(
                                      IN_LOCALE,
                                      {
                                        maximumFractionDigits: 2,
                                      }
                                    )}
                                  </TableCell>
                                  <TableCell className="font-custom text-xs whitespace-nowrap">
                                    {farmer.generations.join(', ')}
                                  </TableCell>
                                  <TableCell className="font-custom text-xs whitespace-nowrap">
                                    {size?.name ?? '—'}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs tabular-nums">
                                    {size != null
                                      ? size.quantity.toLocaleString(
                                          IN_LOCALE,
                                          {
                                            maximumFractionDigits: 0,
                                          }
                                        )
                                      : '—'}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs tabular-nums">
                                    {hasBuyBack
                                      ? buyBack.totalBags.toLocaleString(
                                          IN_LOCALE,
                                          { maximumFractionDigits: 0 }
                                        )
                                      : '—'}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs tabular-nums">
                                    {hasBuyBack
                                      ? buyBack.totalNetWeightKg.toLocaleString(
                                          IN_LOCALE,
                                          { maximumFractionDigits: 2 }
                                        )
                                      : '—'}
                                  </TableCell>
                                  {CONTRACT_FARMING_GRADING_COLUMNS.map(
                                    (col) => (
                                      <TableCell
                                        key={col.header}
                                        className="font-custom text-right text-xs tabular-nums"
                                      >
                                        {formatGradingBagsQty(
                                          findGradingBucket(
                                            gradingBySize,
                                            col.matchKeys
                                          )
                                        )}
                                      </TableCell>
                                    )
                                  )}
                                  <TableCell className="font-custom text-right text-xs font-semibold tabular-nums">
                                    {formatTotalGradingBags(gradingBySize)}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs font-semibold tabular-nums">
                                    {formatNetWeightAfterGrading(gradingBySize)}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs font-semibold tabular-nums">
                                    {formatBuyBackAmount(farmer, variety)}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs font-semibold tabular-nums">
                                    {formatTotalSeedAmount(farmer)}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs font-semibold tabular-nums">
                                    {formatNetAmountPayable(farmer, variety)}
                                  </TableCell>
                                  <TableCell className="font-custom text-right text-xs font-semibold tabular-nums">
                                    {formatNetAmountPerAcre(farmer, variety)}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          )}
                        </TableBody>
                        <TableFooter className="border-border bg-muted/70 text-foreground border-t font-bold!">
                          <TableRow className="hover:bg-muted/80 font-custom text-foreground border-0 font-bold [&_td]:px-1.5 [&_td]:font-bold!">
                            <TableCell
                              className="font-custom text-center text-xs font-bold"
                              aria-hidden
                            />
                            <TableCell className="font-custom max-w-48 truncate text-xs font-bold">
                              Total
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.acresPlanted.toLocaleString(
                                IN_LOCALE,
                                {
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-xs font-bold">
                              —
                            </TableCell>
                            <TableCell className="font-custom text-xs font-bold">
                              —
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.seedBags.toLocaleString(
                                IN_LOCALE,
                                {
                                  maximumFractionDigits: 0,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.buyBackBags.toLocaleString(
                                IN_LOCALE,
                                {
                                  maximumFractionDigits: 0,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.buyBackNetWeightKg.toLocaleString(
                                IN_LOCALE,
                                { maximumFractionDigits: 2 }
                              )}
                            </TableCell>
                            {varietyTotals.gradingByColumn.map((qty, gi) => (
                              <TableCell
                                key={
                                  CONTRACT_FARMING_GRADING_COLUMNS[gi].header
                                }
                                className="font-custom text-right text-xs font-bold tabular-nums"
                              >
                                {qty.toLocaleString(IN_LOCALE, {
                                  maximumFractionDigits: 0,
                                })}
                              </TableCell>
                            ))}
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.totalGradingBags.toLocaleString(
                                IN_LOCALE,
                                { maximumFractionDigits: 0 }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.netWeightAfterGrading.toLocaleString(
                                IN_LOCALE,
                                { maximumFractionDigits: 2 }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.buyBackAmount.toLocaleString(
                                IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.totalSeedAmount.toLocaleString(
                                IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.netAmountPayable.toLocaleString(
                                IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                            <TableCell className="font-custom text-right text-xs font-bold tabular-nums">
                              {varietyTotals.netAmountPerAcre.toLocaleString(
                                IN_LOCALE,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          {!isLoading && totalRows > 0 ? (
            <p className="font-custom text-muted-foreground mt-3 text-xs">
              {totalRows} row{totalRows === 1 ? '' : 's'} across {groups.length}{' '}
              variet{groups.length === 1 ? 'y' : 'ies'}.
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }
);
