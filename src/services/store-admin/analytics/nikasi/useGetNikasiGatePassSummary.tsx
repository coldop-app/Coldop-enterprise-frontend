import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetNikasiGatePassSummaryApiResponse,
  NikasiGatePassSummaryData,
} from '@/types/analytics';

/** Query key prefix for nikasi (dispatch) gate pass summary */
export const nikasiGatePassSummaryKeys = {
  all: ['store-admin', 'analytics', 'nikasi-gate-pass-summary'] as const,
};

/** Params for GET /analytics/nikasi-summary (date range in YYYY-MM-DD) */
export interface GetNikasiGatePassSummaryParams {
  dateFrom?: string;
  dateTo?: string;
}

function summaryQueryParams(
  params: GetNikasiGatePassSummaryParams
): Record<string, string> | undefined {
  const q: Record<string, string> = {};
  if (params.dateFrom != null && params.dateFrom !== '') {
    q.dateFrom = params.dateFrom;
  }
  if (params.dateTo != null && params.dateTo !== '') {
    q.dateTo = params.dateTo;
  }
  return Object.keys(q).length > 0 ? q : undefined;
}

async function fetchNikasiGatePassSummary(
  params: GetNikasiGatePassSummaryParams
): Promise<NikasiGatePassSummaryData> {
  const { data } =
    await storeAdminAxiosClient.get<GetNikasiGatePassSummaryApiResponse>(
      '/analytics/nikasi-summary',
      {
        params: summaryQueryParams(params),
      }
    );

  if (!data.success || data.data == null) {
    throw new Error(
      data.message ?? 'Failed to fetch dispatch (nikasi) gate pass summary'
    );
  }

  return data.data;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const nikasiGatePassSummaryQueryOptions = (
  params: GetNikasiGatePassSummaryParams
) =>
  queryOptions({
    queryKey: [...nikasiGatePassSummaryKeys.all, params] as const,
    queryFn: () => fetchNikasiGatePassSummary(params),
  });

/** Hook to fetch nikasi summary: varieties with total quantity issued and per-size breakdown */
export function useGetNikasiGatePassSummary(
  params: GetNikasiGatePassSummaryParams = {}
) {
  return useQuery(nikasiGatePassSummaryQueryOptions(params));
}

export function prefetchNikasiGatePassSummary(
  params: GetNikasiGatePassSummaryParams = {}
) {
  return queryClient.prefetchQuery(nikasiGatePassSummaryQueryOptions(params));
}
