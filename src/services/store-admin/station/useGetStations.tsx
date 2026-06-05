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

async function fetchStations(): Promise<GetStationsResult> {
  try {
    const { data } =
      await storeAdminAxiosClient.get<GetStationsApiResponse>('/station/');

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
export const stationsQueryOptions = () =>
  queryOptions({
    queryKey: stationKeys.lists(),
    queryFn: fetchStations,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Hook to fetch stations. GET /station */
export function useGetStations(options?: { enabled?: boolean }) {
  return useQuery({
    ...stationsQueryOptions(),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** Prefetch stations — e.g. on route hover or before navigation */
export function prefetchStations() {
  return queryClient.prefetchQuery(stationsQueryOptions());
}
