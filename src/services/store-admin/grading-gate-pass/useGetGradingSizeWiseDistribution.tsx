import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetSizeDistributionApiResponse,
  SizeDistributionData,
} from '@/types/analytics';

/** Query key prefix for grading size-wise distribution */
export const gradingSizeWiseDistributionKeys = {
  all: ['store-admin', 'analytics', 'size-distribution'] as const,
  list: (params: GetGradingSizeWiseDistributionParams) =>
    [...gradingSizeWiseDistributionKeys.all, params] as const,
};

/** Params for GET /analytics/size-distribution (date range in YYYY-MM-DD) */
export interface GetGradingSizeWiseDistributionParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchGradingSizeWiseDistribution(
  params: GetGradingSizeWiseDistributionParams
): Promise<SizeDistributionData> {
  const { data } =
    await storeAdminAxiosClient.get<GetSizeDistributionApiResponse>(
      '/analytics/size-distribution',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to fetch grading size-wise distribution'
    );
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingSizeWiseDistributionQueryOptions = (
  params: GetGradingSizeWiseDistributionParams = {}
) =>
  queryOptions({
    queryKey: gradingSizeWiseDistributionKeys.list(params),
    queryFn: () => fetchGradingSizeWiseDistribution(params),
  });

/** Hook to fetch grading size-wise distribution (chart data) for a date range */
export function useGetGradingSizeWiseDistribution(
  params: GetGradingSizeWiseDistributionParams = {}
) {
  return useQuery(gradingSizeWiseDistributionQueryOptions(params));
}

/** Prefetch grading size-wise distribution – e.g. on route hover or before navigation */
export function prefetchGradingSizeWiseDistribution(
  params: GetGradingSizeWiseDistributionParams = {}
) {
  return queryClient.prefetchQuery(
    gradingSizeWiseDistributionQueryOptions(params)
  );
}
