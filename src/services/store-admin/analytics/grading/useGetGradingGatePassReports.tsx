import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingGatePassReportApiResponse,
  GradingGatePassReportData,
} from '@/types/analytics';

/** Query key prefix for grading gate pass report */
export const gradingGatePassReportKeys = {
  all: ['store-admin', 'analytics', 'grading-gate-pass-report'] as const,
};

/** Params for GET /analytics/grading-gate-pass-report (date range in YYYY-MM-DD) */
export interface GetGradingGatePassReportParams {
  dateFrom?: string;
  dateTo?: string;
  /** When true, response is grouped by farmer */
  groupByFarmer?: boolean;
  /** When true, response is grouped by variety (optionally nested by farmer if groupByFarmer is also true) */
  groupByVariety?: boolean;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchGradingGatePassReport(
  params: GetGradingGatePassReportParams
): Promise<GradingGatePassReportData> {
  const { data } =
    await storeAdminAxiosClient.get<GetGradingGatePassReportApiResponse>(
      '/analytics/grading-gate-pass-report',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          groupByFarmer: params.groupByFarmer,
          groupByVariety: params.groupByVariety,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch grading gate pass report');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingGatePassReportQueryOptions = (
  params: GetGradingGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [...gradingGatePassReportKeys.all, params] as const,
    queryFn: () => fetchGradingGatePassReport(params),
  });

/** Hook to fetch grading gate pass report for a date range (optionally grouped by farmer) */
export function useGetGradingGatePassReports(
  params: GetGradingGatePassReportParams = {}
) {
  return useQuery(gradingGatePassReportQueryOptions(params));
}

/** Prefetch grading gate pass report – e.g. on route hover or before navigation */
export function prefetchGradingGatePassReport(
  params: GetGradingGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(gradingGatePassReportQueryOptions(params));
}
