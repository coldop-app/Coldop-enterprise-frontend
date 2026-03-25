import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingGatePassReportApiResponse,
  GradingGatePassReportData,
  GradingGatePassReportDataGroupedByVariety,
} from '@/types/analytics';
import {
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import type { GradingGatePassOrderDetail } from '@/types/grading-gate-pass';

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
  const { data } =
    await storeAdminAxiosClient.get<GetGradingGatePassReportApiResponse>(
      '/analytics/grading-gate-pass-report',
      {
        params: {
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          groupByVariety: true,
          groupByFarmer: false,
        },
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to fetch grading size-wise distribution'
    );
  }

  return {
    chartData: computeSizeDistributionByWeight(data.data),
  };
}

function isGradingGroupedByVariety(
  data: GradingGatePassReportData
): data is GradingGatePassReportDataGroupedByVariety {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function getBagTypeWeightKg(bagType?: string): number {
  return bagType === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
}

function computeOrderDetailWeightKg(
  detail: GradingGatePassOrderDetail
): number {
  const bagCount = detail.currentQuantity ?? detail.initialQuantity ?? 0;
  const adjustedWeightPerBagKg =
    (detail.weightPerBagKg ?? 0) - getBagTypeWeightKg(detail.bagType);
  return bagCount * Math.max(adjustedWeightPerBagKg, 0);
}

function computeSizeDistributionByWeight(
  data: GradingGatePassReportData
): GradingSizeDistributionData['chartData'] {
  if (!isGradingGroupedByVariety(data)) return [];

  return data.map((varietyGroup) => {
    const sizeMap = new Map<string, number>();
    const sizeBagMap = new Map<string, number>();

    for (const pass of varietyGroup.gatePasses) {
      for (const detail of pass.orderDetails ?? []) {
        if (!detail.size) continue;
        const bagCount = detail.currentQuantity ?? detail.initialQuantity ?? 0;
        const weightKg = computeOrderDetailWeightKg(detail);
        if (weightKg <= 0) continue;
        sizeMap.set(detail.size, (sizeMap.get(detail.size) ?? 0) + weightKg);
        sizeBagMap.set(
          detail.size,
          (sizeBagMap.get(detail.size) ?? 0) + bagCount
        );
      }
    }

    return {
      variety: varietyGroup.variety?.trim() || 'Unknown',
      sizes: Array.from(sizeMap.entries()).map(([name, value]) => ({
        name,
        value,
        bags: sizeBagMap.get(name) ?? 0,
      })),
    };
  });
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
