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
  isMarkedAsNull?: boolean;
  [key: string]: unknown;
}

export interface EditFarmerSeedApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface FarmerSeedAuditUser {
  _id: string;
  name: string;
  mobileNumber?: string;
  role?: string;
  [key: string]: unknown;
}

export interface FarmerSeedAuditFarmer {
  _id: string;
  name: string;
  address: string;
  accountNumber?: number;
  [key: string]: unknown;
}

export interface FarmerSeedAuditFarmerStorageLink {
  _id: string;
  farmerId?: FarmerSeedAuditFarmer | string;
  coldStorageId: string;
  accountNumber?: number;
  [key: string]: unknown;
}

export interface FarmerSeedAuditStateSnapshot {
  _id?: string;
  farmerStorageLinkId?: FarmerSeedAuditFarmerStorageLink | string;
  gatePassNo?: number | null;
  invoiceNumber?: string | null;
  date?: string;
  variety?: string;
  generation?: string;
  bagSizes?: FarmerSeedReportBagSize[];
  remarks?: string | null;
  [key: string]: unknown;
}

export interface FarmerSeedAuditFarmerSeedRef {
  _id?: string;
  farmerStorageLinkId?: FarmerSeedAuditFarmerStorageLink | string;
  gatePassNo?: number | null;
  [key: string]: unknown;
}

export interface FarmerSeedAuditEntry {
  _id: string;
  farmerSeedId?: FarmerSeedAuditFarmerSeedRef | string;
  editedById?: FarmerSeedAuditUser | string;
  previousState?: FarmerSeedAuditStateSnapshot;
  updatedState?: FarmerSeedAuditStateSnapshot;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt?: string;
  __v?: number;
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
