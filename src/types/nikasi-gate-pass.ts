import type {
  GradingGatePassIncomingGatePass,
  GradingGatePassOrderDetail,
} from './grading-gate-pass';

/** Allocation for a grading gate pass in the create nikasi request */
export interface CreateNikasiGatePassAllocation {
  size: string;
  quantityToAllocate: number;
}

/** Grading gate pass entry in the create nikasi request */
export interface CreateNikasiGatePassGradingEntry {
  gradingGatePassId: string;
  allocations: CreateNikasiGatePassAllocation[];
}

/** Request body for POST /nikasi-gate-pass */
export interface CreateNikasiGatePassInput {
  gatePassNo: number;
  date: string;
  variety: string;
  from: string;
  toField: string;
  gradingGatePasses: CreateNikasiGatePassGradingEntry[];
  remarks?: string;
  manualGatePassNumber?: number;
}

/** Incoming bag size snapshot in created nikasi gate pass */
export interface NikasiGatePassIncomingBagSize {
  size: string;
  currentQuantity: number;
  initialQuantity: number;
}

/** Grading gate pass snapshot in created nikasi gate pass */
export interface NikasiGatePassGradingSnapshot {
  _id: string;
  gatePassNo: number;
  incomingBagSizes: NikasiGatePassIncomingBagSize[];
}

/** Order detail in created nikasi gate pass */
export interface NikasiGatePassOrderDetail {
  size: string;
  gradingGatePassId: string;
  quantityAvailable: number;
  quantityIssued: number;
}

/** Created nikasi gate pass as returned by POST /nikasi-gate-pass */
export interface CreatedNikasiGatePass {
  gatePassNo: number;
  gradingGatePassIds: string[];
  gradingGatePassSnapshots: NikasiGatePassGradingSnapshot[];
  date: string;
  variety: string;
  from: string;
  toField: string;
  orderDetails: NikasiGatePassOrderDetail[];
  remarks?: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for POST /nikasi-gate-pass */
export interface CreateNikasiGatePassApiResponse {
  status: string;
  message: string;
  data: CreatedNikasiGatePass;
}

/** Grading gate pass as returned in GET /nikasi-gate-pass (gradedById may be unpopulated) */
export interface NikasiGradingGatePassInList {
  _id: string;
  incomingGatePassId: GradingGatePassIncomingGatePass & {
    weightSlip?: {
      slipNumber: string;
      grossWeightKg: number;
      tareWeightKg: number;
    };
  };
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

/** Nikasi gate pass as returned by GET /nikasi-gate-pass */
export interface NikasiGatePass {
  _id: string;
  gatePassNo: number;
  gradingGatePassIds: NikasiGradingGatePassInList[];
  gradingGatePassSnapshots: NikasiGatePassGradingSnapshot[];
  date: string;
  variety: string;
  from: string;
  toField: string;
  orderDetails: NikasiGatePassOrderDetail[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for GET /nikasi-gate-pass */
export interface GetNikasiGatePassesApiResponse {
  success: boolean;
  data: NikasiGatePass[];
  message?: string;
}
