import { roundMax2 } from '@/components/daybook/grading-calculations';
import type { BulkNetProfitUpdate } from '@/types/farmer';
import type { FarmerStorageLinkProfit } from '@/types/incoming-gate-pass';
import {
  aggregateVarietyNetAcres,
  type FinanceGradingVarietyGroup,
  type FinancePlantingVarietyGroup,
} from './finance-calculations';

/**
 * Builds per-variety profit from finance report planting and grading groups.
 * Uses varietyLabel as the API key (matches gate-pass / contract farming variety names).
 */
export function buildVarietyProfitMap(
  plantingGroups: FinancePlantingVarietyGroup[],
  gradingGroups: FinanceGradingVarietyGroup[]
): FarmerStorageLinkProfit {
  const gradingByKey = new Map(
    gradingGroups.map((group) => [group.varietyKey, group])
  );
  const profit: FarmerStorageLinkProfit = {};

  for (const planting of plantingGroups) {
    const grading = gradingByKey.get(planting.varietyKey);
    const saleAmount = grading?.totals.saleAmount ?? 0;
    const netProfitToCompany = roundMax2(saleAmount - planting.netAmount);
    const acres = aggregateVarietyNetAcres(planting.seedRows);

    const entry: FarmerStorageLinkProfit[string] = {
      netProfitToCompany,
    };

    if (acres > 0) {
      entry.netProfitToCompanyPerAcre = roundMax2(netProfitToCompany / acres);
    }

    if (
      Number.isFinite(entry.netProfitToCompany) ||
      Number.isFinite(entry.netProfitToCompanyPerAcre)
    ) {
      profit[planting.varietyLabel] = entry;
    }
  }

  return profit;
}

/**
 * Builds the net-profit sync payload for a farmer-storage-link from finance report groups.
 * Returns null when there is no report data or no computable variety profit.
 */
export function buildNetProfitSyncPayload(
  farmerStorageLinkId: string,
  plantingGroups: FinancePlantingVarietyGroup[],
  gradingGroups: FinanceGradingVarietyGroup[],
  hasReportData: boolean
): BulkNetProfitUpdate | null {
  if (!hasReportData) return null;

  const profit = buildVarietyProfitMap(plantingGroups, gradingGroups);
  if (Object.keys(profit).length === 0) return null;

  return {
    farmerStorageLinkId,
    profit,
  };
}
