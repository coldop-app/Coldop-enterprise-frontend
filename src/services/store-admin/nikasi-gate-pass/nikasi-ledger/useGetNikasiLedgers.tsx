import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { nikasiLedgerKeys } from './useCreateNikasiLedger';

/** Dispatch ledger entry in GET /dispatch-ledger */
export interface NikasiLedger {
  _id: string;
  coldStorageId: string;
  name: string;
  address: string;
  mobileNumber: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

/** API response for GET /dispatch-ledger */
export interface GetNikasiLedgersApiResponse {
  success: boolean;
  data: NikasiLedger[];
  message?: string;
}

/** GET error shape (e.g. 401): { success, error: { code, message } } */
type GetNikasiLedgersError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(data: GetNikasiLedgersError | undefined): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to fetch dispatch ledgers'
  );
}

/** Fetcher used by queryOptions and prefetch */
async function fetchNikasiLedgers(): Promise<NikasiLedger[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetNikasiLedgersApiResponse | GetNikasiLedgersError
    >('/dispatch-ledger');

    if (!data.success || !('data' in data) || !Array.isArray(data.data)) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetNikasiLedgersError } }).response?.data;

    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }

    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const nikasiLedgersQueryOptions = () =>
  queryOptions({
    queryKey: [...nikasiLedgerKeys.all, 'list'],
    queryFn: fetchNikasiLedgers,
  });

/** Hook to fetch all dispatch ledgers (no pagination) */
export function useGetNikasiLedgers() {
  return useQuery(nikasiLedgersQueryOptions());
}

/** Prefetch dispatch ledgers – e.g. before navigation */
export function prefetchNikasiLedgers() {
  return queryClient.prefetchQuery(nikasiLedgersQueryOptions());
}
