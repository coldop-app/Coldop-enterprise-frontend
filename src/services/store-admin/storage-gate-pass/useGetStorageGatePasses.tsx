import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageGatePassesApiResponse,
  StorageGatePassWithLink,
} from '@/types/storage-gate-pass';

/** Query key prefix for storage gate pass – use for invalidation */
export const storageGatePassKeys = {
  all: ['store-admin', 'storage-gate-pass'] as const,
};

/** Query key for the list of storage gate passes */
const storageGatePassListKey = [...storageGatePassKeys.all, 'list'] as const;

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetStorageGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetStorageGatePassesError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch storage gate passes'
  );
}

/** Fetcher used by queryOptions and prefetch */
async function fetchStorageGatePasses(): Promise<StorageGatePassWithLink[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetStorageGatePassesApiResponse | GetStorageGatePassesError
    >('/storage-gate-pass');

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetStorageGatePassesError } }).response
        ?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const storageGatePassesQueryOptions = () =>
  queryOptions({
    queryKey: storageGatePassListKey,
    queryFn: fetchStorageGatePasses,
  });

/** Hook to fetch all storage gate passes */
export function useGetStorageGatePasses() {
  return useQuery(storageGatePassesQueryOptions());
}

/** Prefetch storage gate passes – e.g. on route hover or before navigation */
export function prefetchStorageGatePasses() {
  return queryClient.prefetchQuery(storageGatePassesQueryOptions());
}
