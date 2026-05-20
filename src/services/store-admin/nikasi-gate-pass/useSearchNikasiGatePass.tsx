import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type { NikasiGatePassItem } from './useGetNikasiGatePasses';
import { nikasiGatePassKeys } from './useGetNikasiGatePasses';

export interface SearchNikasiGatePassApiResponse {
  success: boolean;
  data?: NikasiGatePassItem[] | null;
  message?: string;
}

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

function getSearchNikasiGatePassErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while searching nikasi gate passes';
    }

    if (!error.response) {
      return 'Network error while searching nikasi gate passes';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to search nikasi gate passes';
}

async function fetchSearchNikasiGatePassByNumber(
  gatePassNo: string | number
): Promise<NikasiGatePassItem[]> {
  try {
    const segment = encodeURIComponent(String(gatePassNo));
    const { data } =
      await storeAdminAxiosClient.get<SearchNikasiGatePassApiResponse>(
        `/nikasi-gate-pass/search/${segment}`
      );

    if (!data.success || data.data == null) {
      throw new Error(data.message ?? 'Failed to search nikasi gate passes');
    }

    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getSearchNikasiGatePassErrorMessage(error), {
      cause: error,
    });
  }
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
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
  });
};

/**
 * Search nikasi gate passes by gate pass number.
 * GET /nikasi-gate-pass/search/:gatePassNo
 */
export function useSearchNikasiGatePass(
  gatePassNo: string | number | undefined | null,
  options?: { enabled?: boolean }
) {
  const query = searchNikasiGatePassQueryOptions(gatePassNo);
  return useQuery({
    ...query,
    enabled: (query.enabled ?? true) && (options?.enabled ?? true),
  });
}

export function prefetchSearchNikasiGatePass(
  gatePassNo: string | number | undefined | null
) {
  return queryClient.prefetchQuery(
    searchNikasiGatePassQueryOptions(gatePassNo)
  );
}
