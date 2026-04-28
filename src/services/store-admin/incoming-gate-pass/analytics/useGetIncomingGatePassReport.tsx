import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  IncomingGatePassWithLink,
  IncomingGatePassResponse,
} from '@/types/incoming-gate-pass';

export const incomingGatePassReportKeys = {
  all: ['incoming-gate-pass', 'report'] as const,
};

export interface GetIncomingGatePassReportParams {
  fromDate?: string;
  toDate?: string;
}

function sanitizeParams(
  params: GetIncomingGatePassReportParams
): GetIncomingGatePassReportParams {
  return {
    fromDate: params.fromDate?.trim() || undefined,
    toDate: params.toDate?.trim() || undefined,
  };
}

function getIncomingGatePassReportErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching incoming gate pass report';
    }

    if (!error.response) {
      return 'Network error while fetching incoming gate pass report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch incoming gate pass report';
}

async function fetchIncomingGatePassReport(
  params: GetIncomingGatePassReportParams
): Promise<IncomingGatePassWithLink[]> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } = await storeAdminAxiosClient.get<IncomingGatePassResponse>(
      '/incoming-gate-pass/report',
      {
        params: safeParams,
      }
    );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch incoming gate pass report'
      );
    }

    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getIncomingGatePassReportErrorMessage(error), {
      cause: error,
    });
  }
}

export const incomingGatePassReportQueryOptions = (
  params: GetIncomingGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [
      ...incomingGatePassReportKeys.all,
      {
        fromDate: params.fromDate,
        toDate: params.toDate,
      },
    ],
    queryFn: () => fetchIncomingGatePassReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetIncomingGatePassReport(
  params: GetIncomingGatePassReportParams = {},
  options?: { enabled?: boolean }
) {
  const hasDateRange = Boolean(params.fromDate && params.toDate);

  return useQuery({
    ...incomingGatePassReportQueryOptions(params),
    enabled: options?.enabled ?? hasDateRange,
  });
}

export function prefetchIncomingGatePassReport(
  params: GetIncomingGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(incomingGatePassReportQueryOptions(params));
}
