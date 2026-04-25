import { queryOptions, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerSeedSingleEntry,
  GetSingleFarmerSeedEntryByIdApiResponse,
} from '@/types/farmer-seed';
import { farmerSeedKeys } from './useCreateFarmerSeedEntry';

/** GET error shape (e.g. 401, 404): { success, error: { code, message } } */
type GetSingleFarmerSeedEntryError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetSingleFarmerSeedEntryError | undefined
): string {
  return (
    data?.error?.message ?? data?.message ?? 'Failed to fetch farmer seed entry'
  );
}

/** Query key for GET /farmer-seed/:id */
export const farmerSeedEntryByIdKey = (id: string) =>
  [...farmerSeedKeys.all, 'by-id', id] as const;

/** Fetcher used by queryOptions and prefetch */
async function fetchSingleFarmerSeedEntryById(
  id: string
): Promise<FarmerSeedSingleEntry> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetSingleFarmerSeedEntryByIdApiResponse | GetSingleFarmerSeedEntryError
    >(`/farmer-seed/${id}`);

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData = axios.isAxiosError(err)
      ? err.response?.data
      : undefined;
    if (responseData && typeof responseData === 'object') {
      throw new Error(
        getFetchErrorMessage(responseData as GetSingleFarmerSeedEntryError)
      );
    }
    throw err;
  }
}

/** Query options - use with useQuery, prefetchQuery, or in loaders */
export function singleFarmerSeedEntryByIdQueryOptions(id: string) {
  return queryOptions({
    queryKey: farmerSeedEntryByIdKey(id),
    queryFn: () => fetchSingleFarmerSeedEntryById(id),
    enabled: Boolean(id),
  });
}

/** Hook to fetch a single farmer seed entry by id. GET /farmer-seed/:id */
export function useGetSingleFarmerSeedEntryById(id: string) {
  return useQuery(singleFarmerSeedEntryByIdQueryOptions(id));
}

/** Prefetch single farmer seed entry by id - e.g. before opening edit screen */
export function prefetchSingleFarmerSeedEntryById(id: string) {
  return queryClient.prefetchQuery(singleFarmerSeedEntryByIdQueryOptions(id));
}
