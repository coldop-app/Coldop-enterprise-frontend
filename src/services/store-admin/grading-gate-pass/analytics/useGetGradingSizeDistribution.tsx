import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetSizeDistributionApiResponse,
  SizeDistributionData,
} from '@/types/analytics';

/** Query key prefix for grading size distribution */
export const gradingSizeDistributionKeys = {
  all: ['store-admin', 'analytics', 'grading-size-distribution'] as const,
};

/** Params for GET /analytics/size-distribution (date range in YYYY-MM-DD) */
export interface GetGradingSizeDistributionParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetGradingSizeDistributionParams
): GetGradingSizeDistributionParams {
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

function getGradingSizeDistributionErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching grading size distribution';
    }

    if (!error.response) {
      return 'Network error while fetching grading size distribution';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch grading size distribution';
}

async function fetchGradingSizeDistribution(
  params: GetGradingSizeDistributionParams
): Promise<SizeDistributionData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetGradingSizeDistributionParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetSizeDistributionApiResponse>(
        '/analytics/size-distribution',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(
        data.message ?? 'Failed to fetch grading size distribution'
      );
    }

    return data.data;
  } catch (error) {
    throw new Error(getGradingSizeDistributionErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingSizeDistributionQueryOptions = (
  params: GetGradingSizeDistributionParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...gradingSizeDistributionKeys.all, safeParams] as const,
    queryFn: () => fetchGradingSizeDistribution(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch grading size distribution for a date range */
export function useGetGradingSizeDistribution(
  params: GetGradingSizeDistributionParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...gradingSizeDistributionQueryOptions(safeParams),
  });
}

/** Prefetch grading size distribution – e.g. before navigation */
export function prefetchGradingSizeDistribution(
  params: GetGradingSizeDistributionParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(
    gradingSizeDistributionQueryOptions(safeParams)
  );
}
