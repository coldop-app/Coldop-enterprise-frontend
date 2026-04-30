export type FarmerSeedEntryListItem = Record<string, unknown>;

export interface FarmerSeedEntryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetAllFarmerSeedEntriesApiResponse {
  success: boolean;
  message?: string;
  data: FarmerSeedEntryListItem[];
  pagination?: FarmerSeedEntryPagination;
}

export interface CreateFarmerSeedBagSizeInput {
  quantity: number | string;
  rate: number | string;
  acres?: number | string;
  [key: string]: unknown;
}

export interface CreateFarmerSeedInput {
  gatePassNo?: number | string;
  invoiceNumber?: string;
  bagSizes: CreateFarmerSeedBagSizeInput[];
  [key: string]: unknown;
}

export interface CreateFarmerSeedApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface EditFarmerSeedInput {
  gatePassNo?: number | string;
  bagSizes?: CreateFarmerSeedBagSizeInput[];
  remarks?: string;
  [key: string]: unknown;
}

export interface EditFarmerSeedApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface FarmerSeedAuditEntry {
  [key: string]: unknown;
}

export interface GetFarmerSeedAuditApiResponse {
  success: boolean;
  message?: string;
  data: FarmerSeedAuditEntry[];
  pagination?: FarmerSeedEntryPagination;
}

export interface FarmerSeedReportFarmer {
  _id: string;
  name: string;
  address: string;
}

export interface FarmerSeedReportFarmerStorageLink {
  _id: string;
  farmerId: FarmerSeedReportFarmer | string;
  coldStorageId: string;
  accountNumber: number;
}

export interface FarmerSeedReportBagSize {
  name: string;
  quantity: number;
  rate: number;
  acres: number;
}

export interface FarmerSeedReportEntry {
  _id: string;
  farmerStorageLinkId: FarmerSeedReportFarmerStorageLink | string;
  gatePassNo: number | null;
  invoiceNumber: string | null;
  date: string;
  variety: string;
  generation: string;
  bagSizes: FarmerSeedReportBagSize[];
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetFarmerSeedReportApiResponse {
  success: boolean;
  message?: string;
  data?: FarmerSeedReportEntry[] | null;
}
