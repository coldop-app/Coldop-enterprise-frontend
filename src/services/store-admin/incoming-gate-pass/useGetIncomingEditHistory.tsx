import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingGatePassAuditApiResponse,
  IncomingGatePassAuditItem,
  IncomingGatePassPagination,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useGetIncomingGatePasses';

export interface GetIncomingEditHistoryParams {
  page?: number;
  limit?: number;
}

export interface GetIncomingEditHistoryResult {
  data: IncomingGatePassAuditItem[];
  pagination?: IncomingGatePassPagination;
}

function sanitizeParams(
  params: GetIncomingEditHistoryParams
): GetIncomingEditHistoryParams {
  return {
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : undefined,
    limit:
      typeof params.limit === 'number' && params.limit > 0
        ? Math.floor(params.limit)
        : undefined,
  };
}

function getIncomingEditHistoryErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching incoming gate pass audit history';
    }

    if (!error.response) {
      return 'Network error while fetching incoming gate pass audit history';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch incoming gate pass audit history';
}

async function fetchIncomingEditHistory(
  params: GetIncomingEditHistoryParams
): Promise<GetIncomingEditHistoryResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetIncomingGatePassAuditApiResponse>(
        '/incoming-gate-pass/audit',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch incoming gate pass audit history'
      );
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
      pagination: data.pagination,
    };
  } catch (error) {
    throw new Error(getIncomingEditHistoryErrorMessage(error), {
      cause: error,
    });
  }
}

export const incomingGatePassEditHistoryQueryOptions = (
  params: GetIncomingEditHistoryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [
      ...incomingGatePassKeys.all,
      'audit-history',
      {
        page: safeParams.page,
        limit: safeParams.limit,
      },
    ],
    queryFn: () => fetchIncomingEditHistory(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

export function useGetIncomingEditHistory(
  params: GetIncomingEditHistoryParams = {}
) {
  return useQuery({
    ...incomingGatePassEditHistoryQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

export function prefetchIncomingEditHistory(
  params: GetIncomingEditHistoryParams = {}
) {
  return queryClient.prefetchQuery(
    incomingGatePassEditHistoryQueryOptions(params)
  );
}
