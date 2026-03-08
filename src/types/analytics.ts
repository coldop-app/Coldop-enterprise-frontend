import type { IncomingGatePassWithLink } from './incoming-gate-pass';
import type {
  GradingGatePass,
  GradingGatePassGradedBy,
  GradingGatePassIncomingGatePass,
} from './grading-gate-pass';
import type { StorageGatePass } from './storage-gate-pass';
import type { NikasiGatePass } from './nikasi-gate-pass';

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

/** Report type for analytics/reports route (from overview cards) */
export type AnalyticsReportType =
  | 'incoming'
  | 'ungraded'
  | 'grading'
  | 'stored'
  | 'dispatch'
  | 'outgoing';

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

/** Data shape when groupByFarmer=true, groupByVariety=false */
export type IncomingGatePassReportDataGrouped =
  IncomingGatePassReportGroupedItem[];

/** Data shape when groupByFarmer=false, groupByVariety=false */
export type IncomingGatePassReportDataFlat = IncomingGatePassWithLink[];

/** Single group when groupByVariety=true, groupByFarmer=false */
export interface IncomingGatePassReportVarietyGroupItem {
  variety: string;
  gatePasses: IncomingGatePassWithLink[];
}

/** Data shape when groupByVariety=true, groupByFarmer=false */
export type IncomingGatePassReportDataGroupedByVariety =
  IncomingGatePassReportVarietyGroupItem[];

/** Single group when groupByVariety=true, groupByFarmer=true */
export interface IncomingGatePassReportVarietyAndFarmerItem {
  variety: string;
  farmers: IncomingGatePassReportGroupedItem[];
}

/** Data shape when groupByVariety=true, groupByFarmer=true */
export type IncomingGatePassReportDataGroupedByVarietyAndFarmer =
  IncomingGatePassReportVarietyAndFarmerItem[];

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

/** Variety-only group with grading status */
export interface IncomingGatePassReportVarietyGroupItemWithStatus {
  variety: string;
  gatePasses: IncomingGatePassWithLinkWithStatus[];
}

export type IncomingGatePassReportDataGroupedByVarietyWithStatus =
  IncomingGatePassReportVarietyGroupItemWithStatus[];

/** Variety + farmer group with grading status */
export interface IncomingGatePassReportVarietyAndFarmerItemWithStatus {
  variety: string;
  farmers: IncomingGatePassReportGroupedItemWithStatus[];
}

export type IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus =
  IncomingGatePassReportVarietyAndFarmerItemWithStatus[];

/** Union of all possible incoming gate pass report data shapes */
export type IncomingGatePassReportData =
  | IncomingGatePassReportDataFlat
  | IncomingGatePassReportDataGrouped
  | IncomingGatePassReportDataGroupedByVariety
  | IncomingGatePassReportDataGroupedByVarietyAndFarmer;

/** Union of all possible incoming gate pass report data shapes with grading status */
export type IncomingGatePassReportDataWithStatus =
  | IncomingGatePassReportDataFlatWithStatus
  | IncomingGatePassReportDataGroupedWithStatus
  | IncomingGatePassReportDataGroupedByVarietyWithStatus
  | IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus;

/** API response for GET /analytics/incoming-gate-pass-report */
export interface GetIncomingGatePassReportApiResponse {
  success: boolean;
  data: IncomingGatePassReportData;
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
  tareWeightKg?: number;
  netWeightKg?: number;
  /** Incoming gate pass date (ISO string) */
  date?: string;
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

/** Data shape when groupByFarmer=true, groupByVariety=false */
export type GradingGatePassReportDataGrouped =
  GradingGatePassReportGroupedItem[];

/** Data shape when groupByFarmer=false, groupByVariety=false */
export type GradingGatePassReportDataFlat = GradingGatePassReportItem[];

/** Single group when groupByVariety=true, groupByFarmer=false */
export interface GradingGatePassReportVarietyGroupItem {
  variety: string;
  gatePasses: GradingGatePassReportItem[];
}

/** Data shape when groupByVariety=true, groupByFarmer=false */
export type GradingGatePassReportDataGroupedByVariety =
  GradingGatePassReportVarietyGroupItem[];

/** Single group when groupByVariety=true, groupByFarmer=true */
export interface GradingGatePassReportVarietyAndFarmerItem {
  variety: string;
  farmers: GradingGatePassReportGroupedItem[];
}

/** Data shape when groupByVariety=true, groupByFarmer=true */
export type GradingGatePassReportDataGroupedByVarietyAndFarmer =
  GradingGatePassReportVarietyAndFarmerItem[];

/** Union of all possible grading gate pass report data shapes */
export type GradingGatePassReportData =
  | GradingGatePassReportDataFlat
  | GradingGatePassReportDataGrouped
  | GradingGatePassReportDataGroupedByVariety
  | GradingGatePassReportDataGroupedByVarietyAndFarmer;

/** API response for GET /analytics/grading-gate-pass-report */
export interface GetGradingGatePassReportApiResponse {
  success: boolean;
  data: GradingGatePassReportData;
  message?: string;
}

// --- Storage gate pass report (GET /analytics/storage-gate-pass-report) ---

/** Farmer as returned in GET /analytics/storage-gate-pass-report when groupByFarmer=true */
export interface StorageGatePassReportFarmer {
  _id: string;
  accountNumber: number;
  name: string;
  mobileNumber: string;
  address: string;
}

/** Farmer storage link as returned on each storage gate pass in the report */
export interface StorageGatePassReportFarmerStorageLink {
  _id: string;
  accountNumber: number;
  farmerId: {
    _id: string;
    name: string;
    mobileNumber: string;
    address: string;
  };
}

/** Single storage gate pass as in the report (farmerStorageLinkId populated) */
export type StorageGatePassReportItem = Omit<
  StorageGatePass,
  'farmerStorageLinkId'
> & {
  farmerStorageLinkId: StorageGatePassReportFarmerStorageLink;
};

/** Single group when GET /analytics/storage-gate-pass-report is called with groupByFarmer=true */
export interface StorageGatePassReportGroupedItem {
  farmer: StorageGatePassReportFarmer;
  gatePasses: StorageGatePassReportItem[];
}

/** Data shape when groupByFarmer=true, groupByVariety=false */
export type StorageGatePassReportDataGrouped =
  StorageGatePassReportGroupedItem[];

/** Data shape when groupByFarmer=false, groupByVariety=false */
export type StorageGatePassReportDataFlat = StorageGatePassReportItem[];

/** Single group when groupByVariety=true, groupByFarmer=false */
export interface StorageGatePassReportVarietyGroupItem {
  variety: string;
  gatePasses: StorageGatePassReportItem[];
}

/** Data shape when groupByVariety=true, groupByFarmer=false */
export type StorageGatePassReportDataGroupedByVariety =
  StorageGatePassReportVarietyGroupItem[];

/** Single group when groupByVariety=true, groupByFarmer=true */
export interface StorageGatePassReportVarietyAndFarmerItem {
  variety: string;
  farmers: StorageGatePassReportGroupedItem[];
}

/** Data shape when groupByVariety=true, groupByFarmer=true */
export type StorageGatePassReportDataGroupedByVarietyAndFarmer =
  StorageGatePassReportVarietyAndFarmerItem[];

/** Union of all possible storage gate pass report data shapes */
export type StorageGatePassReportData =
  | StorageGatePassReportDataFlat
  | StorageGatePassReportDataGrouped
  | StorageGatePassReportDataGroupedByVariety
  | StorageGatePassReportDataGroupedByVarietyAndFarmer;

/** API response for GET /analytics/storage-gate-pass-report */
export interface GetStorageGatePassReportApiResponse {
  success: boolean;
  data: StorageGatePassReportData;
  message?: string;
}

// --- Nikasi (dispatch) gate pass report (GET /analytics/nikasi-gate-pass-report) ---

/** Farmer as returned in GET /analytics/nikasi-gate-pass-report when groupByFarmer=true */
export interface NikasiGatePassReportFarmer {
  _id: string;
  accountNumber: number;
  name: string;
  mobileNumber: string;
  address: string;
}

/** Farmer storage link as returned on each nikasi gate pass in the report */
export interface NikasiGatePassReportFarmerStorageLink {
  _id: string;
  accountNumber: number;
  farmerId: {
    _id: string;
    name: string;
    mobileNumber: string;
    address: string;
  };
}

/** Single nikasi gate pass as in the report (farmerStorageLinkId populated) */
export type NikasiGatePassReportItem = Omit<
  NikasiGatePass,
  'farmerStorageLinkId'
> & {
  farmerStorageLinkId: NikasiGatePassReportFarmerStorageLink;
};

/** Single group when GET /analytics/nikasi-gate-pass-report is called with groupByFarmer=true */
export interface NikasiGatePassReportGroupedItem {
  farmer: NikasiGatePassReportFarmer;
  gatePasses: NikasiGatePassReportItem[];
}

/** Data shape when groupByFarmer=true, groupByVariety=false */
export type NikasiGatePassReportDataGrouped = NikasiGatePassReportGroupedItem[];

/** Data shape when groupByFarmer=false, groupByVariety=false */
export type NikasiGatePassReportDataFlat = NikasiGatePassReportItem[];

/** Single group when groupByVariety=true, groupByFarmer=false */
export interface NikasiGatePassReportVarietyGroupItem {
  variety: string;
  gatePasses: NikasiGatePassReportItem[];
}

/** Data shape when groupByVariety=true, groupByFarmer=false */
export type NikasiGatePassReportDataGroupedByVariety =
  NikasiGatePassReportVarietyGroupItem[];

/** Single group when groupByVariety=true, groupByFarmer=true */
export interface NikasiGatePassReportVarietyAndFarmerItem {
  variety: string;
  farmers: NikasiGatePassReportGroupedItem[];
}

/** Data shape when groupByVariety=true, groupByFarmer=true */
export type NikasiGatePassReportDataGroupedByVarietyAndFarmer =
  NikasiGatePassReportVarietyAndFarmerItem[];

/** Union of all possible nikasi gate pass report data shapes */
export type NikasiGatePassReportData =
  | NikasiGatePassReportDataFlat
  | NikasiGatePassReportDataGrouped
  | NikasiGatePassReportDataGroupedByVariety
  | NikasiGatePassReportDataGroupedByVarietyAndFarmer;

/** API response for GET /analytics/nikasi-gate-pass-report */
export interface GetNikasiGatePassReportApiResponse {
  success: boolean;
  data: NikasiGatePassReportData;
  message?: string;
}

// --- Top farmers by bags (GET /analytics/top-farmers-by-bags) ---

/** Single farmer entry in GET /analytics/top-farmers-by-bags chartData */
export interface TopFarmersChartItem {
  name: string;
  bags: number;
  farmerId: string;
  accountNumber: number;
}

/** Data shape for GET /analytics/top-farmers-by-bags */
export interface TopFarmersByBagsData {
  chartData: TopFarmersChartItem[];
}

/** API response for GET /analytics/top-farmers-by-bags */
export interface GetTopFarmersByBagsApiResponse {
  success: boolean;
  data: TopFarmersByBagsData;
  message?: string;
}

// --- Variety distribution (GET /analytics/variety-distribution) ---

/** Single variety entry in GET /analytics/variety-distribution chartData */
export interface VarietyDistributionChartItem {
  name: string;
  value: number;
}

/** Data shape for GET /analytics/variety-distribution */
export interface VarietyDistributionData {
  chartData: VarietyDistributionChartItem[];
}

/** API response for GET /analytics/variety-distribution */
export interface GetVarietyDistributionApiResponse {
  success: boolean;
  data: VarietyDistributionData;
  message?: string;
}

// --- Daily/monthly trend (GET /analytics/daily-monthly-trend) ---

/** Single daily entry in GET /analytics/daily-monthly-trend daily.chartData */
export interface DailyTrendChartItem {
  date: string;
  bags: number;
}

/** Single monthly entry in GET /analytics/daily-monthly-trend monthly.chartData */
export interface MonthlyTrendChartItem {
  month: string;
  monthLabel: string;
  bags: number;
}

/** Data shape for GET /analytics/daily-monthly-trend */
export interface DailyMonthlyTrendData {
  daily: { chartData: DailyTrendChartItem[] };
  monthly: { chartData: MonthlyTrendChartItem[] };
}

/** API response for GET /analytics/daily-monthly-trend */
export interface GetDailyMonthlyTrendApiResponse {
  success: boolean;
  data: DailyMonthlyTrendData;
  message?: string;
}
