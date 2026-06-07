import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export const nikasiGatePassReportKeys = {
  all: ['store-admin', 'nikasi-gate-pass', 'report'] as const,
};

export interface GetNikasiGatePassReportParams {
  fromDate?: string;
  toDate?: string;
}

export interface NikasiGatePassReportColumn {
  id: string;
  header: string;
  accessorKey: string;
}

export interface NikasiGatePassReportBagSize {
  size: string;
  bagType: string;
  variety: string;
  quantityIssued: number;
}

export interface NikasiGatePassReportDataRow {
  id: string;
  farmerName?: string;
  accountNumber?: number | string;
  dispatchLedger?: string;
  gatePassNo?: number;
  manualGatePassNumber?: number | null;
  date?: string;
  from?: string;
  to?: string;
  truckNumber?: string;
  variety?: string;
  bagSizes?: NikasiGatePassReportBagSize[];
  totalBagsIssued?: number;
  averageWeightPerBag?: number;
  netWeight?: number;
  isInternalTransfer?: boolean;
  remarks?: string | null;
  [key: string]: unknown;
}

export interface NikasiGatePassReportResult {
  columns: NikasiGatePassReportColumn[];
  data: NikasiGatePassReportDataRow[];
}

export interface NikasiGatePassReportListApiResponse {
  success: boolean;
  columns?: NikasiGatePassReportColumn[];
  data?: NikasiGatePassReportDataRow[] | null;
  message?: string;
}

function sanitizeParams(
  params: GetNikasiGatePassReportParams
): GetNikasiGatePassReportParams {
  return {
    fromDate: params.fromDate?.trim() || undefined,
    toDate: params.toDate?.trim() || undefined,
  };
}

function getNikasiGatePassReportErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching nikasi gate pass report';
    }

    if (!error.response) {
      return 'Network error while fetching nikasi gate pass report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch nikasi gate pass report';
}

async function fetchNikasiGatePassReport(
  params: GetNikasiGatePassReportParams
): Promise<NikasiGatePassReportResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<NikasiGatePassReportListApiResponse>(
        '/nikasi-gate-pass/report',
        {
          params: safeParams,
        }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch nikasi gate pass report'
      );
    }

    return {
      columns: Array.isArray(data.columns) ? data.columns : [],
      data: Array.isArray(data.data) ? data.data : [],
    };
  } catch (error) {
    throw new Error(getNikasiGatePassReportErrorMessage(error), {
      cause: error,
    });
  }
}

export const nikasiGatePassReportQueryOptions = (
  params: GetNikasiGatePassReportParams = {}
) =>
  queryOptions({
    queryKey: [
      ...nikasiGatePassReportKeys.all,
      {
        fromDate: params.fromDate,
        toDate: params.toDate,
      },
    ],
    queryFn: () => fetchNikasiGatePassReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetNikasiGatePassReport(
  params: GetNikasiGatePassReportParams = {},
  options?: { enabled?: boolean }
) {
  const hasDateRange = Boolean(params.fromDate && params.toDate);

  return useQuery({
    ...nikasiGatePassReportQueryOptions(params),
    enabled: options?.enabled ?? hasDateRange,
  });
}

export function prefetchNikasiGatePassReport(
  params: GetNikasiGatePassReportParams = {}
) {
  return queryClient.prefetchQuery(nikasiGatePassReportQueryOptions(params));
}
