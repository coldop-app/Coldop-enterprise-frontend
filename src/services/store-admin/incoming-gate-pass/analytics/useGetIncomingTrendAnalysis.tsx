import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetDailyMonthlyTrendApiResponse,
  DailyMonthlyTrendData,
} from '@/types/analytics';

/** Query key prefix for daily/monthly trend (incoming trend analysis) */
export const dailyMonthlyTrendKeys = {
  all: ['store-admin', 'analytics', 'daily-monthly-trend'] as const,
};

/** Params for GET /analytics/daily-monthly-trend (date range in YYYY-MM-DD) */
export interface GetDailyMonthlyTrendParams {
  dateFrom?: string;
  dateTo?: string;
}

/** Trims whitespace and validates YYYY-MM-DD format for date ranges */
function sanitizeParams(
  params: GetDailyMonthlyTrendParams
): GetDailyMonthlyTrendParams {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const validateDate = (d?: string) => {
    const trimmed = d?.trim();
    return trimmed && dateRegex.test(trimmed) ? trimmed : undefined;
  };

  return {
    dateFrom: validateDate(params.dateFrom),
    dateTo: validateDate(params.dateTo),
  };
}

/** Standardized error mapping for the trend analysis endpoint */
function getDailyMonthlyTrendErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching trend analysis';
    }

    if (!error.response) {
      return 'Network error while fetching trend analysis';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch daily/monthly trend analysis';
}

/** Fetcher used by queryOptions and prefetch */
async function fetchDailyMonthlyTrend(
  params: GetDailyMonthlyTrendParams
): Promise<DailyMonthlyTrendData> {
  try {
    const { data } =
      await storeAdminAxiosClient.get<GetDailyMonthlyTrendApiResponse>(
        '/analytics/daily-monthly-trend',
        {
          params: {
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
          },
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch daily/monthly trend');
    }

    return data.data;
  } catch (error) {
    throw new Error(getDailyMonthlyTrendErrorMessage(error), { cause: error });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const dailyMonthlyTrendQueryOptions = (
  params: GetDailyMonthlyTrendParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...dailyMonthlyTrendKeys.all, safeParams] as const,
    queryFn: () => fetchDailyMonthlyTrend(safeParams),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/** Hook to fetch incoming trend analysis (daily and monthly) for a date range */
export function useGetIncomingTrendAnalysis(
  params: GetDailyMonthlyTrendParams = {}
) {
  const options = dailyMonthlyTrendQueryOptions(params);

  // Ensures the query only fires if BOTH dates are provided and valid.
  // Note: If your backend supports fetching without dates (e.g., defaults to last 30 days),
  // you can remove this check or adjust the logic.
  const hasValidDateRange = Boolean(
    options.queryKey[3]?.dateFrom && options.queryKey[3]?.dateTo
  );

  return useQuery({
    ...options,
    enabled: hasValidDateRange,
  });
}

/** Prefetch daily/monthly trend – e.g. on route hover or before navigation */
export function prefetchDailyMonthlyTrend(
  params: GetDailyMonthlyTrendParams = {}
) {
  const options = dailyMonthlyTrendQueryOptions(params);

  const hasValidDateRange = Boolean(
    options.queryKey[3]?.dateFrom && options.queryKey[3]?.dateTo
  );

  // Prevent prefetching if the params are incomplete or invalid
  if (!hasValidDateRange) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery(options);
}
