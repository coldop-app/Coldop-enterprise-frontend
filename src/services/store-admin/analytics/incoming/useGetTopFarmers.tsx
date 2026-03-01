import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetTopFarmersByBagsApiResponse,
  TopFarmersByBagsData,
} from '@/types/analytics';

/** Query key prefix for top farmers by bags */
export const topFarmersByBagsKeys = {
  all: ['store-admin', 'analytics', 'top-farmers-by-bags'] as const,
};

/** Params for GET /analytics/top-farmers-by-bags (date range in YYYY-MM-DD) */
export interface GetTopFarmersByBagsParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchTopFarmersByBags(
  params: GetTopFarmersByBagsParams
): Promise<TopFarmersByBagsData> {
  const { data } =
    await storeAdminAxiosClient.get<GetTopFarmersByBagsApiResponse>(
      '/analytics/top-farmers-by-bags',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch top farmers by bags');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const topFarmersByBagsQueryOptions = (
  params: GetTopFarmersByBagsParams = {}
) =>
  queryOptions({
    queryKey: [...topFarmersByBagsKeys.all, params] as const,
    queryFn: () => fetchTopFarmersByBags(params),
  });

/** Hook to fetch top farmers by bags for a date range */
export function useGetTopFarmers(params: GetTopFarmersByBagsParams = {}) {
  return useQuery(topFarmersByBagsQueryOptions(params));
}

/** Prefetch top farmers by bags – e.g. on route hover or before navigation */
export function prefetchTopFarmersByBags(
  params: GetTopFarmersByBagsParams = {}
) {
  return queryClient.prefetchQuery(topFarmersByBagsQueryOptions(params));
}
