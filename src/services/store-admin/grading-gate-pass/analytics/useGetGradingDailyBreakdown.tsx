import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingDailyBreakdownApiResponse,
  GradingDailyBreakdownData,
} from '@/types/analytics';

/** Query key prefix for grading daily breakdown (by calendar date) */
export const gradingDailyBreakdownKeys = {
  all: ['store-admin', 'analytics', 'grading-daily-breakdown'] as const,
};

/** Params for GET /grading-gate-pass/grading-daily-breakdown (date in YYYY-MM-DD) */
export interface GetGradingDailyBreakdownParams {
  date?: string;
}

/** Trims whitespace and validates YYYY-MM-DD format */
function sanitizeParams(
  params: GetGradingDailyBreakdownParams
): GetGradingDailyBreakdownParams {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const trimmedDate = params.date?.trim();
  const isValidDate = trimmedDate && dateRegex.test(trimmedDate);

  return {
    date: isValidDate ? trimmedDate : undefined,
  };
}

/** Standardized error mapping for the grading daily breakdown endpoint */
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

/** Fetcher used by queryOptions and prefetch */
async function fetchGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams
): Promise<GradingDailyBreakdownData> {
  try {
    const { data } =
      await storeAdminAxiosClient.get<GetGradingDailyBreakdownApiResponse>(
        '/grading-gate-pass/grading-daily-breakdown',
        {
          params: { date: params.date },
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
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};

/** Hook to fetch grading gate passes for a single day, grouped by grader */
export function useGetGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams = {}
) {
  const options = gradingDailyBreakdownQueryOptions(params);
  const hasValidDate = Boolean(options.queryKey[3]?.date);

  return useQuery({
    ...options,
    enabled: hasValidDate,
  });
}

/** Prefetch grading daily breakdown – e.g. before navigation from trend chart */
export function prefetchGradingDailyBreakdown(
  params: GetGradingDailyBreakdownParams = {}
) {
  const options = gradingDailyBreakdownQueryOptions(params);
  const hasValidDate = Boolean(options.queryKey[3]?.date);

  if (!hasValidDate) {
    return Promise.resolve();
  }

  return queryClient.prefetchQuery(options);
}
