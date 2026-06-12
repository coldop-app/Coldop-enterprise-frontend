import { memo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEditFarmer } from '@/services/store-admin/people/useEditFarmer';
import FarmerDetailsSection from './farmer-details-section';
import GradingVarietyTable from './grading-variety-table';
import PlantingVarietyTable from './planting-variety-table';
import ReportMetaCards from './report-meta-cards';
import ReportSnapshotBar from './report-snapshot-bar';
import ReportTableSection from './report-table-section';
import { buildNetProfitSyncPayload } from './build-net-profit-sync-payload';
import { useFinanceReportData } from './use-finance-report-data';

export interface FinanceReportProps {
  farmerStorageLinkId: string;
}

const FinanceReport = ({ farmerStorageLinkId }: FinanceReportProps) => {
  const {
    coldStorageName,
    farmerStorageLink,
    stationName,
    localityName,
    localityRates,
    isLoading,
    isError,
    errorDescription,
    reportGeneratedOn,
    reportPeriodLabel,
    hasReportData,
    plantingGroups,
    gradingGroups,
    summary,
    rowStats,
  } = useFinanceReportData(farmerStorageLinkId);

  const { mutate: editFarmer, isPending: isSyncing } = useEditFarmer();

  const showSummary = !isLoading && !isError && hasReportData;
  const sectionEmpty = !hasReportData;
  const canSync = showSummary && !isSyncing;

  const handleSyncWithCfReport = useCallback(() => {
    const payload = buildNetProfitSyncPayload(
      farmerStorageLinkId,
      summary,
      showSummary
    );
    if (!payload) return;

    editFarmer(payload);
  }, [editFarmer, farmerStorageLinkId, showSummary, summary]);

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

              <div className="flex flex-col items-stretch gap-2 sm:items-end">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="font-custom focus-visible:ring-primary font-bold focus-visible:ring-offset-2"
                  disabled={!canSync}
                  onClick={handleSyncWithCfReport}
                  aria-label="Sync with Cf Report"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                    aria-hidden
                  />
                  Sync with Cf Report
                </Button>
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
          </div>

          <div className="space-y-8 px-4 py-4 sm:px-6 sm:py-5">
            <ReportMetaCards
              reportGeneratedOn={reportGeneratedOn}
              reportPeriodLabel={reportPeriodLabel}
              showSummary={showSummary}
              summary={summary}
            />

            {farmerStorageLink ? (
              <FarmerDetailsSection
                farmerStorageLink={farmerStorageLink}
                stationName={stationName}
                localityName={localityName}
                localityRates={localityRates}
              />
            ) : null}

            {showSummary ? <ReportSnapshotBar rowStats={rowStats} /> : null}

            <ReportTableSection
              title="Planting"
              description="Seed dispatch and expense particulars by variety — net amount per variety in the footer row."
              isLoading={isLoading}
              isError={isError}
              errorTitle="Could not load farmer seed gate passes"
              errorDescription={errorDescription}
              isEmpty={sectionEmpty}
              emptyTitle="No planting data to show"
              emptyDescription="This farmer has no seed, incoming, or grading records to build a finance report."
            >
              <PlantingVarietyTable varietyGroups={plantingGroups} />
            </ReportTableSection>

            <ReportTableSection
              title="Grading"
              description="Grading sale lines by variety — sale amount totals in the footer row."
              isLoading={isLoading}
              isError={isError}
              errorTitle="Could not load grading gate passes"
              errorDescription={errorDescription}
              isEmpty={sectionEmpty}
              emptyTitle="No grading data to show"
              emptyDescription="Grading rows appear when related gate passes exist for this farmer."
            >
              <GradingVarietyTable varietyGroups={gradingGroups} />
            </ReportTableSection>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default memo(FinanceReport);
