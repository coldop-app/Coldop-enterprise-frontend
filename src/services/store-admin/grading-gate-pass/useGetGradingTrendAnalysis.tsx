import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingTrendApiResponse,
  GradingTrendData,
} from '@/types/analytics';

/** Query key prefix for grading daily/monthly trend */
export const gradingTrendKeys = {
  all: ['store-admin', 'analytics', 'grading-daily-monthly-trend'] as const,
  list: (params: GetGradingTrendParams) =>
    [...gradingTrendKeys.all, params] as const,
};

/** Params for GET /analytics/grading-daily-monthly-trend (date range in YYYY-MM-DD) */
export interface GetGradingTrendParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchGradingTrend(
  params: GetGradingTrendParams
): Promise<GradingTrendData> {
  const { data } = await storeAdminAxiosClient.get<GetGradingTrendApiResponse>(
    '/analytics/grading-daily-monthly-trend',
    {
      params: {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    }
  );

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to fetch grading daily/monthly trend'
    );
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingTrendQueryOptions = (params: GetGradingTrendParams = {}) =>
  queryOptions({
    queryKey: gradingTrendKeys.list(params),
    queryFn: () => fetchGradingTrend(params),
  });

/** Hook to fetch grading trend analysis (daily and monthly) for a date range */
export function useGetGradingTrendAnalysis(params: GetGradingTrendParams = {}) {
  return useQuery(gradingTrendQueryOptions(params));
}

/** Prefetch grading trend – e.g. on route hover or before navigation */
export function prefetchGradingTrendAnalysis(
  params: GetGradingTrendParams = {}
) {
  return queryClient.prefetchQuery(gradingTrendQueryOptions(params));
}
