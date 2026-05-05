export type GatePassStatus = 'NOT_GRADED' | 'GRADED' | 'PARTIALLY_GRADED';

export interface Farmer {
  _id: string;
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber?: number;
}

export interface User {
  _id: string;
  name: string;
  mobileNumber: string;
}

export interface LinkedBy {
  _id: string;
  name: string;
}

/** Farmer–cold-storage link; list APIs often omit bookkeeping fields. */
export interface FarmerStorageLink {
  _id: string;
  farmerId: Farmer;
  coldStorageId: string;
  linkedById?: LinkedBy;
  accountNumber: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface WeightSlip {
  slipNumber: string;
  grossWeightKg: number;
  tareWeightKg: number;
}

// API can send either object references or just ids for relational fields.
export type IncomingGatePassWithLink = IncomingGatePass;

export interface IncomingGatePass {
  _id: string;
  farmerStorageLinkId: FarmerStorageLink | string;
  createdBy: User | string;
  gatePassNo: number;
  manualGatePassNumber: number;
  date: string; // ISO string
  variety: string;
  location: string;
  truckNumber: string;
  bagsReceived: number;
  weightSlip: WeightSlip;
  status: GatePassStatus;
  remarks: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface IncomingGatePassPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  hasPrevPage?: boolean;
  nextPage?: number | null;
  prevPage?: number | null;
}

export interface GetIncomingGatePassesApiResponse {
  success: boolean;
  message?: string;
  data?: IncomingGatePassWithLink[] | null;
  pagination?: IncomingGatePassPagination;
}

export type IncomingGatePassByFarmerStorageLinkItem = IncomingGatePassWithLink;

export interface SearchIncomingGatePassApiResponse {
  success: boolean;
  message?: string;
  data?: IncomingGatePassByFarmerStorageLinkItem[] | null;
}

export interface EditIncomingGatePassInput {
  farmerStorageLinkId?: string;
  gatePassNo?: number;
  manualGatePassNumber?: number;
  date?: string;
  variety?: string;
  location?: string;
  truckNumber?: string;
  bagsReceived?: number;
  weightSlip?: {
    slipNumber?: string;
    grossWeightKg: number;
    tareWeightKg: number;
  };
  status?: GatePassStatus;
  remarks?: string;
}

export interface EditIncomingGatePassApiResponse {
  success: boolean;
  message?: string;
  data?: Record<string, never>;
}

export type CreateIncomingGatePassInput = EditIncomingGatePassInput;

export interface CreateIncomingGatePassApiResponse {
  success: boolean;
  message?: string;
  data?: IncomingGatePassWithLink;
}

export interface IncomingGatePassAuditItem {
  _id: string;
  incomingGatePassId: IncomingGatePass;
  editedById: User;
  previousState: IncomingGatePass;
  updatedState: IncomingGatePass;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  __v: number;
}

export interface GetIncomingGatePassAuditApiResponse {
  success: boolean;
  message?: string;
  data?: IncomingGatePassAuditItem[] | null;
  pagination?: IncomingGatePassPagination;
}

// Backward compatible alias for existing callers/imports.
export type IncomingGatePassResponse = GetIncomingGatePassesApiResponse;
