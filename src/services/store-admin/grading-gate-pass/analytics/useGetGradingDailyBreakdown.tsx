import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingTrendApiResponse,
  GradingTrendData,
} from '@/types/analytics';

/** Query key prefix for grading daily/monthly trend (grouped by grader) */
export const gradingDailyBreakdownKeys = {
  all: ['store-admin', 'analytics', 'grading-daily-breakdown'] as const,
};

/** Params for GET /analytics/grading-daily-monthly-trend (date range in YYYY-MM-DD) */
export interface GetGradingDailyBreakdownParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetGradingDailyBreakdownParams
): GetGradingDailyBreakdownParams {
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

function getGradingDailyBreakdownErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching grading daily breakdown';
    }

    if (!error.response) {
      return 'Network error while fetching grading daily breakdown';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch grading daily breakdown';
}

async function fetchGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams
): Promise<GradingTrendData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetGradingDailyBreakdownParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetGradingTrendApiResponse>(
        '/analytics/grading-daily-monthly-trend',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(
        data.message ?? 'Failed to fetch grading daily breakdown'
      );
    }

    return data.data;
  } catch (error) {
    throw new Error(getGradingDailyBreakdownErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const gradingDailyBreakdownQueryOptions = (
  params: GetGradingDailyBreakdownParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...gradingDailyBreakdownKeys.all, safeParams] as const,
    queryFn: () => fetchGradingDailyBreakdown(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch grading daily/monthly trend for a date range */
export function useGetGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...gradingDailyBreakdownQueryOptions(safeParams),
  });
}

/** Prefetch grading daily breakdown – e.g. before navigation */
export function prefetchGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(
    gradingDailyBreakdownQueryOptions(safeParams)
  );
}
