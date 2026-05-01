import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  DispatchLedger,
  GetDispatchLedgersApiResponse,
} from '@/types/dispatch-ledger';

/** Query key prefix for dispatch ledger cache and invalidation */
export const dispatchLedgerKeys = {
  all: ['store-admin', 'dispatch-ledger'] as const,
  lists: () => [...dispatchLedgerKeys.all, 'list'] as const,
};

type DispatchLedgerApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export interface GetDispatchLedgersResult {
  data: DispatchLedger[];
}

function getDispatchLedgersErrorMessage(errorOrData: unknown): string {
  if (isAxiosError<DispatchLedgerApiError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching dispatch ledgers';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching dispatch ledgers';
    }
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return 'Failed to fetch dispatch ledgers';
}

async function fetchDispatchLedgers(): Promise<GetDispatchLedgersResult> {
  try {
    const { data } =
      await storeAdminAxiosClient.get<GetDispatchLedgersApiResponse>(
        '/dispatch-ledger'
      );

    if (!data.success) {
      throw new Error(data.message ?? 'Failed to fetch dispatch ledgers');
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
    };
  } catch (error) {
    throw new Error(getDispatchLedgersErrorMessage(error), { cause: error });
  }
}

/** Query options — usable with useQuery, prefetchQuery, or route loaders */
export const dispatchLedgersQueryOptions = () =>
  queryOptions({
    queryKey: [...dispatchLedgerKeys.lists()],
    queryFn: fetchDispatchLedgers,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Hook to fetch dispatch ledgers */
export function useGetDispatchLedgers(options?: { enabled?: boolean }) {
  return useQuery({
    ...dispatchLedgersQueryOptions(),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** Prefetch dispatch ledgers — e.g. on route hover or before navigation */
export function prefetchDispatchLedgers() {
  return queryClient.prefetchQuery(dispatchLedgersQueryOptions());
}
