import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageGatePassesApiResponse,
  StorageGatePassPagination,
  StorageGatePassWithLink,
} from '@/types/storage-gate-pass';
import { storageGatePassKeys } from './useGetStorageGatePasses';

export interface GetStorageGatePassesForFarmerParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
}

type GetStorageGatePassesForFarmerError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export interface GetStorageGatePassesForFarmerResult {
  data: StorageGatePassWithLink[];
  pagination: StorageGatePassPagination;
}

export const storageGatePassesForFarmerKeys = {
  all: [...storageGatePassKeys.all, 'by-farmer'] as const,
  list: (
    farmerStorageLinkId: string,
    params: GetStorageGatePassesForFarmerParams
  ) =>
    [
      ...storageGatePassesForFarmerKeys.all,
      farmerStorageLinkId,
      {
        page: params.page,
        limit: params.limit,
        sortOrder: params.sortOrder,
      },
    ] as const,
};

function sanitizeParams(
  params: GetStorageGatePassesForFarmerParams
): GetStorageGatePassesForFarmerParams {
  return {
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : 1,
    limit:
      typeof params.limit === 'number' && params.limit > 0
        ? Math.floor(params.limit)
        : 50,
    sortOrder: params.sortOrder ?? 'desc',
  };
}

function getFetchErrorMessage(
  errorOrData: unknown,
  fallback = 'Failed to fetch storage gate passes for farmer'
): string {
  if (isAxiosError<GetStorageGatePassesForFarmerError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching storage gate passes';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching storage gate passes';
    }
  }

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'error' in errorOrData &&
    (errorOrData as GetStorageGatePassesForFarmerError).error?.message
  ) {
    return (errorOrData as GetStorageGatePassesForFarmerError).error
      ?.message as string;
  }

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'message' in errorOrData &&
    typeof (errorOrData as { message?: unknown }).message === 'string'
  ) {
    return (errorOrData as { message: string }).message;
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return fallback;
}

async function fetchStorageGatePassesForFarmer(
  farmerStorageLinkId: string,
  params: GetStorageGatePassesForFarmerParams
): Promise<GetStorageGatePassesForFarmerResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetStorageGatePassesApiResponse>(
        `/storage-gate-pass/farmer-storage-link/${encodeURIComponent(
          farmerStorageLinkId
        )}`,
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(getFetchErrorMessage(data));
    }

    const list = Array.isArray(data.data) ? data.data : [];
    const pagination = data.pagination ?? {
      page: safeParams.page ?? 1,
      limit: safeParams.limit ?? 50,
      total: list.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    return { data: list, pagination };
  } catch (error) {
    throw new Error(getFetchErrorMessage(error), { cause: error });
  }
}

export function storageGatePassesForFarmerQueryOptions(
  farmerStorageLinkId: string,
  params: GetStorageGatePassesForFarmerParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryOptions({
    queryKey: storageGatePassesForFarmerKeys.list(
      farmerStorageLinkId,
      safeParams
    ),
    queryFn: () =>
      fetchStorageGatePassesForFarmer(farmerStorageLinkId, safeParams),
    enabled: Boolean(farmerStorageLinkId),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

/** GET /storage-gate-pass/farmer-storage-link/:id */
export function useGetStorageGatePassesForFarmer(
  farmerStorageLinkId: string,
  params: GetStorageGatePassesForFarmerParams = {}
) {
  return useQuery(
    storageGatePassesForFarmerQueryOptions(farmerStorageLinkId, params)
  );
}

export function prefetchStorageGatePassesForFarmer(
  farmerStorageLinkId: string,
  params: GetStorageGatePassesForFarmerParams = {}
) {
  return queryClient.prefetchQuery(
    storageGatePassesForFarmerQueryOptions(farmerStorageLinkId, params)
  );
}

export const STORAGE_GATE_PASSES_FOR_FARMER_QUERY_PARAMS: GetStorageGatePassesForFarmerParams =
  {
    page: 1,
    limit: 50,
    sortOrder: 'desc',
  };
