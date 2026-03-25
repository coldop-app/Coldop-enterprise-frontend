import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingGatePassReportApiResponse,
  IncomingGatePassReportData,
  IncomingGatePassReportDataGroupedByVariety,
  VarietyDistributionData,
} from '@/types/analytics';
import { JUTE_BAG_WEIGHT } from '@/components/forms/grading/constants';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';

/** Query key prefix for variety distribution (incoming variety breakdown) */
export const varietyDistributionKeys = {
  all: ['store-admin', 'analytics', 'variety-distribution'] as const,
};

/** Params for GET /analytics/variety-distribution (date range in YYYY-MM-DD) */
export interface GetVarietyDistributionParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchVarietyDistribution(
  params: GetVarietyDistributionParams
): Promise<VarietyDistributionData> {
  const { data } =
    await storeAdminAxiosClient.get<GetIncomingGatePassReportApiResponse>(
      '/analytics/incoming-gate-pass-report',
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
    throw new Error(data.message ?? 'Failed to fetch variety distribution');
  }

  return {
    chartData: computeVarietyDistributionByWeight(data.data),
  };
}

function isIncomingGroupedByVariety(
  data: IncomingGatePassReportData
): data is IncomingGatePassReportDataGroupedByVariety {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function getIncomingPassBags(pass: IncomingGatePassWithLink): number {
  const bagsFromSizes = (pass.bagSizes ?? []).reduce(
    (sum, b) => sum + (b.initialQuantity ?? 0),
    0
  );
  return pass.bagsReceived ?? bagsFromSizes;
}

function getIncomingPassNetWeightKg(
  pass: IncomingGatePassWithLink & {
    weightSlip?: { grossWeightKg?: number; tareWeightKg?: number };
    grossWeightKg?: number;
    tareWeightKg?: number;
    netWeightKg?: number;
  }
): number {
  const gross = pass.weightSlip?.grossWeightKg ?? pass.grossWeightKg;
  const tare = pass.weightSlip?.tareWeightKg ?? pass.tareWeightKg;
  if (typeof gross === 'number' && typeof tare === 'number') {
    return gross - tare;
  }
  return pass.netWeightKg ?? 0;
}

function computeVarietyDistributionByWeight(
  data: IncomingGatePassReportData
): VarietyDistributionData['chartData'] {
  if (!isIncomingGroupedByVariety(data)) return [];

  return data
    .map((group) => {
      const totalAdjustedNetWeightKg = group.gatePasses.reduce((sum, pass) => {
        const bags = getIncomingPassBags(pass);
        const netWeightKg = getIncomingPassNetWeightKg(pass);
        const bardanaWeightKg = bags * JUTE_BAG_WEIGHT;
        return sum + Math.max(netWeightKg - bardanaWeightKg, 0);
      }, 0);

      return {
        name: group.variety?.trim() || 'Unknown',
        value: totalAdjustedNetWeightKg,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const varietyDistributionQueryOptions = (
  params: GetVarietyDistributionParams = {}
) =>
  queryOptions({
    queryKey: [...varietyDistributionKeys.all, params] as const,
    queryFn: () => fetchVarietyDistribution(params),
  });

/** Hook to fetch incoming variety breakdown (variety distribution) for a date range */
export function useGetIncomingVarietyBreakdown(
  params: GetVarietyDistributionParams = {}
) {
  return useQuery(varietyDistributionQueryOptions(params));
}

/** Prefetch variety distribution – e.g. on route hover or before navigation */
export function prefetchVarietyDistribution(
  params: GetVarietyDistributionParams = {}
) {
  return queryClient.prefetchQuery(varietyDistributionQueryOptions(params));
}
