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

/** Params for GET /analytics/farmers-stock-by-filters (area, variety) */
export interface GetAreaBreakdownParams {
  area?: string;
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
          variety: params.variety,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch farmers stock by filters');
  }

  const raw = data.data;
  return {
    farmers: (raw.farmers ?? []).map((entry) => ({
      ...entry,
      varieties: (entry.varieties ?? []).map((v) => ({
        ...v,
        sizes: (v.sizes ?? []).map((s) => {
          const w = (s as { weightExcludingBardanaKg?: unknown })
            .weightExcludingBardanaKg;
          const wSnake = (s as { weight_excluding_bardana_kg?: unknown })
            .weight_excluding_bardana_kg;
          const weightRaw = w ?? wSnake;
          const weightExcludingBardanaKg =
            weightRaw != null && weightRaw !== ''
              ? Number(weightRaw)
              : undefined;
          return {
            size: s.size ?? '',
            stock: Number(s.stock ?? 0),
            weightExcludingBardanaKg:
              weightExcludingBardanaKg != null &&
              !Number.isNaN(weightExcludingBardanaKg)
                ? weightExcludingBardanaKg
                : undefined,
          };
        }),
      })),
    })),
  };
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const areaBreakdownQueryOptions = (
  params: GetAreaBreakdownParams = {}
) =>
  queryOptions({
    queryKey: areaBreakdownKeys.list(params),
    queryFn: () => fetchAreaBreakdown(params),
  });

/** Hook to fetch farmers stock filtered by area and/or variety (area breakdown) */
export function useGetAreaBreakdown(params: GetAreaBreakdownParams = {}) {
  const hasFilters =
    (params.area?.trim()?.length ?? 0) > 0 ||
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
