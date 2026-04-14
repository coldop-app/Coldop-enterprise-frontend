import { memo, useCallback, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useStore } from '@/stores/store';
import { useGetContractFarmingReport } from '@/services/store-admin/analytics/Contract-farming-report/useGetContractFarmingReport';
import { useGetAllFarmerSeedEntries } from '@/services/store-admin/farmer-seed/useGetAllFarmerSeedEntries';
import { downloadContractFarmingReportExcel } from '@/utils/contractFarmingReportExcel';
import {
  ContractFarmingReportDigitalTable,
  type ContractFarmingReportDigitalVarietyGroup,
} from '@/components/people/ContractFarmingReportDigitalTable';
import {
  DEFAULT_CONTRACT_FARMING_COLUMN_VISIBILITY,
  type ContractFarmingColumnVisibility,
} from '@/components/people/contractFarmingColumns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Item,
  ItemActions,
  ItemFooter,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from '@/components/ui/empty';
import { Card, CardContent } from '@/components/ui/card';
import {
  Eye,
  EyeOff,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  Sprout,
  User,
} from 'lucide-react';
import { FarmerSeedVoucher } from '../vouchers';

const SeedTab = memo(function SeedTab() {
  const {
    data: cfReportData,
    isLoading: isCfReportLoading,
    isError: isCfReportError,
    error: cfReportError,
    isFetching: isCfReportFetching,
    refetch: refetchCfReport,
  } = useGetContractFarmingReport();
  const {
    data: farmerSeedEntries,
    isLoading: isFarmerSeedLoading,
    isError: isFarmerSeedError,
    error: farmerSeedError,
    isFetching: isFarmerSeedFetching,
    refetch: refetchFarmerSeedEntries,
  } = useGetAllFarmerSeedEntries();
  const coldStorage = useStore((s) => s.coldStorage);
  const companyName = coldStorage?.name ?? 'Cold Storage';

  const [showContractFarmingTable, setShowContractFarmingTable] =
    useState(true);
  const [isGeneratingCfReportPdf, setIsGeneratingCfReportPdf] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnVisibility, setColumnVisibility] =
    useState<ContractFarmingColumnVisibility>(
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
          rows: [...farmers].sort((x, y) => x.name.localeCompare(y.name)),
        }));
    }, [cfReportData]);

  const filteredContractFarmingGroups =
    useMemo((): ContractFarmingReportDigitalVarietyGroup[] => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return contractFarmingGroups;
      return contractFarmingGroups
        .map((group) => {
          const varietyMatch = group.variety.toLowerCase().includes(query);
          if (varietyMatch) return group;
          return {
            ...group,
            rows: group.rows.filter(
              (row) =>
                row.name.toLowerCase().includes(query) ||
                row.address.toLowerCase().includes(query)
            ),
          };
        })
        .filter((group) => group.rows.length > 0);
    }, [contractFarmingGroups, searchQuery]);

  const totalRows = useMemo(
    () =>
      filteredContractFarmingGroups.reduce(
        (acc, group) => acc + group.rows.length,
        0
      ),
    [filteredContractFarmingGroups]
  );

  const filteredFarmerSeedEntries = useMemo(() => {
    const entries = farmerSeedEntries ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const farmer = entry.farmerStorageLinkId?.farmerId;
      return (
        farmer?.name?.toLowerCase().includes(query) ||
        farmer?.address?.toLowerCase().includes(query) ||
        entry.variety?.toLowerCase().includes(query) ||
        entry.generation?.toLowerCase().includes(query) ||
        String(entry.gatePassNo ?? '').includes(query) ||
        entry.invoiceNumber?.toLowerCase().includes(query)
      );
    });
  }, [farmerSeedEntries, searchQuery]);

  const groupedFarmerSeedEntries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        farmerName: string;
        farmerAddress: string;
        farmerAccount: number;
        entries: typeof filteredFarmerSeedEntries;
      }
    >();

    for (const entry of filteredFarmerSeedEntries) {
      const storageLink = entry.farmerStorageLinkId;
      const farmer = storageLink?.farmerId;
      const farmerId = farmer?._id ?? storageLink?._id ?? 'unknown-farmer';
      const existing = grouped.get(farmerId);

      if (existing) {
        existing.entries.push(entry);
        continue;
      }

      grouped.set(farmerId, {
        farmerName: farmer?.name ?? 'Unknown Farmer',
        farmerAddress: farmer?.address ?? '',
        farmerAccount: storageLink?.accountNumber ?? 0,
        entries: [entry],
      });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.farmerName.localeCompare(b.farmerName)
    );
  }, [filteredFarmerSeedEntries]);

  const isRefreshing = isCfReportFetching || isFarmerSeedFetching;

  const handleRefreshSeedTab = useCallback(async () => {
    await Promise.allSettled([refetchCfReport(), refetchFarmerSeedEntries()]);
  }, [refetchCfReport, refetchFarmerSeedEntries]);

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
        import('@/components/pdf/contract-farming-report/contract-farming-report-table-pdf'),
      ]);
      const blob = await pdf(
        <ContractFarmingReportTablePdf
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle="Contract Farming Report"
          groups={filteredContractFarmingGroups}
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
  }, [columnVisibility, companyName, filteredContractFarmingGroups]);

  const handleDownloadContractFarmingReportExcel = useCallback(() => {
    downloadContractFarmingReportExcel(filteredContractFarmingGroups, {
      companyName,
    });
    toast.success('Excel downloaded', {
      description:
        'Farmers are listed A–Z; buy-back and grading columns merge per farmer when there are multiple seed lines.',
    });
    setIsReportDialogOpen(false);
  }, [companyName, filteredContractFarmingGroups]);

  return (
    <div className="w-full space-y-4">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full">
          <div className="flex items-center gap-3">
            <ItemMedia variant="icon" className="rounded-lg">
              <Sprout className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              {totalRows} {totalRows === 1 ? 'record' : 'records'}
            </ItemTitle>
          </div>
          <ItemActions>
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={() => void handleRefreshSeedTab()}
              className="font-custom h-8 gap-2 rounded-lg px-3"
            >
              <RefreshCw
                className={`h-4 w-4 shrink-0 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </ItemActions>
        </ItemHeader>
      </Item>

      <Item
        variant="outline"
        size="sm"
        className="flex-col items-stretch gap-4 rounded-xl"
      >
        <div className="relative w-full">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by farmer name, address, or variety..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>
        <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowContractFarmingTable((visible) => !visible)}
              aria-pressed={showContractFarmingTable}
              aria-label={
                showContractFarmingTable
                  ? 'Hide contract farming table'
                  : 'Show contract farming table'
              }
              className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
            >
              {showContractFarmingTable ? (
                <EyeOff className="h-4 w-4 shrink-0" />
              ) : (
                <Eye className="h-4 w-4 shrink-0" />
              )}
              {showContractFarmingTable ? 'Hide' : 'Show'} C.F. table
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportDialogOpen(true)}
              className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
            >
              <FileBarChart className="h-4 w-4 shrink-0" />
              C.F. Report
            </Button>
            <Button
              variant="default"
              className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              asChild
            >
              <Link to="/store-admin/farmer-seed">
                <Sprout className="h-4 w-4 shrink-0" />
                Add Seed
              </Link>
            </Button>
          </div>
        </ItemFooter>
      </Item>

      {showContractFarmingTable ? (
        <ContractFarmingReportDigitalTable
          isLoading={isCfReportLoading}
          isError={isCfReportError}
          error={cfReportError}
          groups={filteredContractFarmingGroups}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
        />
      ) : null}

      <div className="space-y-4">
        {isFarmerSeedLoading ? (
          <Card>
            <CardContent className="py-10">
              <p className="font-custom text-center text-sm text-gray-600">
                Loading seed vouchers...
              </p>
            </CardContent>
          </Card>
        ) : isFarmerSeedError ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyTitle>Failed to load seed vouchers</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <p className="font-custom text-sm text-red-600">
                    {farmerSeedError instanceof Error
                      ? farmerSeedError.message
                      : 'Something went wrong.'}
                  </p>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : groupedFarmerSeedEntries.length === 0 ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Sprout className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No seed vouchers found</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <p className="font-custom text-sm text-gray-600">
                    Try adjusting your search or add a new seed entry.
                  </p>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          groupedFarmerSeedEntries.map((group) => (
            <section
              key={`${group.farmerName}-${group.farmerAccount}`}
              className="space-y-3"
            >
              <div className="bg-muted/40 border-border/50 flex items-center gap-2 rounded-lg border px-3 py-2">
                <User className="text-primary h-4 w-4" />
                <p className="font-custom text-sm font-semibold text-[#333]">
                  {group.farmerName}
                </p>
                <p className="font-custom text-muted-foreground text-xs">
                  A/C #{group.farmerAccount}
                </p>
                <p className="font-custom text-muted-foreground text-xs">
                  · {group.entries.length}{' '}
                  {group.entries.length === 1 ? 'voucher' : 'vouchers'}
                </p>
              </div>

              <div className="space-y-4">
                {group.entries
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((entry) => (
                    <FarmerSeedVoucher
                      key={entry._id}
                      entry={entry}
                      farmerName={group.farmerName}
                      farmerAddress={group.farmerAddress}
                      farmerAccount={group.farmerAccount}
                    />
                  ))}
              </div>
            </section>
          ))
        )}
      </div>

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
              disabled={isCfReportLoading || isCfReportError || totalRows === 0}
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
  );
});

export default SeedTab;
