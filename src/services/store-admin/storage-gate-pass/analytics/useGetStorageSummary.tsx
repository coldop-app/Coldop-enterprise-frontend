import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageSummaryApiResponse,
  StorageSummaryData,
} from '@/types/analytics';

/** Query key prefix for storage summary (variety -> size -> bag type) */
export const storageSummaryKeys = {
  all: ['store-admin', 'analytics', 'storage-summary'] as const,
};

/** Params for GET /analytics/storage-summary (date range in YYYY-MM-DD) */
export interface GetStorageSummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetStorageSummaryParams
): GetStorageSummaryParams {
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

function getStorageSummaryErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching storage summary';
    }

    if (!error.response) {
      return 'Network error while fetching storage summary';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch storage summary';
}

async function fetchStorageSummary(
  params: GetStorageSummaryParams
): Promise<StorageSummaryData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetStorageSummaryParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetStorageSummaryApiResponse>(
        '/analytics/storage-summary',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch storage summary');
    }

    return data.data;
  } catch (error) {
    throw new Error(getStorageSummaryErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageSummaryQueryOptions = (
  params: GetStorageSummaryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...storageSummaryKeys.all, safeParams] as const,
    queryFn: () => fetchStorageSummary(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch storage summary for a date range */
export function useGetStorageSummary(params: GetStorageSummaryParams = {}) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...storageSummaryQueryOptions(safeParams),
  });
}

/** Prefetch storage summary – e.g. before navigation */
export function prefetchStorageSummary(params: GetStorageSummaryParams = {}) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(storageSummaryQueryOptions(safeParams));
}
