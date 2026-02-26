import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageGatePassReportApiResponse,
  StorageGatePassReportData,
} from '@/types/analytics';

/** Query key prefix for storage gate pass report */
export const storageGatePassReportKeys = {
  all: ['store-admin', 'analytics', 'storage-gate-pass-report'] as const,
};

/** Params for GET /analytics/storage-gate-pass-report (date range in YYYY-MM-DD) */
export interface GetStorageGatePassReportParams {
  dateFrom?: string;
  dateTo?: string;
  /** When true, response is grouped by farmer */
  groupByFarmer?: boolean;
  /** When true, response is grouped by variety (optionally nested by farmer if groupByFarmer is also true) */
  groupByVariety?: boolean;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchStorageGatePassReport(
  params: GetStorageGatePassReportParams
): Promise<StorageGatePassReportData> {
  const { data } =
    await storeAdminAxiosClient.get<GetStorageGatePassReportApiResponse>(
      '/analytics/storage-gate-pass-report',
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
    throw new Error(data.message ?? 'Failed to fetch storage gate pass report');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageGatePassReportQueryOptions = (
  params: GetStorageGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [...storageGatePassReportKeys.all, params] as const,
    queryFn: () => fetchStorageGatePassReport(params),
  });

/** Hook to fetch storage gate pass report for a date range (optionally grouped by farmer) */
export function useGetStorageGatePassReports(
  params: GetStorageGatePassReportParams = {}
) {
  return useQuery(storageGatePassReportQueryOptions(params));
}

/** Prefetch storage gate pass report – e.g. on route hover or before navigation */
export function prefetchStorageGatePassReport(
  params: GetStorageGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(storageGatePassReportQueryOptions(params));
}
