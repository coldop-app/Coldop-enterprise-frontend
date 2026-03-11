import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetIncomingGatePassesByFarmerStorageLinkApiResponse,
  IncomingGatePassByFarmerStorageLinkItem,
  IncomingGatePassPagination,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useCreateIncomingGatePass';

/** Query key for incoming gate passes of a single farmer (by farmer-storage-link id) */
export const incomingGatePassesByFarmerKey = (farmerStorageLinkId: string) =>
  [
    ...incomingGatePassKeys.all,
    'farmer-storage-link',
    farmerStorageLinkId,
  ] as const;

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetIncomingGatePassesByFarmerError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetIncomingGatePassesByFarmerError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch incoming gate passes for farmer'
  );
}

export interface GetIncomingGatePassesOfSingleFarmerResult {
  data: IncomingGatePassByFarmerStorageLinkItem[];
  pagination: IncomingGatePassPagination;
}

/** Fetcher used by queryOptions and prefetch */
async function fetchIncomingGatePassesByFarmer(
  farmerStorageLinkId: string
): Promise<GetIncomingGatePassesOfSingleFarmerResult> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      | GetIncomingGatePassesByFarmerStorageLinkApiResponse
      | GetIncomingGatePassesByFarmerError
    >(`/incoming-gate-pass/farmer-storage-link/${farmerStorageLinkId}`);

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    const response =
      data as GetIncomingGatePassesByFarmerStorageLinkApiResponse;
    return {
      data: response.data,
      pagination: response.pagination,
    };
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetIncomingGatePassesByFarmerError } })
        .response?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export function incomingGatePassesByFarmerQueryOptions(
  farmerStorageLinkId: string
) {
  return queryOptions({
    queryKey: incomingGatePassesByFarmerKey(farmerStorageLinkId),
    queryFn: () => fetchIncomingGatePassesByFarmer(farmerStorageLinkId),
    enabled: Boolean(farmerStorageLinkId),
    refetchOnMount: 'always',
  });
}

/** Hook to fetch incoming gate passes for a single farmer (by farmer-storage-link id). GET /incoming-gate-pass/farmer-storage-link/:farmerStorageLinkId */
export function useGetIncomingGatePassesOfSingleFarmer(
  farmerStorageLinkId: string
) {
  return useQuery(incomingGatePassesByFarmerQueryOptions(farmerStorageLinkId));
}

/** Prefetch incoming gate passes for a farmer – e.g. before opening farmer detail */
export function prefetchIncomingGatePassesOfSingleFarmer(
  farmerStorageLinkId: string
) {
  return queryClient.prefetchQuery(
    incomingGatePassesByFarmerQueryOptions(farmerStorageLinkId)
  );
}
