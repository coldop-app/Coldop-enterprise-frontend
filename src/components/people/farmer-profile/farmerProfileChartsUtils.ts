import type { GradingGatePass } from '@/types/grading-gate-pass';
import {
  GRADING_SIZES,
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';

/** Order for size names (string[] so indexOf/includes accept API string values) */
export const SIZE_ORDER: readonly string[] = [...GRADING_SIZES];

/** Aggregate variety distribution from grading passes (adjusted net kg per variety) */
export function computeVarietyDistribution(
  passes: GradingGatePass[]
): { name: string; value: number }[] {
  const byVariety = new Map<string, number>();
  for (const pass of passes) {
    const variety = pass.variety?.trim() || 'Unknown';
    const totalBags = (pass.orderDetails ?? []).reduce(
      (sum, d) => sum + (d.currentQuantity ?? d.initialQuantity ?? 0),
      0
    );
    const totalNetWeightKg = (pass.incomingGatePassIds ?? []).reduce(
      (sum, incoming) => {
        const grossWeightKg = incoming.weightSlip?.grossWeightKg ?? 0;
        const tareWeightKg = incoming.weightSlip?.tareWeightKg ?? 0;
        return sum + (grossWeightKg - tareWeightKg);
      },
      0
    );
    const bardanaWeightKg = totalBags * JUTE_BAG_WEIGHT;
    const adjustedNetWeightKg = Math.max(totalNetWeightKg - bardanaWeightKg, 0);
    if (adjustedNetWeightKg > 0) {
      byVariety.set(
        variety,
        (byVariety.get(variety) ?? 0) + adjustedNetWeightKg
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
      const bagCount = d.currentQuantity ?? d.initialQuantity ?? 0;
      const bagTypeWeight =
        d.bagType === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
      const adjustedWeightPerBagKg = (d.weightPerBagKg ?? 0) - bagTypeWeight;
      const totalAdjustedWeightKg = bagCount * adjustedWeightPerBagKg;
      if (totalAdjustedWeightKg > 0 && d.size) {
        sizeMap.set(d.size, (sizeMap.get(d.size) ?? 0) + totalAdjustedWeightKg);
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
