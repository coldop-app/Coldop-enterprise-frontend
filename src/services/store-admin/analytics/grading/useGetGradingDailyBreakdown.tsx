import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingDailyBreakdownApiResponse,
  GradingDailyBreakdownData,
} from '@/types/analytics';

/** Query key prefix for grading daily breakdown (by calendar date) */
export const gradingDailyBreakdownKeys = {
  all: ['store-admin', 'analytics', 'grading-daily-breakdown'] as const,
};

/** Params for GET /grading-gate-pass/grading-daily-breakdown (date in YYYY-MM-DD) */
export interface GetGradingDailyBreakdownParams {
  date?: string;
}

async function fetchGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams
): Promise<GradingDailyBreakdownData> {
  const { data } =
    await storeAdminAxiosClient.get<GetGradingDailyBreakdownApiResponse>(
      '/grading-gate-pass/grading-daily-breakdown',
      {
        params: { date: params.date },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch grading daily breakdown');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingDailyBreakdownQueryOptions = (
  params: GetGradingDailyBreakdownParams = {}
) =>
  queryOptions({
    queryKey: [...gradingDailyBreakdownKeys.all, params] as const,
    queryFn: () => fetchGradingDailyBreakdown(params),
    enabled: Boolean(params.date),
  });

/** Hook to fetch grading gate passes for a single day, grouped by grader */
export function useGetGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams = {}
) {
  return useQuery(gradingDailyBreakdownQueryOptions(params));
}

/** Prefetch grading daily breakdown – e.g. before navigation from trend chart */
export function prefetchGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams = {}
) {
  return queryClient.prefetchQuery(gradingDailyBreakdownQueryOptions(params));
}
