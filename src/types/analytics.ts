import type { IncomingGatePassWithLink } from './incoming-gate-pass';

/** Grading bags summary (initial vs current quantity) */
export interface AnalyticsOverviewGradingBags {
  initialQuantity: number;
  currentQuantity: number;
}

/** Overview stats returned by GET /analytics/overview */
export interface AnalyticsOverviewData {
  totalIncomingBags: number;
  totalIncomingWeight: number;
  totalUngradedBags: number;
  totalUngradedWeight: number;
  totalGradingBags: AnalyticsOverviewGradingBags;
  totalGradingWeight: number;
  totalBagsStored: number;
  totalBagsDispatched: number;
  totalOutgoingBags: number;
}

/** API response for GET /analytics/overview */
export interface GetAnalyticsOverviewApiResponse {
  success: boolean;
  data: AnalyticsOverviewData;
  message?: string;
}

/** Farmer as returned in GET /analytics/incoming-gate-pass-report when groupByFarmer=true */
export interface IncomingGatePassReportFarmer {
  _id: string;
  accountNumber: number;
  name: string;
  mobileNumber: string;
  address: string;
}

/** Single group when GET /analytics/incoming-gate-pass-report is called with groupByFarmer=true */
export interface IncomingGatePassReportGroupedItem {
  farmer: IncomingGatePassReportFarmer;
  gatePasses: IncomingGatePassWithLink[];
}

/** Data shape when groupByFarmer=true */
export type IncomingGatePassReportDataGrouped = IncomingGatePassReportGroupedItem[];

/** Data shape when groupByFarmer=false */
export type IncomingGatePassReportDataFlat = IncomingGatePassWithLink[];

/** API response for GET /analytics/incoming-gate-pass-report */
export interface GetIncomingGatePassReportApiResponse {
  success: boolean;
  data: IncomingGatePassReportDataGrouped | IncomingGatePassReportDataFlat;
  message?: string;
}
