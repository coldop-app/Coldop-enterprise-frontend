import { useQuery, queryOptions } from '@tanstack/react-query';
import axios from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerSeedEntryListItem,
  GetAllFarmerSeedEntriesApiResponse,
} from '@/types/farmer-seed';
import { farmerSeedKeys } from './useCreateFarmerSeedEntry';

type GetAllFarmerSeedEntriesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetAllFarmerSeedEntriesError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch farmer seed entries'
  );
}

async function fetchAllFarmerSeedEntries(): Promise<FarmerSeedEntryListItem[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetAllFarmerSeedEntriesApiResponse | GetAllFarmerSeedEntriesError
    >('/farmer-seed/farmer-seed-entry', {
      headers: { Accept: 'application/json' },
    });

    if (!data.success || !('data' in data) || !Array.isArray(data.data)) {
      throw new Error(getFetchErrorMessage(data));
    }

    return data.data;
  } catch (err) {
    const responseData = axios.isAxiosError(err)
      ? err.response?.data
      : undefined;
    if (responseData && typeof responseData === 'object') {
      throw new Error(
        getFetchErrorMessage(responseData as GetAllFarmerSeedEntriesError)
      );
    }
    throw err;
  }
}

export const allFarmerSeedEntriesQueryKey = [
  ...farmerSeedKeys.all,
  'farmer-seed-entry',
] as const;

export const allFarmerSeedEntriesQueryOptions = () =>
  queryOptions({
    queryKey: allFarmerSeedEntriesQueryKey,
    queryFn: fetchAllFarmerSeedEntries,
  });

/** GET /farmer-seed/farmer-seed-entry */
export function useGetAllFarmerSeedEntries() {
  return useQuery(allFarmerSeedEntriesQueryOptions());
}

export function prefetchAllFarmerSeedEntries() {
  return queryClient.prefetchQuery(allFarmerSeedEntriesQueryOptions());
}
