import { useQuery, queryOptions } from '@tanstack/react-query';
import axios from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerSeedEntryListItem,
  FarmerSeedEntryPagination,
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

export interface GetAllFarmerSeedEntriesParams {
  page?: number;
  limit?: number;
}

export interface GetAllFarmerSeedEntriesResult {
  data: FarmerSeedEntryListItem[];
  pagination?: FarmerSeedEntryPagination;
}

async function fetchAllFarmerSeedEntries(
  params: GetAllFarmerSeedEntriesParams
): Promise<GetAllFarmerSeedEntriesResult> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetAllFarmerSeedEntriesApiResponse | GetAllFarmerSeedEntriesError
    >('/farmer-seed/farmer-seed-entry', {
      headers: { Accept: 'application/json' },
      params: {
        page: params.page,
        limit: params.limit,
      },
    });

    if (!data.success || !('data' in data) || !Array.isArray(data.data)) {
      throw new Error(getFetchErrorMessage(data));
    }

    return {
      data: data.data,
      pagination: data.pagination,
    };
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

export const allFarmerSeedEntriesQueryOptions = (
  params: GetAllFarmerSeedEntriesParams = { page: 1, limit: 50 }
) =>
  queryOptions({
    queryKey: [...allFarmerSeedEntriesQueryKey, params] as const,
    queryFn: () => fetchAllFarmerSeedEntries(params),
  });

/** GET /farmer-seed/farmer-seed-entry */
export function useGetAllFarmerSeedEntries(
  params: GetAllFarmerSeedEntriesParams = { page: 1, limit: 50 }
) {
  return useQuery(allFarmerSeedEntriesQueryOptions(params));
}

export function prefetchAllFarmerSeedEntries(
  params: GetAllFarmerSeedEntriesParams = { page: 1, limit: 50 }
) {
  return queryClient.prefetchQuery(allFarmerSeedEntriesQueryOptions(params));
}
