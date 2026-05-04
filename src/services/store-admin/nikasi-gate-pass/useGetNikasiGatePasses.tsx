import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

/** Query key prefix for nikasi gate pass – use for invalidation */
export const nikasiGatePassKeys = {
  all: ['store-admin', 'nikasi-gate-pass'] as const,
  lists: () => [...nikasiGatePassKeys.all, 'list'] as const,
};

/** Params for GET /nikasi-gate-pass (date range in YYYY-MM-DD) */
export interface GetNikasiGatePassesParams {
  page?: number;
  limit?: number;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

export interface NikasiGatePassFarmer {
  _id: string;
  name: string;
  address: string;
  mobileNumber: string;
}

export interface NikasiGatePassLinkedBy {
  _id: string;
  name: string;
}

export interface NikasiGatePassFarmerStorageLink {
  _id: string;
  farmerId?: NikasiGatePassFarmer;
  linkedById?: NikasiGatePassLinkedBy;
  accountNumber?: number;
}

export interface NikasiGatePassCreatedBy {
  _id: string;
  name: string;
}

export interface NikasiGatePassDispatchLedger {
  _id: string;
  name: string;
  address?: string;
}

export interface NikasiGatePassBagSize {
  size: string;
  variety: string;
  quantityIssued: number;
}

export interface NikasiGatePassItem {
  _id: string;
  farmerStorageLinkId: NikasiGatePassFarmerStorageLink | string;
  dispatchLedgerId: NikasiGatePassDispatchLedger | string;
  createdBy?: NikasiGatePassCreatedBy | string;
  gatePassNo: number;
  manualGatePassNumber?: number;
  isInternalTransfer: boolean;
  date: string;
  from: string;
  /** Destination label on the gate pass; when unset, UI falls back to dispatch ledger name. */
  to?: string;
  /** @deprecated Legacy field kept for backward compatibility in UI */
  toField?: string;
  bagSize?: NikasiGatePassBagSize[];
  remarks?: string;
  netWeight?: number;
  averageWeightPerBag?: number;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface NikasiGatePassPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetNikasiGatePassesApiResponse {
  success: boolean;
  data?: NikasiGatePassItem[] | null;
  pagination?: NikasiGatePassPagination;
  message?: string;
}

type GetNikasiGatePassesError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

export interface GetNikasiGatePassesResult {
  data: NikasiGatePassItem[];
  pagination: NikasiGatePassPagination;
}

function sanitizeParams(
  params: GetNikasiGatePassesParams
): GetNikasiGatePassesParams {
  return {
    page:
      typeof params.page === 'number' && params.page > 0
        ? Math.floor(params.page)
        : undefined,
    limit:
      typeof params.limit === 'number' && params.limit > 0
        ? Math.floor(params.limit)
        : undefined,
    sortOrder: params.sortOrder,
    dateFrom: params.dateFrom?.trim() || undefined,
    dateTo: params.dateTo?.trim() || undefined,
  };
}

function getFetchErrorMessage(
  errorOrData: unknown,
  fallback = 'Failed to fetch nikasi gate passes'
): string {
  if (isAxiosError<GetNikasiGatePassesError>(errorOrData)) {
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

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'error' in errorOrData &&
    (errorOrData as GetNikasiGatePassesError).error?.message
  ) {
    return (errorOrData as GetNikasiGatePassesError).error?.message as string;
  }

  if (
    errorOrData &&
    typeof errorOrData === 'object' &&
    'message' in errorOrData &&
    typeof (errorOrData as { message?: unknown }).message === 'string'
  ) {
    return (errorOrData as { message: string }).message;
  }

  if (errorOrData instanceof Error && errorOrData.message) {
    return errorOrData.message;
  }

  return fallback;
}

/** Fetcher used by queryOptions and prefetch helpers */
async function fetchNikasiGatePasses(
  params: GetNikasiGatePassesParams
): Promise<GetNikasiGatePassesResult> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetNikasiGatePassesApiResponse>(
        '/nikasi-gate-pass',
        { params: safeParams }
      );

    if (!data.success) {
      throw new Error(getFetchErrorMessage(data));
    }

    const list = Array.isArray(data.data) ? data.data : [];
    const pagination = data.pagination ?? {
      page: safeParams.page ?? 1,
      limit: safeParams.limit ?? 10,
      total: list.length,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    return {
      data: list,
      pagination,
    };
  } catch (error) {
    throw new Error(getFetchErrorMessage(error), { cause: error });
  }
}

/** Query options – usable with useQuery, prefetchQuery, or route loaders */
export const nikasiGatePassesQueryOptions = (
  params: GetNikasiGatePassesParams = {}
) =>
  queryOptions({
    queryKey: [
      ...nikasiGatePassKeys.lists(),
      {
        page: params.page,
        limit: params.limit,
        sortOrder: params.sortOrder,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    ],
    queryFn: () => fetchNikasiGatePasses(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Hook to fetch nikasi gate passes with pagination */
export function useGetNikasiGatePasses(
  params: GetNikasiGatePassesParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...nikasiGatePassesQueryOptions(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  });
}

/** Hook that returns only list data – for non-paginated consumers */
export function useGetNikasiGatePassList(
  params: GetNikasiGatePassesParams = {}
) {
  return useQuery({
    ...nikasiGatePassesQueryOptions(params),
    placeholderData: keepPreviousData,
    select: (result) => result.data,
  });
}

/** Prefetch nikasi gate passes – e.g. on route hover or before navigation */
export function prefetchNikasiGatePasses(
  params: GetNikasiGatePassesParams = {}
) {
  return queryClient.prefetchQuery(nikasiGatePassesQueryOptions(params));
}
