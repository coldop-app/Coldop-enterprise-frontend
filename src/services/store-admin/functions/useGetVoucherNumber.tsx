import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

/** Voucher type for the API – corresponds to voucher-number?type= */
export type VoucherNumberType =
  | 'incoming-gate-pass'
  | 'grading-gate-pass'
  | 'storage-gate-pass'
  | 'nikasi-gate-pass'
  | 'outgoing-gate-pass';

/** API response shape for voucher-number */
export interface VoucherNumberApiResponse {
  success: boolean;
  data: { type: string; nextVoucherNumber: number } | null;
  message?: string;
}

/** Query key factory */
export const voucherNumberKeys = {
  all: ['store-admin', 'voucher-number'] as const,
  detail: (type: VoucherNumberType) =>
    [...voucherNumberKeys.all, type] as const,
};

/** Fetcher used by queryOptions and prefetch */
async function fetchVoucherNumber(
  type: VoucherNumberType = 'incoming-gate-pass'
): Promise<number> {
  const { data } = await storeAdminAxiosClient.get<VoucherNumberApiResponse>(
    '/store-admin/voucher-number',
    { params: { type } }
  );

  if (!data.success || data.data?.nextVoucherNumber == null) {
    throw new Error(data.message ?? 'Failed to fetch voucher number');
  }

  return data.data.nextVoucherNumber;
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const voucherNumberQueryOptions = (
  type: VoucherNumberType = 'incoming-gate-pass'
) =>
  queryOptions({
    queryKey: voucherNumberKeys.detail(type),
    queryFn: () => fetchVoucherNumber(type),
  });

/** Hook to fetch voucher number for a given gate-pass type. Always fetches latest when the form mounts. */
export function useGetReceiptVoucherNumber(
  type: VoucherNumberType = 'incoming-gate-pass'
) {
  return useQuery({
    ...voucherNumberQueryOptions(type),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** Prefetch voucher number – e.g. before opening a gate-pass form */
export function prefetchVoucherNumber(
  type: VoucherNumberType = 'incoming-gate-pass'
) {
  return queryClient.prefetchQuery(voucherNumberQueryOptions(type));
}
