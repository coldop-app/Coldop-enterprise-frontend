import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingGatePassesApiResponse,
  IncomingGatePassPagination,
  IncomingGatePassWithLink,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useCreateIncomingGatePass';

/** Status value for filtering ungraded incoming gate passes (API expects this exact string) */
export const INCOMING_GATE_PASS_STATUS_NOT_GRADED = 'NOT_GRADED';

/** Params for fetching incoming gate passes (date range in YYYY-MM-DD). Example: ?page=1&limit=50&sortOrder=desc&status=NOT_GRADED&dateFrom=2025-01-01&dateTo=2025-03-31 */
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

/** Fetcher used by queryOptions and prefetch */
async function fetchIncomingGatePasses(
  params: GetIncomingGatePassesParams
): Promise<GetIncomingGatePassesResult> {
  const { data } =
    await storeAdminAxiosClient.get<GetIncomingGatePassesApiResponse>(
      '/incoming-gate-pass',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          page: params.page,
          limit: params.limit,
          sortOrder: params.sortOrder,
          status: params.status,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch incoming gate passes');
  }

  return {
    data: data.data,
    pagination: data.pagination,
  };
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const incomingGatePassesQueryOptions = (
  params: GetIncomingGatePassesParams = {}
) =>
  queryOptions({
    queryKey: [...incomingGatePassKeys.all, 'list', params] as const,
    queryFn: () => fetchIncomingGatePasses(params),
  });

/** Hook to fetch incoming gate passes for a date range */
export function useGetIncomingGatePasses(
  params: GetIncomingGatePassesParams = {}
) {
  return useQuery(incomingGatePassesQueryOptions(params));
}

/** Prefetch incoming gate passes – e.g. on route hover or before navigation */
export function prefetchIncomingGatePasses(
  params: GetIncomingGatePassesParams = {}
) {
  return queryClient.prefetchQuery(incomingGatePassesQueryOptions(params));
}
