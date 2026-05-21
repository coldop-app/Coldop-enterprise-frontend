import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetShedStockReportApiResponse,
  ShedStockReportData,
} from '@/types/analytics';

/** Query key prefix for shed stock report */
export const shedStockReportKeys = {
  all: ['store-admin', 'analytics', 'shed-stock-report'] as const,
};

/** Params for GET /analytics/shed-stock-report (date range in YYYY-MM-DD) */
export interface GetShedStockReportParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetShedStockReportParams
): GetShedStockReportParams {
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

function getShedStockReportErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching shed stock report';
    }

    if (!error.response) {
      return 'Network error while fetching shed stock report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch shed stock report';
}

async function fetchShedStockReport(
  params: GetShedStockReportParams
): Promise<ShedStockReportData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetShedStockReportParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetShedStockReportApiResponse>(
        '/analytics/shed-stock-report',
        { params: requestParams }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch shed stock report');
    }

    return data.data;
  } catch (error) {
    throw new Error(getShedStockReportErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const shedStockReportQueryOptions = (
  params: GetShedStockReportParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...shedStockReportKeys.all, safeParams] as const,
    queryFn: () => fetchShedStockReport(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch shed stock report for an optional date range */
export function useGetShedStockReport(params: GetShedStockReportParams = {}) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...shedStockReportQueryOptions(safeParams),
  });
}

/** Prefetch shed stock report – e.g. before navigation */
export function prefetchShedStockReport(params: GetShedStockReportParams = {}) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(shedStockReportQueryOptions(safeParams));
}
