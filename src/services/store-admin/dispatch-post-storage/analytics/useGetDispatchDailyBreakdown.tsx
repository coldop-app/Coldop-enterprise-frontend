import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  DispatchTrendData,
  GetDispatchTrendApiResponse,
} from '@/types/analytics';

/** Query key prefix for dispatch daily/monthly trend (grouped by variety) */
export const dispatchDailyBreakdownKeys = {
  all: ['store-admin', 'analytics', 'dispatch-daily-breakdown'] as const,
};

/** Params for GET /analytics/dispatch-daily-monthly-trend (date range in YYYY-MM-DD) */
export interface GetDispatchDailyBreakdownParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetDispatchDailyBreakdownParams
): GetDispatchDailyBreakdownParams {
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

function getDispatchDailyBreakdownErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string; error?: { message?: string } }>(error)) {
    const apiMessage =
      error.response?.data?.error?.message ?? error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching dispatch daily breakdown';
    }

    if (!error.response) {
      return 'Network error while fetching dispatch daily breakdown';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch dispatch daily breakdown';
}

async function fetchDispatchDailyBreakdown(
  params: GetDispatchDailyBreakdownParams
): Promise<DispatchTrendData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetDispatchDailyBreakdownParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetDispatchTrendApiResponse>(
        '/analytics/dispatch-daily-monthly-trend',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(
        data.message ?? 'Failed to fetch dispatch daily breakdown'
      );
    }

    return data.data;
  } catch (error) {
    throw new Error(getDispatchDailyBreakdownErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const dispatchDailyBreakdownQueryOptions = (
  params: GetDispatchDailyBreakdownParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...dispatchDailyBreakdownKeys.all, safeParams] as const,
    queryFn: () => fetchDispatchDailyBreakdown(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch dispatch daily/monthly trend for a date range */
export function useGetDispatchDailyBreakdown(
  params: GetDispatchDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...dispatchDailyBreakdownQueryOptions(safeParams),
  });
}

/** Prefetch dispatch daily breakdown – e.g. before navigation */
export function prefetchDispatchDailyBreakdown(
  params: GetDispatchDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(
    dispatchDailyBreakdownQueryOptions(safeParams)
  );
}
