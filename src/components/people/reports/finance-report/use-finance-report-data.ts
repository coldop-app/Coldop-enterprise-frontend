import { useEffect, useMemo } from 'react';

import { useGetAllGatePassesOfFarmer } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import {
  normalizePreferences,
  useGetPreferences,
} from '@/services/store-admin/preferences/useGetPreferences';
import {
  useStore,
  usePreferencesStore,
  usePreferencesStoreHydrated,
} from '@/stores/store';
import { buildFinanceReportData } from './finance-calculations';
import { formatDateRangeLabel, formatDisplayDate } from './report-date-utils';

function gatePassesErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

export function useFinanceReportData(farmerStorageLinkId: string) {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const gatePasses = useGetAllGatePassesOfFarmer(farmerStorageLinkId);
  const {
    data: farmerSeedList,
    isLoading: isFarmerSeedsLoading,
    isError: isFarmerSeedsError,
    error: farmerSeedsError,
  } = gatePasses.farmerSeeds;
  const { data: incomingList, isLoading: isIncomingLoading } =
    gatePasses.incoming;
  const { data: gradingList } = gatePasses.grading;
  const farmerStorageLink = gatePasses.farmerStorageLink;

  const { data: serverPreferences } = useGetPreferences();
  const storePreferences = usePreferencesStore((state) => state.preferences);
  const hydrated = usePreferencesStoreHydrated();
  const syncFromServerIfNeeded = usePreferencesStore(
    (state) => state.syncFromServerIfNeeded
  );

  useEffect(() => {
    if (!serverPreferences || !hydrated) return;
    syncFromServerIfNeeded(serverPreferences);
  }, [serverPreferences, hydrated, syncFromServerIfNeeded]);

  const preferences = useMemo(
    () =>
      storePreferences && serverPreferences
        ? normalizePreferences(storePreferences, serverPreferences)
        : storePreferences,
    [storePreferences, serverPreferences]
  );

  const reportData = useMemo(
    () =>
      buildFinanceReportData(
        farmerSeedList,
        incomingList,
        gradingList ?? [],
        preferences
      ),
    [farmerSeedList, incomingList, gradingList, preferences]
  );

  const reportPeriodLabel = useMemo(
    () =>
      formatDateRangeLabel([
        ...(farmerSeedList ?? []).map((row) => row.date),
        ...(incomingList ?? []).map((row) => row.date),
        ...(gradingList ?? []).map((row) => row.date),
      ]),
    [farmerSeedList, incomingList, gradingList]
  );

  const isLoading = isFarmerSeedsLoading || isIncomingLoading;
  const isError = isFarmerSeedsError;
  const hasReportData = reportData.plantingGroups.length > 0;

  return {
    coldStorageName,
    farmerStorageLink,
    isLoading,
    isError,
    errorDescription: gatePassesErrorMessage(farmerSeedsError),
    reportGeneratedOn: formatDisplayDate(new Date()),
    reportPeriodLabel,
    hasReportData,
    ...reportData,
  };
}
