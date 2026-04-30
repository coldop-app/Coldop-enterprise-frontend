import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export interface ContractFarmingReportSize {
  name: string;
  quantity: number;
  acres: number;
  amountPayable: number;
}

export interface ContractFarmingReportBuyBackBag {
  bags: number;
  netWeightKg: number;
}

export interface ContractFarmingReportGradingEntry {
  initialBags: number;
  netWeightKg: number;
}

export type ContractFarmingReportGrading = Record<
  string,
  Record<string, ContractFarmingReportGradingEntry>
>;

export interface ContractFarmingReportFarmerEntry {
  id: string;
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber: number;
  acresPlanted: number;
  totalSeedAmountPayable: number;
  generations: string[];
  sizes: ContractFarmingReportSize[];
  'buy-back-bags': Record<string, ContractFarmingReportBuyBackBag>;
  grading: ContractFarmingReportGrading;
}

export interface ContractFarmingReportData {
  byVariety: Record<string, ContractFarmingReportFarmerEntry[]>;
}

export interface GetContractFarmingReportApiResponse {
  success: boolean;
  data: ContractFarmingReportData | null;
  message?: string;
}

export interface GetContractFarmingReportParams {
  fromDate?: string;
  toDate?: string;
}

export const contractFarmingReportKeys = {
  all: ['store-admin', 'analytics', 'contract-farming-report'] as const,
};

function sanitizeParams(
  params: GetContractFarmingReportParams
): GetContractFarmingReportParams {
  return {
    fromDate: params.fromDate?.trim() || undefined,
    toDate: params.toDate?.trim() || undefined,
  };
}

function getContractFarmingReportErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching contract farming report';
    }

    if (!error.response) {
      return 'Network error while fetching contract farming report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch contract farming report';
}

async function fetchContractFarmingReport(
  params: GetContractFarmingReportParams
): Promise<ContractFarmingReportData> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetContractFarmingReportApiResponse>(
        '/analytics/contract-farming-report',
        {
          params: safeParams,
        }
      );

    if (!data.success || data.data == null) {
      throw new Error(
        data.message ?? 'Failed to fetch contract farming report'
      );
    }

    return {
      byVariety: data.data.byVariety ?? {},
    };
  } catch (error) {
    throw new Error(getContractFarmingReportErrorMessage(error), {
      cause: error,
    });
  }
}

export const contractFarmingReportQueryOptions = (
  params: GetContractFarmingReportParams = {}
) =>
  queryOptions({
    queryKey: [
      ...contractFarmingReportKeys.all,
      {
        fromDate: params.fromDate,
        toDate: params.toDate,
      },
    ],
    queryFn: () => fetchContractFarmingReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetContractFarmingReport(
  params: GetContractFarmingReportParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...contractFarmingReportQueryOptions(params),
    enabled: options?.enabled ?? true,
  });
}

export function prefetchContractFarmingReport(
  params: GetContractFarmingReportParams = {}
) {
  return queryClient.prefetchQuery(contractFarmingReportQueryOptions(params));
}
