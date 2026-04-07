import { useQuery, queryOptions } from '@tanstack/react-query';
import axios from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerSeedEntryByStorageLink,
  GetFarmerSeedApiResponse,
} from '@/types/farmer-seed';
import { farmerSeedKeys } from './useCreateFarmerSeedEntry';

type GetFarmerSeedError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(data: GetFarmerSeedError | undefined): string {
  return data?.error?.message ?? data?.message ?? 'Failed to fetch farmer seed';
}

export const farmerSeedByFarmerStorageLinkKey = (farmerStorageLinkId: string) =>
  [...farmerSeedKeys.all, 'farmer-storage-link', farmerStorageLinkId] as const;

/** Returns seed rows, or an empty list when none exists. */
async function fetchFarmerSeedByFarmerStorageLink(
  farmerStorageLinkId: string
): Promise<FarmerSeedEntryByStorageLink[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetFarmerSeedApiResponse | GetFarmerSeedError
    >(`/farmer-seed/farmer-storage-link/${farmerStorageLinkId}`);

    if (!data || !('success' in data)) {
      throw new Error('Invalid response');
    }

    if (!data.success) {
      throw new Error(getFetchErrorMessage(data));
    }

    if (!('data' in data) || !Array.isArray(data.data)) {
      return [];
    }
    return data.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return [];
    }
    const responseData = axios.isAxiosError(err)
      ? err.response?.data
      : undefined;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData as GetFarmerSeedError));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or route loaders */
export function farmerSeedByFarmerStorageLinkQueryOptions(
  farmerStorageLinkId: string
) {
  return queryOptions({
    queryKey: farmerSeedByFarmerStorageLinkKey(farmerStorageLinkId),
    queryFn: () => fetchFarmerSeedByFarmerStorageLink(farmerStorageLinkId),
    enabled: Boolean(farmerStorageLinkId),
    refetchOnMount: 'always',
  });
}

export type UseGetFarmerSeedOptions = {
  /** When false, the query does not run (e.g. until a dialog opens). */
  enabled?: boolean;
};

/** GET /farmer-seed/farmer-storage-link/:farmerStorageLinkId */
export function useGetFarmerSeed(
  farmerStorageLinkId: string,
  options?: UseGetFarmerSeedOptions
) {
  const base = farmerSeedByFarmerStorageLinkQueryOptions(farmerStorageLinkId);
  return useQuery({
    ...base,
    enabled: Boolean(farmerStorageLinkId) && (options?.enabled ?? true),
  });
}

export function prefetchFarmerSeedByFarmerStorageLink(
  farmerStorageLinkId: string
) {
  return queryClient.prefetchQuery(
    farmerSeedByFarmerStorageLinkQueryOptions(farmerStorageLinkId)
  );
}
