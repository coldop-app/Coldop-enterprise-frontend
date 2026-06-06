import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  AreaBreakdownData,
  GetAreaBreakdownApiResponse,
} from '@/types/analytics';

/** Query key prefix for GET /analytics/area-breakdown */
export const areaBreakdownKeys = {
  all: ['store-admin', 'analytics', 'area-breakdown'] as const,
};

/** Params for GET /analytics/area-breakdown */
export interface GetAreaBreakdownParams {
  area?: string;
  variety?: string;
}

function sanitizeParams(
  params: GetAreaBreakdownParams
): GetAreaBreakdownParams {
  const sanitizeString = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };

  return {
    area: sanitizeString(params.area),
    variety: sanitizeString(params.variety),
  };
}

function getAreaBreakdownErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string; error?: { message?: string } }>(error)) {
    const apiMessage =
      error.response?.data?.error?.message ?? error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching area breakdown';
    }

    if (!error.response) {
      return 'Network error while fetching area breakdown';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch area breakdown';
}

async function fetchAreaBreakdown(
  params: GetAreaBreakdownParams
): Promise<AreaBreakdownData> {
  try {
    const safeParams = sanitizeParams(params);
    if (!safeParams.area) {
      throw new Error('Area is required');
    }

    const requestParams: Required<Pick<GetAreaBreakdownParams, 'area'>> &
      Pick<GetAreaBreakdownParams, 'variety'> = {
      area: safeParams.area,
      ...(safeParams.variety ? { variety: safeParams.variety } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetAreaBreakdownApiResponse>(
        '/analytics/area-breakdown',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch area breakdown');
    }

    return data.data;
  } catch (error) {
    throw new Error(getAreaBreakdownErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const areaBreakdownQueryOptions = (
  params: GetAreaBreakdownParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...areaBreakdownKeys.all, safeParams] as const,
    queryFn: () => fetchAreaBreakdown(safeParams),
    enabled: Boolean(safeParams.area),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch farmers by area (and optional variety) for area breakdown */
export function useGetAreaBreakdown(params: GetAreaBreakdownParams = {}) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...areaBreakdownQueryOptions(safeParams),
  });
}

/** Prefetch area breakdown – e.g. before navigation */
export function prefetchAreaBreakdown(params: GetAreaBreakdownParams = {}) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(areaBreakdownQueryOptions(safeParams));
}
