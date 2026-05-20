import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingGatePassByIdApiResponse,
  GradingGatePass,
} from '@/types/grading-gate-pass';
import { gradingGatePassKeys } from './useGetGradingGatePasses';

async function fetchGradingGatePassById(
  gradingGatePassId: string
): Promise<GradingGatePass> {
  const safeId = encodeURIComponent(gradingGatePassId);
  const { data } =
    await storeAdminAxiosClient.get<GetGradingGatePassByIdApiResponse>(
      `/grading-gate-pass/${safeId}`
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to load grading gate pass');
  }

  return data.data;
}

export const gradingGatePassDetailQueryOptions = (
  id: string | undefined,
  options?: { enabled?: boolean }
) =>
  queryOptions({
    queryKey:
      id !== undefined && id.trim() !== ''
        ? gradingGatePassKeys.detail(id)
        : [...gradingGatePassKeys.all, 'detail', '__none'],
    queryFn: () => fetchGradingGatePassById(id!),
    enabled: (options?.enabled ?? true) && Boolean(id && id.trim() !== ''),
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
  });

export function useGetGradingGatePassById(
  id: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...gradingGatePassDetailQueryOptions(id, options),
  });
}

export function prefetchGradingGatePassDetail(gradingGatePassId: string) {
  return queryClient.prefetchQuery(
    gradingGatePassDetailQueryOptions(gradingGatePassId)
  );
}
