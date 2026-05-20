import { roundMax2 } from '@/components/daybook/grading-calculations';
import {
  ACCOUNTING_GRADING_BAG_SIZE_ORDER,
  gradingOrderDetailSizeKey,
  type GradingTableTotals,
} from '@/components/people/reports/helpers/grading-prepare';
import type { DispatchLedgerNikasiGatePass } from '@/types/dispatch-ledger';

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRangeLabel(dates: string[]): string {
  const parsed = dates
    .map((date) => new Date(date))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (parsed.length === 0) return 'N/A';
  if (parsed.length === 1) return formatDisplayDate(parsed[0]);

  return `${formatDisplayDate(parsed[0])} - ${formatDisplayDate(parsed[parsed.length - 1])}`;
}

const CANONICAL_BAG_SIZE_LABEL_SET = new Set<string>([
  ...ACCOUNTING_GRADING_BAG_SIZE_ORDER,
]);

/** Passes with no `bagSize` lines are grouped under this key. */
export const EMPTY_BAG_LINES_KEY = '__EMPTY_BAG_LINES__';

export function varietyDisplayKeyFromBag(variety: string | undefined): string {
  const t = variety?.trim() ?? '';
  return t !== '' ? t : '—';
}

export function totalBagsOnPass(gp: DispatchLedgerNikasiGatePass): number {
  let sum = 0;
  for (const b of gp.bagSize ?? []) {
    sum += Number(b.quantityIssued) || 0;
  }
  return sum;
}

export function bagsForVarietyOnPass(
  gp: DispatchLedgerNikasiGatePass,
  varietyKey: string
): number {
  let sum = 0;
  for (const b of gp.bagSize ?? []) {
    if (varietyDisplayKeyFromBag(b.variety) !== varietyKey) continue;
    sum += Number(b.quantityIssued) || 0;
  }
  return sum;
}

export function sizeQuantitiesForPassAndVariety(
  gp: DispatchLedgerNikasiGatePass,
  varietyKey: string
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of gp.bagSize ?? []) {
    if (varietyDisplayKeyFromBag(b.variety) !== varietyKey) continue;
    const sk = gradingOrderDetailSizeKey(b.size ?? '');
    if (!sk) continue;
    const qty = Number(b.quantityIssued) || 0;
    out[sk] = (out[sk] ?? 0) + qty;
  }
  return out;
}

/** When a pass mixes varieties, split net weight by bag count so totals stay consistent. */
export function allocatedNetKgForVariety(
  gp: DispatchLedgerNikasiGatePass,
  varietyKey: string
): number {
  if (varietyKey === EMPTY_BAG_LINES_KEY) {
    return Number.isFinite(gp.netWeight) ? gp.netWeight : 0;
  }
  const vBags = bagsForVarietyOnPass(gp, varietyKey);
  if (vBags === 0) return 0;
  const nw = Number(gp.netWeight);
  if (!Number.isFinite(nw)) return 0;
  const totalBags = totalBagsOnPass(gp);
  if (totalBags <= 0) return nw;
  return (nw * vBags) / totalBags;
}

export function buildDispatchVarietySizeLabelsOrdered(
  passes: DispatchLedgerNikasiGatePass[],
  varietyKey: string
): string[] {
  if (varietyKey === EMPTY_BAG_LINES_KEY) return [];

  const extras = new Set<string>();
  for (const gp of passes) {
    for (const b of gp.bagSize ?? []) {
      if (varietyDisplayKeyFromBag(b.variety) !== varietyKey) continue;
      const sk = gradingOrderDetailSizeKey(b.size ?? '');
      if (!sk) continue;
      if (!CANONICAL_BAG_SIZE_LABEL_SET.has(sk)) extras.add(sk);
    }
  }
  const extrasSorted = [...extras].sort((a, b) => a.localeCompare(b));
  return [...ACCOUNTING_GRADING_BAG_SIZE_ORDER, ...extrasSorted];
}

export function computeDispatchVarietyTotals(
  passes: DispatchLedgerNikasiGatePass[],
  varietyKey: string,
  sizeLabelsOrdered: readonly string[]
): GradingTableTotals {
  const bySize: Record<string, { bags: number; weightKg: number }> = {};
  for (const label of sizeLabelsOrdered) {
    bySize[label] = { bags: 0, weightKg: 0 };
  }
  for (const gp of passes) {
    const sq = sizeQuantitiesForPassAndVariety(gp, varietyKey);
    for (const [label, qty] of Object.entries(sq)) {
      if (bySize[label] == null) {
        bySize[label] = { bags: 0, weightKg: 0 };
      }
      bySize[label].bags += qty;
    }
  }
  let totalBags = 0;
  for (const label of sizeLabelsOrdered) {
    totalBags += bySize[label]?.bags ?? 0;
  }
  let totalKg = 0;
  for (const gp of passes) {
    totalKg += allocatedNetKgForVariety(gp, varietyKey);
  }
  return {
    bySize,
    totalBags,
    totalKg: roundMax2(totalKg),
  };
}

export function dispatchReportVarietyKeys(
  sortedPasses: DispatchLedgerNikasiGatePass[]
): string[] {
  const set = new Set<string>();
  for (const gp of sortedPasses) {
    if (!gp.bagSize?.length) {
      set.add(EMPTY_BAG_LINES_KEY);
      continue;
    }
    for (const b of gp.bagSize) {
      set.add(varietyDisplayKeyFromBag(b.variety));
    }
  }
  return [...set].sort((a, b) => {
    if (a === EMPTY_BAG_LINES_KEY) return 1;
    if (b === EMPTY_BAG_LINES_KEY) return -1;
    return a.localeCompare(b);
  });
}

export function gatePassesForDispatchVariety(
  sortedPasses: DispatchLedgerNikasiGatePass[],
  varietyKey: string
): DispatchLedgerNikasiGatePass[] {
  if (varietyKey === EMPTY_BAG_LINES_KEY) {
    return sortedPasses.filter((gp) => !gp.bagSize?.length);
  }
  return sortedPasses.filter((gp) =>
    (gp.bagSize ?? []).some(
      (b) => varietyDisplayKeyFromBag(b.variety) === varietyKey
    )
  );
}

export function varietySectionTitle(varietyKey: string): string {
  if (varietyKey === EMPTY_BAG_LINES_KEY) return 'No bag sizes recorded';
  return varietyKey;
}

export function sortGatePassesNewestFirst(
  passes: DispatchLedgerNikasiGatePass[]
): DispatchLedgerNikasiGatePass[] {
  return [...passes].sort((a, b) => {
    const aTime = new Date(a.date).getTime();
    const bTime = new Date(b.date).getTime();
    const aSafe = Number.isFinite(aTime) ? aTime : 0;
    const bSafe = Number.isFinite(bTime) ? bTime : 0;
    if (bSafe !== aSafe) return bSafe - aSafe;
    return (b.gatePassNo ?? 0) - (a.gatePassNo ?? 0);
  });
}
