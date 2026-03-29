import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingDailyBreakdownApiResponse,
  IncomingDailyBreakdownData,
} from '@/types/analytics';

/** Query key prefix for incoming daily breakdown (by calendar date) */
export const incomingDailyBreakdownKeys = {
  all: ['store-admin', 'analytics', 'incoming-daily-breakdown'] as const,
};

/** Params for GET /incoming-gate-pass/incoming-daily-breakdown (date in YYYY-MM-DD) */
export interface GetIncomingDailyBreakdownParams {
  date?: string;
}

async function fetchIncomingDailyBreakdown(
  params: GetIncomingDailyBreakdownParams
): Promise<IncomingDailyBreakdownData> {
  const { data } =
    await storeAdminAxiosClient.get<GetIncomingDailyBreakdownApiResponse>(
      '/incoming-gate-pass/incoming-daily-breakdown',
      {
        params: { date: params.date },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch incoming daily breakdown');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const incomingDailyBreakdownQueryOptions = (
  params: GetIncomingDailyBreakdownParams = {}
) =>
  queryOptions({
    queryKey: [...incomingDailyBreakdownKeys.all, params] as const,
    queryFn: () => fetchIncomingDailyBreakdown(params),
    enabled: Boolean(params.date),
  });

/** Hook to fetch incoming gate passes for a single day, grouped by location */
export function useGetIncomingDailyBreakdown(
  params: GetIncomingDailyBreakdownParams = {}
) {
  return useQuery(incomingDailyBreakdownQueryOptions(params));
}

/** Prefetch incoming daily breakdown – e.g. before navigation from trend chart */
export function prefetchIncomingDailyBreakdown(
  params: GetIncomingDailyBreakdownParams = {}
) {
  return queryClient.prefetchQuery(incomingDailyBreakdownQueryOptions(params));
}
