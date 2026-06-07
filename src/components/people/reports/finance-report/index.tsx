import { memo, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  FileText,
  Hash,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  resolveStationRates,
  useGetAllGatePassesOfFarmer,
  type StationInPassesPayload,
} from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import {
  normalizePreferences,
  useGetPreferences,
} from '@/services/store-admin/preferences/useGetPreferences';
import {
  useStore,
  usePreferencesStore,
  usePreferencesStoreHydrated,
} from '@/stores/store';
import {
  buildFinanceGradingVarietyGroups,
  buildFinancePlantingVarietyGroups,
  computeFinanceReportSummary,
} from './finance-calculations';
import FinanceSummaryStatItems from './finance-summary-card';
import GradingVarietyTable from './grading-variety-table';
import PlantingVarietyTable from './planting-variety-table';

export interface FinanceReportProps {
  farmerStorageLinkId: string;
}

function gatePassesErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateRangeLabel(dates: string[]): string {
  const parsed = dates
    .map((date) => new Date(date))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (parsed.length === 0) return 'N/A';
  if (parsed.length === 1) return formatDisplayDate(parsed[0]);

  return `${formatDisplayDate(parsed[0])} - ${formatDisplayDate(parsed[parsed.length - 1])}`;
}

function FinanceReport({ farmerStorageLinkId }: FinanceReportProps) {
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

  const stationRates = useMemo(
    () => resolveStationRates(farmerStorageLink?.station),
    [farmerStorageLink?.station]
  );

  const populatedStation = useMemo((): StationInPassesPayload | null => {
    const station = farmerStorageLink?.station;
    if (station == null || typeof station === 'string') return null;
    return station;
  }, [farmerStorageLink?.station]);

  const isLoading = isFarmerSeedsLoading || isIncomingLoading;
  const isError = isFarmerSeedsError;
  const error = farmerSeedsError;

  const plantingVarietyGroups = useMemo(
    () =>
      buildFinancePlantingVarietyGroups(
        farmerSeedList,
        incomingList,
        gradingList ?? [],
        preferences,
        stationRates
      ),
    [farmerSeedList, incomingList, gradingList, preferences, stationRates]
  );

  const gradingVarietyGroups = useMemo(
    () =>
      buildFinanceGradingVarietyGroups(
        farmerSeedList,
        incomingList,
        gradingList ?? [],
        preferences
      ),
    [farmerSeedList, incomingList, gradingList, preferences]
  );

  const reportSummary = useMemo(
    () =>
      computeFinanceReportSummary(plantingVarietyGroups, gradingVarietyGroups),
    [plantingVarietyGroups, gradingVarietyGroups]
  );

  const reportGeneratedOn = useMemo(() => formatDisplayDate(new Date()), []);

  const reportPeriodLabel = useMemo(
    () =>
      formatDateRangeLabel([
        ...(farmerSeedList ?? []).map((row) => row.date),
        ...(incomingList ?? []).map((row) => row.date),
        ...(gradingList ?? []).map((row) => row.date),
      ]),
    [farmerSeedList, incomingList, gradingList]
  );

  const rowStats = useMemo(() => {
    let plantingRows = 0;
    for (const group of plantingVarietyGroups) {
      plantingRows += group.seedRows.length + group.particularsRows.length;
    }
    let gradingRows = 0;
    for (const group of gradingVarietyGroups) {
      gradingRows += group.gradingRows.length;
    }
    return {
      varieties: plantingVarietyGroups.length,
      planting: plantingRows,
      grading: gradingRows,
    };
  }, [plantingVarietyGroups, gradingVarietyGroups]);

  const errorDescription = useMemo(
    () => gatePassesErrorMessage(error),
    [error]
  );

  const hasReportData = plantingVarietyGroups.length > 0;

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <Card className="border-border/50 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_28px_rgba(0,0,0,0.06)] ring-1">
        <CardContent className="p-0">
          <div className="from-primary/10 via-primary/5 to-background border-border/40 border-b bg-linear-to-r px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-custom text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                  Finance Report
                </p>
                <h1 className="font-custom text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  {coldStorageName}
                </h1>
                <p className="font-custom text-muted-foreground text-sm">
                  Planting &amp; Grading Financial Statement
                </p>
              </div>

              <div className="border-border/50 bg-card/90 rounded-xl border px-3 py-2 text-right">
                <p className="font-custom text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Powered By
                </p>
                <p className="font-custom text-primary text-base font-bold tracking-wide">
                  COLDOP
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8 px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Generated On
                </p>
                <p className="font-custom text-foreground text-sm font-semibold">
                  {reportGeneratedOn}
                </p>
              </div>
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <FileText className="h-3.5 w-3.5" />
                  Report Period
                </p>
                <p className="font-custom text-foreground text-sm font-semibold">
                  {reportPeriodLabel}
                </p>
              </div>
              {!isLoading && !isError && hasReportData ? (
                <FinanceSummaryStatItems summary={reportSummary} />
              ) : (
                <>
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                      Net Revenue
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      —
                    </p>
                  </div>
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                      Net Amount Per Acre
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      —
                    </p>
                  </div>
                </>
              )}
            </div>

            {farmerStorageLink ? (
              <section className="border-border/40 space-y-3 rounded-xl border p-3 sm:p-4">
                <h2 className="font-custom text-foreground text-lg font-semibold sm:text-xl">
                  Farmer details
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                      <UserRound className="h-3.5 w-3.5" />
                      Name
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      {farmerStorageLink.name}
                    </p>
                  </div>
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                      <Hash className="h-3.5 w-3.5" />
                      Account
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      #{farmerStorageLink.accountNumber}
                    </p>
                  </div>
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                      <Phone className="h-3.5 w-3.5" />
                      Mobile
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      {farmerStorageLink.mobileNumber}
                    </p>
                  </div>
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                      <MapPin className="h-3.5 w-3.5" />
                      Address
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      {farmerStorageLink.address}
                    </p>
                  </div>
                  {populatedStation ? (
                    <div className="border-border/50 bg-card rounded-xl border p-3 sm:col-span-2">
                      <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                        <MapPin className="h-3.5 w-3.5" />
                        Station
                      </p>
                      <p className="font-custom text-foreground text-sm font-semibold">
                        {populatedStation.name?.trim() || '—'}
                        {populatedStation.locality?.trim()
                          ? ` · ${populatedStation.locality.trim()}`
                          : ''}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {!isLoading && !isError && hasReportData ? (
              <div className="border-border/50 bg-secondary/30 font-custom text-muted-foreground rounded-xl border px-3 py-3 text-sm sm:px-4">
                <span className="text-foreground font-semibold">
                  Report snapshot
                </span>
                <span className="text-border mx-2">·</span>
                Varieties:{' '}
                <span className="text-foreground font-medium tabular-nums">
                  {rowStats.varieties}
                </span>
                <span className="text-border mx-2">·</span>
                Planting rows:{' '}
                <span className="text-foreground font-medium tabular-nums">
                  {rowStats.planting}
                </span>
                <span className="text-border mx-2">·</span>
                Grading rows:{' '}
                <span className="text-foreground font-medium tabular-nums">
                  {rowStats.grading}
                </span>
              </div>
            ) : null}

            <section className="border-border/40 overflow-hidden rounded-xl border">
              <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
                <CardTitle className="font-custom text-foreground text-lg font-semibold sm:text-xl">
                  Planting
                </CardTitle>
                <CardDescription className="font-custom text-muted-foreground leading-relaxed">
                  Seed dispatch and expense particulars by variety — net amount
                  per variety in the footer row.
                </CardDescription>
              </CardHeader>
              <div className="p-0">
                {isLoading ? (
                  <div className="space-y-4 p-4">
                    <Skeleton className="font-custom text-muted-foreground h-[280px] w-full rounded-2xl" />
                  </div>
                ) : isError ? (
                  <div className="p-4">
                    <Empty className="border-border/50 rounded-xl border py-12">
                      <EmptyHeader>
                        <EmptyTitle className="font-custom">
                          Could not load farmer seed gate passes
                        </EmptyTitle>
                        <EmptyDescription className="font-custom">
                          {errorDescription}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : !hasReportData ? (
                  <div className="p-4">
                    <Empty className="border-border/50 rounded-xl border py-12">
                      <EmptyHeader>
                        <EmptyTitle className="font-custom">
                          No planting data to show
                        </EmptyTitle>
                        <EmptyDescription className="font-custom">
                          This farmer has no seed, incoming, or grading records
                          to build a finance report.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <div className="w-full">
                    <PlantingVarietyTable
                      varietyGroups={plantingVarietyGroups}
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="border-border/40 overflow-hidden rounded-xl border">
              <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
                <CardTitle className="font-custom text-foreground text-lg font-semibold sm:text-xl">
                  Grading
                </CardTitle>
                <CardDescription className="font-custom text-muted-foreground leading-relaxed">
                  Grading sale lines by variety — sale amount totals in the
                  footer row.
                </CardDescription>
              </CardHeader>
              <div className="p-0">
                {isLoading ? (
                  <div className="space-y-4 p-4">
                    <Skeleton className="font-custom text-muted-foreground h-[280px] w-full rounded-2xl" />
                  </div>
                ) : isError ? (
                  <div className="p-4">
                    <Empty className="border-border/50 rounded-xl border py-12">
                      <EmptyHeader>
                        <EmptyTitle className="font-custom">
                          Could not load grading gate passes
                        </EmptyTitle>
                        <EmptyDescription className="font-custom">
                          {errorDescription}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : !hasReportData ? (
                  <div className="p-4">
                    <Empty className="border-border/50 rounded-xl border py-12">
                      <EmptyHeader>
                        <EmptyTitle className="font-custom">
                          No grading data to show
                        </EmptyTitle>
                        <EmptyDescription className="font-custom">
                          Grading rows appear when related gate passes exist for
                          this farmer.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <div className="w-full">
                    <GradingVarietyTable varietyGroups={gradingVarietyGroups} />
                  </div>
                )}
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default memo(FinanceReport);
