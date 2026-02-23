import type { IncomingGatePassWithLink } from './incoming-gate-pass';
import type {
  GradingGatePass,
  GradingGatePassGradedBy,
  GradingGatePassIncomingGatePass,
} from './grading-gate-pass';

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
export type IncomingGatePassReportDataGrouped =
  IncomingGatePassReportGroupedItem[];

/** Data shape when groupByFarmer=false */
export type IncomingGatePassReportDataFlat = IncomingGatePassWithLink[];

/** Incoming gate pass with grading status (Graded if referenced by a grading gate pass) */
export type IncomingGatePassWithLinkWithStatus = IncomingGatePassWithLink & {
  gradingStatus: 'Graded' | 'Ungraded';
};

/** Grouped report item with grading status on each gate pass */
export interface IncomingGatePassReportGroupedItemWithStatus {
  farmer: IncomingGatePassReportFarmer;
  gatePasses: IncomingGatePassWithLinkWithStatus[];
}

export type IncomingGatePassReportDataGroupedWithStatus =
  IncomingGatePassReportGroupedItemWithStatus[];
export type IncomingGatePassReportDataFlatWithStatus =
  IncomingGatePassWithLinkWithStatus[];

/** API response for GET /analytics/incoming-gate-pass-report */
export interface GetIncomingGatePassReportApiResponse {
  success: boolean;
  data: IncomingGatePassReportDataGrouped | IncomingGatePassReportDataFlat;
  message?: string;
}

// --- Grading gate pass report (GET /analytics/grading-gate-pass-report) ---

/** Farmer as returned in GET /analytics/grading-gate-pass-report when groupByFarmer=true */
export interface GradingGatePassReportFarmer {
  _id: string;
  accountNumber: number;
  name: string;
  mobileNumber: string;
  address: string;
}

/** Incoming gate pass summary as in grading report (leaner than full GradingGatePass.incomingGatePassId) */
export interface GradingGatePassReportIncomingSummary {
  _id: string;
  gatePassNo: number;
  manualGatePassNumber?: number;
  truckNumber: string;
  bagsReceived: number;
  grossWeightKg?: number;
  netWeightKg?: number;
}

/** Farmer storage link as returned on each gate pass in the report */
export interface GradingGatePassReportFarmerStorageLink {
  _id: string;
  accountNumber: number;
  farmerId: {
    _id: string;
    name: string;
    mobileNumber: string;
    address: string;
  };
}

/** Single grading gate pass as in the report response (uses createdBy, optional farmerStorageLink) */
export type GradingGatePassReportItem = Omit<
  GradingGatePass,
  'gradedById' | 'incomingGatePassId'
> & {
  createdBy: GradingGatePassGradedBy;
  manualGatePassNumber?: number;
  /** Report API may return lean summary or full nested incoming */
  incomingGatePassId:
    | GradingGatePassReportIncomingSummary
    | GradingGatePassIncomingGatePass;
  farmerStorageLink?: GradingGatePassReportFarmerStorageLink;
};

/** Single group when GET /analytics/grading-gate-pass-report is called with groupByFarmer=true */
export interface GradingGatePassReportGroupedItem {
  farmer: GradingGatePassReportFarmer;
  gatePasses: GradingGatePassReportItem[];
}

/** Data shape when groupByFarmer=true */
export type GradingGatePassReportDataGrouped =
  GradingGatePassReportGroupedItem[];

/** Data shape when groupByFarmer=false */
export type GradingGatePassReportDataFlat = GradingGatePassReportItem[];

/** API response for GET /analytics/grading-gate-pass-report */
export interface GetGradingGatePassReportApiResponse {
  success: boolean;
  data: GradingGatePassReportDataGrouped | GradingGatePassReportDataFlat;
  message?: string;
}
