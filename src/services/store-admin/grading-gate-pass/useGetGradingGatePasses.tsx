import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingGatePassesApiResponse,
  GradingGatePassPagination,
} from '@/types/grading-gate-pass';

/** Query key prefix for grading gate pass – use for invalidation */
export const gradingGatePassKeys = {
  all: ['store-admin', 'grading-gate-pass'] as const,
  lists: () => [...gradingGatePassKeys.all, 'list'] as const,
  list: (params: GetGradingGatePassesQueryKeyParts) =>
    [...gradingGatePassKeys.lists(), params] as const,
};

/** Params for GET /grading-gate-pass (date range in YYYY-MM-DD) */
export interface GetGradingGatePassesParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  /** When true, fetches all pages (limit per request) and returns combined data */
  fetchAllPages?: boolean;
}

type GetGradingGatePassesQueryKeyParts = {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  fetchAllPages: boolean;
};

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetGradingGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export interface GetGradingGatePassesResult {
  data: GetGradingGatePassesApiResponse['data'];
  pagination: GradingGatePassPagination;
}

function sanitizeParams(
  params: GetGradingGatePassesParams
): Required<Pick<GetGradingGatePassesParams, 'fetchAllPages'>> &
  Omit<GetGradingGatePassesParams, 'fetchAllPages'> {
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
    fetchAllPages: Boolean(params.fetchAllPages),
  };
}

function queryKeyPartsFromParams(
  safe: ReturnType<typeof sanitizeParams>
): GetGradingGatePassesQueryKeyParts {
  const { fetchAllPages, page, limit, sortOrder, dateFrom, dateTo } = safe;
  return {
    page,
    limit,
    sortOrder,
    dateFrom,
    dateTo,
    fetchAllPages,
  };
}

function getFetchErrorMessage(
  errorOrData: unknown,
  fallback = 'Failed to fetch grading gate passes'
): string {
  if (isAxiosError<GetGradingGatePassesError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching grading gate passes';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching grading gate passes';
    }
  }

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'error' in errorOrData &&
    (errorOrData as GetGradingGatePassesError).error?.message
  ) {
    return (errorOrData as GetGradingGatePassesError).error?.message as string;
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

/** Fetcher for a single page */
async function fetchGradingGatePassesPage(
  params: ReturnType<typeof sanitizeParams>
): Promise<GetGradingGatePassesResult> {
  const { data } = await storeAdminAxiosClient.get<
    GetGradingGatePassesApiResponse | GetGradingGatePassesError
  >('/grading-gate-pass', {
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

  const response = data as GetGradingGatePassesApiResponse;
  const list = Array.isArray(response.data) ? response.data : [];
  const pagination = response.pagination ?? {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    total: list.length,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { data: list, pagination };
}

/** Fetcher used by queryOptions and prefetch – fetches one page or all pages when fetchAllPages is true */
async function fetchGradingGatePasses(
  rawParams: GetGradingGatePassesParams
): Promise<GetGradingGatePassesResult> {
  const params = sanitizeParams(rawParams);

  try {
    if (params.fetchAllPages) {
      const limit = params.limit ?? 5000;
      const allData: GetGradingGatePassesApiResponse['data'] = [];
      let page = 1;
      let hasNextPage = true;
      let lastPagination: GradingGatePassPagination = {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      };

      while (hasNextPage) {
        const result = await fetchGradingGatePassesPage({
          ...params,
          fetchAllPages: false,
          page,
          limit,
        });
        allData.push(...result.data);
        lastPagination = result.pagination;
        hasNextPage = result.pagination.hasNextPage;
        page += 1;
      }

      return {
        data: allData,
        pagination: {
          ...lastPagination,
          page: 1,
          limit: Math.max(lastPagination.limit, allData.length),
          total:
            typeof lastPagination.total === 'number' && lastPagination.total > 0
              ? lastPagination.total
              : allData.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    return fetchGradingGatePassesPage(params);
  } catch (error) {
    throw new Error(getFetchErrorMessage(error), { cause: error });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingGatePassesQueryOptions = (
  params: GetGradingGatePassesParams = {}
) => {
  const safe = sanitizeParams(params);
  return queryOptions({
    queryKey: gradingGatePassKeys.list(queryKeyPartsFromParams(safe)),
    queryFn: () => fetchGradingGatePasses(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch grading gate passes with pagination */
export function useGetGradingGatePasses(
  params: GetGradingGatePassesParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...gradingGatePassesQueryOptions(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** Prefetch grading gate passes – e.g. on route hover or before navigation */
export function prefetchGradingGatePasses(
  params: GetGradingGatePassesParams = {}
) {
  return queryClient.prefetchQuery(gradingGatePassesQueryOptions(params));
}
