import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetNikasiGatePassReportApiResponse,
  NikasiGatePassReportData,
} from '@/types/analytics';

/** Query key prefix for nikasi (dispatch) gate pass report */
export const nikasiGatePassReportKeys = {
  all: ['store-admin', 'analytics', 'nikasi-gate-pass-report'] as const,
};

/** Params for GET /analytics/nikasi-gate-pass-report (date range in YYYY-MM-DD) */
export interface GetNikasiGatePassReportParams {
  dateFrom?: string;
  dateTo?: string;
  /** When true, response is grouped by farmer */
  groupByFarmer?: boolean;
  /** When true, response is grouped by variety (optionally nested by farmer if groupByFarmer is also true) */
  groupByVariety?: boolean;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchNikasiGatePassReport(
  params: GetNikasiGatePassReportParams
): Promise<NikasiGatePassReportData> {
  const { data } =
    await storeAdminAxiosClient.get<GetNikasiGatePassReportApiResponse>(
      '/analytics/nikasi-gate-pass-report',
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
    throw new Error(data.message ?? 'Failed to fetch nikasi gate pass report');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const nikasiGatePassReportQueryOptions = (
  params: GetNikasiGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [...nikasiGatePassReportKeys.all, params] as const,
    queryFn: () => fetchNikasiGatePassReport(params),
  });

/** Hook to fetch nikasi (dispatch) gate pass report for a date range (optionally grouped by farmer) */
export function useGetNikasiGatePassReports(
  params: GetNikasiGatePassReportParams = {}
) {
  return useQuery(nikasiGatePassReportQueryOptions(params));
}

/** Prefetch nikasi gate pass report – e.g. on route hover or before navigation */
export function prefetchNikasiGatePassReport(
  params: GetNikasiGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(nikasiGatePassReportQueryOptions(params));
}
