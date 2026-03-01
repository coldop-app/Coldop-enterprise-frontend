import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetDailyMonthlyTrendApiResponse,
  DailyMonthlyTrendData,
} from '@/types/analytics';

/** Query key prefix for daily/monthly trend (incoming trend analysis) */
export const dailyMonthlyTrendKeys = {
  all: ['store-admin', 'analytics', 'daily-monthly-trend'] as const,
};

/** Params for GET /analytics/daily-monthly-trend (date range in YYYY-MM-DD) */
export interface GetDailyMonthlyTrendParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchDailyMonthlyTrend(
  params: GetDailyMonthlyTrendParams
): Promise<DailyMonthlyTrendData> {
  const { data } =
    await storeAdminAxiosClient.get<GetDailyMonthlyTrendApiResponse>(
      '/analytics/daily-monthly-trend',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch daily/monthly trend');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const dailyMonthlyTrendQueryOptions = (
  params: GetDailyMonthlyTrendParams = {}
) =>
  queryOptions({
    queryKey: [...dailyMonthlyTrendKeys.all, params] as const,
    queryFn: () => fetchDailyMonthlyTrend(params),
  });

/** Hook to fetch incoming trend analysis (daily and monthly) for a date range */
export function useGetIncomingTrendAnalysis(
  params: GetDailyMonthlyTrendParams = {}
) {
  return useQuery(dailyMonthlyTrendQueryOptions(params));
}

/** Prefetch daily/monthly trend – e.g. on route hover or before navigation */
export function prefetchDailyMonthlyTrend(
  params: GetDailyMonthlyTrendParams = {}
) {
  return queryClient.prefetchQuery(dailyMonthlyTrendQueryOptions(params));
}
