import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  StorageGatePassWithLink,
  SearchStorageGatePassApiResponse,
} from '@/types/storage-gate-pass';

export const storageGatePassReportKeys = {
  all: ['store-admin', 'storage-gate-pass', 'report'] as const,
};

export interface GetStorageGatePassReportParams {
  fromDate?: string;
  toDate?: string;
}

function sanitizeParams(
  params: GetStorageGatePassReportParams
): GetStorageGatePassReportParams {
  return {
    fromDate: params.fromDate?.trim() || undefined,
    toDate: params.toDate?.trim() || undefined,
  };
}

function getStorageGatePassReportErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching storage gate pass report';
    }

    if (!error.response) {
      return 'Network error while fetching storage gate pass report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch storage gate pass report';
}

async function fetchStorageGatePassReport(
  params: GetStorageGatePassReportParams
): Promise<StorageGatePassWithLink[]> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<SearchStorageGatePassApiResponse>(
        '/storage-gate-pass/report',
        {
          params: safeParams,
        }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch storage gate pass report'
      );
    }

    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getStorageGatePassReportErrorMessage(error), {
      cause: error,
    });
  }
}

export const storageGatePassReportQueryOptions = (
  params: GetStorageGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [
      ...storageGatePassReportKeys.all,
      {
        fromDate: params.fromDate,
        toDate: params.toDate,
      },
    ],
    queryFn: () => fetchStorageGatePassReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetStorageGatePassReport(
  params: GetStorageGatePassReportParams = {},
  options?: { enabled?: boolean }
) {
  const hasDateRange = Boolean(params.fromDate && params.toDate);

  return useQuery({
    ...storageGatePassReportQueryOptions(params),
    enabled: options?.enabled ?? hasDateRange,
  });
}

export function prefetchStorageGatePassReport(
  params: GetStorageGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(storageGatePassReportQueryOptions(params));
}
