import type { PreferencesData } from '@/services/store-admin/preferences/useGetPreferences';
import { usePreferencesStore } from '@/stores/store';

/** Fallback when preferences are absent or incomplete (cold storage prefs drive live values). */
export const DEFAULT_BAG_WEIGHTS: Record<string, number> = {
  JUTE: 1.2,
  LENO: 0.15,
};

/** Bag weights keyed by uppercase type (`JUTE`, `LENO`) from cold storage preferences. */
export function getBagWeightsFromPreferences(
  preferences: PreferencesData | null | undefined
): Record<string, number> {
  const cfg = preferences?.custom?.bagConfig;
  if (
    cfg &&
    Number.isFinite(cfg.juteBagWeight) &&
    Number.isFinite(cfg.lenoBagWeight)
  ) {
    return {
      JUTE: cfg.juteBagWeight,
      LENO: cfg.lenoBagWeight,
    };
  }
  return DEFAULT_BAG_WEIGHTS;
}

export function getBagWeightsFromStore(): Record<string, number> {
  return getBagWeightsFromPreferences(
    usePreferencesStore.getState().preferences
  );
}

/** Rounds a number to a maximum of 2 decimal places strictly */
export const roundMax2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/** Formats a number to Indian locale with max 2 decimal places. Drops decimals if whole. */
export const formatNumber = (num: number): string => {
  return roundMax2(num).toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

/** Calculates all incoming gate pass metrics; incoming sacks use jute weight from prefs. */
export const calculateIncomingMetrics = (
  incomingGatePassIds: any[],
  bagWeights: Record<string, number> = getBagWeightsFromStore()
) => {
  const juteWt = bagWeights.JUTE ?? DEFAULT_BAG_WEIGHTS.JUTE;

  let totalBags = 0;
  let totalGrossKg = 0;
  let totalTareKg = 0;

  const rows = incomingGatePassIds.map((igp) => {
    const bags = igp.bagsReceived ?? 0;
    const gross = igp.weightSlip?.grossWeightKg ?? 0;
    const tare = igp.weightSlip?.tareWeightKg ?? 0;
    const baseNet = gross - tare;

    const bardanaKg = bags * juteWt;
    const netProductKg = baseNet - bardanaKg;

    totalBags += bags;
    totalGrossKg += gross;
    totalTareKg += tare;

    return {
      ...igp,
      baseNetKg: baseNet,
      bardanaKg,
      netProductKg,
    };
  });

  const totalBaseNetKg = totalGrossKg - totalTareKg;
  const totalBardanaKg = totalBags * juteWt;
  const totalNetProductKg = totalBaseNetKg - totalBardanaKg;

  return {
    rows,
    totals: {
      totalBags,
      totalGrossKg,
      totalTareKg,
      totalBaseNetKg,
      totalBardanaKg,
      totalNetProductKg,
    },
  };
};

/** Calculates grading output metrics and wastage based on the incoming net product */
export const calculateGradingMetrics = (
  orderDetails: any[],
  incomingNetProductKg: number,
  bagWeights: Record<string, number> = getBagWeightsFromStore()
) => {
  let totalInitial = 0;
  let totalGrossKg = 0;
  let totalDeductionKg = 0;
  let totalNetKg = 0;

  const rows = orderDetails.map((od) => {
    const initialQty = od.initialQuantity ?? 0;
    const wtPerBag = od.weightPerBagKg ?? 0;
    const bagType = (od.bagType ?? '').toUpperCase();

    const bagWt = bagWeights[bagType] ?? 0;
    const grossKg = initialQty * wtPerBag;
    const deductionKg = initialQty * bagWt;
    const netKg = grossKg - deductionKg;

    totalInitial += initialQty;
    totalGrossKg += grossKg;
    totalDeductionKg += deductionKg;
    totalNetKg += netKg;

    return {
      ...od,
      bagWt,
      grossKg,
      deductionKg,
      netKg,
    };
  });

  const wastageKg = Math.max(0, incomingNetProductKg - totalNetKg);

  const totalGradedPct =
    incomingNetProductKg > 0 ? (totalNetKg / incomingNetProductKg) * 100 : 0;

  const wastagePct =
    incomingNetProductKg > 0 ? (wastageKg / incomingNetProductKg) * 100 : 0;

  const rowsWithPct = rows.map((r) => ({
    ...r,
    weightPct: totalNetKg > 0 ? (r.netKg / totalNetKg) * 100 : 0,
  }));

  return {
    rows: rowsWithPct,
    totals: {
      totalInitial,
      totalGrossKg,
      totalDeductionKg,
      totalNetKg,
      wastageKg,
      totalGradedPct,
      wastagePct,
    },
  };
};
