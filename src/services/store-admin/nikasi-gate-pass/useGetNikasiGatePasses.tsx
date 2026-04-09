import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetNikasiGatePassesApiResponse,
  NikasiGatePassPagination,
  NikasiGatePassWithLink,
} from '@/types/nikasi-gate-pass';

/** Query key prefix for nikasi gate pass – use for invalidation */
export const nikasiGatePassKeys = {
  all: ['store-admin', 'nikasi-gate-pass'] as const,
  lists: () => [...nikasiGatePassKeys.all, 'list'] as const,
  list: (params: GetNikasiGatePassesParams) =>
    [...nikasiGatePassKeys.lists(), params] as const,
};

/** Params for GET /nikasi-gate-pass (date range in YYYY-MM-DD) */
export interface GetNikasiGatePassesParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetNikasiGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetNikasiGatePassesError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch nikasi gate passes'
  );
}

/** Fetcher used by queryOptions and prefetch */
export interface GetNikasiGatePassesResult {
  data: NikasiGatePassWithLink[];
  pagination: NikasiGatePassPagination;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchNikasiGatePasses(
  params: GetNikasiGatePassesParams
): Promise<GetNikasiGatePassesResult> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetNikasiGatePassesApiResponse | GetNikasiGatePassesError
    >('/nikasi-gate-pass', {
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

    const response = data as GetNikasiGatePassesApiResponse;
    const list = response.data ?? [];
    const pagination = response.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
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
      (err as { response?: { data?: GetNikasiGatePassesError } }).response
        ?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const nikasiGatePassesQueryOptions = (
  params: GetNikasiGatePassesParams = {}
) =>
  queryOptions({
    queryKey: nikasiGatePassKeys.list(params),
    queryFn: () => fetchNikasiGatePasses(params),
  });

/** Hook to fetch nikasi gate passes with pagination */
export function useGetNikasiGatePasses(params: GetNikasiGatePassesParams = {}) {
  return useQuery(nikasiGatePassesQueryOptions(params));
}

/** Prefetch nikasi gate passes – e.g. on route hover or before navigation */
export function prefetchNikasiGatePasses(
  params: GetNikasiGatePassesParams = {}
) {
  return queryClient.prefetchQuery(nikasiGatePassesQueryOptions(params));
}
