import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';

type GetIncomingGatePassesOfFarmerResponse = {
  success: boolean;
  message?: string;
  data?: IncomingGatePassByFarmerStorageLinkItem[] | null;
};

type GetIncomingGatePassesOfFarmerError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export const incomingGatePassesOfFarmerKeys = {
  all: ['store-admin', 'farmer-storage-link', 'incoming-gate-passes'] as const,
  detail: (farmerStorageLinkId: string) =>
    [...incomingGatePassesOfFarmerKeys.all, farmerStorageLinkId] as const,
};

function getFetchErrorMessage(
  data?: GetIncomingGatePassesOfFarmerError
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch incoming gate passes of farmer'
  );
}

async function fetchIncomingGatePassesOfFarmer(
  farmerStorageLinkId: string
): Promise<IncomingGatePassByFarmerStorageLinkItem[]> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetIncomingGatePassesOfFarmerResponse | GetIncomingGatePassesOfFarmerError
    >(
      `/farmer-storage-link/${encodeURIComponent(
        farmerStorageLinkId
      )}/incoming-gate-passes`
    );

    if (!data.success || !('data' in data)) {
      throw new Error(getFetchErrorMessage(data));
    }

    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    if (isAxiosError<GetIncomingGatePassesOfFarmerError>(error)) {
      throw new Error(getFetchErrorMessage(error.response?.data), {
        cause: error,
      });
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to fetch incoming gate passes of farmer', {
      cause: error,
    });
  }
}

export function incomingGatePassesOfFarmerQueryOptions(
  farmerStorageLinkId: string
) {
  return queryOptions({
    queryKey: incomingGatePassesOfFarmerKeys.detail(farmerStorageLinkId),
    queryFn: () => fetchIncomingGatePassesOfFarmer(farmerStorageLinkId),
    enabled: Boolean(farmerStorageLinkId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useGetIncomingGatePassesOfFarmer(farmerStorageLinkId: string) {
  return useQuery(incomingGatePassesOfFarmerQueryOptions(farmerStorageLinkId));
}

export function prefetchIncomingGatePassesOfFarmer(
  farmerStorageLinkId: string
) {
  return queryClient.prefetchQuery(
    incomingGatePassesOfFarmerQueryOptions(farmerStorageLinkId)
  );
}
