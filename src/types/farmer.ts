import type { FarmerStorageLink } from '@/types/incoming-gate-pass';

export type { FarmerStorageLink };

/** Payload for POST /store-admin/quick-register-farmer */
export interface QuickRegisterFarmerInput {
  name: string;
  address: string;
  mobileNumber: string;
  coldStorageId: string;
  linkedById: string;
  accountNumber: number;
  station: string;
}

export interface QuickRegisterFarmerApiResponse {
  success: boolean;
  message?: string;
  data?: FarmerStorageLink | null;
}

/** Payload for PUT /farmer-storage-link/:id */
export interface EditFarmerStorageLinkInput {
  name: string;
  mobileNumber: string;
  accountNumber: number;
  address: string;
  station: string;
}

export interface EditFarmerStorageLinkApiResponse {
  success: boolean;
  message?: string;
  data?: FarmerStorageLink | null;
}
