import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageSummaryApiResponse,
  StorageSummaryData,
} from '@/types/analytics';

/** Per-size quantity for table (initial/current used for Current / Initial / Outgoing tabs) */
export interface SizeQuantity {
  size: string;
  initialQuantity: number;
  currentQuantity: number;
}

/** One variety row for StorageSummaryTable */
export interface VarietyStockSummary {
  variety: string;
  sizes: SizeQuantity[];
}

/** Filtered stock summary (e.g. Owned / Farmer); used when showStockFilterTabs is true */
export interface StockSummaryByFilterData {
  OWNED?: {
    stockSummary: VarietyStockSummary[];
    chartData?: { sizes: string[] };
  };
  FARMER?: {
    stockSummary: VarietyStockSummary[];
    chartData?: { sizes: string[] };
  };
}

/** Query key prefix for storage summary */
export const storageSummaryKeys = {
  all: ['store-admin', 'analytics', 'storage-summary'] as const,
};

/** Params for GET /analytics/storage-summary (extend when backend supports filters) */
export interface GetStorageSummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchStorageSummary(
  params: GetStorageSummaryParams = {}
): Promise<StorageSummaryData> {
  const { data } =
    await storeAdminAxiosClient.get<GetStorageSummaryApiResponse>(
      '/analytics/storage-summary',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch storage summary');
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageSummaryQueryOptions = (
  params: GetStorageSummaryParams = {}
) =>
  queryOptions({
    queryKey: [...storageSummaryKeys.all, params] as const,
    queryFn: () => fetchStorageSummary(params),
  });

/** Hook to fetch storage summary (variety → sizes → byBagType) */
export function useGetStorageSummary(params: GetStorageSummaryParams = {}) {
  return useQuery(storageSummaryQueryOptions(params));
}

/** Prefetch storage summary – e.g. on route hover or before navigation */
export function prefetchStorageSummary(params: GetStorageSummaryParams = {}) {
  return queryClient.prefetchQuery(storageSummaryQueryOptions(params));
}
