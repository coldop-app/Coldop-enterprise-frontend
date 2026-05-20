import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageGatePassAuditApiResponse,
  StorageGatePassAuditItem,
  StorageGatePassAuditPagination,
} from '@/types/storage-gate-pass';
import { storageGatePassKeys } from './useGetStorageGatePasses';

export interface GetStorageEditHistoryParams {
  page?: number;
  limit?: number;
}

export interface GetStorageEditHistoryResult {
  data: StorageGatePassAuditItem[];
  pagination?: StorageGatePassAuditPagination;
}

function sanitizeParams(
  params: GetStorageEditHistoryParams
): GetStorageEditHistoryParams {
  return {
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : undefined,
    limit:
      typeof params.limit === 'number' && params.limit > 0
        ? Math.floor(params.limit)
        : undefined,
  };
}

function getStorageEditHistoryErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching storage gate pass audit history';
    }

    if (!error.response) {
      return 'Network error while fetching storage gate pass audit history';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch storage gate pass audit history';
}

async function fetchStorageEditHistory(
  params: GetStorageEditHistoryParams
): Promise<GetStorageEditHistoryResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetStorageGatePassAuditApiResponse>(
        '/storage-gate-pass/audit',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch storage gate pass audit history'
      );
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
      pagination: data.pagination,
    };
  } catch (error) {
    throw new Error(getStorageEditHistoryErrorMessage(error), {
      cause: error,
    });
  }
}

export const storageGatePassEditHistoryQueryOptions = (
  params: GetStorageEditHistoryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [
      ...storageGatePassKeys.all,
      'audit-history',
      {
        page: safeParams.page,
        limit: safeParams.limit,
      },
    ],
    queryFn: () => fetchStorageEditHistory(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

export function useGetStorageEditHistory(
  params: GetStorageEditHistoryParams = {}
) {
  return useQuery({
    ...storageGatePassEditHistoryQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

export function prefetchStorageEditHistory(
  params: GetStorageEditHistoryParams = {}
) {
  return queryClient.prefetchQuery(
    storageGatePassEditHistoryQueryOptions(params)
  );
}
