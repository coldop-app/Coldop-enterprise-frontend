import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GradingGatePass,
  SearchGradingGatePassApiResponse,
} from '@/types/grading-gate-pass';

export const gradingGatePassReportKeys = {
  all: ['store-admin', 'grading-gate-pass', 'report'] as const,
};

export interface GetGradingGatePassReportParams {
  fromDate?: string;
  toDate?: string;
}

function sanitizeParams(
  params: GetGradingGatePassReportParams
): GetGradingGatePassReportParams {
  return {
    fromDate: params.fromDate?.trim() || undefined,
    toDate: params.toDate?.trim() || undefined,
  };
}

/** Axios query string: only include dates that are set (omit optional params otherwise). */
function paramsForRequest(
  params: GetGradingGatePassReportParams
): Record<string, string> {
  const safe = sanitizeParams(params);
  const out: Record<string, string> = {};
  if (safe.fromDate) out.fromDate = safe.fromDate;
  if (safe.toDate) out.toDate = safe.toDate;
  return out;
}

function getGradingGatePassReportErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching grading gate pass report';
    }

    if (!error.response) {
      return 'Network error while fetching grading gate pass report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch grading gate pass report';
}

/** GET `/grading-gate-pass/report` (optional `fromDate`, `toDate` as YYYY-MM-DD) */
async function fetchGradingGatePassReport(
  params: GetGradingGatePassReportParams
): Promise<GradingGatePass[]> {
  try {
    const { data } =
      await storeAdminAxiosClient.get<SearchGradingGatePassApiResponse>(
        '/grading-gate-pass/report',
        {
          params: paramsForRequest(params),
        }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch grading gate pass report'
      );
    }

    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getGradingGatePassReportErrorMessage(error), {
      cause: error,
    });
  }
}

export const gradingGatePassReportQueryOptions = (
  params: GetGradingGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [
      ...gradingGatePassReportKeys.all,
      {
        fromDate: params.fromDate,
        toDate: params.toDate,
      },
    ],
    queryFn: () => fetchGradingGatePassReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetGradingGatePassReport(
  params: GetGradingGatePassReportParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...gradingGatePassReportQueryOptions(params),
    enabled: options?.enabled ?? true,
  });
}

export function prefetchGradingGatePassReport(
  params: GetGradingGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(gradingGatePassReportQueryOptions(params));
}
