import type { BulkNetProfitUpdate } from '@/types/farmer';
import type { FinanceReportSummary } from './finance-calculations';

/**
 * Builds the net-profit sync payload for a farmer-storage-link from finance report summary.
 * Returns null when there is no report data (no planting groups).
 */
export function buildNetProfitSyncPayload(
  farmerStorageLinkId: string,
  summary: FinanceReportSummary,
  hasReportData: boolean
): BulkNetProfitUpdate | null {
  if (!hasReportData) return null;

  const payload: BulkNetProfitUpdate = {
    farmerStorageLinkId,
    netProfitToCompany: summary.netRevenue,
  };

  if (summary.netAmountPerAcre !== null) {
    payload.netProfitToCompanyPerAcre = summary.netAmountPerAcre;
  }

  return payload;
}
