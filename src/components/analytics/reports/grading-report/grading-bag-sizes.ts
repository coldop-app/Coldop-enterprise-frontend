import type { GradingGatePass } from '@/types/grading-gate-pass';

/** Same order and labels as FarmerProfileGradingGatePassTable bag size columns. */
export const GRADING_REPORT_BAG_SIZE_ORDER: string[] = [
  'Below 30',
  '30–40',
  '35–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
];

/** Short labels for column ids / headers (e.g. B30, 30-40). */
export const GRADING_REPORT_BAG_SIZE_LABELS: Record<string, string> = {
  'Below 30': 'B30',
  '30–40': '30-40',
  '35–40': '35-40',
  '40–45': '40-45',
  '45–50': '45-50',
  '50–55': '50-55',
  'Above 50': 'A50',
  'Above 55': 'A55',
  Cut: 'CUT',
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
  return GRADING_REPORT_BAG_SIZE_ORDER.filter((size) => hasQty.has(size));
}

/**
 * Per-size qty across all bag types in orderDetails, with weightPerBagKg merged
 * like FarmerProfileGradingGatePassTable (last non-null weightPerBagKg wins per size).
 */
export function getAggregatedGradedSizeBreakdown(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): Record<string, { qty: number; weightPerBagKg: number }> {
  const map = new Map<string, { qty: number; weightPerBagKg: number }>();
  for (const d of orderDetails ?? []) {
    const size = d.size;
    if (!size) continue;
    const qty = d.initialQuantity ?? d.currentQuantity ?? 0;
    const existing = map.get(size);
    if (existing) {
      existing.qty += qty;
      if (d.weightPerBagKg != null) existing.weightPerBagKg = d.weightPerBagKg;
    } else {
      map.set(size, {
        qty,
        weightPerBagKg: d.weightPerBagKg ?? 0,
      });
    }
  }
  return Object.fromEntries(map);
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
