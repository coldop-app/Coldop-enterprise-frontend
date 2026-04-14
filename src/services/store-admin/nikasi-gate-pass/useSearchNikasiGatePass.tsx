import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  NikasiGatePassWithLink,
  SearchNikasiGatePassApiResponse,
} from '@/types/nikasi-gate-pass';
import { nikasiGatePassKeys } from './useGetNikasiGatePasses';

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

async function fetchSearchNikasiGatePassByNumber(
  gatePassNo: string | number
): Promise<NikasiGatePassWithLink[]> {
  const segment = encodeURIComponent(String(gatePassNo));
  const { data } =
    await storeAdminAxiosClient.get<SearchNikasiGatePassApiResponse>(
      `/nikasi-gate-pass/search/${segment}`
    );

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to search dispatch (nikasi) gate passes'
    );
  }

  return data.data;
}

/** Query options for GET /nikasi-gate-pass/search/:gatePassNo */
export const searchNikasiGatePassQueryOptions = (
  gatePassNo: string | number | undefined | null
) => {
  const normalized = normalizeGatePassNo(gatePassNo);

  return queryOptions({
    queryKey: [...nikasiGatePassKeys.all, 'search', normalized] as const,
    queryFn: () => fetchSearchNikasiGatePassByNumber(normalized!),
    enabled: normalized !== null,
  });
};

/**
 * Search nikasi (dispatch) gate passes by gate pass number (system or manual per API).
 * GET /nikasi-gate-pass/search/:gatePassNo
 * Auth is applied via store admin axios client (Bearer token).
 */
export function useSearchNikasiGatePass(
  gatePassNo: string | number | undefined | null
) {
  return useQuery(searchNikasiGatePassQueryOptions(gatePassNo));
}

export function prefetchSearchNikasiGatePass(
  gatePassNo: string | number | undefined | null
) {
  return queryClient.prefetchQuery(
    searchNikasiGatePassQueryOptions(gatePassNo)
  );
}
