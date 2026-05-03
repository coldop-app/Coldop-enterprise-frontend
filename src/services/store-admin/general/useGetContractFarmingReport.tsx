import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

type ContractFarmingSeedSize = {
  name: string;
  quantity: number;
  acres: number;
  amountPayable: number;
};

type ContractFarmingBuyBack = {
  bags: number;
  netWeightKg: number;
};

type ContractFarmingGradingValue = {
  bags: number;
  netWeightKg: number;
};

type ContractFarmingSeed = {
  generation: string;
  sizes: ContractFarmingSeedSize[];
  totalAcres: number;
  totalAmountPayable: number;
};

export type ContractFarmingVariety = {
  name: string;
  seed: ContractFarmingSeed | null;
  buyBack: ContractFarmingBuyBack | null;
  /** Incoming / gate net weight (kg) when tracked separately from buy-back; coalesced with buy-back for wastage. */
  incomingNetWeightKg?: number | null;
  grading: Record<string, ContractFarmingGradingValue>;
};

export type ContractFarmingReportFarmer = {
  id: string;
  name: string;
  address: string;
  mobileNumber: string;
  accountNumber: number;
  varieties: ContractFarmingVariety[];
};

type ContractFarmingReportMeta = {
  allGrades: string[];
  allVarieties: string[];
};

export type ContractFarmingReportData = {
  farmers: ContractFarmingReportFarmer[];
  meta: ContractFarmingReportMeta;
};

type ContractFarmingReportResponse = {
  success: boolean;
  message?: string;
  data?: ContractFarmingReportData;
};

export interface GetContractFarmingReportParams {
  fromDate?: string;
  toDate?: string;
}

export const contractFarmingReportKeys = {
  all: ['store-admin', 'contract-farming', 'report'] as const,
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
      await storeAdminAxiosClient.get<ContractFarmingReportResponse>(
        '/analytics/contract-farming-report',
        {
          params: safeParams,
        }
      );

    if (!data.success) {
      throw new Error(
        data.message ?? 'Failed to fetch contract farming report'
      );
    }

    return (
      data.data ?? { farmers: [], meta: { allGrades: [], allVarieties: [] } }
    );
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
      { fromDate: params.fromDate, toDate: params.toDate },
    ],
    queryFn: () => fetchContractFarmingReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetContractFarmingReport(
  params: GetContractFarmingReportParams = {}
) {
  return useQuery({
    ...contractFarmingReportQueryOptions(params),
  });
}

export function prefetchContractFarmingReport(
  params: GetContractFarmingReportParams = {}
) {
  return queryClient.prefetchQuery(contractFarmingReportQueryOptions(params));
}
