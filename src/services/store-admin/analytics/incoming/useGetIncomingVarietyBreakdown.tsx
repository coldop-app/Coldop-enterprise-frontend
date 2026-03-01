import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetVarietyDistributionApiResponse,
  VarietyDistributionData,
} from '@/types/analytics';

/** Query key prefix for variety distribution (incoming variety breakdown) */
export const varietyDistributionKeys = {
  all: ['store-admin', 'analytics', 'variety-distribution'] as const,
};

/** Params for GET /analytics/variety-distribution (date range in YYYY-MM-DD) */
export interface GetVarietyDistributionParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchVarietyDistribution(
  params: GetVarietyDistributionParams
): Promise<VarietyDistributionData> {
  const { data } =
    await storeAdminAxiosClient.get<GetVarietyDistributionApiResponse>(
      '/analytics/variety-distribution',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch variety distribution');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const varietyDistributionQueryOptions = (
  params: GetVarietyDistributionParams = {}
) =>
  queryOptions({
    queryKey: [...varietyDistributionKeys.all, params] as const,
    queryFn: () => fetchVarietyDistribution(params),
  });

/** Hook to fetch incoming variety breakdown (variety distribution) for a date range */
export function useGetIncomingVarietyBreakdown(
  params: GetVarietyDistributionParams = {}
) {
  return useQuery(varietyDistributionQueryOptions(params));
}

/** Prefetch variety distribution – e.g. on route hover or before navigation */
export function prefetchVarietyDistribution(
  params: GetVarietyDistributionParams = {}
) {
  return queryClient.prefetchQuery(varietyDistributionQueryOptions(params));
}
