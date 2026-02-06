/** Bag summary for one daybook entry */
export interface DaybookEntrySummaries {
  totalBagsIncoming: number;
  totalBagsGraded: number;
  totalBagsStored: number;
  totalBagsNikasi: number;
  totalBagsOutgoing: number;
  /** Weight wastage (kg): [Net − (incoming bags × 700 g)] − [graded weight − (60 g × graded bags)]. Optional when not computable. */
  wastageKg?: number;
  /** Wastage as % of net incoming weight. Optional when not computable. */
  wastagePercent?: number;
  /** Net incoming weight (kg) from weight slip. Optional when not available. */
  incomingNetKg?: number;
}

/** Farmer in a daybook entry (from API) */
export interface DaybookFarmer {
  _id: string;
  name: string;
  address: string;
  mobileNumber: string;
  imageUrl: string;
  accountNumber: number;
  createdAt: string;
  updatedAt: string;
}

/** One daybook entry: incoming gate pass + attached passes + summaries */
export interface DaybookEntry {
  incoming: Record<string, unknown>;
  farmer: DaybookFarmer | null;
  gradingPasses: unknown[];
  storagePasses: unknown[];
  nikasiPasses: unknown[];
  outgoingPasses: unknown[];
  summaries: DaybookEntrySummaries;
}

/** Pagination metadata from daybook API */
export interface DaybookPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Gate pass type filter – entries that have at least one of these pass types */
export type DaybookGatePassType =
  | 'incoming'
  | 'grading'
  | 'storage'
  | 'nikasi'
  | 'outgoing';

/** Query params for GET /store-admin/daybook */
export interface GetDaybookParams {
  limit?: number;
  page?: number;
  sortOrder?: 'asc' | 'desc';
  gatePassType?: DaybookGatePassType | DaybookGatePassType[];
}

/** API response for GET /store-admin/daybook */
export interface GetDaybookApiResponse {
  success: boolean;
  data: {
    daybook: DaybookEntry[];
    pagination: DaybookPagination;
  };
  message?: string;
}
