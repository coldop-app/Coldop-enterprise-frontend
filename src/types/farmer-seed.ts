export type FarmerSeedEntryListItem = Record<string, unknown>;

export interface FarmerSeedEntryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetAllFarmerSeedEntriesApiResponse {
  success: boolean;
  message?: string;
  data: FarmerSeedEntryListItem[];
  pagination?: FarmerSeedEntryPagination;
}

export interface CreateFarmerSeedBagSizeInput {
  quantity: number | string;
  rate: number | string;
  acres?: number | string;
  [key: string]: unknown;
}

export interface CreateFarmerSeedInput {
  gatePassNo?: number | string;
  invoiceNumber?: string;
  bagSizes: CreateFarmerSeedBagSizeInput[];
  [key: string]: unknown;
}

export interface CreateFarmerSeedApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

export interface EditFarmerSeedInput {
  gatePassNo?: number | string;
  bagSizes?: CreateFarmerSeedBagSizeInput[];
  remarks?: string;
  [key: string]: unknown;
}

export interface EditFarmerSeedApiResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}
