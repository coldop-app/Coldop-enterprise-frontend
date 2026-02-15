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

/** Fetcher used by queryOptions and prefetch */
async function fetchAnalyticsOverview(): Promise<AnalyticsOverviewData> {
  const { data } =
    await storeAdminAxiosClient.get<GetAnalyticsOverviewApiResponse>(
      '/analytics/overview'
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch analytics overview');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const analyticsOverviewQueryOptions = () =>
  queryOptions({
    queryKey: analyticsOverviewKeys.all,
    queryFn: fetchAnalyticsOverview,
  });

/** Hook to fetch analytics overview */
export function useGetOverview() {
  return useQuery(analyticsOverviewQueryOptions());
}

/** Prefetch analytics overview – e.g. on route hover or before navigation */
export function prefetchAnalyticsOverview() {
  return queryClient.prefetchQuery(analyticsOverviewQueryOptions());
}
