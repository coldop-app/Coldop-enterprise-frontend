import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import {
  type NikasiGatePassBagSize,
  type NikasiGatePassItem,
  type NikasiGatePassPagination,
  nikasiGatePassKeys,
} from './useGetNikasiGatePasses';

type NikasiGatePassEditHistoryApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export interface GetNikasiGatePassEditHistoryParams {
  page?: number;
  limit?: number;
}

interface NikasiGatePassAuditUser {
  _id: string;
  name: string;
  mobileNumber?: string;
}

interface NikasiGatePassAuditDispatchLedger {
  _id: string;
  name: string;
  address?: string;
}

interface NikasiGatePassAuditState {
  _id: string;
  farmerStorageLinkId?: string;
  createdBy?: string | { _id: string; name: string };
  gatePassNo?: number;
  manualGatePassNumber?: number;
  date?: string;
  from?: string;
  toField?: string;
  bagSize?: NikasiGatePassBagSize[];
  remarks?: string;
  netWeight?: number;
  averageWeightPerBag?: number;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  isInternalTransfer?: boolean;
  dispatchLedgerId?: string | NikasiGatePassAuditDispatchLedger;
}

export interface NikasiGatePassAuditItem {
  _id: string;
  nikasiGatePassId?: NikasiGatePassItem | string;
  editedById?: NikasiGatePassAuditUser | string;
  previousState?: NikasiGatePassAuditState;
  updatedState?: NikasiGatePassAuditState;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  __v?: number;
}

export interface GetNikasiGatePassEditHistoryApiResponse {
  success: boolean;
  data?: NikasiGatePassAuditItem[] | null;
  pagination?: NikasiGatePassPagination;
  message?: string;
}

export interface GetNikasiGatePassEditHistoryResult {
  data: NikasiGatePassAuditItem[];
  pagination?: NikasiGatePassPagination;
}

function sanitizeParams(
  params: GetNikasiGatePassEditHistoryParams
): GetNikasiGatePassEditHistoryParams {
  return {
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : undefined,
    limit:
      typeof params.limit === 'number' && params.limit > 0
        ? Math.floor(params.limit)
        : undefined,
  };
}

function getNikasiGatePassEditHistoryErrorMessage(
  errorOrData: unknown
): string {
  if (isAxiosError<NikasiGatePassEditHistoryApiError>(errorOrData)) {
    const apiData = errorOrData.response?.data;
    if (apiData?.error?.message) return apiData.error.message;
    if (apiData?.message) return apiData.message;

    if (errorOrData.code === 'ECONNABORTED') {
      return 'Request timed out while fetching nikasi gate pass audit history';
    }
    if (!errorOrData.response) {
      return 'Network error while fetching nikasi gate pass audit history';
    }
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return 'Failed to fetch nikasi gate pass audit history';
}

async function fetchNikasiGatePassEditHistory(
  params: GetNikasiGatePassEditHistoryParams
): Promise<GetNikasiGatePassEditHistoryResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetNikasiGatePassEditHistoryApiResponse>(
        '/nikasi-gate-pass/audit',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch nikasi gate pass audit history'
      );
    }

    return {
      data: Array.isArray(data.data) ? data.data : [],
      pagination: data.pagination,
    };
  } catch (error) {
    throw new Error(getNikasiGatePassEditHistoryErrorMessage(error), {
      cause: error,
    });
  }
}

export const nikasiGatePassEditHistoryQueryOptions = (
  params: GetNikasiGatePassEditHistoryParams = {}
) => {
  const safeParams = sanitizeParams(params);

  return queryOptions({
    queryKey: [
      ...nikasiGatePassKeys.all,
      'audit-history',
      {
        page: safeParams.page,
        limit: safeParams.limit,
      },
    ],
    queryFn: () => fetchNikasiGatePassEditHistory(safeParams),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
};

/** GET /nikasi-gate-pass/audit */
export function useGetNikasiGatePassEditHistory(
  params: GetNikasiGatePassEditHistoryParams = {}
) {
  return useQuery({
    ...nikasiGatePassEditHistoryQueryOptions(params),
    placeholderData: keepPreviousData,
  });
}

export function prefetchNikasiGatePassEditHistory(
  params: GetNikasiGatePassEditHistoryParams = {}
) {
  return queryClient.prefetchQuery(
    nikasiGatePassEditHistoryQueryOptions(params)
  );
}
