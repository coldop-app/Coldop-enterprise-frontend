import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export interface GradingSizeDistributionSizeItem {
  name: string;
  /** Weight in kg (excluding bardana), used for percentage calculations */
  value: number;
  /** Raw bag count for display purposes */
  bags: number;
}

export interface GradingSizeDistributionVarietyItem {
  variety: string;
  sizes: GradingSizeDistributionSizeItem[];
}

export interface GradingSizeDistributionData {
  chartData: GradingSizeDistributionVarietyItem[];
}

/** Query key prefix for grading size-wise distribution */
export const gradingSizeWiseDistributionKeys = {
  all: ['store-admin', 'analytics', 'size-distribution'] as const,
  list: (params: GetGradingSizeWiseDistributionParams) =>
    [...gradingSizeWiseDistributionKeys.all, params] as const,
};

/** Params for GET /analytics/size-distribution (date range in YYYY-MM-DD) */
export interface GetGradingSizeWiseDistributionParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchGradingSizeWiseDistribution(
  params: GetGradingSizeWiseDistributionParams
): Promise<GradingSizeDistributionData> {
  const { data } = await storeAdminAxiosClient.get<{
    success: boolean;
    message?: string;
    data?: {
      chartData?: Array<{
        variety?: string;
        sizes?: Array<{
          name?: string;
          value?: number;
          weightExcludingBardanaKg?: number;
        }>;
      }>;
    };
  }>('/analytics/size-distribution', {
    params: {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    },
  });

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to fetch grading size-wise distribution'
    );
  }

  return {
    chartData: (data.data.chartData ?? []).map((item) => ({
      variety: item.variety?.trim() || 'Unknown',
      sizes: (item.sizes ?? []).map((size) => {
        const bags = Number(size.value ?? 0);
        const value = Number(size.weightExcludingBardanaKg ?? 0);
        return {
          name: normalizeSizeName(size.name),
          value,
          bags,
        };
      }),
    })),
  };
}

function normalizeSizeName(name?: string): string {
  if (!name) return 'Unknown';
  return name.trim().replace(/-/g, '–');
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingSizeWiseDistributionQueryOptions = (
  params: GetGradingSizeWiseDistributionParams = {}
) =>
  queryOptions({
    queryKey: gradingSizeWiseDistributionKeys.list(params),
    queryFn: () => fetchGradingSizeWiseDistribution(params),
  });

/** Hook to fetch grading size-wise distribution (chart data) for a date range */
export function useGetGradingSizeWiseDistribution(
  params: GetGradingSizeWiseDistributionParams = {}
) {
  return useQuery(gradingSizeWiseDistributionQueryOptions(params));
}

/** Prefetch grading size-wise distribution – e.g. on route hover or before navigation */
export function prefetchGradingSizeWiseDistribution(
  params: GetGradingSizeWiseDistributionParams = {}
) {
  return queryClient.prefetchQuery(
    gradingSizeWiseDistributionQueryOptions(params)
  );
}
