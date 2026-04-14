import type { FarmerStorageLinkFarmer } from './farmer';

/** Weight slip sub-object for incoming gate pass */
export interface IncomingGatePassWeightSlip {
  slipNumber: string;
  grossWeightKg: number;
  tareWeightKg: number;
}

/** Grading summary for create/update payload */
export interface CreateIncomingGatePassGradingSummary {
  totalGradedBags: number;
}

/** Request body for POST /incoming-gate-pass */
export interface CreateIncomingGatePassInput {
  farmerStorageLinkId: string;
  receivedById?: string;
  gatePassNo: number;
  date: string; // ISO date string
  variety: string;
  location: string;
  truckNumber: string;
  bagsReceived: number;
  weightSlip?: IncomingGatePassWeightSlip;
  status?: 'OPEN' | 'CLOSED';
  gradingSummary?: CreateIncomingGatePassGradingSummary;
  remarks?: string;
  manualGatePassNumber?: number;
}

/** Grading summary on an incoming gate pass */
export interface IncomingGatePassGradingSummary {
  totalGradedBags: number;
}

/** Incoming gate pass as returned by the API */
export interface IncomingGatePass {
  _id: string;
  farmerStorageLinkId: string;
  gatePassNo: number;
  date: string;
  variety: string;
  truckNumber: string;
  bagsReceived: number;
  status: string;
  gradingSummary: IncomingGatePassGradingSummary;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for POST /incoming-gate-pass */
export interface CreateIncomingGatePassApiResponse {
  success: boolean;
  data: IncomingGatePass | null;
  message: string;
}

/** Weight slip sub-object for PUT /incoming-gate-pass (partial) */
export interface EditIncomingGatePassWeightSlip {
  grossWeightKg: number;
  tareWeightKg: number;
}

/** Request body for PUT /incoming-gate-pass/:id */
export interface EditIncomingGatePassInput {
  manualGatePassNumber?: number;
  weightSlip?: EditIncomingGatePassWeightSlip;
  reason?: string;
}

/** API response for PUT /incoming-gate-pass/:id */
export interface EditIncomingGatePassApiResponse {
  success: boolean;
  data: Record<string, unknown>;
  message: string;
}

/** Admin user who linked the farmer–storage pair in GET /incoming-gate-pass response */
export interface IncomingGatePassLinkedByAdmin {
  _id: string;
  name: string;
}

/** Farmer storage link as returned in GET /incoming-gate-pass response (populated) */
export interface IncomingGatePassFarmerStorageLink {
  _id: string;
  farmerId: FarmerStorageLinkFarmer;
  linkedById: IncomingGatePassLinkedByAdmin;
  accountNumber: number;
}

/** Single bag size entry on an incoming gate pass (GET /incoming-gate-pass) */
export interface IncomingGatePassBagSize {
  size: string;
  currentQuantity: number;
  initialQuantity: number;
  bagType: string;
  chamber: string;
  floor: string;
  row: string;
}

/** Incoming gate pass as returned by GET /incoming-gate-pass (with populated farmerStorageLinkId) */
export interface IncomingGatePassWithLink {
  _id: string;
  farmerStorageLinkId: IncomingGatePassFarmerStorageLink;
  createdBy: string;
  gatePassNo: number;
  date: string;
  variety: string;
  location?: string;
  bagSizes: IncomingGatePassBagSize[];
  editHistory: unknown[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  /** @deprecated Use bagSizes (e.g. sum of initialQuantity) when present. Kept for backward compatibility. */
  bagsReceived?: number;
  /** @deprecated Not present in current API. Kept for backward compatibility. */
  weightSlip?: IncomingGatePassWeightSlip;
  /** @deprecated Not present in current API. Kept for backward compatibility. */
  truckNumber?: string;
  /** @deprecated Not present in current API. Kept for backward compatibility. */
  manualGatePassNumber?: number;
  /** @deprecated Not present in current API. Kept for backward compatibility. */
  status?: string;
  /** @deprecated Not present in current API. Kept for backward compatibility. */
  gradingSummary?: IncomingGatePassGradingSummary;
}

/** Pagination as returned by GET /incoming-gate-pass when present */
export interface IncomingGatePassPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** API response for GET /incoming-gate-pass */
export interface GetIncomingGatePassesApiResponse {
  success: boolean;
  data: IncomingGatePassWithLink[];
  pagination?: IncomingGatePassPagination;
  message?: string;
}

/** Created-by user as returned by GET /incoming-gate-pass/farmer-storage-link/:id */
export interface IncomingGatePassCreatedBy {
  _id: string;
  name: string;
  mobileNumber: string;
}

/** Farmer storage link as returned by GET /incoming-gate-pass/farmer-storage-link/:id (populated) */
export interface IncomingGatePassByLinkFarmerStorageLink {
  _id: string;
  farmerId: {
    _id: string;
    name: string;
    address: string;
    mobileNumber: string;
  };
  coldStorageId: string;
  linkedById: IncomingGatePassLinkedByAdmin;
  accountNumber: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** Single incoming gate pass as returned by GET /incoming-gate-pass/farmer-storage-link/:id */
export interface IncomingGatePassByFarmerStorageLinkItem {
  _id: string;
  farmerStorageLinkId: IncomingGatePassByLinkFarmerStorageLink;
  createdBy: IncomingGatePassCreatedBy;
  gatePassNo: number;
  manualGatePassNumber: number;
  date: string;
  variety: string;
  truckNumber: string;
  bagsReceived: number;
  weightSlip: IncomingGatePassWeightSlip;
  status: string;
  remarks?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

/** API response for GET /incoming-gate-pass/farmer-storage-link/:farmerStorageLinkId */
export interface GetIncomingGatePassesByFarmerStorageLinkApiResponse {
  success: boolean;
  data: IncomingGatePassByFarmerStorageLinkItem[];
  pagination: IncomingGatePassPagination;
}

/** API response for GET /incoming-gate-pass/search/:gatePassNo */
export interface SearchIncomingGatePassApiResponse {
  success: boolean;
  data: IncomingGatePassByFarmerStorageLinkItem[];
  message?: string;
}
