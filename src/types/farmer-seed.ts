/** One bag size entry in farmer seed payloads */
export interface FarmerSeedBagSize {
  name: string;
  quantity: number;
  rate: number;
  /** When set, used with line amount for seed balance on accounting PDF (Amount − Amount Received). */
  amountReceived?: number;
}

/** Request body for POST /farmer-seed */
export interface CreateFarmerSeedInput {
  farmerStorageLinkId: string;
  variety: string;
  generation: string;
  bagSizes: FarmerSeedBagSize[];
}

/** Request body for PUT /farmer-seed/:id */
export interface EditFarmerSeedInput {
  farmerStorageLinkId?: string;
  variety?: string;
  generation?: string;
  bagSizes?: FarmerSeedBagSize[];
}

/** Farmer seed entity returned by create API */
export interface FarmerSeedEntry {
  _id: string;
  farmerStorageLinkId: string;
  createdBy: string;
  variety: string;
  generation: string;
  bagSizes: FarmerSeedBagSize[];
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
  variety: string;
  generation: string;
  bagSizes: FarmerSeedBagSize[];
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
