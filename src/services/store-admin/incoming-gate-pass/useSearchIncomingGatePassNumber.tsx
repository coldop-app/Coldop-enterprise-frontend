import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  IncomingGatePassByFarmerStorageLinkItem,
  SearchIncomingGatePassApiResponse,
} from '@/types/incoming-gate-pass';
import { incomingGatePassKeys } from './useGetIncomingGatePasses';

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

function getSearchIncomingGatePassErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while searching incoming gate passes';
    }

    if (!error.response) {
      return 'Network error while searching incoming gate passes';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to search incoming gate passes';
}

async function fetchSearchIncomingGatePassByNumber(
  gatePassNo: string | number
): Promise<IncomingGatePassByFarmerStorageLinkItem[]> {
  try {
    const segment = encodeURIComponent(String(gatePassNo));
    const { data } =
      await storeAdminAxiosClient.get<SearchIncomingGatePassApiResponse>(
        `/incoming-gate-pass/search/${segment}`
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to search incoming gate passes');
    }

    return data.data;
  } catch (error) {
    throw new Error(getSearchIncomingGatePassErrorMessage(error), {
      cause: error,
    });
  }
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
 * Search incoming gate passes by gate pass number.
 * GET /incoming-gate-pass/search/:gatePassNo
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
