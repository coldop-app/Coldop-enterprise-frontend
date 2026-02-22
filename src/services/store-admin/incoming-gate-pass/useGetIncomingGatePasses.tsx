import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingGatePassesApiResponse,
  IncomingGatePassWithLink,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useCreateIncomingGatePass';

/** Params for fetching incoming gate passes (date range in YYYY-MM-DD) */
export interface GetIncomingGatePassesParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchIncomingGatePasses(
  params: GetIncomingGatePassesParams
): Promise<IncomingGatePassWithLink[]> {
  const { data } =
    await storeAdminAxiosClient.get<GetIncomingGatePassesApiResponse>(
      '/incoming-gate-pass',
      { params: { dateFrom: params.dateFrom, dateTo: params.dateTo } }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch incoming gate passes');
  }

  return data.data;
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
