'use client';

import { useCallback, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText, Sprout } from 'lucide-react';
import { useStore } from '@/stores/store';
import { useGetContractFarmingReport } from '@/services/store-admin/analytics/Contract-farming-report/useGetContractFarmingReport';
import { downloadContractFarmingReportExcel } from '@/utils/contractFarmingReportExcel';
import {
  CONTRACT_FARMING_GRADING_COLUMNS,
  acresPlantedForSeedLine,
  aggregateBuyBackBagsForReportVariety,
  compareContractFarmingFarmersByFamilyAccount,
  computeGradingRangePercentages,
  computeYieldPerAcreQuintals,
  expandFarmerRowsForSizes,
  findGradingBucket,
  formatAccountNumberField,
  formatBuyBackAmount,
  formatNetAmountPayable,
  formatNetAmountPerAcre,
  formatTotalSeedAmount,
  generationLabelForSeedLine,
  hasBuyBackBagsEntryForReportVariety,
  mergeGradingSizeMapsForReportVariety,
  resolveAcresForNetPerAcre,
  type ContractFarmingReportDigitalVarietyGroup,
} from '@/utils/contractFarmingReportShared';
import {
  DEFAULT_CONTRACT_FARMING_COLUMN_VISIBILITY,
  type ContractFarmingColumnVisibility,
} from '@/components/analytics/seed/contractFarmingColumns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createContractFarmingColumns,
  toColumnVisibilityState,
  type ContractFarmingTableRow,
} from './columns';
import { ContractFarmingDataTable } from './data-table';

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toTwoDecimalNumber(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.replace(/,/g, '').trim())
        : NaN;
  return Number.isFinite(parsed) ? roundToTwo(parsed) : 0;
}

const SeedAnalyticsTab = () => {
  const {
    data: cfReportData,
    isLoading: isCfReportLoading,
    isError: isCfReportError,
    error: cfReportError,
  } = useGetContractFarmingReport();
  const coldStorage = useStore((s) => s.coldStorage);
  const companyName = coldStorage?.name ?? 'Cold Storage';

  const [isGeneratingCfReportPdf, setIsGeneratingCfReportPdf] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [columnVisibility] = useState<ContractFarmingColumnVisibility>(
    DEFAULT_CONTRACT_FARMING_COLUMN_VISIBILITY
  );

  const contractFarmingGroups =
    useMemo((): ContractFarmingReportDigitalVarietyGroup[] => {
      const by = cfReportData?.byVariety;
      if (!by) return [];
      return Object.entries(by)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([variety, farmers]) => ({
          variety,
          rows: [...farmers]
            .filter((farmer) =>
              farmer.sizes.some((sizeLine) => (sizeLine.quantity ?? 0) > 0)
            )
            .sort(compareContractFarmingFarmersByFamilyAccount),
        }));
    }, [cfReportData]);

  const tableRows = useMemo((): ContractFarmingTableRow[] => {
    let serial = 1;
    const rows: ContractFarmingTableRow[] = [];
    for (const group of contractFarmingGroups) {
      for (const farmer of group.rows) {
        const expandedRows = expandFarmerRowsForSizes([farmer]);
        for (const expanded of expandedRows) {
          const gradingBySize = mergeGradingSizeMapsForReportVariety(
            farmer,
            group.variety
          );
          const percentages = computeGradingRangePercentages(gradingBySize);
          const buyBack = aggregateBuyBackBagsForReportVariety(
            farmer,
            group.variety
          );
          const hasBuyBack = hasBuyBackBagsEntryForReportVariety(
            farmer,
            group.variety
          );
          const gradingByHeader = CONTRACT_FARMING_GRADING_COLUMNS.reduce<
            Record<string, number>
          >((acc, col) => {
            acc[col.header] =
              findGradingBucket(gradingBySize, col.matchKeys)?.initialBags ?? 0;
            return acc;
          }, {});
          const totalGradingBags = Object.values(gradingByHeader).reduce(
            (sum, value) => sum + value,
            0
          );
          const netWeightAfterGrading = roundToTwo(
            Object.values(gradingBySize).reduce(
              (sum, item) => sum + (item.netWeightKg ?? 0),
              0
            )
          );
          const buyBackAmount = toTwoDecimalNumber(
            formatBuyBackAmount(farmer, group.variety)
          );
          const totalSeedAmount = toTwoDecimalNumber(
            formatTotalSeedAmount(farmer)
          );
          const netAmountPayable = toTwoDecimalNumber(
            formatNetAmountPayable(farmer, group.variety)
          );
          const netAmountPerAcre = toTwoDecimalNumber(
            formatNetAmountPerAcre(farmer, group.variety)
          );
          const acresForYield = resolveAcresForNetPerAcre(farmer) ?? 0;
          const yieldPerAcreQuintals = roundToTwo(
            computeYieldPerAcreQuintals(gradingBySize, acresForYield) ?? 0
          );

          rows.push({
            id: `${farmer.id}-${group.variety}-${expanded.sizeLineIndex}`,
            sNo: serial++,
            variety: group.variety,
            name: farmer.name ?? '—',
            accountNumber: formatAccountNumberField(farmer.accountNumber),
            address: farmer.address ?? '—',
            acresPlanted: roundToTwo(
              acresPlantedForSeedLine(farmer, expanded.size)
            ),
            generation: generationLabelForSeedLine(
              farmer,
              expanded.sizeLineIndex
            ),
            sizeName: expanded.size?.name ?? '—',
            seedBags: expanded.size?.quantity ?? 0,
            buyBackBags: hasBuyBack ? buyBack.totalBags : 0,
            wtWithoutBardana: roundToTwo(
              hasBuyBack ? buyBack.totalNetWeightKg : 0
            ),
            gradingByHeader,
            totalGradingBags,
            below40Percent: roundToTwo(percentages.below40 ?? 0),
            range40To50Percent: roundToTwo(percentages.range40To50 ?? 0),
            above50Percent: roundToTwo(percentages.above50 ?? 0),
            cutPercent: roundToTwo(percentages.cut ?? 0),
            netWeightAfterGrading,
            buyBackAmount,
            totalSeedAmount,
            netAmountPayable,
            netAmountPerAcre,
            yieldPerAcreQuintals,
          });
        }
      }
    }
    return rows;
  }, [contractFarmingGroups]);

  const totalRows = tableRows.length;
  const gradingHeaders = useMemo(
    () => CONTRACT_FARMING_GRADING_COLUMNS.map((col) => col.header),
    []
  );
  const columns = useMemo(
    () => createContractFarmingColumns(gradingHeaders),
    [gradingHeaders]
  );

  const handleOpenContractFarmingReportPdf = useCallback(async () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingCfReportPdf(true);
    const dateRangeLabel = `As of ${new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`;
    try {
      const [{ pdf }, { ContractFarmingReportTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/analytics/seed/contract-farming-report-table-pdf'),
      ]);
      const blob = await pdf(
        <ContractFarmingReportTablePdf
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle="Contract Farming Report"
          groups={contractFarmingGroups}
          columnVisibility={columnVisibility}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('PDF opened in new tab', {
        description: 'Contract farming report is ready to view or print.',
      });
    } catch (err) {
      console.error('Contract farming PDF generation failed', err);
      printWindow?.close();
      const description =
        err instanceof Error && err.message ? err.message : 'Please try again.';
      toast.error('Could not generate PDF', {
        description,
      });
    } finally {
      setIsGeneratingCfReportPdf(false);
    }
  }, [columnVisibility, companyName, contractFarmingGroups]);

  const handleDownloadContractFarmingReportExcel = useCallback(() => {
    downloadContractFarmingReportExcel(contractFarmingGroups, {
      companyName,
    });
    toast.success('Excel downloaded', {
      description:
        'Farmers are grouped by family (account base), then by account number; buy-back and grading columns merge per farmer when there are multiple seed lines.',
    });
    setIsReportDialogOpen(false);
  }, [companyName, contractFarmingGroups]);

  if (isCfReportLoading) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <Skeleton className="font-custom h-8 w-64 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </main>
    );
  }

  if (isCfReportError) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <h2 className="text-foreground font-custom text-2xl font-semibold">
            Contract Farming Report
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="font-custom text-destructive">
                {cfReportError instanceof Error
                  ? cfReportError.message
                  : 'Failed to load contract farming report.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <h2 className="text-foreground font-custom text-2xl font-semibold">
          Contract Farming Report
        </h2>
        <ContractFarmingDataTable
          columns={columns}
          data={tableRows}
          initialColumnVisibility={toColumnVisibilityState(columnVisibility)}
          toolbarRightContent={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadContractFarmingReportExcel}
                disabled={totalRows === 0}
                className="font-custom h-10 w-full gap-2 sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                Download Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReportDialogOpen(true)}
                disabled={totalRows === 0}
                className="font-custom h-10 w-full gap-2 sm:w-auto"
              >
                <FileText className="h-4 w-4 shrink-0" />
                View PDF
              </Button>
              <Button
                variant="default"
                className="font-custom h-10 w-full gap-2 sm:w-auto"
                asChild
              >
                <Link to="/store-admin/farmer-seed">
                  <Sprout className="h-4 w-4 shrink-0" />
                  Add Seed
                </Link>
              </Button>
            </>
          }
        />

        <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
          <DialogContent className="font-custom sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contract Farming Report</DialogTitle>
              <DialogDescription className="font-custom">
                Choose the format you want to export.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReportDialogOpen(false)}
                className="font-custom w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  isCfReportLoading || isCfReportError || totalRows === 0
                }
                onClick={handleDownloadContractFarmingReportExcel}
                className="font-custom w-full gap-2 sm:w-auto"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                Download Excel
              </Button>
              <Button
                type="button"
                disabled={
                  isGeneratingCfReportPdf ||
                  isCfReportLoading ||
                  isCfReportError ||
                  totalRows === 0
                }
                onClick={async () => {
                  await handleOpenContractFarmingReportPdf();
                  setIsReportDialogOpen(false);
                }}
                className="font-custom w-full gap-2 sm:w-auto"
              >
                <FileText className="h-4 w-4 shrink-0" />
                {isGeneratingCfReportPdf ? 'Generating…' : 'View PDF'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
};

export default SeedAnalyticsTab;
