import { memo, useMemo, useState } from 'react';
import FarmerSeedTable from '../farmer-seed-table';
import GradingTable from '@/components/people/reports/grading-table';
import IncomingTable from '@/components/people/reports/incoming-table';
import SummaryTable from '@/components/people/reports/summary-table';
import AccountingGradingPassSelectionDialog from './accounting-grading-pass-selection-dialog';
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
import { Button } from '@/components/ui/button';
import {
  Building2,
  CalendarDays,
  FileText,
  Hash,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react';
import { useGetAllGatePassesOfFarmer } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import { useStore } from '@/stores/store';
import { usePreferencesStore } from '@/stores/store';
import { AccountingReportExcelButton } from './accounting-report-excel-button';
import { buildAccountingReportVarietySections } from './accounting-report-variety-sections';

export interface AccountingReportTableProps {
  farmerStorageLinkId: string;
}

function incomingErrorMessage(error: unknown): string {
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

const AccountingReportTable = ({
  farmerStorageLinkId,
}: AccountingReportTableProps) => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const gatePassesResponse = useGetAllGatePassesOfFarmer(farmerStorageLinkId);
  const preferences = usePreferencesStore((state) => state.preferences);
  const {
    data: incomingList,
    isLoading,
    isError,
    error,
  } = gatePassesResponse.incoming;
  const { data: gradingList } = gatePassesResponse.grading;
  const { data: farmerSeedList } = gatePassesResponse.farmerSeeds;
  const farmerStorageLink = gatePassesResponse.farmerStorageLink;
  const gradingPasses = useMemo(() => gradingList ?? [], [gradingList]);
  const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);
  const [selectedGradingIds, setSelectedGradingIds] =
    useState<Set<string> | null>(null);
  const [draftSelectedGradingIds, setDraftSelectedGradingIds] = useState<
    Set<string>
  >(new Set());

  const selectedGradingIdSet = useMemo(() => {
    if (selectedGradingIds == null) {
      return new Set(gradingPasses.map((pass) => pass._id));
    }
    return selectedGradingIds;
  }, [selectedGradingIds, gradingPasses]);

  const sortedGradingPasses = useMemo(() => {
    return [...gradingPasses].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      const aSafe = Number.isFinite(aTime) ? aTime : 0;
      const bSafe = Number.isFinite(bTime) ? bTime : 0;
      if (bSafe !== aSafe) return bSafe - aSafe;
      return (b.gatePassNo ?? 0) - (a.gatePassNo ?? 0);
    });
  }, [gradingPasses]);

  const filteredGradingPasses = useMemo(
    () => gradingPasses.filter((pass) => selectedGradingIdSet.has(pass._id)),
    [gradingPasses, selectedGradingIdSet]
  );

  const selectedIncomingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pass of filteredGradingPasses) {
      for (const incomingRef of pass.incomingGatePassIds ?? []) {
        if (incomingRef?._id) ids.add(incomingRef._id);
      }
    }
    return ids;
  }, [filteredGradingPasses]);

  const filteredIncomingPasses = useMemo(
    () =>
      incomingList.filter((incoming) => selectedIncomingIds.has(incoming._id)),
    [incomingList, selectedIncomingIds]
  );

  const varietySections = useMemo(
    () =>
      buildAccountingReportVarietySections(
        filteredGradingPasses,
        filteredIncomingPasses,
        farmerSeedList,
        preferences
      ),
    [filteredGradingPasses, filteredIncomingPasses, farmerSeedList, preferences]
  );

  const reportGeneratedOn = useMemo(() => formatDisplayDate(new Date()), []);
  const reportPeriodLabel = useMemo(
    () =>
      formatDateRangeLabel([
        ...filteredIncomingPasses.map((row) => row.date),
        ...filteredGradingPasses.map((row) => row.date),
      ]),
    [filteredIncomingPasses, filteredGradingPasses]
  );

  const rowStats = useMemo(
    () => ({
      incoming: filteredIncomingPasses.length,
      grading: filteredGradingPasses.length,
      summary: varietySections.reduce((a, s) => a + s.summaryRows.length, 0),
      seed: varietySections.reduce((a, s) => a + s.farmerSeedRows.length, 0),
    }),
    [filteredIncomingPasses, filteredGradingPasses, varietySections]
  );

  const incomingFetchErrorDescription = useMemo(
    () => incomingErrorMessage(error),
    [error]
  );

  const varietyGroupedIncoming = useMemo(
    () =>
      varietySections.map((s) => ({
        varietyKey: s.varietyKey,
        varietyLabel: s.varietyLabel,
        rows: s.incomingRows,
      })),
    [varietySections]
  );

  const varietyGroupedGrading = useMemo(
    () =>
      varietySections.map((s) => ({
        varietyKey: s.varietyKey,
        varietyLabel: s.varietyLabel,
        rows: s.gradingRows,
      })),
    [varietySections]
  );

  const varietyGroupedSummary = useMemo(
    () =>
      varietySections.map((s) => ({
        varietyKey: s.varietyKey,
        varietyLabel: s.varietyLabel,
        gradingGatePasses: s.gradingGatePassesForSummary,
      })),
    [varietySections]
  );

  const varietyGroupedFarmerSeed = useMemo(
    () =>
      varietySections.map((s) => ({
        varietyKey: s.varietyKey,
        varietyLabel: s.varietyLabel,
        rows: s.farmerSeedRows,
      })),
    [varietySections]
  );

  const handleCustomSelectClick = () => {
    setDraftSelectedGradingIds(new Set(selectedGradingIdSet));
    setIsSelectionDialogOpen(true);
  };

  const toggleDraftSelection = (gradingId: string) => {
    setDraftSelectedGradingIds((prev) => {
      const next = new Set(prev);
      if (next.has(gradingId)) next.delete(gradingId);
      else next.add(gradingId);
      return next;
    });
  };

  const selectAllDraft = () => {
    setDraftSelectedGradingIds(new Set(gradingPasses.map((pass) => pass._id)));
  };

  const deselectAllDraft = () => {
    setDraftSelectedGradingIds(new Set());
  };

  const hasDraftChanges = useMemo(() => {
    if (draftSelectedGradingIds.size !== selectedGradingIdSet.size) return true;
    for (const id of draftSelectedGradingIds) {
      if (!selectedGradingIdSet.has(id)) return true;
    }
    return false;
  }, [draftSelectedGradingIds, selectedGradingIdSet]);

  const applyDraftSelection = () => {
    setSelectedGradingIds(new Set(draftSelectedGradingIds));
    setIsSelectionDialogOpen(false);
  };

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-5">
        <Card className="border-border/50 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_28px_rgba(0,0,0,0.06)] ring-1">
          <CardContent className="p-0">
            <div className="from-primary/10 via-primary/5 to-background border-border/40 border-b bg-linear-to-r px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="font-custom text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                    Accounting Report
                  </p>
                  <h1 className="font-custom text-2xl font-bold tracking-tight text-[#222] sm:text-3xl">
                    {coldStorageName}
                  </h1>
                  <p className="font-custom text-muted-foreground text-sm">
                    Farmer Ledger &amp; Stock Movement Statement
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

            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Generated On
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  {reportGeneratedOn}
                </p>
              </div>
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <FileText className="h-3.5 w-3.5" />
                  Report Period
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  {reportPeriodLabel}
                </p>
              </div>
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
                  Included Grading Passes
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  {selectedGradingIdSet.size} / {gradingPasses.length}
                </p>
              </div>
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <Building2 className="h-3.5 w-3.5" />
                  Rows Snapshot
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  In: {rowStats.incoming} | Gr: {rowStats.grading} | Summary:{' '}
                  {rowStats.summary} | Seed: {rowStats.seed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {farmerStorageLink ? (
          <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
            <CardHeader className="border-border/40 bg-secondary/50 border-b px-3 py-3 sm:px-4 sm:py-4">
              <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
                Farmer details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <UserRound className="h-3.5 w-3.5" />
                  Name
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  {farmerStorageLink.name}
                </p>
              </div>

              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <Hash className="h-3.5 w-3.5" />
                  Account
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  #{farmerStorageLink.accountNumber}
                </p>
              </div>

              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <Phone className="h-3.5 w-3.5" />
                  Mobile
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  {farmerStorageLink.mobileNumber}
                </p>
              </div>

              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <MapPin className="h-3.5 w-3.5" />
                  Address
                </p>
                <p className="font-custom text-sm font-semibold text-[#333]">
                  {farmerStorageLink.address}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <AccountingReportExcelButton
            coldStorageName={coldStorageName}
            farmerDetails={farmerStorageLink}
            varietySections={varietySections}
            reportPeriodLabel={reportPeriodLabel}
            rowStats={rowStats}
          />
          <Button
            type="button"
            onClick={handleCustomSelectClick}
            className="font-custom shadow-sm"
            disabled={gradingPasses.length === 0}
          >
            Custom Select ({selectedGradingIdSet.size}/{gradingPasses.length})
          </Button>
        </div>
        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Incoming
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Manual gate passes, store, truck, variety, bags, weight slip,
              gross, tare, net, bardana, and actual weight — grouped by variety.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="font-custom text-muted-foreground h-[280px] w-full rounded-2xl" />
              </div>
            ) : isError ? (
              <div className="p-4">
                <Empty className="border-border/50 rounded-xl border py-12">
                  <EmptyHeader>
                    <EmptyTitle className="font-custom">
                      Could not load incoming gate passes
                    </EmptyTitle>
                    <EmptyDescription className="font-custom">
                      {incomingFetchErrorDescription}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="w-full">
                <IncomingTable varietyGroups={varietyGroupedIncoming} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Grading
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Grading gate passes with bag sizes by variety — one table, blocks
              per variety.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
                      {incomingFetchErrorDescription}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="w-full">
                <GradingTable varietyGroups={varietyGroupedGrading} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Summary
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Bag-type and size summary lines grouped by variety in one table.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="font-custom text-muted-foreground h-[200px] w-full rounded-2xl" />
              </div>
            ) : isError ? (
              <div className="p-4">
                <Empty className="border-border/50 rounded-xl border py-12">
                  <EmptyHeader>
                    <EmptyTitle className="font-custom">
                      Could not load summary (grading gate passes)
                    </EmptyTitle>
                    <EmptyDescription className="font-custom">
                      {incomingFetchErrorDescription}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="w-full">
                <SummaryTable varietyGroups={varietyGroupedSummary} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)] ring-1">
          <CardHeader className="border-border/40 bg-secondary/50 space-y-1.5 border-b px-3 py-3 sm:px-4 sm:py-4">
            <CardTitle className="font-custom text-lg font-semibold text-[#333] sm:text-xl">
              Farmer seed
            </CardTitle>
            <CardDescription className="font-custom leading-relaxed text-gray-600">
              Seed dispatch lines grouped by variety in one table.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full">
              <FarmerSeedTable varietyGroups={varietyGroupedFarmerSeed} />
            </div>
          </CardContent>
        </Card>
      </div>

      <AccountingGradingPassSelectionDialog
        open={isSelectionDialogOpen}
        onOpenChange={setIsSelectionDialogOpen}
        gradingPasses={gradingPasses}
        sortedGradingPasses={sortedGradingPasses}
        draftSelectedGradingIds={draftSelectedGradingIds}
        selectedGradingIdSet={selectedGradingIdSet}
        hasDraftChanges={hasDraftChanges}
        onSelectAll={selectAllDraft}
        onDeselectAll={deselectAllDraft}
        onToggleDraftSelection={toggleDraftSelection}
        onResetDraftSelection={() =>
          setDraftSelectedGradingIds(new Set(selectedGradingIdSet))
        }
        onApplyDraftSelection={applyDraftSelection}
      />
    </main>
  );
};

export default memo(AccountingReportTable);
