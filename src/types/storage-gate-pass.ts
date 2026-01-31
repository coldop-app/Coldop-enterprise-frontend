import type { GradingGatePass } from '@/types/grading-gate-pass';

/** Single allocation for a grading gate pass when creating a storage gate pass */
export interface CreateStorageGatePassAllocation {
  size: string;
  quantityToAllocate: number;
  chamber: string;
  floor: string;
  row: string;
}

/** Entry for one grading gate pass and its allocations in the create payload */
export interface CreateStorageGatePassGradingEntry {
  gradingGatePassId: string;
  allocations: CreateStorageGatePassAllocation[];
}

/** Request body for POST /storage-gate-pass */
export interface CreateStorageGatePassInput {
  gatePassNo: number;
  date: string;
  variety: string;
  gradingGatePasses: CreateStorageGatePassGradingEntry[];
  remarks?: string;
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
}

/** API response for GET /storage-gate-pass */
export interface GetStorageGatePassesApiResponse {
  success: boolean;
  data: StorageGatePass[];
  message?: string;
}

/** Created storage gate pass as returned by POST /storage-gate-pass */
export interface CreatedStorageGatePass {
  _id: string;
  gatePassNo: number;
  gradingGatePassIds: string[];
  gradingGatePassSnapshots: StorageGatePassGradingSnapshot[];
  date: string;
  variety: string;
  orderDetails: StorageGatePassOrderDetail[];
  editHistory: unknown[];
  remarks: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for POST /storage-gate-pass */
export interface CreateStorageGatePassApiResponse {
  success: boolean;
  data: CreatedStorageGatePass | null;
  message?: string;
}
