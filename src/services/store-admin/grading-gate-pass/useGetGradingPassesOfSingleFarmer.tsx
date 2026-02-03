import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetGradingGatePassesApiResponse,
  GradingGatePass,
} from '@/types/grading-gate-pass';
import { gradingGatePassKeys } from './useGetGradingGatePasses';

/** Query key for grading gate passes of a single farmer (by farmer-storage-link id) */
export const gradingGatePassesByFarmerKey = (farmerStorageLinkId: string) =>
  [
    ...gradingGatePassKeys.all,
    'farmer-storage-link',
    farmerStorageLinkId,
  ] as const;

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetGradingGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetGradingGatePassesError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch grading gate passes for farmer'
  );
}

/** Fetcher used by queryOptions and prefetch */
async function fetchGradingGatePassesByFarmer(
  farmerStorageLinkId: string
): Promise<GradingGatePass[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetGradingGatePassesApiResponse | GetGradingGatePassesError
    >(`/grading-gate-pass/farmer-storage-link/${farmerStorageLinkId}`);

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetGradingGatePassesError } }).response
        ?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export function gradingGatePassesByFarmerQueryOptions(
  farmerStorageLinkId: string
) {
  return queryOptions({
    queryKey: gradingGatePassesByFarmerKey(farmerStorageLinkId),
    queryFn: () => fetchGradingGatePassesByFarmer(farmerStorageLinkId),
    enabled: Boolean(farmerStorageLinkId),
    refetchOnMount: 'always',
  });
}

/** Hook to fetch grading gate passes for a single farmer (by farmer-storage-link id) */
export function useGetGradingPassesOfSingleFarmer(farmerStorageLinkId: string) {
  return useQuery(gradingGatePassesByFarmerQueryOptions(farmerStorageLinkId));
}

/** Prefetch grading gate passes for a farmer – e.g. before opening grading form */
export function prefetchGradingPassesOfSingleFarmer(
  farmerStorageLinkId: string
) {
  return queryClient.prefetchQuery(
    gradingGatePassesByFarmerQueryOptions(farmerStorageLinkId)
  );
}
