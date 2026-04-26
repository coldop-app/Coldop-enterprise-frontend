import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetStorageGatePassByIdApiResponse,
  StorageGatePassById,
} from '@/types/storage-gate-pass';
import { storageGatePassKeys } from './useGetStorageGatePasses';

/** GET error shape (e.g. 401, 404): { success, error: { code, message } } */
type GetStorageGatePassByIdError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetStorageGatePassByIdError | undefined
): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to fetch storage gate pass'
  );
}

/** Query key for GET /storage-gate-pass/:id */
export const storageGatePassByIdKey = (id: string) =>
  [...storageGatePassKeys.all, 'by-id', id] as const;

/** Fetcher used by queryOptions and prefetch */
async function fetchStorageGatePassById(
  id: string
): Promise<StorageGatePassById> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetStorageGatePassByIdApiResponse | GetStorageGatePassByIdError
    >(`/storage-gate-pass/${id}`);

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetStorageGatePassByIdError } }).response
        ?.data;

    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }

    throw err;
  }
}

/** Query options - use with useQuery, prefetchQuery, or in loaders */
export function storageGatePassByIdQueryOptions(id: string) {
  return queryOptions({
    queryKey: storageGatePassByIdKey(id),
    queryFn: () => fetchStorageGatePassById(id),
    enabled: Boolean(id),
  });
}

/** Hook to fetch a single storage gate pass by id. GET /storage-gate-pass/:id */
export function useGetStorageGatePassById(id: string) {
  return useQuery(storageGatePassByIdQueryOptions(id));
}

/** Prefetch single storage gate pass by id - e.g. before opening details screen */
export function prefetchStorageGatePassById(id: string) {
  return queryClient.prefetchQuery(storageGatePassByIdQueryOptions(id));
}
