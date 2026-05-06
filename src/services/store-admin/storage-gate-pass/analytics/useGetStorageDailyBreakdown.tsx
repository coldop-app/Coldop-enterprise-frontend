import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageTrendApiResponse,
  StorageTrendData,
} from '@/types/analytics';

/** Query key prefix for storage daily/monthly trend (grouped by variety) */
export const storageDailyBreakdownKeys = {
  all: ['store-admin', 'analytics', 'storage-daily-breakdown'] as const,
};

/** Params for GET /analytics/storage-daily-monthly-trend (date range in YYYY-MM-DD) */
export interface GetStorageDailyBreakdownParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetStorageDailyBreakdownParams
): GetStorageDailyBreakdownParams {
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

function getStorageDailyBreakdownErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching storage daily breakdown';
    }

    if (!error.response) {
      return 'Network error while fetching storage daily breakdown';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch storage daily breakdown';
}

async function fetchStorageDailyBreakdown(
  params: GetStorageDailyBreakdownParams
): Promise<StorageTrendData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetStorageDailyBreakdownParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetStorageTrendApiResponse>(
        '/analytics/storage-daily-monthly-trend',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(
        data.message ?? 'Failed to fetch storage daily breakdown'
      );
    }

    return data.data;
  } catch (error) {
    throw new Error(getStorageDailyBreakdownErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageDailyBreakdownQueryOptions = (
  params: GetStorageDailyBreakdownParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...storageDailyBreakdownKeys.all, safeParams] as const,
    queryFn: () => fetchStorageDailyBreakdown(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch storage daily/monthly trend for a date range */
export function useGetStorageDailyBreakdown(
  params: GetStorageDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...storageDailyBreakdownQueryOptions(safeParams),
  });
}

/** Prefetch storage daily breakdown – e.g. before navigation */
export function prefetchStorageDailyBreakdown(
  params: GetStorageDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(
    storageDailyBreakdownQueryOptions(safeParams)
  );
}
