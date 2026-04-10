import { useQuery, queryOptions } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  GetContractFarmingReportApiResponse,
  ContractFarmingReportData,
} from '@/types/analytics';

/** Query key prefix for contract farming report */
export const contractFarmingReportKeys = {
  all: ['store-admin', 'analytics', 'contract-farming-report'] as const,
};

type GetContractFarmingReportError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(
  data: GetContractFarmingReportError | undefined
): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch contract farming report'
  );
}

async function fetchContractFarmingReport(): Promise<ContractFarmingReportData> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetContractFarmingReportApiResponse | GetContractFarmingReportError
    >('/analytics/contract-farming-report', {
      headers: { Accept: 'application/json' },
    });

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return (data as GetContractFarmingReportApiResponse).data;
  } catch (err) {
    const responseData =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: GetContractFarmingReportError } }).response
        ?.data;
    if (responseData && typeof responseData === 'object') {
      throw new Error(getFetchErrorMessage(responseData));
    }
    throw err;
  }
}

/** Query options – use with useQuery, prefetchQuery, or in loaders */
export const contractFarmingReportQueryOptions = () =>
  queryOptions({
    queryKey: contractFarmingReportKeys.all,
    queryFn: fetchContractFarmingReport,
  });

/** Hook to fetch GET /analytics/contract-farming-report */
export function useGetContractFarmingReport() {
  return useQuery(contractFarmingReportQueryOptions());
}

/** Prefetch contract farming report */
export function prefetchContractFarmingReport() {
  return queryClient.prefetchQuery(contractFarmingReportQueryOptions());
}
