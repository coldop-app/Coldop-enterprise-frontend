import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingGatePassReportApiResponse,
  IncomingGatePassReportDataFlat,
  IncomingGatePassReportDataGrouped,
} from '@/types/analytics';

/** Query key prefix for incoming gate pass report */
export const incomingGatePassReportKeys = {
  all: ['store-admin', 'analytics', 'incoming-gate-pass-report'] as const,
};

/** Params for GET /analytics/incoming-gate-pass-report (date range in YYYY-MM-DD) */
export interface GetIncomingGatePassReportParams {
  dateFrom?: string;
  dateTo?: string;
  /** When true, response is grouped by farmer; when false, flat list of gate passes */
  groupByFarmer?: boolean;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchIncomingGatePassReport(
  params: GetIncomingGatePassReportParams
): Promise<IncomingGatePassReportDataGrouped | IncomingGatePassReportDataFlat> {
  const { data } =
    await storeAdminAxiosClient.get<GetIncomingGatePassReportApiResponse>(
      '/analytics/incoming-gate-pass-report',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          groupByFarmer: params.groupByFarmer,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to fetch incoming gate pass report'
    );
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const incomingGatePassReportQueryOptions = (
  params: GetIncomingGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [...incomingGatePassReportKeys.all, params] as const,
    queryFn: () => fetchIncomingGatePassReport(params),
  });

/** Hook to fetch incoming gate pass report for a date range (optionally grouped by farmer) */
export function useGetIncomingGatePassReports(
  params: GetIncomingGatePassReportParams = {}
) {
  return useQuery(incomingGatePassReportQueryOptions(params));
}

/** Prefetch incoming gate pass report – e.g. on route hover or before navigation */
export function prefetchIncomingGatePassReport(
  params: GetIncomingGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(incomingGatePassReportQueryOptions(params));
}
