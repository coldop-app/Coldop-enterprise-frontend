import type {
  GradingGatePassIncomingGatePass,
  GradingGatePassOrderDetail,
} from './grading-gate-pass';

/** One bag size entry in the create nikasi request */
export interface CreateNikasiGatePassBagSize {
  size: string;
  variety: string;
  quantityIssued: number;
}

/** Request body for POST /nikasi-gate-pass */
export interface CreateNikasiGatePassInput {
  farmerStorageLinkId: string;
  gatePassNo: number;
  date: string;
  from: string;
  toField: string;
  bagSizes: CreateNikasiGatePassBagSize[];
  manualGatePassNumber?: number;
  remarks?: string;
  netWeight?: number;
  averageWeightPerBag?: number;
}

/** @deprecated Use CreateNikasiGatePassBagSize and CreateNikasiGatePassInput (bagSizes) */
export interface CreateNikasiGatePassAllocation {
  size: string;
  quantityToAllocate: number;
}

/** @deprecated Bulk API used gradingGatePasses; single create uses bagSizes */
export interface CreateNikasiGatePassGradingEntry {
  gradingGatePassId: string;
  variety: string;
  allocations: CreateNikasiGatePassAllocation[];
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

/** Request body for POST /nikasi-gate-pass/bulk */
export interface CreateBulkNikasiGatePassInput {
  passes: CreateNikasiGatePassInput[];
}

/** API response for POST /nikasi-gate-pass/bulk */
export interface CreateBulkNikasiGatePassApiResponse {
  status: string;
  message: string;
  data: CreatedNikasiGatePass[];
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

/** Bag size entry in GET /nikasi-gate-pass response (new API shape) */
export interface NikasiGatePassBagSizeItem {
  size: string;
  variety: string;
  quantityIssued: number;
}

/** Nikasi gate pass as returned by GET /nikasi-gate-pass */
export interface NikasiGatePass {
  _id: string;
  gatePassNo: number;
  /** Legacy list shape: grading gate pass refs */
  gradingGatePassIds?: NikasiGradingGatePassInList[];
  /** Legacy list shape: snapshots */
  gradingGatePassSnapshots?: NikasiGatePassGradingSnapshot[];
  date: string;
  variety?: string;
  from: string;
  toField: string;
  /** Legacy list shape; omit when using bagSize */
  orderDetails?: NikasiGatePassOrderDetail[];
  /** New list shape: size/variety/quantityIssued per row */
  bagSize?: NikasiGatePassBagSizeItem[];
  remarks?: string;
  netWeight?: number;
  averageWeightPerBag?: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
  /** Present when returned from GET /nikasi-gate-pass/grouped */
  manualGatePassNumber?: number;
  farmerStorageLinkId?: string;
  createdBy?: string;
}

/** API response for GET /nikasi-gate-pass */
export interface GetNikasiGatePassesApiResponse {
  success: boolean;
  data: NikasiGatePass[];
  message?: string;
}

/** One group from GET /nikasi-gate-pass/grouped (by manualGatePassNumber and date) */
export interface GroupedNikasiGatePassGroup {
  manualGatePassNumber: number | null;
  date: string;
  passes: NikasiGatePass[];
}

/** API response for GET /nikasi-gate-pass/grouped */
export interface GetGroupedNikasiGatePassesApiResponse {
  success: boolean;
  data: GroupedNikasiGatePassGroup[];
}
