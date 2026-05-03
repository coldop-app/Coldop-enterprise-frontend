import { GRADING_BAG_SIZE_COLUMN_ORDER } from '@/components/analytics/grading/report/column-meta';
import { roundMax2 } from '@/components/daybook/grading-calculations';
import type { GradingGatePass } from '@/types/grading-gate-pass';

export type GradingSizeCell = {
  bags: number;
  weightKg: number;
  bagType: string;
};

/**
 * Undefined = blank cell (continuation row, no line for this size at this stripe).
 * Present (including {0,0,''}) = show values (primary row padded zeros).
 */
export type AccountingGradingRowSizes = Record<
  string,
  GradingSizeCell | undefined
>;

export type AccountingGradingRow = {
  id: string;
  gradingGatePassId: string;
  /** 0 = primary row; continuation rows expose extra bag-type lines only in size columns. */
  stripeIndex: number;
  isContinuation: boolean;
  incomingManualGatePassNumber: string;
  gradingManualGatePassNumber: string;
  variety: string;
  gradingDate: string;
  /** Same date/time base for sorting; tie-break stripe so lines stay grouped. */
  gradingDateSortValue: number;
  sizes: AccountingGradingRowSizes;
  totalKg: number;
};

/** Fixed display order for accounting grading table (matches operational bag-size list). */
export const ACCOUNTING_GRADING_BAG_SIZE_ORDER = GRADING_BAG_SIZE_COLUMN_ORDER;

const CANONICAL_ORDER_SET = new Set<string>(GRADING_BAG_SIZE_COLUMN_ORDER);

/** Preferred stacking order when multiple bag types exist for one size */
const KNOWN_BAG_TYPE_ORDER = ['JUTE', 'LENO'] as const;

function normalizeSizeToken(raw: string): string {
  return raw
    .trim()
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\s+/g, ' ');
}

/** O(1) resolution of API size strings to canonical column labels (replacing nested scans). */
const RESOLVE_SIZE_EXACT = new Map<string, string>();
const RESOLVE_SIZE_LOWER = new Map<string, string>();
const RESOLVE_SIZE_COMPACT = new Map<string, string>();
for (const label of GRADING_BAG_SIZE_COLUMN_ORDER) {
  const norm = normalizeSizeToken(label);
  if (!RESOLVE_SIZE_EXACT.has(norm)) {
    RESOLVE_SIZE_EXACT.set(norm, label);
  }
  const low = norm.toLowerCase();
  if (!RESOLVE_SIZE_LOWER.has(low)) {
    RESOLVE_SIZE_LOWER.set(low, label);
  }
  const compact = norm.replace(/\s+/g, '').toLowerCase();
  if (!RESOLVE_SIZE_COMPACT.has(compact)) {
    RESOLVE_SIZE_COMPACT.set(compact, label);
  }
}

function resolveCanonicalSizeLabel(raw: string): string | null {
  const n = normalizeSizeToken(raw);
  if (!n) return null;
  return (
    RESOLVE_SIZE_EXACT.get(n) ??
    RESOLVE_SIZE_LOWER.get(n.toLowerCase()) ??
    RESOLVE_SIZE_COMPACT.get(n.replace(/\s+/g, '').toLowerCase()) ??
    null
  );
}

/** Maps API `orderDetails[].size` to canonical key or a stable display key for unknown labels. */
function sizeKeyForDetail(rawSize: string): string {
  return resolveCanonicalSizeLabel(rawSize) ?? normalizeSizeToken(rawSize);
}

/** Exported for downstream reports (summary) — same resolution as grading table buckets. */
export function gradingOrderDetailSizeKey(rawSize: string): string {
  return sizeKeyForDetail(rawSize);
}

function normalizeBagTypeKey(raw: string): string {
  const t = raw.trim().toUpperCase();
  return t !== '' ? t : 'UNKNOWN';
}

/** Same normalization as grading buckets; exported for summary grouping. */
export function gradingOrderDetailBagTypeKey(raw: string): string {
  return normalizeBagTypeKey(raw);
}

function compareBagTypeKeys(a: string, b: string): number {
  const ia = KNOWN_BAG_TYPE_ORDER.indexOf(
    a as (typeof KNOWN_BAG_TYPE_ORDER)[number]
  );
  const ib = KNOWN_BAG_TYPE_ORDER.indexOf(
    b as (typeof KNOWN_BAG_TYPE_ORDER)[number]
  );
  const aKnown = ia >= 0;
  const bKnown = ib >= 0;
  if (aKnown && bKnown) return ia - ib;
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  return a.localeCompare(b);
}

function formatGradingDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function emptySizeBucket(): GradingSizeCell {
  return { bags: 0, weightKg: 0, bagType: '' };
}

function incomingManualGatePassNumbers(gp: GradingGatePass): string {
  const incoming = gp.incomingGatePassIds ?? [];
  if (incoming.length === 0) return '';
  const seen = new Set<string>();
  for (const i of incoming) {
    const n = i.manualGatePassNumber;
    if (n != null) seen.add(String(n));
  }
  return [...seen].join(', ');
}

function gradingManualDisplay(gp: GradingGatePass): string {
  if (gp.manualGatePassNumber != null) {
    return String(gp.manualGatePassNumber);
  }
  return String(gp.gatePassNo ?? '');
}

/** Accumulate order lines keyed by canonical/extra size, then normalized bag type. */
type SizeBagBuckets = Map<
  string,
  Map<string, { bags: number; weightKg: number }>
>;

function upsertBucket(
  buckets: SizeBagBuckets,
  sizeKey: string,
  bagKey: string,
  bagsDelta: number,
  weightKgDelta: number
) {
  let byBag = buckets.get(sizeKey);
  if (!byBag) {
    byBag = new Map();
    buckets.set(sizeKey, byBag);
  }
  const cur = byBag.get(bagKey) ?? { bags: 0, weightKg: 0 };
  cur.bags += bagsDelta;
  cur.weightKg += weightKgDelta;
  byBag.set(bagKey, cur);
}

function linesSortedForSize(
  byBag: Map<string, { bags: number; weightKg: number }>
): GradingSizeCell[] {
  return [...byBag.entries()]
    .map(([bagTypeKey, v]) => ({
      bags: Number(v.bags) || 0,
      weightKg: roundMax2(v.weightKg),
      bagType: bagTypeKey !== 'UNKNOWN' ? bagTypeKey : '',
    }))
    .sort((a, b) => compareBagTypeKeys(a.bagType, b.bagType));
}

/** Sort each size bucket once per gate pass; reused for stripe depth, totals, and every stripe row. */
function computeSortedLinesBySize(
  buckets: SizeBagBuckets
): Map<string, GradingSizeCell[]> {
  const sorted = new Map<string, GradingSizeCell[]>();
  for (const [sizeKey, byBag] of buckets) {
    sorted.set(sizeKey, linesSortedForSize(byBag));
  }
  return sorted;
}

/** Aggregated bags and weight per size column plus grand total kg (for accounting grading footer). */
export type GradingTableTotals = {
  bySize: Record<string, { bags: number; weightKg: number }>;
  /** Sum of bags across every size stripe row (equiv. sum of per-size bag footers). */
  totalBags: number;
  totalKg: number;
};

/**
 * Sums bags and weight per `sizeLabelsOrdered` and `totalKg` across rows. Weights rounded with `roundMax2`.
 */
export function computeGradingTableTotals(
  rows: AccountingGradingRow[],
  sizeLabelsOrdered: readonly string[]
): GradingTableTotals {
  const bySize: Record<string, { bags: number; weightKg: number }> = {};
  for (const label of sizeLabelsOrdered) {
    bySize[label] = { bags: 0, weightKg: 0 };
  }

  let totalKgSum = 0;
  for (const row of rows) {
    totalKgSum += row.totalKg;
    for (const label of sizeLabelsOrdered) {
      const cell = row.sizes[label];
      if (!cell) continue;
      bySize[label].bags += Number(cell.bags) || 0;
      bySize[label].weightKg += Number(cell.weightKg) || 0;
    }
  }

  for (const label of sizeLabelsOrdered) {
    bySize[label].weightKg = roundMax2(bySize[label].weightKg);
  }

  let totalBags = 0;
  for (const label of sizeLabelsOrdered) {
    totalBags += bySize[label].bags;
  }

  return {
    bySize,
    totalBags,
    totalKg: roundMax2(totalKgSum),
  };
}

/** Bags shown on one grading stripe row: sum every size column (JUTE/LENO/other lines honour all non-blank qty cells). */
export function totalBagsForAccountingGradingRow(
  row: AccountingGradingRow,
  sizeLabelsOrdered: readonly string[]
): number {
  let sum = 0;
  for (const label of sizeLabelsOrdered) {
    const cell = row.sizes[label];
    if (cell === undefined) continue;
    sum += Number(cell.bags) || 0;
  }
  return sum;
}

function buildStripeSizes(
  stripeIndex: number,
  buckets: SizeBagBuckets,
  sortedBySize: Map<string, GradingSizeCell[]>
): AccountingGradingRowSizes {
  const out: AccountingGradingRowSizes = {};

  for (const sizeKey of buckets.keys()) {
    const lines = sortedBySize.get(sizeKey)!;
    const line = lines[stripeIndex];
    if (line) {
      out[sizeKey] = line;
    } else if (stripeIndex === 0) {
      out[sizeKey] = emptySizeBucket();
    }
  }

  if (stripeIndex === 0 && buckets.size === 0) {
    for (const label of GRADING_BAG_SIZE_COLUMN_ORDER) {
      out[label] = emptySizeBucket();
    }
  }

  if (stripeIndex === 0 && buckets.size > 0) {
    for (const label of GRADING_BAG_SIZE_COLUMN_ORDER) {
      if (out[label] === undefined) {
        out[label] = emptySizeBucket();
      }
    }
  }

  return out;
}

function maxStripeDepth(sortedBySize: Map<string, GradingSizeCell[]>): number {
  if (sortedBySize.size === 0) return 1;
  let max = 1;
  for (const lines of sortedBySize.values()) {
    max = Math.max(max, Math.max(lines.length, 1));
  }
  return Math.max(max, 1);
}

function totalRoundedFromSorted(
  sortedBySize: Map<string, GradingSizeCell[]>
): number {
  let sum = 0;
  for (const lines of sortedBySize.values()) {
    for (const line of lines) {
      sum += line.weightKg;
    }
  }
  return roundMax2(sum);
}

/**
 * Maps grading gate passes to accounting grading table rows. Per-size quantities use
 * `initialQuantity` and `weightPerBagKg`; multiple bag types for the same size render as stacked rows
 * (first stripe full metadata; later stripes omit metadata and repeat only qty / weight / bag type).
 */
export function prepareDataForGradingTable(
  gradingGatePasses: GradingGatePass[] | null | undefined
): AccountingGradingRow[] {
  const list = gradingGatePasses ?? [];
  if (list.length === 0) return [];

  const outRows: AccountingGradingRow[] = [];

  for (const gp of list) {
    const buckets: SizeBagBuckets = new Map();
    const rawDate = gp.date ?? gp.createdAt ?? '';
    let dateMs = new Date(rawDate).getTime();
    if (!Number.isFinite(dateMs)) {
      dateMs = 0;
    }

    for (const od of gp.orderDetails ?? []) {
      const rawSz = od.size ?? '';
      const sizeKey = sizeKeyForDetail(rawSz);
      if (!sizeKey) continue;

      const bags = Number(od.initialQuantity) || 0;
      const wtPerBag = Number(od.weightPerBagKg) || 0;
      const lineGrossKg = bags * wtPerBag;
      const bagKey = normalizeBagTypeKey(od.bagType ?? '');
      upsertBucket(buckets, sizeKey, bagKey, bags, lineGrossKg);
    }

    const sortedBySize = computeSortedLinesBySize(buckets);
    const depth = maxStripeDepth(sortedBySize);
    const gradingDate = formatGradingDate(rawDate);
    const incoming = incomingManualGatePassNumbers(gp);
    const gradingMan = gradingManualDisplay(gp);
    const varietyStr = gp.variety ?? '';
    const passTotalKg =
      buckets.size === 0 ? 0 : totalRoundedFromSorted(sortedBySize);

    for (let stripe = 0; stripe < depth; stripe++) {
      const sizes = buildStripeSizes(stripe, buckets, sortedBySize);
      const isContinuation = stripe > 0;

      outRows.push({
        id: `${gp._id}__${stripe}`,
        gradingGatePassId: gp._id,
        stripeIndex: stripe,
        isContinuation,
        incomingManualGatePassNumber: incoming,
        gradingManualGatePassNumber: gradingMan,
        variety: varietyStr,
        gradingDate,
        gradingDateSortValue: dateMs + stripe / 1000,
        sizes,
        totalKg: isContinuation ? 0 : roundMax2(passTotalKg),
      });
    }
  }

  return outRows;
}

/** Column labels to render after the canonical order (unknown API size labels only). */
export function extraGradingSizeLabelsFromRows(
  rows: AccountingGradingRow[]
): string[] {
  const extras = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.sizes)) {
      if (row.sizes[key] === undefined) continue;
      if (!CANONICAL_ORDER_SET.has(key)) {
        extras.add(key);
      }
    }
  }
  return [...extras].sort((a, b) => a.localeCompare(b));
}
