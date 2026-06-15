import type { BulkNetProfitUpdate } from '@/types/farmer';
import type { FarmerStorageLinkProfit } from '@/types/incoming-gate-pass';
import {
  computeFinanceVarietySummaries,
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
  const profit: FarmerStorageLinkProfit = {};

  for (const summary of computeFinanceVarietySummaries(
    plantingGroups,
    gradingGroups
  )) {
    const entry: FarmerStorageLinkProfit[string] = {
      netProfitToCompany: summary.netRevenue,
    };

    if (summary.netAmountPerAcre != null) {
      entry.netProfitToCompanyPerAcre = summary.netAmountPerAcre;
    }

    if (
      Number.isFinite(entry.netProfitToCompany) ||
      Number.isFinite(entry.netProfitToCompanyPerAcre)
    ) {
      profit[summary.varietyLabel] = entry;
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
