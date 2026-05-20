export interface DispatchLedger {
  _id: string;
  coldStorageId?: string;
  name: string;
  address: string;
  mobileNumber: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/** Request body for POST /dispatch-ledger */
export interface CreateDispatchLedgerInput {
  name: string;
  address: string;
  mobileNumber?: string;
}

/** API response for POST /dispatch-ledger */
export interface CreateDispatchLedgerApiResponse {
  success: boolean;
  data?: DispatchLedger | null;
  message?: string;
}

/** Request body for PUT /dispatch-ledger/:id */
export interface EditDispatchLedgerInput {
  name?: string;
  address?: string;
  mobileNumber?: string;
}

/** API response for PUT /dispatch-ledger/:id */
export interface EditDispatchLedgerApiResponse {
  success: boolean;
  data?: DispatchLedger | null;
  message?: string;
}

/** API response for GET /dispatch-ledger */
export interface GetDispatchLedgersApiResponse {
  success: boolean;
  data?: DispatchLedger[] | null;
  message?: string;
}

/** One bag line on a nikasi gate pass (GET /dispatch-ledger/:id/nikasi-gate-passes) */
export interface DispatchLedgerNikasiGatePassBagSize {
  size: string;
  variety: string;
  quantityIssued: number;
}

/** One nikasi gate pass under a dispatch ledger scope */
export interface DispatchLedgerNikasiGatePass {
  _id: string;
  farmerStorageLinkId: string;
  dispatchLedgerId: string;
  createdBy: string;
  gatePassNo: number;
  manualGatePassNumber?: number;
  isInternalTransfer: boolean;
  date: string;
  from: string;
  to: string;
  truckNumber: string;
  bagSize: DispatchLedgerNikasiGatePassBagSize[];
  remarks?: string;
  netWeight: number;
  averageWeightPerBag: number;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/** Aggregates returned with the nikasi gate pass list for a dispatch ledger */
export interface DispatchLedgerNikasiGatePassesSummary {
  totalBagsDispatched: number;
  gatePassCount: number;
}

/** Dispatch ledger record embedded in GET /dispatch-ledger/:id/nikasi-gate-passes */
export interface DispatchLedgerNikasiGatePassesLedger {
  _id: string;
  name: string;
  address: string;
  mobileNumber: string;
}

/** API response for GET /dispatch-ledger/:id/nikasi-gate-passes */
export interface GetDispatchLedgerNikasiGatePassesApiResponse {
  success: boolean;
  data?: {
    dispatchLedger: DispatchLedgerNikasiGatePassesLedger;
    summary: DispatchLedgerNikasiGatePassesSummary;
    nikasiGatePasses: DispatchLedgerNikasiGatePass[];
  } | null;
  message?: string;
}

/** Normalized result for consumers of the nikasi gate passes hook */
export interface GetDispatchLedgerNikasiGatePassesResult {
  dispatchLedger: DispatchLedgerNikasiGatePassesLedger | null;
  summary: DispatchLedgerNikasiGatePassesSummary;
  nikasiGatePasses: DispatchLedgerNikasiGatePass[];
}
