import { queryOptions, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerSeedAuditEntry,
  FarmerSeedEntryPagination,
  GetFarmerSeedAuditApiResponse,
} from '@/types/farmer-seed';
import { farmerSeedKeys } from './useCreateFarmerSeedEntry';

type GetFarmerSeedAuditError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetFarmerSeedAuditError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch farmer seed edit history'
  );
}

export interface GetFarmerSeedEditHistoryParams {
  page?: number;
  limit?: number;
}

export interface GetFarmerSeedEditHistoryResult {
  data: FarmerSeedAuditEntry[];
  pagination?: FarmerSeedEntryPagination;
}

async function fetchFarmerSeedEditHistory(
  params: GetFarmerSeedEditHistoryParams
): Promise<GetFarmerSeedEditHistoryResult> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetFarmerSeedAuditApiResponse | GetFarmerSeedAuditError
    >('/farmer-seed/audit', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
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
        getFetchErrorMessage(responseData as GetFarmerSeedAuditError),
        { cause: err }
      );
    }
    throw err;
  }
}

export const farmerSeedEditHistoryQueryKey = [
  ...farmerSeedKeys.all,
  'audit',
] as const;

export const farmerSeedEditHistoryQueryOptions = (
  params: GetFarmerSeedEditHistoryParams = { page: 1, limit: 50 },
  enabled = true
) =>
  queryOptions({
    queryKey: [...farmerSeedEditHistoryQueryKey, params] as const,
    queryFn: () => fetchFarmerSeedEditHistory(params),
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

/** GET /farmer-seed/audit */
export function useGetFarmerSeedEditHistory(
  params: GetFarmerSeedEditHistoryParams = { page: 1, limit: 50 },
  options?: { enabled?: boolean }
) {
  return useQuery(
    farmerSeedEditHistoryQueryOptions(params, options?.enabled ?? true)
  );
}

export function prefetchFarmerSeedEditHistory(
  params: GetFarmerSeedEditHistoryParams = { page: 1, limit: 50 }
) {
  return queryClient.prefetchQuery(farmerSeedEditHistoryQueryOptions(params));
}
