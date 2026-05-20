import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingGatePassAuditApiResponse,
  GradingGatePassAuditItem,
  GradingGatePassPagination,
} from '@/types/grading-gate-pass';
import { gradingGatePassKeys } from './useGetGradingGatePasses';

export interface GetGradingEditHistoryParams {
  page?: number;
  limit?: number;
}

export interface GetGradingEditHistoryResult {
  data: GradingGatePassAuditItem[];
  pagination?: GradingGatePassPagination;
}

function sanitizeParams(
  params: GetGradingEditHistoryParams
): GetGradingEditHistoryParams {
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

function getGradingEditHistoryErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching grading gate pass audit history';
    }

    if (!error.response) {
      return 'Network error while fetching grading gate pass audit history';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch grading gate pass audit history';
}

async function fetchGradingEditHistory(
  params: GetGradingEditHistoryParams
): Promise<GetGradingEditHistoryResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetGradingGatePassAuditApiResponse>(
        '/grading-gate-pass/audit',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch grading gate pass audit history'
      );
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
      pagination: data.pagination,
    };
  } catch (error) {
    throw new Error(getGradingEditHistoryErrorMessage(error), {
      cause: error,
    });
  }
}

export const gradingGatePassEditHistoryQueryOptions = (
  params: GetGradingEditHistoryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [
      ...gradingGatePassKeys.all,
      'audit-history',
      {
        page: safeParams.page,
        limit: safeParams.limit,
      },
    ],
    queryFn: () => fetchGradingEditHistory(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

export function useGetGradingEditHistory(
  params: GetGradingEditHistoryParams = {}
) {
  return useQuery({
    ...gradingGatePassEditHistoryQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

export function prefetchGradingEditHistory(
  params: GetGradingEditHistoryParams = {}
) {
  return queryClient.prefetchQuery(
    gradingGatePassEditHistoryQueryOptions(params)
  );
}
