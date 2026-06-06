import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetNikasiGatePassSummaryApiResponse,
  NikasiGatePassSummaryData,
} from '@/types/analytics';

/** Query key prefix for GET /analytics/nikasi-summary */
export const nikasiSummaryKeys = {
  all: ['store-admin', 'analytics', 'nikasi-summary'] as const,
};

/** Params for GET /analytics/nikasi-summary (date range in YYYY-MM-DD) */
export interface GetNikasiSummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeParams(
  params: GetNikasiSummaryParams
): GetNikasiSummaryParams {
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

function getNikasiSummaryErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string; error?: { message?: string } }>(error)) {
    const apiMessage =
      error.response?.data?.error?.message ?? error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching nikasi summary';
    }

    if (!error.response) {
      return 'Network error while fetching nikasi summary';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch nikasi summary';
}

async function fetchNikasiSummary(
  params: GetNikasiSummaryParams
): Promise<NikasiGatePassSummaryData> {
  try {
    const safeParams = sanitizeParams(params);
    const requestParams: GetNikasiSummaryParams = {
      ...(safeParams.dateFrom ? { dateFrom: safeParams.dateFrom } : {}),
      ...(safeParams.dateTo ? { dateTo: safeParams.dateTo } : {}),
    };

    const { data } =
      await storeAdminAxiosClient.get<GetNikasiGatePassSummaryApiResponse>(
        '/analytics/nikasi-summary',
        {
          params: requestParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to fetch nikasi summary');
    }

    return data.data;
  } catch (error) {
    throw new Error(getNikasiSummaryErrorMessage(error), {
      cause: error,
    });
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const nikasiSummaryQueryOptions = (
  params: GetNikasiSummaryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [...nikasiSummaryKeys.all, safeParams] as const,
    queryFn: () => fetchNikasiSummary(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** Hook to fetch nikasi summary (variety → size → internal transfer) for an optional date range */
export function useGetNikasiSummary(params: GetNikasiSummaryParams = {}) {
  const safeParams = sanitizeParams(params);

  return useQuery({
    ...nikasiSummaryQueryOptions(safeParams),
  });
}

/** Prefetch nikasi summary – e.g. before navigation */
export function prefetchNikasiSummary(params: GetNikasiSummaryParams = {}) {
  const safeParams = sanitizeParams(params);
  return queryClient.prefetchQuery(nikasiSummaryQueryOptions(safeParams));
}
