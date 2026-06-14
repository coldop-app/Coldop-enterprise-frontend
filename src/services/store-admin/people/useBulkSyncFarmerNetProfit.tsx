import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import { buildFinanceReportData } from '@/components/people/reports/finance-report/finance-calculations';
import { buildNetProfitSyncPayload } from '@/components/people/reports/finance-report/build-net-profit-sync-payload';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import { usePreferencesStore } from '@/stores/usePreferencesStore';
import {
  normalizePreferences,
  preferencesQueryOptions,
} from '@/services/store-admin/preferences/useGetPreferences';
import type {
  BulkNetProfitSyncApiResponse,
  BulkNetProfitUpdate,
} from '@/types/farmer';
import type { FarmerStorageLink } from '@/types/incoming-gate-pass';
import {
  farmerStorageLinksKeys,
  farmerStorageLinksQueryOptions,
} from './useGetAllFarmers';
import {
  fetchAllGatePassesOfFarmer,
  resolveLocalityRates,
} from './useGetAllGatePassesOfFarmer';

const DEFAULT_ERROR_MESSAGE = 'Failed to sync farmer net profit';
const PASS_FETCH_CONCURRENCY = 5;

type BulkNetProfitSyncApiError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

type ClientSkippedItem = {
  farmerStorageLinkId: string;
  reason: string;
};

function getBulkSyncErrorMessage(
  data: BulkNetProfitSyncApiError | undefined
): string {
  return data?.error?.message ?? data?.message ?? DEFAULT_ERROR_MESSAGE;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

async function computeNetProfitUpdateForFarmer(
  farmer: FarmerStorageLink,
  preferences: ReturnType<typeof normalizePreferences>
): Promise<{
  update: BulkNetProfitUpdate | null;
  skipped: ClientSkippedItem | null;
}> {
  try {
    const passes = await fetchAllGatePassesOfFarmer(farmer._id);
    const localityRates = resolveLocalityRates(
      passes.farmerStorageLink?.localityId ?? farmer.localityId
    );

    const reportData = buildFinanceReportData(
      passes.farmerSeeds,
      passes.incoming,
      passes.grading ?? [],
      preferences,
      localityRates
    );

    const hasReportData = reportData.plantingGroups.length > 0;
    const update = buildNetProfitSyncPayload(
      farmer._id,
      reportData.plantingGroups,
      reportData.gradingGroups,
      hasReportData
    );

    if (!update) {
      return {
        update: null,
        skipped: {
          farmerStorageLinkId: farmer._id,
          reason: 'NO_REPORT_DATA',
        },
      };
    }

    return { update, skipped: null };
  } catch {
    return {
      update: null,
      skipped: {
        farmerStorageLinkId: farmer._id,
        reason: 'PASS_FETCH_FAILED',
      },
    };
  }
}

async function bulkSyncFarmerNetProfit(): Promise<BulkNetProfitSyncApiResponse> {
  const farmers = await queryClient.fetchQuery(
    farmerStorageLinksQueryOptions()
  );
  const serverPreferences = await queryClient.fetchQuery(
    preferencesQueryOptions()
  );
  const storePreferences = usePreferencesStore.getState().preferences;

  const preferences =
    storePreferences && serverPreferences
      ? normalizePreferences(storePreferences, serverPreferences)
      : (storePreferences ?? serverPreferences);

  if (!preferences) {
    throw new Error('Preferences are not available');
  }

  const results = await mapWithConcurrency(
    farmers,
    PASS_FETCH_CONCURRENCY,
    (farmer) => computeNetProfitUpdateForFarmer(farmer, preferences)
  );

  const updates: BulkNetProfitUpdate[] = [];
  const clientSkipped: ClientSkippedItem[] = [];

  for (const result of results) {
    if (result.update) {
      updates.push(result.update);
    } else if (result.skipped) {
      clientSkipped.push(result.skipped);
    }
  }

  if (updates.length === 0) {
    throw new Error('No farmers with report data to sync');
  }

  const { data } =
    await storeAdminAxiosClient.patch<BulkNetProfitSyncApiResponse>(
      '/farmer-storage-link/bulk/net-profit',
      { updates }
    );

  if (!data.success) {
    throw new Error(data.message ?? DEFAULT_ERROR_MESSAGE);
  }

  return {
    ...data,
    data: {
      updatedCount: data.data?.updatedCount ?? 0,
      skipped: [
        ...clientSkipped.map((item) => ({
          farmerStorageLinkId: item.farmerStorageLinkId,
          reason: item.reason,
        })),
        ...(data.data?.skipped ?? []),
      ],
    },
  };
}

/**
 * Bulk-syncs per-variety profit for all farmers using the same finance report
 * calculations as the per-farmer sync button.
 */
export function useBulkSyncFarmerNetProfit() {
  return useMutation<
    BulkNetProfitSyncApiResponse,
    AxiosError<BulkNetProfitSyncApiError> | Error
  >({
    mutationKey: [...farmerStorageLinksKeys.all, 'bulk-sync-net-profit'],
    mutationFn: bulkSyncFarmerNetProfit,
    onSuccess: async (data) => {
      const updatedCount = data.data?.updatedCount ?? 0;
      const skippedCount = data.data?.skipped?.length ?? 0;

      toast.success(
        skippedCount > 0
          ? `Updated ${updatedCount} farmer(s) (${skippedCount} skipped)`
          : `Updated ${updatedCount} farmer(s)`
      );

      await queryClient.invalidateQueries({
        queryKey: farmerStorageLinksKeys.all,
      });
    },
    onError: (error) => {
      if (error instanceof Error && !('response' in error)) {
        toast.error(error.message);
        return;
      }

      const axiosError = error as AxiosError<BulkNetProfitSyncApiError>;
      const errMsg = axiosError.response?.data
        ? getBulkSyncErrorMessage(axiosError.response.data)
        : axiosError.message || DEFAULT_ERROR_MESSAGE;
      toast.error(errMsg);
    },
  });
}
