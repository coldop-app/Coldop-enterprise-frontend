import type { FarmerStorageLinkFarmer } from './farmer';

/** Admin user (graded-by) in grading gate pass response */
export interface GradingGatePassGradedBy {
  _id: string;
  name: string;
  mobileNumber: string;
}

/** Linked-by admin as returned in nested incoming gate pass */
export interface GradingGatePassLinkedBy {
  _id: string;
  name: string;
}

/** Farmer storage link as returned inside grading gate pass incoming ref */
export interface GradingGatePassFarmerStorageLink {
  _id: string;
  farmerId: FarmerStorageLinkFarmer;
  coldStorageId: string;
  linkedById: GradingGatePassLinkedBy;
  accountNumber: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  notes?: string;
}

/** Grading summary on nested incoming gate pass */
export interface GradingGatePassIncomingGradingSummary {
  totalGradedBags: number;
}

/** Incoming gate pass as nested in GET /grading-gate-pass response (legacy single ref) */
export interface GradingGatePassIncomingGatePass {
  _id: string;
  farmerStorageLinkId: GradingGatePassFarmerStorageLink;
  gatePassNo: number;
  date: string;
  variety: string;
  truckNumber: string;
  bagsReceived: number;
  status: string;
  gradingSummary: GradingGatePassIncomingGradingSummary;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** Farmer storage link as returned in grading pass incomingGatePassIds[].farmerStorageLinkId (subset) */
export interface GradingGatePassIncomingRefLink {
  _id: string;
  farmerId: FarmerStorageLinkFarmer;
  linkedById: GradingGatePassLinkedBy;
  accountNumber: number;
}

/** Incoming gate pass as nested in grading pass incomingGatePassIds[] (list API and get-all-gate-passes-of-farmer) */
export interface GradingGatePassIncomingRef {
  _id: string;
  farmerStorageLinkId?:
    | GradingGatePassIncomingRefLink
    | GradingGatePassFarmerStorageLink;
  gatePassNo: number;
  manualGatePassNumber?: number;
  date: string;
  variety?: string;
  location?: string;
  truckNumber?: string;
  bagsReceived?: number;
  weightSlip?: {
    slipNumber?: string;
    grossWeightKg?: number;
    tareWeightKg?: number;
  };
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Single order detail row in a grading gate pass */
export interface GradingGatePassOrderDetail {
  size: string;
  bagType: string;
  currentQuantity: number;
  initialQuantity: number;
  weightPerBagKg: number;
}

/** Grading gate pass as returned by GET /grading-gate-pass (list API) and GET /grading-gate-pass/farmer-storage-link/:id */
export interface GradingGatePass {
  _id: string;
  farmerStorageLinkId: string;
  incomingGatePassIds: GradingGatePassIncomingRef[];
  /** Populated object in list API; may be ID string in get-all-gate-passes-of-farmer */
  createdBy: GradingGatePassGradedBy | string;
  gatePassNo: number;
  manualGatePassNumber?: number;
  date: string;
  variety: string;
  orderDetails: GradingGatePassOrderDetail[];
  allocationStatus: string;
  /** Grader name when provided by API */
  grader?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  /** Present on list API; may be omitted by GET /grading-gate-pass/farmer-storage-link/:id */
  __v?: number;
}

/** Pagination as returned by GET /grading-gate-pass */
export interface GradingGatePassPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** API response for GET /grading-gate-pass */
export interface GetGradingGatePassesApiResponse {
  success: boolean;
  data: GradingGatePass[];
  pagination: GradingGatePassPagination;
  message?: string;
}

/** API response for GET /grading-gate-pass/search/:gatePassNo */
export interface SearchGradingGatePassApiResponse {
  success: boolean;
  data: GradingGatePass[];
  message?: string;
}

/** Order detail for POST /grading-gate-pass (size name can vary) */
export interface CreateGradingGatePassOrderDetail {
  size: string;
  bagType: string;
  currentQuantity: number;
  initialQuantity: number;
  weightPerBagKg: number;
}

/** Request body for POST /grading-gate-pass */
export interface CreateGradingGatePassInput {
  farmerStorageLinkId: string;
  incomingGatePassIds: string[];
  gatePassNo: number;
  date: string;
  variety: string;
  orderDetails: CreateGradingGatePassOrderDetail[];
  allocationStatus: string;
  remarks?: string;
  manualGatePassNumber?: number;
  grader?: string;
}

/** Created grading gate pass as returned by POST /grading-gate-pass (refs as IDs) */
export interface CreatedGradingGatePass {
  _id: string;
  incomingGatePassId: string;
  gradedById: string;
  gatePassNo: number;
  date: string;
  variety: string;
  orderDetails: GradingGatePassOrderDetail[];
  allocationStatus: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for POST /grading-gate-pass */
export interface CreateGradingGatePassApiResponse {
  success: boolean;
  data: CreatedGradingGatePass | null;
  message?: string;
}
