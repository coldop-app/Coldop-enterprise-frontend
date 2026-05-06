import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingDailyBreakdownApiResponse,
  IncomingDailyBreakdownData,
} from '@/types/analytics';

/** Query key prefix for incoming daily breakdown (by calendar date) */
export const incomingDailyBreakdownKeys = {
  all: ['store-admin', 'analytics', 'incoming-daily-breakdown'] as const,
};

/** Params for GET /incoming-gate-pass/incoming-daily-breakdown (date range in YYYY-MM-DD) */
export interface GetIncomingDailyBreakdownParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetIncomingDailyBreakdownParams
): GetIncomingDailyBreakdownParams {
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

function getIncomingDailyBreakdownErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching incoming daily breakdown';
    }

    if (!error.response) {
      return 'Network error while fetching incoming daily breakdown';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch incoming daily breakdown';
}

async function fetchIncomingDailyBreakdown(
  params: GetIncomingDailyBreakdownParams
): Promise<IncomingDailyBreakdownData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetIncomingDailyBreakdownParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };
    const { data } =
      await storeAdminAxiosClient.get<GetIncomingDailyBreakdownApiResponse>(
        '/analytics/daily-monthly-trend',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(
        data.message ?? 'Failed to fetch incoming daily breakdown'
      );
    }

    return data.data;
  } catch (error) {
    throw new Error(getIncomingDailyBreakdownErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const incomingDailyBreakdownQueryOptions = (
  params: GetIncomingDailyBreakdownParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...incomingDailyBreakdownKeys.all, safeParams] as const,
    queryFn: () => fetchIncomingDailyBreakdown(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch incoming gate passes for a single day, grouped by location */
export function useGetIncomingDailyBreakdown(
  params: GetIncomingDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...incomingDailyBreakdownQueryOptions(safeParams),
  });
}

/** Prefetch incoming daily breakdown – e.g. before navigation from trend chart */
export function prefetchIncomingDailyBreakdown(
  params: GetIncomingDailyBreakdownParams = {}
) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(
    incomingDailyBreakdownQueryOptions(safeParams)
  );
}
