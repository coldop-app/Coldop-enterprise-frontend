import {
  useQuery,
  queryOptions,
  keepPreviousData,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingGatePassesApiResponse,
  IncomingGatePassPagination,
  IncomingGatePassWithLink,
} from '@/types/incoming-gate-pass';

export const INCOMING_GATE_PASS_STATUS_NOT_GRADED = 'NOT_GRADED';
export const incomingGatePassKeys = {
  all: ['incoming-gate-pass'] as const,
};

/** Date range in YYYY-MM-DD. Example: ?page=1&limit=50&sortOrder=desc&status=NOT_GRADED */
export interface GetIncomingGatePassesParams {
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export interface GetIncomingGatePassesResult {
  data: IncomingGatePassWithLink[];
  pagination?: IncomingGatePassPagination;
}

function sanitizeParams(
  params: GetIncomingGatePassesParams
): GetIncomingGatePassesParams {
  return {
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : undefined,
    limit:
      typeof params.limit === 'number' && params.limit > 0
        ? Math.floor(params.limit)
        : undefined,
    sortOrder: params.sortOrder,
    status: params.status?.trim() || undefined,
  };
}

function getIncomingGatePassesErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching incoming gate passes';
    }

    if (!error.response) {
      return 'Network error while fetching incoming gate passes';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch incoming gate passes';
}

async function fetchIncomingGatePasses(
  params: GetIncomingGatePassesParams
): Promise<GetIncomingGatePassesResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetIncomingGatePassesApiResponse>(
        '/incoming-gate-pass',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(data.message ?? 'Failed to fetch incoming gate passes');
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
      pagination: data.pagination,
    };
  } catch (error) {
    throw new Error(getIncomingGatePassesErrorMessage(error), { cause: error });
  }
}

/** Query options — usable with useQuery, prefetchQuery, or route loaders */
export const incomingGatePassesQueryOptions = (
  params: GetIncomingGatePassesParams = {}
) =>
  queryOptions({
    // Explicit key fields prevent accidental cache-busting from object identity
    queryKey: [
      ...incomingGatePassKeys.all,
      'list',
      {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        page: params.page,
        limit: params.limit,
        sortOrder: params.sortOrder,
        status: params.status,
      },
    ],
    queryFn: () => fetchIncomingGatePasses(params),
    staleTime: 1000 * 60 * 2, // 2 min — prevents refetch on every mount
  });

/** Hook to fetch paginated gate passes — retains previous data during page/filter changes */
export function useGetIncomingGatePasses(
  params: GetIncomingGatePassesParams = {}
) {
  return useQuery({
    ...incomingGatePassesQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

/** Hook that returns only the data array — for non-paginated consumers */
export function useGetIncomingGatePassList(
  params: GetIncomingGatePassesParams = {}
) {
  return useQuery({
    ...incomingGatePassesQueryOptions(params),
    placeholderData: keepPreviousData,
    select: (result) => result.data,
  });
}

/** Prefetch on route hover or before navigation */
export function prefetchIncomingGatePasses(
  params: GetIncomingGatePassesParams = {}
) {
  return queryClient.prefetchQuery(incomingGatePassesQueryOptions(params));
}
