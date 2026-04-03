import type { GradingGatePass } from '@/types/grading-gate-pass';
import { GRADING_SIZES } from '@/components/forms/grading/constants';

/**
 * Display order for grading report bag-size columns (table + PDF).
 * Same order as {@link GRADING_SIZES} (field / spec sheet order).
 */
export const GRADING_REPORT_BAG_SIZE_ORDER: string[] = [...GRADING_SIZES];

const KNOWN_BAG_SIZE_SET = new Set(GRADING_REPORT_BAG_SIZE_ORDER);

/** Order size keys: canonical order first, then any unknown sizes (localeCompare). */
export function orderBagSizesByGradingReport(
  sizes: Iterable<string>
): string[] {
  const set = new Set(sizes);
  const ordered: string[] = [];
  for (const s of GRADING_REPORT_BAG_SIZE_ORDER) {
    if (set.has(s)) ordered.push(s);
  }
  const rest = [...set].filter((s) => !KNOWN_BAG_SIZE_SET.has(s));
  rest.sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

/** Short labels for column ids / PDF headers (e.g. A50, 30-40, B25). */
export const GRADING_REPORT_BAG_SIZE_LABELS: Record<string, string> = {
  '30–40': '30-40',
  '35–40': '35-40',
  '40–45': '40-45',
  '45–50': '45-50',
  '50–55': '50-55',
  'Above 50': 'A50',
  'Above 55': 'A55',
  Cut: 'CUT',
  '25–30': '25-30',
  '30–35': '30-35',
  'Below 30': 'B30',
  'Below 25': 'B25',
};

export function getVisibleBagSizesFromPasses(
  passes: GradingGatePass[]
): string[] {
  const hasQty = new Set<string>();
  for (const pass of passes) {
    for (const d of pass.orderDetails ?? []) {
      const q = d.initialQuantity ?? d.currentQuantity ?? 0;
      if (q > 0 && d.size) hasQty.add(d.size);
    }
  }
  return orderBagSizesByGradingReport(hasQty);
}

/** Display label for a grading order line bag type (Jute / Leno / other). */
export function formatGradingBagTypeLabel(
  bagType: string | null | undefined
): string {
  const t = bagType?.trim();
  if (!t) return '—';
  const u = t.toUpperCase();
  if (u === 'JUTE') return 'Jute';
  if (u === 'LENO') return 'Leno';
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function sortBagTypeParts(
  a: { label: string; qty: number; weightPerBagKg: number },
  b: { label: string; qty: number; weightPerBagKg: number }
): number {
  const rank = (l: string) =>
    l === 'Jute' ? 0 : l === 'Leno' ? 1 : l === '—' ? 99 : 50;
  const ra = rank(a.label);
  const rb = rank(b.label);
  if (ra !== rb) return ra - rb;
  return a.label.localeCompare(b.label);
}

export type GradedSizeBreakdownEntry = {
  qty: number;
  weightPerBagKg: number;
  /** Non-empty when qty > 0; split by bag type from order lines */
  bagTypeParts: { label: string; qty: number; weightPerBagKg: number }[];
};

/**
 * Per-size qty across all bag types in orderDetails, with weightPerBagKg merged
 * like FarmerProfileGradingGatePassTable (last non-null weightPerBagKg wins per size).
 * {@link bagTypeParts} lists qty and weightPerBagKg per bag type for report cells (jute vs leno vs other).
 */
export function getAggregatedGradedSizeBreakdown(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): Record<string, GradedSizeBreakdownEntry> {
  const map = new Map<
    string,
    {
      qty: number;
      weightPerBagKg: number;
      byLabel: Map<string, { qty: number; weightPerBagKg: number }>;
    }
  >();

  for (const d of orderDetails ?? []) {
    const size = d.size;
    if (!size) continue;
    const qty = d.initialQuantity ?? d.currentQuantity ?? 0;
    const label = formatGradingBagTypeLabel(d.bagType);
    const lineWeight = d.weightPerBagKg ?? 0;
    const existing = map.get(size);
    if (existing) {
      existing.qty += qty;
      if (d.weightPerBagKg != null) existing.weightPerBagKg = d.weightPerBagKg;
      const prev = existing.byLabel.get(label);
      if (prev) {
        existing.byLabel.set(label, {
          qty: prev.qty + qty,
          weightPerBagKg:
            d.weightPerBagKg != null ? d.weightPerBagKg : prev.weightPerBagKg,
        });
      } else {
        existing.byLabel.set(label, { qty, weightPerBagKg: lineWeight });
      }
    } else {
      const byLabel = new Map<
        string,
        { qty: number; weightPerBagKg: number }
      >();
      byLabel.set(label, { qty, weightPerBagKg: lineWeight });
      map.set(size, {
        qty,
        weightPerBagKg: d.weightPerBagKg ?? 0,
        byLabel,
      });
    }
  }

  const result: Record<string, GradedSizeBreakdownEntry> = {};
  for (const [size, entry] of map) {
    const bagTypeParts = [...entry.byLabel.entries()]
      .filter(([, v]) => v.qty > 0)
      .map(([label, v]) => ({
        label,
        qty: v.qty,
        weightPerBagKg: v.weightPerBagKg,
      }))
      .sort(sortBagTypeParts);
    result[size] = {
      qty: entry.qty,
      weightPerBagKg: entry.weightPerBagKg,
      bagTypeParts,
    };
  }
  return result;
}

export function gradedBagSizeColumnId(size: string): string {
  const short = GRADING_REPORT_BAG_SIZE_LABELS[size] ?? size;
  return `gradedBagSize_${short}`;
}

export function sizeKeyFromGradedBagColumnId(
  columnId: string
): string | undefined {
  if (!columnId.startsWith('gradedBagSize_')) return undefined;
  const short = columnId.slice('gradedBagSize_'.length);
  const fromOrder = GRADING_REPORT_BAG_SIZE_ORDER.find(
    (s) => (GRADING_REPORT_BAG_SIZE_LABELS[s] ?? s) === short
  );
  return fromOrder;
}

const SIZE_ORDER_INDEX = new Map(
  GRADING_REPORT_BAG_SIZE_ORDER.map((s, i) => [s, i] as const)
);

/** Sort `gradedBagSize_*` column ids by {@link GRADING_REPORT_BAG_SIZE_ORDER} (not lexicographic). */
export function sortGradedBagSizeColumnIds(columnIds: string[]): string[] {
  return [...columnIds].sort((a, b) => {
    const ka = sizeKeyFromGradedBagColumnId(a);
    const kb = sizeKeyFromGradedBagColumnId(b);
    return compareSizeKeysForReport(ka, kb, a, b);
  });
}

/** Compare canonical size keys (e.g. for PDF summary rows). Unknown sizes sort after known, then localeCompare. */
export function compareSizeKeysForReport(
  aKey: string | undefined,
  bKey: string | undefined,
  aFallback = '',
  bFallback = ''
): number {
  const ia = aKey != null ? SIZE_ORDER_INDEX.get(aKey) : undefined;
  const ib = bKey != null ? SIZE_ORDER_INDEX.get(bKey) : undefined;
  if (ia != null && ib != null && ia !== ib) return ia - ib;
  if (ia != null && ib === undefined) return -1;
  if (ia === undefined && ib != null) return 1;
  return aFallback.localeCompare(bFallback);
}
