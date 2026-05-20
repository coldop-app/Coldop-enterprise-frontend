import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingGatePassByIdApiResponse,
  GradingGatePass,
} from '@/types/grading-gate-pass';
import { gradingGatePassKeys } from './useGetGradingGatePasses';

type GetSingleGradingGatePassError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getSingleGradingGatePassErrorMessage(errorOrData: unknown): string {
  if (isAxiosError<GetSingleGradingGatePassError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while loading grading gate pass';
    }
    if (!errorOrData.response) {
      return 'Network error while loading grading gate pass';
    }
  }

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'error' in errorOrData &&
    (errorOrData as GetSingleGradingGatePassError).error?.message
  ) {
    return (errorOrData as GetSingleGradingGatePassError).error
      ?.message as string;
  }

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'message' in errorOrData &&
    typeof (errorOrData as { message?: unknown }).message === 'string'
  ) {
    return (errorOrData as { message: string }).message;
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return 'Failed to load grading gate pass';
}

async function fetchSingleGradingGatePass(
  gradingGatePassId: string
): Promise<GradingGatePass> {
  const safeId = encodeURIComponent(gradingGatePassId.trim());

  try {
    const { data } = await storeAdminAxiosClient.get<
      GetGradingGatePassByIdApiResponse | GetSingleGradingGatePassError
    >(`/grading-gate-pass/${safeId}`, {
      headers: { Accept: 'application/json' },
    });

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getSingleGradingGatePassErrorMessage(data));
    }

    return data.data;
  } catch (error) {
    throw new Error(getSingleGradingGatePassErrorMessage(error), {
      cause: error,
    });
  }
}

export const singleGradingGatePassQueryOptions = (
  id: string | undefined,
  options?: { enabled?: boolean }
) =>
  queryOptions({
    queryKey:
      id !== undefined && id.trim() !== ''
        ? gradingGatePassKeys.detail(id)
        : [...gradingGatePassKeys.all, 'detail', '__none'],
    queryFn: () => fetchSingleGradingGatePass(id!),
    enabled: (options?.enabled ?? true) && Boolean(id && id.trim() !== ''),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

export function useGetSingleGradingGatePass(
  id: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...singleGradingGatePassQueryOptions(id, options),
  });
}

export function prefetchSingleGradingGatePass(gradingGatePassId: string) {
  return queryClient.prefetchQuery(
    singleGradingGatePassQueryOptions(gradingGatePassId)
  );
}
