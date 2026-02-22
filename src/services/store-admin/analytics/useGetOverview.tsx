import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetAnalyticsOverviewApiResponse,
  AnalyticsOverviewData,
} from '@/types/analytics';

/** Query key prefix for analytics overview */
export const analyticsOverviewKeys = {
  all: ['store-admin', 'analytics', 'overview'] as const,
};

/** Params for fetching analytics overview (date range in YYYY-MM-DD) */
export interface GetOverviewParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchAnalyticsOverview(
  params: GetOverviewParams
): Promise<AnalyticsOverviewData> {
  const { data } =
    await storeAdminAxiosClient.get<GetAnalyticsOverviewApiResponse>(
      '/analytics/overview',
      { params: { dateFrom: params.dateFrom, dateTo: params.dateTo } }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch analytics overview');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const analyticsOverviewQueryOptions = (params: GetOverviewParams = {}) =>
  queryOptions({
    queryKey: [...analyticsOverviewKeys.all, params] as const,
    queryFn: () => fetchAnalyticsOverview(params),
  });

/** Hook to fetch analytics overview */
export function useGetOverview(params: GetOverviewParams = {}) {
  return useQuery(analyticsOverviewQueryOptions(params));
}

/** Prefetch analytics overview – e.g. on route hover or before navigation */
export function prefetchAnalyticsOverview(params: GetOverviewParams = {}) {
  return queryClient.prefetchQuery(analyticsOverviewQueryOptions(params));
}
