import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetDispatchLedgerNikasiGatePassesApiResponse,
  GetDispatchLedgerNikasiGatePassesResult,
} from '@/types/dispatch-ledger';
import { dispatchLedgerKeys } from './useGetDispatchLedgers';

type DispatchLedgerApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

const EMPTY_SUMMARY: GetDispatchLedgerNikasiGatePassesResult['summary'] = {
  totalBagsDispatched: 0,
  gatePassCount: 0,
};

function getNikasiGatePassesErrorMessage(errorOrData: unknown): string {
  if (isAxiosError<DispatchLedgerApiError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching nikasi gate passes';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching nikasi gate passes';
    }
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return 'Failed to fetch nikasi gate passes';
}

async function fetchNikasiGatePassesForDispatchLedger(
  dispatchLedgerId: string
): Promise<GetDispatchLedgerNikasiGatePassesResult> {
  const safeId = dispatchLedgerId.trim();
  if (!safeId) {
    throw new Error('Dispatch ledger id is required');
  }

  try {
    const { data } =
      await storeAdminAxiosClient.get<GetDispatchLedgerNikasiGatePassesApiResponse>(
        `/dispatch-ledger/${encodeURIComponent(safeId)}/nikasi-gate-passes`
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch nikasi gate passes for dispatch ledger'
      );
    }

    const payload = data.data;
    const nikasiGatePasses = Array.isArray(payload?.nikasiGatePasses)
      ? payload.nikasiGatePasses
      : [];
    const summary = payload?.summary ?? EMPTY_SUMMARY;

    return {
      dispatchLedger: payload?.dispatchLedger ?? null,
      nikasiGatePasses,
      summary: {
        totalBagsDispatched: summary.totalBagsDispatched ?? 0,
        gatePassCount: summary.gatePassCount ?? nikasiGatePasses.length,
      },
    };
  } catch (error) {
    throw new Error(getNikasiGatePassesErrorMessage(error), { cause: error });
  }
}

/** Query options for GET /dispatch-ledger/:dispatchLedgerId/nikasi-gate-passes */
export const dispatchLedgerNikasiGatePassesQueryOptions = (
  dispatchLedgerId: string
) =>
  queryOptions({
    queryKey: dispatchLedgerKeys.nikasiGatePasses(dispatchLedgerId),
    queryFn: () => fetchNikasiGatePassesForDispatchLedger(dispatchLedgerId),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export interface UseGetAllGatePassesOfDispatchLedgerOptions {
  dispatchLedgerId: string;
  enabled?: boolean;
}

/**
 * Fetches all nikasi gate passes and summary for a dispatch ledger.
 * GET /dispatch-ledger/:dispatchLedgerId/nikasi-gate-passes
 */
export function useGetAllGatePassesOfDispatchLedger(
  options: UseGetAllGatePassesOfDispatchLedgerOptions
) {
  const { dispatchLedgerId, enabled } = options;
  const trimmedId = dispatchLedgerId.trim();
  const queryEnabled = enabled ?? true;

  return useQuery({
    ...dispatchLedgerNikasiGatePassesQueryOptions(trimmedId),
    placeholderData: keepPreviousData,
    enabled: queryEnabled && trimmedId.length > 0,
  });
}

export function prefetchDispatchLedgerNikasiGatePasses(
  dispatchLedgerId: string
) {
  const trimmed = dispatchLedgerId.trim();
  if (!trimmed) return Promise.resolve();
  return queryClient.prefetchQuery(
    dispatchLedgerNikasiGatePassesQueryOptions(trimmed)
  );
}
