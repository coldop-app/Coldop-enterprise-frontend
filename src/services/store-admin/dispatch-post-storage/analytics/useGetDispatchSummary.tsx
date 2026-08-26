import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  DispatchSummaryData,
  GetDispatchSummaryApiResponse,
} from '@/types/analytics';

/** Query key prefix for GET /analytics/dispatch-summary */
export const dispatchSummaryKeys = {
  all: ['store-admin', 'analytics', 'dispatch-summary'] as const,
};

/** Params for GET /analytics/dispatch-summary (date range in YYYY-MM-DD) */
export interface GetDispatchSummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetDispatchSummaryParams
): GetDispatchSummaryParams {
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

function getDispatchSummaryErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string; error?: { message?: string } }>(error)) {
    const apiMessage =
      error.response?.data?.error?.message ?? error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching dispatch summary';
    }

    if (!error.response) {
      return 'Network error while fetching dispatch summary';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch dispatch summary';
}

async function fetchDispatchSummary(
  params: GetDispatchSummaryParams
): Promise<DispatchSummaryData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetDispatchSummaryParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetDispatchSummaryApiResponse>(
        '/analytics/dispatch-summary',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch dispatch summary');
    }

    return data.data;
  } catch (error) {
    throw new Error(getDispatchSummaryErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const dispatchSummaryQueryOptions = (
  params: GetDispatchSummaryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...dispatchSummaryKeys.all, safeParams] as const,
    queryFn: () => fetchDispatchSummary(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch dispatch (post storage) summary for a date range */
export function useGetDispatchSummary(params: GetDispatchSummaryParams = {}) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...dispatchSummaryQueryOptions(safeParams),
  });
}

/** Prefetch dispatch summary – e.g. before navigation */
export function prefetchDispatchSummary(params: GetDispatchSummaryParams = {}) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(dispatchSummaryQueryOptions(safeParams));
}
