import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmersStockByFiltersData,
  GetFarmersStockByFiltersApiResponse,
} from '@/types/analytics';

/** Query key prefix for grading area breakdown (farmers stock by filters) */
export const gradingAreaBreakdownKeys = {
  all: ['store-admin', 'analytics', 'grading-area-breakdown'] as const,
};

/** Params for GET /analytics/farmers-stock-by-filters */
export interface GetGradingAreaBreakdownParams {
  area?: string;
}

function sanitizeParams(
  params: GetGradingAreaBreakdownParams
): GetGradingAreaBreakdownParams {
  const sanitizeString = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };

  return {
    area: sanitizeString(params.area),
  };
}

function getGradingAreaBreakdownErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching grading area breakdown';
    }

    if (!error.response) {
      return 'Network error while fetching grading area breakdown';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch grading area breakdown';
}

async function fetchGradingAreaBreakdown(
  params: GetGradingAreaBreakdownParams
): Promise<FarmersStockByFiltersData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetGradingAreaBreakdownParams = {
      ...(safeParams.area ? { area: safeParams.area } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetFarmersStockByFiltersApiResponse>(
        '/analytics/farmers-stock-by-filters',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch grading area breakdown');
    }

    return data.data;
  } catch (error) {
    throw new Error(getGradingAreaBreakdownErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingAreaBreakdownQueryOptions = (
  params: GetGradingAreaBreakdownParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...gradingAreaBreakdownKeys.all, safeParams] as const,
    queryFn: () => fetchGradingAreaBreakdown(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch area-wise farmers stock for grading analytics */
export function useGetGradingAreaBreakdown(
  params: GetGradingAreaBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...gradingAreaBreakdownQueryOptions(safeParams),
  });
}

/** Prefetch grading area breakdown – e.g. before navigation */
export function prefetchGradingAreaBreakdown(
  params: GetGradingAreaBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(
    gradingAreaBreakdownQueryOptions(safeParams)
  );
}
