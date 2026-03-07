import { useQuery, queryOptions } from '@tanstack/react-query';
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
  list: (params: GetStorageGatePassesParams) =>
    [...storageGatePassKeys.lists(), params] as const,
};

/** Params for GET /storage-gate-pass (date range in YYYY-MM-DD) */
export interface GetStorageGatePassesParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetStorageGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetStorageGatePassesError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch storage gate passes'
  );
}

export interface GetStorageGatePassesResult {
  data: StorageGatePassWithLink[];
  pagination: StorageGatePassPagination;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchStorageGatePasses(
  params: GetStorageGatePassesParams
): Promise<GetStorageGatePassesResult> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetStorageGatePassesApiResponse | GetStorageGatePassesError
    >('/storage-gate-pass', {
      params: {
        page: params.page,
        limit: params.limit,
        sortOrder: params.sortOrder,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    });

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    const response = data as GetStorageGatePassesApiResponse;
    const list = response.data ?? [];
    const pagination = response.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 100,
      total: list.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };
    return { data: list, pagination };
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetStorageGatePassesError } }).response
        ?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageGatePassesQueryOptions = (
  params: GetStorageGatePassesParams = {}
) =>
  queryOptions({
    queryKey: storageGatePassKeys.list(params),
    queryFn: () => fetchStorageGatePasses(params),
  });

/** Hook to fetch storage gate passes with pagination */
export function useGetStorageGatePasses(
  params: GetStorageGatePassesParams = {}
) {
  return useQuery(storageGatePassesQueryOptions(params));
}

/** Prefetch storage gate passes – e.g. on route hover or before navigation */
export function prefetchStorageGatePasses(
  params: GetStorageGatePassesParams = {}
) {
  return queryClient.prefetchQuery(storageGatePassesQueryOptions(params));
}
