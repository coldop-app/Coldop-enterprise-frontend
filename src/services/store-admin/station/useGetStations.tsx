import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStationsApiResponse,
  GetStationsParams,
  GetStationsResult,
} from '@/types/station';
import { stationKeys } from './keys';

type GetStationsApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getStationsErrorMessage(errorOrData: unknown): string {
  if (isAxiosError<GetStationsApiError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching stations';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching stations';
    }
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return 'Failed to fetch stations';
}

export async function fetchStations(
  params: GetStationsParams
): Promise<GetStationsResult> {
  try {
    const { data } = await storeAdminAxiosClient.get<GetStationsApiResponse>(
      '/station/',
      {
        params: {
          coldStorageId: params.coldStorageId.trim(),
        },
      }
    );

    if (!data.success) {
      throw new Error(data.message ?? 'Failed to fetch stations');
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
    };
  } catch (error) {
    throw new Error(getStationsErrorMessage(error), { cause: error });
  }
}

/** Query options — usable with useQuery, prefetchQuery, or route loaders */
export const stationsQueryOptions = (params: GetStationsParams) =>
  queryOptions({
    queryKey: stationKeys.lists(params.coldStorageId),
    queryFn: () => fetchStations(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Hook to fetch stations. GET /station */
export function useGetStations(
  params: GetStationsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...stationsQueryOptions(params),
    placeholderData: keepPreviousData,
    enabled:
      (options?.enabled ?? true) && Boolean(params.coldStorageId?.trim()),
  });
}

/** Prefetch stations — e.g. on route hover or before navigation */
export function prefetchStations(params: GetStationsParams) {
  return queryClient.prefetchQuery(stationsQueryOptions(params));
}
