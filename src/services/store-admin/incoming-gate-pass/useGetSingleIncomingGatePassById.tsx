import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetSingleIncomingGatePassByIdApiResponse,
  IncomingGatePassByFarmerStorageLinkItem,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useCreateIncomingGatePass';

/** GET error shape (e.g. 401, 404): { success, error: { code, message } } */
type GetSingleIncomingGatePassByIdError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetSingleIncomingGatePassByIdError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch incoming gate pass'
  );
}

/** Query key for GET /incoming-gate-pass/:id */
export const incomingGatePassByIdKey = (id: string) =>
  [...incomingGatePassKeys.all, 'by-id', id] as const;

/** Fetcher used by queryOptions and prefetch */
async function fetchSingleIncomingGatePassById(
  id: string
): Promise<IncomingGatePassByFarmerStorageLinkItem> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      | GetSingleIncomingGatePassByIdApiResponse
      | GetSingleIncomingGatePassByIdError
    >(`/incoming-gate-pass/${id}`);

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetSingleIncomingGatePassByIdError } })
        .response?.data;

    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }

    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export function singleIncomingGatePassByIdQueryOptions(id: string) {
  return queryOptions({
    queryKey: incomingGatePassByIdKey(id),
    queryFn: () => fetchSingleIncomingGatePassById(id),
    enabled: Boolean(id),
  });
}

/** Hook to fetch a single incoming gate pass by id. GET /incoming-gate-pass/:id */
export function useGetSingleIncomingGatePassById(id: string) {
  return useQuery(singleIncomingGatePassByIdQueryOptions(id));
}

/** Prefetch single incoming gate pass by id – e.g. before opening edit/detail screen */
export function prefetchSingleIncomingGatePassById(id: string) {
  return queryClient.prefetchQuery(singleIncomingGatePassByIdQueryOptions(id));
}
