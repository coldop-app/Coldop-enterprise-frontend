import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetDaybookApiResponse,
  GetDaybookParams,
  DaybookEntry,
  DaybookPagination,
} from '@/types/daybook';

/** Query key prefix for daybook */
export const daybookKeys = {
  all: ['store-admin', 'daybook'] as const,
  lists: () => [...daybookKeys.all, 'list'] as const,
  list: (params: GetDaybookParams) => [...daybookKeys.lists(), params] as const,
};

async function fetchDaybook(
  params: GetDaybookParams = {}
): Promise<{ daybook: DaybookEntry[]; pagination: DaybookPagination }> {
  const searchParams = new URLSearchParams();
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.page != null) searchParams.set('page', String(params.page));
  if (params.sortOrder != null) searchParams.set('sortOrder', params.sortOrder);
  if (params.gatePassType != null) {
    const types = Array.isArray(params.gatePassType)
      ? params.gatePassType
      : [params.gatePassType];
    types.forEach((t) => searchParams.append('gatePassType', t));
  }
  const queryString = searchParams.toString();
  const url = queryString
    ? `/store-admin/daybook?${queryString}`
    : '/store-admin/daybook';

  const { data } = await storeAdminAxiosClient.get<GetDaybookApiResponse>(url);

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch daybook');
  }

  return data.data;
}

export const daybookQueryOptions = (params: GetDaybookParams = {}) =>
  queryOptions({
    queryKey: daybookKeys.list(params),
    queryFn: () => fetchDaybook(params),
  });

export function useGetDaybook(params: GetDaybookParams = {}) {
  return useQuery(daybookQueryOptions(params));
}

export function prefetchDaybook(params: GetDaybookParams = {}) {
  return queryClient.prefetchQuery(daybookQueryOptions(params));
}
