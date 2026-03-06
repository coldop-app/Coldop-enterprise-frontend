import { useQuery, queryOptions } from '@tanstack/react-query';
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
  list: (params: GetGradingGatePassesParams) =>
    [...gradingGatePassKeys.lists(), params] as const,
};

/** Params for GET /grading-gate-pass (date range in YYYY-MM-DD) */
export interface GetGradingGatePassesParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetGradingGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetGradingGatePassesError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch grading gate passes'
  );
}

export interface GetGradingGatePassesResult {
  data: GetGradingGatePassesApiResponse['data'];
  pagination: GradingGatePassPagination;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchGradingGatePasses(
  params: GetGradingGatePassesParams
): Promise<GetGradingGatePassesResult> {
  try {
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
    const list = response.data ?? [];
    const pagination = response.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
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
      (err as { response?: { data?: GetGradingGatePassesError } }).response
        ?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingGatePassesQueryOptions = (
  params: GetGradingGatePassesParams = {}
) =>
  queryOptions({
    queryKey: gradingGatePassKeys.list(params),
    queryFn: () => fetchGradingGatePasses(params),
  });

/** Hook to fetch grading gate passes with pagination */
export function useGetGradingGatePasses(
  params: GetGradingGatePassesParams = {}
) {
  return useQuery(gradingGatePassesQueryOptions(params));
}

/** Prefetch grading gate passes – e.g. on route hover or before navigation */
export function prefetchGradingGatePasses(
  params: GetGradingGatePassesParams = {}
) {
  return queryClient.prefetchQuery(gradingGatePassesQueryOptions(params));
}
