import type {
  IncomingGatePassWithLink,
  IncomingGatePassByFarmerStorageLinkItem,
} from './incoming-gate-pass';
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
  totalSeedBagsGiven: number;
  totalIncomingBags: number;
  totalIncomingWeight: number;
  totalUngradedBags: number;
  totalUngradedWeight: number;
  totalGradingBags: AnalyticsOverviewGradingBags;
  totalGradingWeight: number;
  totalBagsStored: number;
  /** When set by GET /analytics/overview, used for shed stock; otherwise clients fall back to totalBagsStored */
  totalBagsStoredInitial?: number;
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
  | 'seed'
  | 'incoming'
  | 'ungraded'
  | 'grading'
  | 'stored'
  | 'shed-stock'
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

// --- Storage summary (GET /analytics/storage-summary) ---

/** Bag type quantity in storage summary */
export interface StorageSummaryByBagType {
  bagType: string;
  initialQuantity: number;
  currentQuantity: number;
  quantityRemoved: number;
}

/** Size entry within a variety in storage summary */
export interface StorageSummarySizeItem {
  size: string;
  initialQuantity: number;
  currentQuantity: number;
  quantityRemoved: number;
  byBagType: StorageSummaryByBagType[];
}

/** Variety entry in storage summary (variety → sizes → byBagType) */
export interface StorageSummaryVarietyItem {
  variety: string;
  initialQuantity: number;
  currentQuantity: number;
  quantityRemoved: number;
  sizes: StorageSummarySizeItem[];
}

/** Data shape for GET /analytics/storage-summary */
export type StorageSummaryData = StorageSummaryVarietyItem[];

/** API response for GET /analytics/storage-summary */
export interface GetStorageSummaryApiResponse {
  success: boolean;
  data: StorageSummaryData;
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

// --- Nikasi summary by variety/size (GET /analytics/nikasi-summary) ---

/** One size bucket in nikasi summary */
export interface NikasiSummarySizeItem {
  size: string;
  quantityIssued: number;
}

/** One variety row in GET /analytics/nikasi-summary */
export interface NikasiSummaryVarietyItem {
  variety: string;
  quantityIssued: number;
  sizes: NikasiSummarySizeItem[];
}

/** Data shape for GET /analytics/nikasi-summary */
export type NikasiGatePassSummaryData = NikasiSummaryVarietyItem[];

/** API response for GET /analytics/nikasi-summary */
export interface GetNikasiGatePassSummaryApiResponse {
  success: boolean;
  data: NikasiGatePassSummaryData;
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

// --- Size distribution (GET /analytics/size-distribution) ---

/** Single size entry within a variety in GET /analytics/size-distribution */
export interface SizeDistributionSizeItem {
  name: string;
  value: number;
}

/** Single variety entry in GET /analytics/size-distribution chartData */
export interface SizeDistributionVarietyItem {
  variety: string;
  sizes: SizeDistributionSizeItem[];
}

/** Data shape for GET /analytics/size-distribution */
export interface SizeDistributionData {
  chartData: SizeDistributionVarietyItem[];
}

/** API response for GET /analytics/size-distribution */
export interface GetSizeDistributionApiResponse {
  success: boolean;
  data: SizeDistributionData;
  message?: string;
}

// --- Area-wise size distribution (GET /analytics/area-wise-size-distribution) ---

/** Single size entry within a bag type in GET /analytics/area-wise-size-distribution */
export interface AreaWiseBagTypeSizeItem {
  name: string;
  value: number;
  netWeightKg: number;
  percentageOfAreaNetWeight: number;
}

/** Single bag type entry within a variety */
export interface AreaWiseBagTypeItem {
  bagType: string;
  sizes: AreaWiseBagTypeSizeItem[];
}

/** Single variety entry within an area */
export interface AreaWiseVarietyItem {
  variety: string;
  yieldNetWeightKg: number;
  yieldPercentageOfArea: number;
  bagTypes: AreaWiseBagTypeItem[];
}

/** Single area entry in GET /analytics/area-wise-size-distribution chartData */
export interface AreaWiseChartAreaItem {
  area: string;
  totalNetWeightKg: number;
  varieties: AreaWiseVarietyItem[];
}

/** Data shape for GET /analytics/area-wise-size-distribution */
export interface AreaWiseSizeDistributionData {
  chartData: AreaWiseChartAreaItem[];
}

/** API response for GET /analytics/area-wise-size-distribution */
export interface GetAreaWiseSizeDistributionApiResponse {
  success: boolean;
  data: AreaWiseSizeDistributionData;
  message?: string;
}

// --- Daily/monthly trend (GET /analytics/daily-monthly-trend) ---

/** Single daily data point (date + bags) */
export interface DailyTrendChartItem {
  date: string;
  bags: number;
}

/** Single monthly data point (month + bags) */
export interface MonthlyTrendChartItem {
  month: string;
  monthLabel: string;
  bags: number;
}

/** Daily series: one location with its daily dataPoints */
export interface DailyTrendChartSeries {
  location: string;
  dataPoints: DailyTrendChartItem[];
}

/** Monthly series: one location with its monthly dataPoints */
export interface MonthlyTrendChartSeries {
  location: string;
  dataPoints: MonthlyTrendChartItem[];
}

/** Data shape for GET /analytics/daily-monthly-trend (grouped by location) */
export interface DailyMonthlyTrendData {
  daily: { chartData: DailyTrendChartSeries[] };
  monthly: { chartData: MonthlyTrendChartSeries[] };
}

/** API response for GET /analytics/daily-monthly-trend */
export interface GetDailyMonthlyTrendApiResponse {
  success: boolean;
  data: DailyMonthlyTrendData;
  message?: string;
}

// --- Incoming daily breakdown (GET /incoming-gate-pass/incoming-daily-breakdown) ---

/** Per-location totals for a single calendar day */
export interface IncomingDailyBreakdownLocationTotals {
  gatePassCount: number;
  bagsReceived: number;
}

/** One shed/location group with its gate passes for that day */
export interface IncomingDailyBreakdownLocationGroup {
  location: string;
  totals: IncomingDailyBreakdownLocationTotals;
  gatePasses: IncomingGatePassByFarmerStorageLinkItem[];
}

/** Data shape for GET /incoming-gate-pass/incoming-daily-breakdown?date=YYYY-MM-DD */
export interface IncomingDailyBreakdownData {
  date: string;
  groups: IncomingDailyBreakdownLocationGroup[];
}

/** API response for GET /incoming-gate-pass/incoming-daily-breakdown */
export interface GetIncomingDailyBreakdownApiResponse {
  success: boolean;
  data: IncomingDailyBreakdownData;
  message?: string;
}

// --- Grading daily breakdown (GET /grading-gate-pass/grading-daily-breakdown) ---

/** Per-grader totals for a single calendar day */
export interface GradingDailyBreakdownGraderTotals {
  gatePassCount: number;
  totalInitialQuantity: number;
  totalCurrentQuantity: number;
}

/** One grader group with its grading gate passes for that day */
export interface GradingDailyBreakdownGraderGroup {
  grader: string;
  totals: GradingDailyBreakdownGraderTotals;
  gradingGatePasses: GradingGatePass[];
}

/** Data shape for GET /grading-gate-pass/grading-daily-breakdown?date=YYYY-MM-DD */
export interface GradingDailyBreakdownData {
  date: string;
  groups: GradingDailyBreakdownGraderGroup[];
}

/** API response for GET /grading-gate-pass/grading-daily-breakdown */
export interface GetGradingDailyBreakdownApiResponse {
  success: boolean;
  data: GradingDailyBreakdownData;
  message?: string;
}

// --- Grading daily/monthly trend (GET /analytics/grading-daily-monthly-trend) ---

/** Daily series for grading trend: one grader with its daily dataPoints */
export interface GradingDailyTrendChartSeries {
  grader: string;
  dataPoints: DailyTrendChartItem[];
}

/** Monthly series for grading trend: one grader with its monthly dataPoints */
export interface GradingMonthlyTrendChartSeries {
  grader: string;
  dataPoints: MonthlyTrendChartItem[];
}

/** Data shape for GET /analytics/grading-daily-monthly-trend (grouped by grader) */
export interface GradingTrendData {
  daily: { chartData: GradingDailyTrendChartSeries[] };
  monthly: { chartData: GradingMonthlyTrendChartSeries[] };
}

/** API response for GET /analytics/grading-daily-monthly-trend */
export interface GetGradingTrendApiResponse {
  success: boolean;
  data: GradingTrendData;
  message?: string;
}

// --- Storage daily/monthly trend (GET /analytics/storage-daily-monthly-trend) ---

/** Daily series for storage trend: one variety with its daily dataPoints */
export interface StorageDailyTrendChartSeries {
  variety: string;
  dataPoints: DailyTrendChartItem[];
}

/** Monthly series for storage trend: one variety with its monthly dataPoints */
export interface StorageMonthlyTrendChartSeries {
  variety: string;
  dataPoints: MonthlyTrendChartItem[];
}

/** Data shape for GET /analytics/storage-daily-monthly-trend (grouped by variety) */
export interface StorageTrendData {
  daily: { chartData: StorageDailyTrendChartSeries[] };
  monthly: { chartData: StorageMonthlyTrendChartSeries[] };
}

/** API response for GET /analytics/storage-daily-monthly-trend */
export interface GetStorageTrendApiResponse {
  success: boolean;
  data: StorageTrendData;
  message?: string;
}

// --- Farmers stock by filters (GET /analytics/farmers-stock-by-filters) ---

/** Farmer info in farmers-stock-by-filters response */
export interface AreaBreakdownFarmer {
  id: string;
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber: number;
}

/** Size + stock in a variety */
export interface AreaBreakdownSizeStock {
  size: string;
  stock: number;
  /** When set by GET /analytics/farmers-stock-by-filters, total net kg for this line (bardana excluded) */
  weightExcludingBardanaKg?: number;
}

/** Variety with sizes in a farmer entry */
export interface AreaBreakdownVarietyItem {
  variety: string;
  sizes: AreaBreakdownSizeStock[];
}

/** Single farmer entry in farmers-stock-by-filters */
export interface AreaBreakdownFarmerEntry {
  farmer: AreaBreakdownFarmer;
  varieties: AreaBreakdownVarietyItem[];
}

/** Data shape for GET /analytics/farmers-stock-by-filters */
export interface FarmersStockByFiltersData {
  farmers: AreaBreakdownFarmerEntry[];
}

/** API response for GET /analytics/farmers-stock-by-filters */
export interface GetFarmersStockByFiltersApiResponse {
  success: boolean;
  data: FarmersStockByFiltersData;
  message?: string;
}

// --- Shed stock report (GET /analytics/shed-stock-report) ---

/** Size line in grading / storage / dispatch sections */
export interface ShedStockReportSourceSize {
  size: string;
  bags: number;
}

/** Variety row in grading / storage / dispatch sections */
export interface ShedStockReportSourceVariety {
  variety: string;
  totalBags: number;
  sizes: ShedStockReportSourceSize[];
}

/** Per-size shed stock breakdown */
export interface ShedStockReportShedSize {
  size: string;
  gradingInitial: number;
  stored: number;
  dispatched: number;
  shedStock: number;
}

/** Per-variety shed stock row */
export interface ShedStockReportShedVariety {
  variety: string;
  gradingInitial: number;
  stored: number;
  dispatched: number;
  shedStock: number;
  sizes: ShedStockReportShedSize[];
}

/** Grand totals for shed stock section */
export interface ShedStockReportShedTotals {
  gradingInitial: number;
  stored: number;
  dispatched: number;
  shedStock: number;
}

/** Nested shed stock summary (varieties + totals) */
export interface ShedStockReportShedSection {
  varieties: ShedStockReportShedVariety[];
  totals: ShedStockReportShedTotals;
}

/** Data shape for GET /analytics/shed-stock-report */
export interface ShedStockReportData {
  grading: ShedStockReportSourceVariety[];
  storage: ShedStockReportSourceVariety[];
  dispatch: ShedStockReportSourceVariety[];
  shedStock: ShedStockReportShedSection;
}

/** API response for GET /analytics/shed-stock-report */
export interface GetShedStockReportApiResponse {
  success: boolean;
  data: ShedStockReportData;
  message?: string;
}

/** Seed size line on a contract farming farmer row */
export interface ContractFarmingSizeRow {
  name: string;
  quantity: number;
  acres: number;
  amountPayable: number;
}

/** Buy-back bags / weight for one variety key */
export interface ContractFarmingBuyBackSummary {
  bags: number;
  netWeightKg: number;
}

/** One grading bucket (e.g. "30–40", "Above 50") */
export interface ContractFarmingGradingBucket {
  initialBags: number;
  netWeightKg: number;
}

/**
 * One farmer row under a variety in GET /analytics/contract-farming-report.
 * `grading` is keyed by variety name, then by size bucket label.
 */
export interface ContractFarmingFarmerRow {
  id: string;
  name: string;
  address: string;
  mobileNumber: string;
  /** May be fractional (e.g. 50.1); API may send number or string. */
  accountNumber: number | string;
  acresPlanted: number;
  totalSeedAmountPayable: number;
  generations: string[];
  sizes: ContractFarmingSizeRow[];
  'buy-back-bags': Record<string, ContractFarmingBuyBackSummary>;
  grading: Record<string, Record<string, ContractFarmingGradingBucket>>;
}

/** Payload for GET /analytics/contract-farming-report */
export interface ContractFarmingReportData {
  byVariety: Record<string, ContractFarmingFarmerRow[]>;
}

/** API response for GET /analytics/contract-farming-report */
export interface GetContractFarmingReportApiResponse {
  success: boolean;
  data: ContractFarmingReportData;
  message?: string;
}
