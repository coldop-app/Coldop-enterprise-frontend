import type { FarmerStorageLink } from '@/types/farmer';

/** Minimal grading gate pass shape used in storage gate pass relations */
export interface GradingGatePass {
  _id: string;
  gatePassNo?: number;
}

/** Single allocation for a grading gate pass when creating a storage gate pass (legacy / summary display) */
export interface CreateStorageGatePassAllocation {
  size: string;
  quantityToAllocate: number;
  chamber: string;
  floor: string;
  row: string;
}

/** Entry for one grading gate pass and its allocations (legacy / summary display) */
export interface CreateStorageGatePassGradingEntry {
  gradingGatePassId: string;
  allocations: CreateStorageGatePassAllocation[];
}

/** One bag size entry in the create storage gate pass request body */
export interface CreateStorageGatePassBagSize {
  size: string;
  bagType: string;
  currentQuantity: number;
  initialQuantity: number;
  chamber: string;
  floor: string;
  row: string;
}

/** Request body for POST /storage-gate-pass */
export interface CreateStorageGatePassInput {
  farmerStorageLinkId: string;
  gatePassNo: number;
  date: string;
  variety: string;
  bagSizes: CreateStorageGatePassBagSize[];
  remarks?: string;
  /** Optional manual gate pass number (sent as number to API). */
  manualGatePassNumber?: number;
}

/** Incoming bag size snapshot as returned in grading gate pass snapshots */
export interface StorageGatePassIncomingBagSize {
  size: string;
  currentQuantity: number;
  initialQuantity: number;
  location: string;
}

/** Grading gate pass snapshot in the created storage gate pass */
export interface StorageGatePassGradingSnapshot {
  _id: string;
  gatePassNo: number;
  incomingBagSizes: StorageGatePassIncomingBagSize[];
}

/** Order detail row in the created storage gate pass */
export interface StorageGatePassOrderDetail {
  size: string;
  currentQuantity: number;
  initialQuantity: number;
  weightPerBag: number;
  bagType: string;
  chamber: string;
  floor: string;
  row: string;
}

/** Storage gate pass as returned by GET /storage-gate-pass (gradingGatePassIds populated) */
export interface StorageGatePass {
  _id: string;
  gatePassNo: number;
  gradingGatePassIds: GradingGatePass[];
  gradingGatePassSnapshots: StorageGatePassGradingSnapshot[];
  date: string;
  variety: string;
  orderDetails: StorageGatePassOrderDetail[];
  editHistory: unknown[];
  remarks: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  /** Present when returned from GET /storage-gate-pass/grouped */
  manualGatePassNumber?: number;
  farmerStorageLinkId?: string;
  createdBy?: string;
}

/** Admin user who linked the farmer-storage pair in GET /storage-gate-pass response */
export interface StorageGatePassLinkedByAdmin {
  _id: string;
  name: string;
}

/** Farmer storage link as returned in GET /storage-gate-pass response (populated) */
export interface StorageGatePassFarmerStorageLink {
  _id: string;
  farmerId: FarmerStorageLink['farmerId'];
  linkedById: StorageGatePassLinkedByAdmin;
  accountNumber: number;
}

/** Single bag size entry on a storage gate pass (GET /storage-gate-pass) */
export interface StorageGatePassBagSize {
  size: string;
  currentQuantity: number;
  initialQuantity: number;
  bagType: string;
  chamber: string;
  floor: string;
  row: string;
}

/** Storage gate pass as returned by GET /storage-gate-pass (with populated farmerStorageLinkId) */
export interface StorageGatePassWithLink {
  _id: string;
  farmerStorageLinkId: StorageGatePassFarmerStorageLink;
  createdBy: string;
  gatePassNo: number;
  date: string;
  variety: string;
  bagSizes: StorageGatePassBagSize[];
  editHistory: unknown[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  manualGatePassNumber?: number;
}

/** Admin user object returned as createdBy in GET /storage-gate-pass/:id */
export interface StorageGatePassCreatedByAdmin {
  _id: string;
  name: string;
}

/** Storage gate pass as returned by GET /storage-gate-pass/:id */
export interface StorageGatePassById {
  _id: string;
  farmerStorageLinkId: StorageGatePassFarmerStorageLink;
  createdBy: StorageGatePassCreatedByAdmin;
  gatePassNo: number;
  manualGatePassNumber?: number;
  date: string;
  variety: string;
  bagSizes: StorageGatePassBagSize[];
  editHistory: unknown[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** Pagination as returned by GET /storage-gate-pass */
export interface StorageGatePassPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** API response for GET /storage-gate-pass */
export interface GetStorageGatePassesApiResponse {
  success: boolean;
  data: StorageGatePassWithLink[];
  pagination: StorageGatePassPagination;
  message?: string;
}

/** API response for GET /storage-gate-pass/:id */
export interface GetStorageGatePassByIdApiResponse {
  success: boolean;
  data: StorageGatePassById;
  message?: string;
}

/** API response for GET /storage-gate-pass/search/:gatePassNo */
export interface SearchStorageGatePassApiResponse {
  success: boolean;
  data: StorageGatePassWithLink[];
  message?: string;
}

/** One group from GET /storage-gate-pass/grouped (by manualGatePassNumber and date) */
export interface GroupedStorageGatePassGroup {
  manualGatePassNumber: number | null;
  date: string;
  passes: StorageGatePass[];
}

/** API response for GET /storage-gate-pass/grouped */
export interface GetGroupedStorageGatePassesApiResponse {
  success: boolean;
  data: GroupedStorageGatePassGroup[];
}

/** Admin user information captured in storage gate pass audit entries */
export interface StorageGatePassAuditEditedBy {
  _id: string;
  name: string;
  email?: string;
  mobileNumber?: string;
}

/** Changed value pair captured in storage gate pass audit entry */
export interface StorageGatePassAuditChangeValue {
  old: unknown;
  new: unknown;
}

/** Field-by-field changes object for storage gate pass audit entries */
export type StorageGatePassAuditChanges = Record<
  string,
  StorageGatePassAuditChangeValue
>;

/** Single storage gate pass audit row from GET /storage-gate-pass/audit */
export interface StorageGatePassAuditGatePassRef {
  _id: string;
  gatePassNo?: number;
  manualGatePassNumber?: number;
  variety?: string;
  date?: string;
}

export interface StorageGatePassAuditStateSnapshot {
  _id?: string;
  gatePassNo?: number;
  manualGatePassNumber?: number;
  date?: string;
  variety?: string;
  bagSizes?: StorageGatePassBagSize[];
  remarks?: string;
  [key: string]: unknown;
}

export interface StorageGatePassAuditItem {
  _id: string;
  storageGatePassId: string | StorageGatePassAuditGatePassRef;
  coldStorageId?: string;
  editedBy?: StorageGatePassAuditEditedBy;
  editedById?: StorageGatePassAuditEditedBy;
  action?: string;
  changes?: StorageGatePassAuditChanges;
  previousState?: StorageGatePassAuditStateSnapshot;
  updatedState?: StorageGatePassAuditStateSnapshot;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

/** Pagination shape from GET /storage-gate-pass/audit */
export interface StorageGatePassAuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** API response for GET /storage-gate-pass/audit */
export interface GetStorageGatePassAuditApiResponse {
  success: boolean;
  data: StorageGatePassAuditItem[];
  pagination?: StorageGatePassAuditPagination;
  message?: string;
}

/** Bag size as returned in created storage gate pass */
export interface CreatedStorageGatePassBagSize {
  size: string;
  currentQuantity: number;
  initialQuantity: number;
  bagType: string;
  chamber: string;
  floor: string;
  row: string;
}

/** Created storage gate pass as returned by POST /storage-gate-pass */
export interface CreatedStorageGatePass {
  _id: string;
  farmerStorageLinkId: string;
  createdBy: string;
  gatePassNo: number;
  date: string;
  variety: string;
  bagSizes: CreatedStorageGatePassBagSize[];
  editHistory: unknown[];
  remarks: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for POST /storage-gate-pass */
export interface CreateStorageGatePassApiResponse {
  success?: boolean;
  data: CreatedStorageGatePass | null;
  message?: string;
}

/** Request body for PUT /storage-gate-pass/:id */
export interface EditStorageGatePassInput {
  gatePassNo?: number;
  date?: string;
  variety?: string;
  bagSizes?: CreateStorageGatePassBagSize[];
  remarks?: string;
  manualGatePassNumber?: number;
  isMarkedAsNull?: boolean;
}

/** API response for PUT /storage-gate-pass/:id */
export interface EditStorageGatePassApiResponse {
  success: boolean;
  data: Record<string, never>;
  message?: string;
}

/** Request body for POST /storage-gate-pass/bulk */
export interface CreateBulkStorageGatePassInput {
  passes: CreateStorageGatePassInput[];
}

/** API response for POST /storage-gate-pass/bulk */
export interface CreateBulkStorageGatePassApiResponse {
  status: string;
  message: string;
  data: CreatedStorageGatePass[];
}
