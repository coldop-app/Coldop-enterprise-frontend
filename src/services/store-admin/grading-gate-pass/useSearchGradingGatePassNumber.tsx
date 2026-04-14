import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GradingGatePass,
  SearchGradingGatePassApiResponse,
} from '@/types/grading-gate-pass';
import { gradingGatePassKeys } from './useGetGradingGatePasses';

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

async function fetchSearchGradingGatePassByNumber(
  gatePassNo: string | number
): Promise<GradingGatePass[]> {
  const segment = encodeURIComponent(String(gatePassNo));
  const { data } =
    await storeAdminAxiosClient.get<SearchGradingGatePassApiResponse>(
      `/grading-gate-pass/search/${segment}`
    );

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to search grading gate passes');
  }

  return data.data;
}

/** Query options for GET /grading-gate-pass/search/:gatePassNo */
export const searchGradingGatePassNumberQueryOptions = (
  gatePassNo: string | number | undefined | null
) => {
  const normalized = normalizeGatePassNo(gatePassNo);

  return queryOptions({
    queryKey: [...gradingGatePassKeys.all, 'search', normalized] as const,
    queryFn: () => fetchSearchGradingGatePassByNumber(normalized!),
    enabled: normalized !== null,
  });
};

/**
 * Search grading gate passes by gate pass number (matches system and manual numbers per API).
 * GET /grading-gate-pass/search/:gatePassNo
 */
export function useSearchGradingGatePassNumber(
  gatePassNo: string | number | undefined | null
) {
  return useQuery(searchGradingGatePassNumberQueryOptions(gatePassNo));
}

export function prefetchSearchGradingGatePassNumber(
  gatePassNo: string | number | undefined | null
) {
  return queryClient.prefetchQuery(
    searchGradingGatePassNumberQueryOptions(gatePassNo)
  );
}
