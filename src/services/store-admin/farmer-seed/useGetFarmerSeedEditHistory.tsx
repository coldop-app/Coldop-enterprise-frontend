import { queryOptions, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerSeedAuditEntry,
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

async function fetchFarmerSeedEditHistory(): Promise<FarmerSeedAuditEntry[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetFarmerSeedAuditApiResponse | GetFarmerSeedAuditError
    >('/farmer-seed/audit', {
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
        getFetchErrorMessage(responseData as GetFarmerSeedAuditError)
      );
    }
    throw err;
  }
}

export const farmerSeedEditHistoryQueryKey = [
  ...farmerSeedKeys.all,
  'audit',
] as const;

export const farmerSeedEditHistoryQueryOptions = () =>
  queryOptions({
    queryKey: farmerSeedEditHistoryQueryKey,
    queryFn: fetchFarmerSeedEditHistory,
  });

/** GET /farmer-seed/audit */
export function useGetFarmerSeedEditHistory() {
  return useQuery(farmerSeedEditHistoryQueryOptions());
}

export function prefetchFarmerSeedEditHistory() {
  return queryClient.prefetchQuery(farmerSeedEditHistoryQueryOptions());
}
