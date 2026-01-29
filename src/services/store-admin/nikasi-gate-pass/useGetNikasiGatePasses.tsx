import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetNikasiGatePassesApiResponse,
  NikasiGatePass,
} from '@/types/nikasi-gate-pass';

/** Query key prefix for nikasi gate pass – use for invalidation */
export const nikasiGatePassKeys = {
  all: ['store-admin', 'nikasi-gate-pass'] as const,
};

/** Query key for the list of nikasi gate passes */
const nikasiGatePassListKey = [...nikasiGatePassKeys.all, 'list'] as const;

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetNikasiGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetNikasiGatePassesError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch nikasi gate passes'
  );
}

/** Fetcher used by queryOptions and prefetch */
async function fetchNikasiGatePasses(): Promise<NikasiGatePass[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetNikasiGatePassesApiResponse | GetNikasiGatePassesError
    >('/nikasi-gate-pass');

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetNikasiGatePassesError } }).response
        ?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const nikasiGatePassesQueryOptions = () =>
  queryOptions({
    queryKey: nikasiGatePassListKey,
    queryFn: fetchNikasiGatePasses,
  });

/** Hook to fetch all nikasi gate passes */
export function useGetNikasiGatePasses() {
  return useQuery(nikasiGatePassesQueryOptions());
}

/** Prefetch nikasi gate passes – e.g. on route hover or before navigation */
export function prefetchNikasiGatePasses() {
  return queryClient.prefetchQuery(nikasiGatePassesQueryOptions());
}
