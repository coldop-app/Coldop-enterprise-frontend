import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import type { NikasiGatePass } from '@/types/nikasi-gate-pass';

/** Totals returned by the get-all-gate-passes-of-farmer API */
export interface GatePassesTotals {
  incoming: number;
  grading: number;
  dispatch: number;
  storage: number;
  outgoing: number;
  totalUngraded: number;
}

/** Payload of the get-all-gate-passes-of-farmer API (data key) */
export interface GetAllGatePassesOfFarmerData {
  incoming: IncomingGatePassByFarmerStorageLinkItem[];
  grading: GradingGatePass[];
  dispatch: NikasiGatePass[];
  storage: StorageGatePassWithLink[];
  outgoing: unknown[];
  totals: GatePassesTotals;
}

/** API response for GET .../gate-passes */
export interface GetAllGatePassesOfFarmerApiResponse {
  success: boolean;
  data: GetAllGatePassesOfFarmerData;
}

export interface AllGatePassesOfFarmer {
  incoming: {
    data: IncomingGatePassByFarmerStorageLinkItem[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  grading: {
    data: GradingGatePass[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  storage: {
    data: StorageGatePassWithLink[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  nikasi: {
    data: NikasiGatePass[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  totals: GatePassesTotals | null;
}

const queryKeyPrefix = [
  'store-admin',
  'farmer-storage-link-gate-passes',
] as const;

function allGatePassesOfFarmerKey(farmerStorageLinkId: string) {
  return [...queryKeyPrefix, farmerStorageLinkId] as const;
}

type GetError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(data: GetError | undefined): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch gate passes for farmer'
  );
}

async function fetchAllGatePassesOfFarmer(
  farmerStorageLinkId: string
): Promise<GetAllGatePassesOfFarmerData> {
  const { data } = await storeAdminAxiosClient.get<
    GetAllGatePassesOfFarmerApiResponse | GetError
  >(`/farmer-storage-link/${encodeURIComponent(farmerStorageLinkId)}/passes`);

  if (!data.success || !('data' in data) || data.data == null) {
    throw new Error(getFetchErrorMessage(data));
  }

  const response = data as GetAllGatePassesOfFarmerApiResponse;
  return response.data;
}

export function allGatePassesOfFarmerQueryOptions(farmerStorageLinkId: string) {
  return queryOptions({
    queryKey: allGatePassesOfFarmerKey(farmerStorageLinkId),
    queryFn: () => fetchAllGatePassesOfFarmer(farmerStorageLinkId),
    enabled: Boolean(farmerStorageLinkId),
  });
}

/**
 * Fetches all gate pass types and totals for a single farmer (by farmer-storage-link id)
 * from a single API: GET /api/v1/farmer-storage-link/:id/passes
 */
export function useGetAllGatePassesOfFarmer(
  farmerStorageLinkId: string
): AllGatePassesOfFarmer {
  const query = useQuery(
    allGatePassesOfFarmerQueryOptions(farmerStorageLinkId)
  );
  const data = query.data;

  return {
    incoming: {
      data: data?.incoming ?? [],
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    grading: {
      data: data?.grading ?? [],
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    storage: {
      data: data?.storage ?? [],
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    nikasi: {
      data: data?.dispatch ?? [],
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    totals: data?.totals ?? null,
  };
}
