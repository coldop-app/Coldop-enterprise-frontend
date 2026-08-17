import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetDispatchPostStorageListApiResponse,
  GetDispatchPostStorageListParams,
  GetDispatchPostStorageListResult,
} from '@/types/dispatch-post-storage';

export const dispatchPostStorageKeys = {
  all: ['store-admin', 'dispatch-post-storage'] as const,
  lists: () => [...dispatchPostStorageKeys.all, 'list'] as const,
};

type GetDispatchPostStorageError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function sanitizeParams(
  params: GetDispatchPostStorageListParams
): GetDispatchPostStorageListParams {
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
  };
}

function getFetchErrorMessage(
  errorOrData: unknown,
  fallback = 'Failed to fetch dispatch (post storage) entries'
): string {
  if (isAxiosError<GetDispatchPostStorageError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching dispatch (post storage) entries';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching dispatch (post storage) entries';
    }
  }

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'error' in errorOrData &&
    (errorOrData as GetDispatchPostStorageError).error?.message
  ) {
    return (errorOrData as GetDispatchPostStorageError).error
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

async function fetchDispatchPostStorageList(
  params: GetDispatchPostStorageListParams
): Promise<GetDispatchPostStorageListResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetDispatchPostStorageListApiResponse>(
        '/dispatch-post-storage',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(getFetchErrorMessage(data));
    }

    const list = Array.isArray(data.data) ? data.data : [];
    const pagination = data.pagination ?? {
      page: safeParams.page ?? 1,
      limit: safeParams.limit ?? 10,
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

export const dispatchPostStorageListQueryOptions = (
  params: GetDispatchPostStorageListParams = {}
) =>
  queryOptions({
    queryKey: [
      ...dispatchPostStorageKeys.lists(),
      {
        page: params.page,
        limit: params.limit,
        sortOrder: params.sortOrder,
      },
    ],
    queryFn: () => fetchDispatchPostStorageList(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Hook to fetch dispatch (post storage) entries with pagination. GET /dispatch-post-storage */
export function useGetDispatchPostStorage(
  params: GetDispatchPostStorageListParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...dispatchPostStorageListQueryOptions(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

export function prefetchDispatchPostStorageList(
  params: GetDispatchPostStorageListParams = {}
) {
  return queryClient.prefetchQuery(dispatchPostStorageListQueryOptions(params));
}
