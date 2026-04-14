import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  IncomingGatePassByFarmerStorageLinkItem,
  SearchIncomingGatePassApiResponse,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useCreateIncomingGatePass';

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

async function fetchSearchIncomingGatePassByNumber(
  gatePassNo: string | number
): Promise<IncomingGatePassByFarmerStorageLinkItem[]> {
  const segment = encodeURIComponent(String(gatePassNo));
  const { data } =
    await storeAdminAxiosClient.get<SearchIncomingGatePassApiResponse>(
      `/incoming-gate-pass/search/${segment}`
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to search incoming gate passes');
  }

  return data.data;
}

/** Query options for GET /incoming-gate-pass/search/:gatePassNo */
export const searchIncomingGatePassNumberQueryOptions = (
  gatePassNo: string | number | undefined | null
) => {
  const normalized = normalizeGatePassNo(gatePassNo);

  return queryOptions({
    queryKey: [...incomingGatePassKeys.all, 'search', normalized] as const,
    queryFn: () => fetchSearchIncomingGatePassByNumber(normalized!),
    enabled: normalized !== null,
  });
};

/**
 * Search incoming gate passes by gate pass number (matches system and manual numbers per API).
 * GET /incoming-gate-pass/search/:gatePassNo
 * Auth is applied via store admin axios client (Bearer token).
 */
export function useSearchIncomingGatePassNumber(
  gatePassNo: string | number | undefined | null
) {
  return useQuery(searchIncomingGatePassNumberQueryOptions(gatePassNo));
}

export function prefetchSearchIncomingGatePassNumber(
  gatePassNo: string | number | undefined | null
) {
  return queryClient.prefetchQuery(
    searchIncomingGatePassNumberQueryOptions(gatePassNo)
  );
}
