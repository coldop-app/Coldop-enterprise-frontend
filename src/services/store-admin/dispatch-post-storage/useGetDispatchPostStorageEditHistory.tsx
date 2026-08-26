import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetDispatchPostStorageAuditApiResponse,
  GetDispatchPostStorageAuditResult,
  DispatchPostStoragePagination,
} from '@/types/dispatch-post-storage';
import { dispatchPostStorageKeys } from './useGetDispatchPostStorage';

export interface GetDispatchPostStorageEditHistoryParams {
  page?: number;
  limit?: number;
}

const MAX_PAGE_LIMIT = 100;

type DispatchPostStorageAuditError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function sanitizeParams(
  params: GetDispatchPostStorageEditHistoryParams
): GetDispatchPostStorageEditHistoryParams {
  const limit =
    typeof params.limit === 'number' && params.limit > 0
      ? Math.min(Math.floor(params.limit), MAX_PAGE_LIMIT)
      : undefined;

  return {
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : undefined,
    limit,
  };
}

function getDispatchPostStorageEditHistoryErrorMessage(error: unknown): string {
  if (isAxiosError<DispatchPostStorageAuditError>(error)) {
    const apiData = error.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching dispatch (post storage) audit history';
    }

    if (!error.response) {
      return 'Network error while fetching dispatch (post storage) audit history';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch dispatch (post storage) audit history';
}

async function fetchDispatchPostStorageEditHistory(
  params: GetDispatchPostStorageEditHistoryParams
): Promise<GetDispatchPostStorageAuditResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetDispatchPostStorageAuditApiResponse>(
        '/dispatch-post-storage/audit',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(
        data.error?.message ??
          data.message ??
          'Failed to fetch dispatch (post storage) audit history'
      );
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
      pagination: data.pagination as DispatchPostStoragePagination | undefined,
    };
  } catch (error) {
    throw new Error(getDispatchPostStorageEditHistoryErrorMessage(error), {
      cause: error,
    });
  }
}

export const dispatchPostStorageEditHistoryQueryOptions = (
  params: GetDispatchPostStorageEditHistoryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [
      ...dispatchPostStorageKeys.all,
      'audit-history',
      {
        page: safeParams.page,
        limit: safeParams.limit,
      },
    ],
    queryFn: () => fetchDispatchPostStorageEditHistory(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

export function useGetDispatchPostStorageEditHistory(
  params: GetDispatchPostStorageEditHistoryParams = {}
) {
  return useQuery({
    ...dispatchPostStorageEditHistoryQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

export function prefetchDispatchPostStorageEditHistory(
  params: GetDispatchPostStorageEditHistoryParams = {}
) {
  return queryClient.prefetchQuery(
    dispatchPostStorageEditHistoryQueryOptions(params)
  );
}
