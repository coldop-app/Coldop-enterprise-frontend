/** One bag size entry in farmer seed payloads */
export interface FarmerSeedBagSize {
  name: string;
  quantity: number;
  rate: number;
  acres?: number;
  /** When set, used with line amount for seed balance on accounting PDF (Amount − Amount Received). */
  amountReceived?: number;
}

/** Request body for POST /farmer-seed */
export interface CreateFarmerSeedInput {
  farmerStorageLinkId: string;
  gatePassNo?: number;
  invoiceNumber?: string;
  date: string;
  variety: string;
  generation: string;
  bagSizes: FarmerSeedBagSize[];
  remarks?: string;
}

/** Request body for PUT /farmer-seed/:id */
export interface EditFarmerSeedInput {
  farmerStorageLinkId?: string;
  gatePassNo?: number;
  invoiceNumber?: string;
  date?: string;
  variety?: string;
  generation?: string;
  bagSizes?: FarmerSeedBagSize[];
  remarks?: string;
}

/** Farmer seed entity returned by create API */
export interface FarmerSeedEntry {
  _id: string;
  farmerStorageLinkId: string;
  createdBy: string;
  gatePassNo: number;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  bagSizes: FarmerSeedBagSize[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/** API response for POST /farmer-seed */
export interface CreateFarmerSeedApiResponse {
  success: boolean;
  data: FarmerSeedEntry | Record<string, unknown> | null;
  message?: string;
}

/** API response for PUT /farmer-seed/:id */
export interface EditFarmerSeedApiResponse {
  success: boolean;
  data: FarmerSeedEntry | Record<string, unknown> | null;
  message?: string;
}

/** Embedded farmer–storage link on GET /farmer-seed/farmer-storage-link/:id */
export interface FarmerSeedFarmerStorageLinkRef {
  _id: string;
  farmerId: string;
  coldStorageId: string;
  accountNumber: number;
}

/** Farmer seed row returned by GET /farmer-seed/farmer-storage-link/:farmerStorageLinkId */
export interface FarmerSeedEntryByStorageLink {
  _id: string;
  farmerStorageLinkId: FarmerSeedFarmerStorageLinkRef;
  gatePassNo: number;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  bagSizes: FarmerSeedBagSize[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/** API response for GET /farmer-seed/farmer-storage-link/:farmerStorageLinkId */
export interface GetFarmerSeedApiResponse {
  success: boolean;
  data: FarmerSeedEntryByStorageLink[];
  message?: string;
}

/** Populated farmer on GET /farmer-seed/farmer-seed-entry */
export interface FarmerSeedEntryListFarmerRef {
  _id: string;
  name: string;
  address: string;
}

/** Populated farmer–storage link on GET /farmer-seed/farmer-seed-entry */
export interface FarmerSeedEntryListStorageLink {
  _id: string;
  farmerId: FarmerSeedEntryListFarmerRef;
  coldStorageId: string;
  /** May be fractional (e.g. 62.3) for secondary accounts */
  accountNumber: number;
}

/** Row from GET /farmer-seed/farmer-seed-entry (all entries for the cold store) */
export interface FarmerSeedEntryListItem {
  _id: string;
  farmerStorageLinkId: FarmerSeedEntryListStorageLink;
  gatePassNo: number | null;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  bagSizes: FarmerSeedBagSize[];
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/** API response for GET /farmer-seed/farmer-seed-entry */
export interface GetAllFarmerSeedEntriesApiResponse {
  success: boolean;
  data: FarmerSeedEntryListItem[];
  message?: string;
}

/** User reference on farmer seed audit entries */
export interface FarmerSeedAuditEditorRef {
  _id: string;
  name: string;
  mobileNumber: string;
  role: string;
}

/** Row from GET /farmer-seed/audit */
export interface FarmerSeedAuditEntry {
  _id: string;
  farmerSeedId: string;
  editedById: FarmerSeedAuditEditorRef;
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  ipAddress: string;
  userAgent: string;
  __v?: number;
  createdAt: string;
}

/** API response for GET /farmer-seed/audit */
export interface GetFarmerSeedAuditApiResponse {
  success: boolean;
  data: FarmerSeedAuditEntry[];
  message?: string;
}
