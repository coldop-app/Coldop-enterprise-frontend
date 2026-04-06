import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetShedStockReportApiResponse,
  ShedStockReportData,
} from '@/types/analytics';

/** Query key prefix for shed stock report */
export const shedStockReportKeys = {
  all: ['store-admin', 'analytics', 'shed-stock-report'] as const,
};

/** Params for GET /analytics/shed-stock-report (dates in YYYY-MM-DD) */
export interface GetShedStockReportParams {
  dateFrom?: string;
  dateTo?: string;
}

async function fetchShedStockReport(
  params: GetShedStockReportParams = {}
): Promise<ShedStockReportData> {
  const { data } =
    await storeAdminAxiosClient.get<GetShedStockReportApiResponse>(
      '/analytics/shed-stock-report',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch shed stock report');
  }

  return data.data;
}

export const shedStockReportQueryOptions = (
  params: GetShedStockReportParams = {}
) =>
  queryOptions({
    queryKey: [...shedStockReportKeys.all, params] as const,
    queryFn: () => fetchShedStockReport(params),
  });

export function useGetShedStock(params: GetShedStockReportParams = {}) {
  return useQuery(shedStockReportQueryOptions(params));
}

export function prefetchShedStockReport(params: GetShedStockReportParams = {}) {
  return queryClient.prefetchQuery(shedStockReportQueryOptions(params));
}
