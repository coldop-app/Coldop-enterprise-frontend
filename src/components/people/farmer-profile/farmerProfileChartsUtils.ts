import type { GradingGatePass } from '@/types/grading-gate-pass';
import {
  GRADING_SIZES,
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';

/** Order for size names (string[] so indexOf/includes accept API string values) */
export const SIZE_ORDER: readonly string[] = [...GRADING_SIZES];

function getBardanaWeightPerBagKg(bagType: string | undefined): number {
  return bagType === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
}

function getNetPotatoWeightKgForOrderDetail(
  detail: NonNullable<GradingGatePass['orderDetails']>[number]
): number {
  // Keep chart math aligned with accounting report math: use initialQuantity and
  // subtract bardana per bag from each size row's weight-per-bag.
  const qty = detail.initialQuantity ?? 0;
  const weightPerBagKg = detail.weightPerBagKg ?? 0;
  const bardanaPerBagKg = getBardanaWeightPerBagKg(detail.bagType);
  return qty * Math.max(0, weightPerBagKg - bardanaPerBagKg);
}

/** Aggregate variety distribution from grading passes using report-aligned logic. */
export function computeVarietyDistribution(
  passes: GradingGatePass[]
): { name: string; value: number }[] {
  const byVariety = new Map<string, number>();
  for (const pass of passes) {
    const variety = pass.variety?.trim() || 'Unknown';
    const actualWeightOfPotato = (pass.orderDetails ?? []).reduce(
      (sum, detail) => sum + getNetPotatoWeightKgForOrderDetail(detail),
      0
    );
    if (actualWeightOfPotato > 0) {
      byVariety.set(
        variety,
        (byVariety.get(variety) ?? 0) + actualWeightOfPotato
      );
    }
  }
  return Array.from(byVariety.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/** Aggregate size distribution per variety from grading passes */
export function computeSizeDistribution(
  passes: GradingGatePass[]
): { variety: string; sizes: { name: string; value: number }[] }[] {
  const byVariety = new Map<string, Map<string, number>>();
  for (const pass of passes) {
    const variety = pass.variety?.trim() || 'Unknown';
    if (!byVariety.has(variety)) {
      byVariety.set(variety, new Map());
    }
    const sizeMap = byVariety.get(variety)!;
    for (const d of pass.orderDetails ?? []) {
      const netPotatoWeightKg = getNetPotatoWeightKgForOrderDetail(d);
      if (netPotatoWeightKg > 0 && d.size) {
        sizeMap.set(d.size, (sizeMap.get(d.size) ?? 0) + netPotatoWeightKg);
      }
    }
  }
  return Array.from(byVariety.entries()).map(([variety, sizeMap]) => {
    const sizes = Array.from(sizeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const ai = SIZE_ORDER.indexOf(a.name);
        const bi = SIZE_ORDER.indexOf(b.name);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
    return { variety, sizes };
  });
}
