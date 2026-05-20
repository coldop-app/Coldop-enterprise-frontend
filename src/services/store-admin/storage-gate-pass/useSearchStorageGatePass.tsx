import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  SearchStorageGatePassApiResponse,
  StorageGatePassWithLink,
} from '@/types/storage-gate-pass';
import { storageGatePassKeys } from './useGetStorageGatePasses';

function normalizeGatePassNo(
  gatePassNo: string | number | undefined | null
): string | number | null {
  if (gatePassNo === undefined || gatePassNo === null) {
    return null;
  }
  if (typeof gatePassNo === 'string') {
    const trimmed = gatePassNo.trim();
    return trimmed === '' ? null : trimmed;
  }
  return gatePassNo;
}

async function fetchSearchStorageGatePassByNumber(
  gatePassNo: string | number
): Promise<StorageGatePassWithLink[]> {
  const segment = encodeURIComponent(String(gatePassNo));
  const { data } =
    await storeAdminAxiosClient.get<SearchStorageGatePassApiResponse>(
      `/storage-gate-pass/search/${segment}`
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to search storage gate passes');
  }

  return data.data;
}

/** Query options for GET /storage-gate-pass/search/:gatePassNo */
export const searchStorageGatePassQueryOptions = (
  gatePassNo: string | number | undefined | null
) => {
  const normalized = normalizeGatePassNo(gatePassNo);

  return queryOptions({
    queryKey: [...storageGatePassKeys.all, 'search', normalized] as const,
    queryFn: () => fetchSearchStorageGatePassByNumber(normalized!),
    enabled: normalized !== null,
  });
};

/**
 * Search storage gate passes by gate pass number (system or manual per API).
 * GET /storage-gate-pass/search/:gatePassNo
 * Auth is applied via store admin axios client (Bearer token).
 */
export function useSearchStorageGatePass(
  gatePassNo: string | number | undefined | null,
  options?: { enabled?: boolean }
) {
  const query = searchStorageGatePassQueryOptions(gatePassNo);
  return useQuery({
    ...query,
    enabled: (query.enabled ?? true) && (options?.enabled ?? true),
  });
}

export function prefetchSearchStorageGatePass(
  gatePassNo: string | number | undefined | null
) {
  return queryClient.prefetchQuery(
    searchStorageGatePassQueryOptions(gatePassNo)
  );
}
