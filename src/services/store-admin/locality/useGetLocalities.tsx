import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import type {
  GetLocalitiesApiResponse,
  GetLocalitiesParams,
  GetLocalitiesResult,
} from '@/types/locality';
import { localityKeys } from './keys';

type GetLocalitiesApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getLocalitiesErrorMessage(errorOrData: unknown): string {
  if (isAxiosError<GetLocalitiesApiError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching localities';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching localities';
    }
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return 'Failed to fetch localities';
}

async function fetchLocalities(
  params: GetLocalitiesParams
): Promise<GetLocalitiesResult> {
  try {
    const { data } = await storeAdminAxiosClient.get<GetLocalitiesApiResponse>(
      '/locality/',
      {
        params: {
          stationId: params.stationId.trim(),
        },
      }
    );

    if (!data.success) {
      throw new Error(data.message ?? 'Failed to fetch localities');
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
    };
  } catch (error) {
    throw new Error(getLocalitiesErrorMessage(error), { cause: error });
  }
}

export const localitiesQueryOptions = (params: GetLocalitiesParams) =>
  queryOptions({
    queryKey: localityKeys.lists(params.stationId),
    queryFn: () => fetchLocalities(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Hook to fetch localities for a station. GET /locality */
export function useGetLocalities(
  params: GetLocalitiesParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...localitiesQueryOptions(params),
    placeholderData: keepPreviousData,
    enabled: (options?.enabled ?? true) && Boolean(params.stationId?.trim()),
  });
}

export { fetchLocalities };
