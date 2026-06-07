import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  IncomingGatePassWithLink,
  IncomingGatePassResponse,
} from '@/types/incoming-gate-pass';

export const ungradedGatePassesReportKeys = {
  all: ['incoming-gate-pass', 'ungraded', 'report'] as const,
};

export interface GetUngradedGatePassesReportParams {
  fromDate?: string;
  toDate?: string;
}

interface UngradedGatePassesReportApiError {
  code?: string;
  message?: string;
}

interface UngradedGatePassesReportApiErrorBody {
  success?: boolean;
  message?: string;
  error?: UngradedGatePassesReportApiError;
}

function sanitizeParams(
  params: GetUngradedGatePassesReportParams
): GetUngradedGatePassesReportParams {
  return {
    fromDate: params.fromDate?.trim() || undefined,
    toDate: params.toDate?.trim() || undefined,
  };
}

function getUngradedGatePassesReportErrorMessage(error: unknown): string {
  if (isAxiosError<UngradedGatePassesReportApiErrorBody>(error)) {
    const apiMessage =
      error.response?.data?.error?.message ?? error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching ungraded gate passes report';
    }

    if (!error.response) {
      return 'Network error while fetching ungraded gate passes report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch ungraded gate passes report';
}

async function fetchUngradedGatePassesReport(
  params: GetUngradedGatePassesReportParams
): Promise<IncomingGatePassWithLink[]> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } = await storeAdminAxiosClient.get<IncomingGatePassResponse>(
      '/incoming-gate-pass/ungraded/report',
      {
        params: safeParams,
      }
    );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch ungraded gate passes report'
      );
    }

    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getUngradedGatePassesReportErrorMessage(error), {
      cause: error,
    });
  }
}

export const ungradedGatePassesReportQueryOptions = (
  params: GetUngradedGatePassesReportParams = {}
) =>
  queryOptions({
    queryKey: [
      ...ungradedGatePassesReportKeys.all,
      {
        fromDate: params.fromDate,
        toDate: params.toDate,
      },
    ],
    queryFn: () => fetchUngradedGatePassesReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetUngradedGatePassesReport(
  params: GetUngradedGatePassesReportParams = {},
  options?: { enabled?: boolean }
) {
  const safeParams = sanitizeParams(params);
  const hasPartialDateRange =
    Boolean(safeParams.fromDate) !== Boolean(safeParams.toDate);

  return useQuery({
    ...ungradedGatePassesReportQueryOptions(safeParams),
    enabled: options?.enabled ?? !hasPartialDateRange,
  });
}

export function prefetchUngradedGatePassesReport(
  params: GetUngradedGatePassesReportParams = {}
) {
  return queryClient.prefetchQuery(
    ungradedGatePassesReportQueryOptions(params)
  );
}
