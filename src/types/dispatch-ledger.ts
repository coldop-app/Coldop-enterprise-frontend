export interface DispatchLedger {
  _id: string;
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
  mobileNumber: string;
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
