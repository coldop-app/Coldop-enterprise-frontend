import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  AreaWiseSizeDistributionData,
  GetAreaWiseSizeDistributionApiResponse,
} from '@/types/analytics';

/** Query key prefix for grading area-wise size distribution */
export const gradingAreaDistributionKeys = {
  all: ['store-admin', 'analytics', 'grading-area-wise-distribution'] as const,
};

/** Params for GET /analytics/area-wise-size-distribution (date range in YYYY-MM-DD) */
export interface GetGradingAreaDistributionParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetGradingAreaDistributionParams
): GetGradingAreaDistributionParams {
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

function getGradingAreaDistributionErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching grading area-wise distribution';
    }

    if (!error.response) {
      return 'Network error while fetching grading area-wise distribution';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch grading area-wise distribution';
}

async function fetchGradingAreaDistribution(
  params: GetGradingAreaDistributionParams
): Promise<AreaWiseSizeDistributionData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetGradingAreaDistributionParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetAreaWiseSizeDistributionApiResponse>(
        '/analytics/area-wise-size-distribution',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(
        data.message ?? 'Failed to fetch grading area-wise distribution'
      );
    }

    return data.data;
  } catch (error) {
    throw new Error(getGradingAreaDistributionErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingAreaDistributionQueryOptions = (
  params: GetGradingAreaDistributionParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...gradingAreaDistributionKeys.all, safeParams] as const,
    queryFn: () => fetchGradingAreaDistribution(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch grading area-wise size distribution for a date range */
export function useGetGradingAreaDistribution(
  params: GetGradingAreaDistributionParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...gradingAreaDistributionQueryOptions(safeParams),
  });
}

/** Prefetch grading area-wise distribution – e.g. before navigation */
export function prefetchGradingAreaDistribution(
  params: GetGradingAreaDistributionParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(
    gradingAreaDistributionQueryOptions(safeParams)
  );
}
