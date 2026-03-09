import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetAreaWiseSizeDistributionApiResponse,
  AreaWiseSizeDistributionData,
} from '@/types/analytics';

/** Query key prefix for area-wise size distribution */
export const areaWiseAnalyticsKeys = {
  all: ['store-admin', 'analytics', 'area-wise-size-distribution'] as const,
  list: (params: GetAreaWiseAnalyticsParams) =>
    [...areaWiseAnalyticsKeys.all, params] as const,
};

/** Params for GET /analytics/area-wise-size-distribution (date range in YYYY-MM-DD) */
export interface GetAreaWiseAnalyticsParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchAreaWiseAnalytics(
  params: GetAreaWiseAnalyticsParams
): Promise<AreaWiseSizeDistributionData> {
  const { data } =
    await storeAdminAxiosClient.get<GetAreaWiseSizeDistributionApiResponse>(
      '/analytics/area-wise-size-distribution',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to fetch area-wise size distribution'
    );
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const areaWiseAnalyticsQueryOptions = (
  params: GetAreaWiseAnalyticsParams = {}
) =>
  queryOptions({
    queryKey: areaWiseAnalyticsKeys.list(params),
    queryFn: () => fetchAreaWiseAnalytics(params),
  });

/** Hook to fetch area-wise size distribution (chart data) for a date range */
export function useGetAreaWiseAnalytics(
  params: GetAreaWiseAnalyticsParams = {}
) {
  return useQuery(areaWiseAnalyticsQueryOptions(params));
}

/** Prefetch area-wise size distribution – e.g. on route hover or before navigation */
export function prefetchAreaWiseAnalytics(
  params: GetAreaWiseAnalyticsParams = {}
) {
  return queryClient.prefetchQuery(areaWiseAnalyticsQueryOptions(params));
}
