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

/** Payload for PUT /farmer-storage-link/:id (partial updates supported) */
export interface EditFarmerStorageLinkInput {
  name?: string;
  mobileNumber?: string;
  accountNumber?: number;
  address?: string;
  stationId?: string;
  localityId?: string;
  netProfitToCompany?: number;
  netProfitToCompanyPerAcre?: number;
}

export interface EditFarmerStorageLinkApiResponse {
  success: boolean;
  message?: string;
  data?: FarmerStorageLink | null;
}

/** Single item in PATCH /farmer-storage-link/bulk/net-profit */
export interface BulkNetProfitUpdate {
  farmerStorageLinkId: string;
  netProfitToCompany: number;
  netProfitToCompanyPerAcre?: number;
}

export interface BulkNetProfitSkippedItem {
  farmerStorageLinkId: string;
  reason: string;
}

export interface BulkNetProfitSyncApiResponse {
  success: boolean;
  message?: string;
  data?: {
    updatedCount: number;
    skipped: BulkNetProfitSkippedItem[];
  };
}
