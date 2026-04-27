import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

/** Voucher type for API query param `/store-admin/voucher-number?type=` */
export type VoucherNumberType =
  | 'incoming-gate-pass'
  | 'grading-gate-pass'
  | 'storage-gate-pass'
  | 'nikasi-gate-pass'
  | 'outgoing-gate-pass';

/** API response shape for voucher-number endpoint */
export interface VoucherNumberApiResponse {
  success: boolean;
  data: { type: string; nextVoucherNumber: number } | null;
  message?: string;
}

/** Query key factory */
export const voucherNumberKeys = {
  all: ['store-admin', 'voucher-number'] as const,
  detail: (type: VoucherNumberType) =>
    [...voucherNumberKeys.all, 'detail', type] as const,
};

function getVoucherNumberErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching voucher number';
    }

    if (!error.response) {
      return 'Network error while fetching voucher number';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch voucher number';
}

/** Fetcher used by queryOptions and prefetch helpers */
async function fetchVoucherNumber(
  type: VoucherNumberType = 'incoming-gate-pass'
): Promise<number> {
  try {
    const { data } = await storeAdminAxiosClient.get<VoucherNumberApiResponse>(
      '/store-admin/voucher-number',
      { params: { type } }
    );

    if (!data.success || data.data?.nextVoucherNumber == null) {
      throw new Error(data.message ?? 'Failed to fetch voucher number');
    }

    return data.data.nextVoucherNumber;
  } catch (error) {
    throw new Error(getVoucherNumberErrorMessage(error), { cause: error });
  }
}

/** Query options – usable with useQuery, prefetchQuery, and route loaders */
export const voucherNumberQueryOptions = (
  type: VoucherNumberType = 'incoming-gate-pass'
) =>
  queryOptions({
    queryKey: voucherNumberKeys.detail(type),
    queryFn: () => fetchVoucherNumber(type),
    // Keep stale by default so form mount always revalidates when desired.
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
  });

/** Fetch voucher number for a given gate-pass type */
export function useGetReceiptVoucherNumber(
  type: VoucherNumberType = 'incoming-gate-pass'
) {
  return useQuery({
    ...voucherNumberQueryOptions(type),
    refetchOnMount: 'always',
  });
}

/** Prefetch voucher number before opening gate-pass forms */
export function prefetchVoucherNumber(
  type: VoucherNumberType = 'incoming-gate-pass'
) {
  return queryClient.prefetchQuery(voucherNumberQueryOptions(type));
}
