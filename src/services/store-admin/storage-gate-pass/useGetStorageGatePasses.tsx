import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageGatePassesApiResponse,
  StorageGatePassPagination,
  StorageGatePassWithLink,
} from '@/types/storage-gate-pass';

/** Query key prefix for storage gate pass – use for invalidation */
export const storageGatePassKeys = {
  all: ['store-admin', 'storage-gate-pass'] as const,
  lists: () => [...storageGatePassKeys.all, 'list'] as const,
};

/** Params for GET /storage-gate-pass (date range in YYYY-MM-DD) */
export interface GetStorageGatePassesParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

type GetStorageGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export interface GetStorageGatePassesResult {
  data: StorageGatePassWithLink[];
  pagination: StorageGatePassPagination;
}

function sanitizeParams(
  params: GetStorageGatePassesParams
): GetStorageGatePassesParams {
  return {
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : undefined,
    limit:
      typeof params.limit === 'number' && params.limit > 0
        ? Math.floor(params.limit)
        : undefined,
    sortOrder: params.sortOrder,
    dateFrom: params.dateFrom?.trim() || undefined,
    dateTo: params.dateTo?.trim() || undefined,
  };
}

function getFetchErrorMessage(
  errorOrData: unknown,
  fallback = 'Failed to fetch storage gate passes'
): string {
  if (isAxiosError<GetStorageGatePassesError>(errorOrData)) {
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
    (errorOrData as GetStorageGatePassesError).error?.message
  ) {
    return (errorOrData as GetStorageGatePassesError).error?.message as string;
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

/** Fetcher used by queryOptions and prefetch */
async function fetchStorageGatePasses(
  params: GetStorageGatePassesParams
): Promise<GetStorageGatePassesResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetStorageGatePassesApiResponse>(
        '/storage-gate-pass',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(getFetchErrorMessage(data));
    }

    const list = Array.isArray(data.data) ? data.data : [];
    const pagination = data.pagination ?? {
      page: safeParams.page ?? 1,
      limit: safeParams.limit ?? 100,
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

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageGatePassesQueryOptions = (
  params: GetStorageGatePassesParams = {}
) =>
  queryOptions({
    queryKey: [
      ...storageGatePassKeys.lists(),
      {
        page: params.page,
        limit: params.limit,
        sortOrder: params.sortOrder,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    ],
    queryFn: () => fetchStorageGatePasses(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Hook to fetch storage gate passes with pagination */
export function useGetStorageGatePasses(
  params: GetStorageGatePassesParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...storageGatePassesQueryOptions(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** Prefetch storage gate passes – e.g. on route hover or before navigation */
export function prefetchStorageGatePasses(
  params: GetStorageGatePassesParams = {}
) {
  return queryClient.prefetchQuery(storageGatePassesQueryOptions(params));
}
