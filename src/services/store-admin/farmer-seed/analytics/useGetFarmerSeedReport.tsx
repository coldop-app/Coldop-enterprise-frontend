import { queryOptions, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerSeedReportEntry,
  GetFarmerSeedReportApiResponse,
} from '@/types/farmer-seed';
import { farmerSeedKeys } from '../useCreateFarmerSeedEntry';

export const farmerSeedReportKeys = {
  all: [...farmerSeedKeys.all, 'report'] as const,
};

export interface GetFarmerSeedReportParams {
  fromDate?: string;
  toDate?: string;
}

function sanitizeParams(
  params: GetFarmerSeedReportParams
): GetFarmerSeedReportParams {
  return {
    fromDate: params.fromDate?.trim() || undefined,
    toDate: params.toDate?.trim() || undefined,
  };
}

function getFarmerSeedReportErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    const apiMessage = error.response?.data?.message;
    if (apiMessage) return apiMessage;

    if (error.code === 'ECONNABORTED') {
      return 'Request timed out while fetching farmer seed report';
    }

    if (!error.response) {
      return 'Network error while fetching farmer seed report';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Failed to fetch farmer seed report';
}

async function fetchFarmerSeedReport(
  params: GetFarmerSeedReportParams
): Promise<FarmerSeedReportEntry[]> {
  try {
    const safeParams = sanitizeParams(params);
    const { data } =
      await storeAdminAxiosClient.get<GetFarmerSeedReportApiResponse>(
        '/farmer-seed/report',
        {
          params: safeParams,
        }
      );

    if (!data.success) {
      throw new Error(data.message ?? 'Failed to fetch farmer seed report');
    }

    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    throw new Error(getFarmerSeedReportErrorMessage(error), {
      cause: error,
    });
  }
}

export const farmerSeedReportQueryOptions = (
  params: GetFarmerSeedReportParams = {}
) =>
  queryOptions({
    queryKey: [
      ...farmerSeedReportKeys.all,
      {
        fromDate: params.fromDate,
        toDate: params.toDate,
      },
    ],
    queryFn: () => fetchFarmerSeedReport(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

export function useGetFarmerSeedReport(
  params: GetFarmerSeedReportParams = {},
  options?: { enabled?: boolean }
) {
  const hasDateRange = Boolean(params.fromDate && params.toDate);

  return useQuery({
    ...farmerSeedReportQueryOptions(params),
    enabled: options?.enabled ?? hasDateRange,
  });
}

export function prefetchFarmerSeedReport(
  params: GetFarmerSeedReportParams = {}
) {
  return queryClient.prefetchQuery(farmerSeedReportQueryOptions(params));
}
