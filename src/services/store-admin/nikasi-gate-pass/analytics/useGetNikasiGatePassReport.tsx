import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type { NikasiGatePassBagSize } from '../useGetNikasiGatePasses';

export const nikasiGatePassReportKeys = {
  all: ['store-admin', 'nikasi-gate-pass', 'report'] as const,
};

export interface GetNikasiGatePassReportParams {
  fromDate?: string;
  toDate?: string;
}

export interface NikasiGatePassReportFarmerRef {
  _id: string;
  name: string;
  mobileNumber: string;
  address: string;
}

export interface NikasiGatePassReportLinkedByRef {
  _id: string;
  name: string;
}

/** Populated farmer storage link on GET /nikasi-gate-pass/report */
export interface NikasiGatePassReportFarmerStorageLinkPopulated {
  _id: string;
  /** Backend may return numeric or string account labels (e.g. FSL-1024). */
  accountNumber?: string | number;
  farmerId: NikasiGatePassReportFarmerRef;
  linkedById?: NikasiGatePassReportLinkedByRef;
}

export interface NikasiGatePassReportDispatchLedgerPopulated {
  _id: string;
  name: string;
  address?: string;
  mobileNumber?: string;
}

export interface NikasiGatePassReportCreatedByRef {
  _id: string;
  name: string;
}

/** One row in GET /nikasi-gate-pass/report `data` array */
export interface NikasiGatePassReportRow {
  _id: string;
  farmerStorageLinkId: NikasiGatePassReportFarmerStorageLinkPopulated;
  dispatchLedgerId: NikasiGatePassReportDispatchLedgerPopulated;
  createdBy?: NikasiGatePassReportCreatedByRef;
  gatePassNo: number;
  manualGatePassNumber?: number | null;
  isInternalTransfer: boolean;
  date: string;
  from: string;
  to: string;
  truckNumber?: string;
  bagSize?: NikasiGatePassBagSize[];
  remarks?: string;
  netWeight?: number;
  averageWeightPerBag?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NikasiGatePassReportListApiResponse {
  success: boolean;
  data?: NikasiGatePassReportRow[] | null;
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
): Promise<NikasiGatePassReportRow[]> {
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

    return Array.isArray(data.data) ? data.data : [];
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
