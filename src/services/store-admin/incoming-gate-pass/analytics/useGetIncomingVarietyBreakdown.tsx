import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetVarietyDistributionApiResponse,
  VarietyDistributionData,
} from '@/types/analytics';

/** Query key prefix for variety distribution (incoming variety breakdown) */
export const varietyDistributionKeys = {
  all: ['store-admin', 'analytics', 'variety-distribution'] as const,
};

/** Params for GET /analytics/variety-distribution (date range in YYYY-MM-DD) */
export interface GetVarietyDistributionParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetVarietyDistributionParams
): GetVarietyDistributionParams {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const validateDate = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed && dateRegex.test(trimmed) ? trimmed : undefined;
  };

  return {
    dateFrom: validateDate(params.dateFrom),
    dateTo: validateDate(params.dateTo),
  };
}

function getVarietyDistributionErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching variety distribution';
    }

    if (!error.response) {
      return 'Network error while fetching variety distribution';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch variety distribution';
}

async function fetchVarietyDistribution(
  params: GetVarietyDistributionParams
): Promise<VarietyDistributionData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetVarietyDistributionParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };
    const { data } =
      await storeAdminAxiosClient.get<GetVarietyDistributionApiResponse>(
        '/analytics/variety-distribution',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch variety distribution');
    }

    // API returns { success, data: { chartData: [...] } }
    return data.data;
  } catch (error) {
    throw new Error(getVarietyDistributionErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const varietyDistributionQueryOptions = (
  params: GetVarietyDistributionParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...varietyDistributionKeys.all, safeParams] as const,
    queryFn: () => fetchVarietyDistribution(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch incoming variety distribution for a date range */
export function useGetIncomingVarietyBreakdown(
  params: GetVarietyDistributionParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...varietyDistributionQueryOptions(safeParams),
  });
}

/** Prefetch incoming variety distribution – e.g. before navigation */
export function prefetchIncomingVarietyBreakdown(
  params: GetVarietyDistributionParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(varietyDistributionQueryOptions(safeParams));
}
