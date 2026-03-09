import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetFarmersStockByFiltersApiResponse,
  FarmersStockByFiltersData,
} from '@/types/analytics';

/** Query key prefix for farmers stock by filters (area breakdown) */
export const areaBreakdownKeys = {
  all: ['store-admin', 'analytics', 'farmers-stock-by-filters'] as const,
  list: (params: GetAreaBreakdownParams) =>
    [...areaBreakdownKeys.all, params] as const,
};

/** Params for GET /analytics/farmers-stock-by-filters (area, size, variety) */
export interface GetAreaBreakdownParams {
  area?: string;
  size?: string;
  variety?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchAreaBreakdown(
  params: GetAreaBreakdownParams
): Promise<FarmersStockByFiltersData> {
  const { data } =
    await storeAdminAxiosClient.get<GetFarmersStockByFiltersApiResponse>(
      '/analytics/farmers-stock-by-filters',
      {
        params: {
          area: params.area,
          size: params.size,
          variety: params.variety,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch farmers stock by filters');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const areaBreakdownQueryOptions = (
  params: GetAreaBreakdownParams = {}
) =>
  queryOptions({
    queryKey: areaBreakdownKeys.list(params),
    queryFn: () => fetchAreaBreakdown(params),
  });

/** Hook to fetch farmers stock filtered by area, size, and/or variety (area breakdown) */
export function useGetAreaBreakdown(params: GetAreaBreakdownParams = {}) {
  const hasFilters =
    (params.area?.trim()?.length ?? 0) > 0 ||
    (params.size?.trim()?.length ?? 0) > 0 ||
    (params.variety?.trim()?.length ?? 0) > 0;

  return useQuery({
    ...areaBreakdownQueryOptions(params),
    enabled: hasFilters,
  });
}

/** Prefetch area breakdown – e.g. on route hover or before navigation */
export function prefetchAreaBreakdown(params: GetAreaBreakdownParams = {}) {
  return queryClient.prefetchQuery(areaBreakdownQueryOptions(params));
}
