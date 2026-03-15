import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageTrendApiResponse,
  StorageTrendData,
} from '@/types/analytics';

/** Query key prefix for storage trend analysis */
export const storageTrendKeys = {
  all: ['store-admin', 'analytics', 'storage-trend'] as const,
};

/** Params for GET /analytics/storage-daily-monthly-trend */
export interface GetStorageTrendParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchStorageTrend(
  params: GetStorageTrendParams = {}
): Promise<StorageTrendData> {
  const { data } = await storeAdminAxiosClient.get<GetStorageTrendApiResponse>(
    '/analytics/storage-daily-monthly-trend',
    {
      params: {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    }
  );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch storage trend analysis');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageTrendQueryOptions = (params: GetStorageTrendParams = {}) =>
  queryOptions({
    queryKey: [...storageTrendKeys.all, params] as const,
    queryFn: () => fetchStorageTrend(params),
  });

/** Hook to fetch storage daily/monthly trend (by variety) */
export function useGetStorageTrendAnalysis(params: GetStorageTrendParams = {}) {
  return useQuery(storageTrendQueryOptions(params));
}

/** Prefetch storage trend – e.g. on route hover or before navigation */
export function prefetchStorageTrend(params: GetStorageTrendParams = {}) {
  return queryClient.prefetchQuery(storageTrendQueryOptions(params));
}
