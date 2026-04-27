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
}

export interface QuickRegisterFarmerApiResponse {
  success: boolean;
  message?: string;
  data?: FarmerStorageLink | null;
}
