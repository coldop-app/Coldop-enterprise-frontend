import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type GroupingState,
  type Row,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { FileText, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item } from '@/components/ui/item';
import { useStore } from '@/stores/store';
import { useGetFarmerSeedReport } from '@/services/store-admin/farmer-seed/analytics/useGetFarmerSeedReport';
import type { FarmerSeedReportEntry } from '@/types/farmer-seed';
import { ViewFiltersSheet } from '@/components/analytics/farmer-seed/report/view-filters-sheet/index';
import PdfWorker from './pdf.worker?worker';
import type {
  FarmerSeedPdfWorkerRequest,
  FarmerSeedPdfWorkerResponse,
} from '@/components/analytics/farmer-seed/report/pdf.worker';
import { FarmerSeedExcelButton } from './farmer-seed-excel-button';
import {
  defaultColumnOrder,
  defaultFarmerSeedColumnVisibility,
  formatIndianNumber,
  globalFilterFn,
  numericColumnIds,
  reportColumns,
  type GlobalFilterValue,
  type FarmerSeedReportRow,
} from './columns';
import { FarmerSeedReportDataTable } from './farmer-seed-report-data-table';

const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 110;
const DEFAULT_COLUMN_MAX_SIZE = 560;

type BagSizeKey =
  | 'bag35to40'
  | 'bag40to45'
  | 'bag40to50'
  | 'bag45to50'
  | 'bag50to55';

type BagSizeMetric = {
  quantity: number;
  totalAcres: number;
  totalRateAmount: number;
};

function toDisplayDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;
  if (year.length !== 4) return undefined;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function getFarmerData(item: FarmerSeedReportEntry) {
  if (
    item.farmerStorageLinkId &&
    typeof item.farmerStorageLinkId !== 'string' &&
    item.farmerStorageLinkId.farmerId &&
    typeof item.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return {
      farmerId: item.farmerStorageLinkId.farmerId._id,
      farmerName: item.farmerStorageLinkId.farmerId.name,
      farmerAddress: item.farmerStorageLinkId.farmerId.address ?? '-',
      accountNumber: item.farmerStorageLinkId.accountNumber,
    };
  }

  return {
    farmerId: '-',
    farmerName: '-',
    farmerAddress: '-',
    accountNumber: null as number | null,
  };
}

function getFarmerDisplayName(
  farmerName: string,
  accountNumber: number | null
): string {
  if (typeof accountNumber === 'number') {
    return `${farmerName} (#${accountNumber})`;
  }
  return farmerName;
}

function computeTotals(entry: FarmerSeedReportEntry) {
  const totalBags = (entry.bagSizes || []).reduce(
    (sum, bag) => sum + Number(bag.quantity || 0),
    0
  );
  const totalAcres = (entry.bagSizes || []).reduce(
    (sum, bag) => sum + Number(bag.acres || 0),
    0
  );
  const totalAmount = (entry.bagSizes || []).reduce(
    (sum, bag) => sum + Number(bag.quantity || 0) * Number(bag.rate || 0),
    0
  );
  const averageRate = totalBags > 0 ? totalAmount / totalBags : 0;

  return {
    totalBags,
    totalAcres,
    totalAmount,
    averageRate,
  };
}

function normalizeBagSizeName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '');

  const matchedRange = normalized.match(/(\d{2})-(\d{2})/);
  if (matchedRange) {
    return `${matchedRange[1]}-${matchedRange[2]}`;
  }

  return normalized;
}

function createEmptyBagSizeMetric(): BagSizeMetric {
  return {
    quantity: 0,
    totalAcres: 0,
    totalRateAmount: 0,
  };
}

function getBagSizeKey(name: string): BagSizeKey | null {
  switch (name) {
    case '35-40':
      return 'bag35to40';
    case '40-45':
      return 'bag40to45';
    case '40-50':
      return 'bag40to50';
    case '45-50':
      return 'bag45to50';
    case '50-55':
      return 'bag50to55';
    default:
      return null;
  }
}

function getBagSizeMetrics(
  entry: FarmerSeedReportEntry
): Record<BagSizeKey, BagSizeMetric> {
  const metrics: Record<BagSizeKey, BagSizeMetric> = {
    bag35to40: createEmptyBagSizeMetric(),
    bag40to45: createEmptyBagSizeMetric(),
    bag40to50: createEmptyBagSizeMetric(),
    bag45to50: createEmptyBagSizeMetric(),
    bag50to55: createEmptyBagSizeMetric(),
  };

  for (const bag of entry.bagSizes || []) {
    const normalized = normalizeBagSizeName(String(bag.name || ''));
    const bagSizeKey = getBagSizeKey(normalized);
    if (!bagSizeKey) continue;
    const quantity = Number(bag.quantity || 0);
    const rate = Number(bag.rate || 0);
    const acres = Number(bag.acres || 0);

    metrics[bagSizeKey].quantity += quantity;
    metrics[bagSizeKey].totalAcres += acres;
    metrics[bagSizeKey].totalRateAmount += quantity * rate;
  }

  return metrics;
}

function getLeafRowsForPdf(
  rows: Row<FarmerSeedReportRow>[]
): FarmerSeedReportRow[] {
  return rows.flatMap((row) =>
    row.getIsGrouped()
      ? row.getLeafRows().map((leaf) => leaf.original)
      : row.original
  );
}

type FarmerSeedPdfButtonProps = {
  buildPayload: (generatedAt: string) => FarmerSeedPdfWorkerRequest;
};

const FarmerSeedPdfButton = ({ buildPayload }: FarmerSeedPdfButtonProps) => {
  const objectUrlRef = React.useRef<string | null>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  React.useEffect(
    () => () => {
      if (workerRef.current) workerRef.current.terminate();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const handleGenerate = async () => {
    if (isGeneratingPdf) return;
    const previewTab = window.open('', '_blank');
    if (!previewTab) {
      window.alert(
        'Popup blocked by your browser. Please allow popups and try again.'
      );
      return;
    }
    previewTab.opener = null;
    previewTab.document.write(
      '<!doctype html><html><body style="font-family:Inter,sans-serif;padding:24px">Generating PDF...</body></html>'
    );
    previewTab.document.close();
    setIsGeneratingPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedAt = new Date().toLocaleString('en-IN');
      const worker = new PdfWorker();
      workerRef.current = worker;
      const blob = await new Promise<Blob>((resolve, reject) => {
        worker.onmessage = (
          event: MessageEvent<FarmerSeedPdfWorkerResponse>
        ) => {
          if (event.data.status === 'success') resolve(event.data.blob);
          else reject(new Error(event.data.message));
        };
        worker.onerror = (event) =>
          reject(new Error(event.message || 'PDF worker execution failed'));
        worker.postMessage(buildPayload(generatedAt));
      });
      const nextUrl = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = nextUrl;
      if (!previewTab.closed) previewTab.location.replace(nextUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      if (!previewTab.closed) {
        previewTab.document.open();
        previewTab.document.write(
          `<!doctype html><html><body style="font-family:Inter,sans-serif;padding:24px;color:#991b1b">Failed to generate PDF<br/><pre>${message}</pre></body></html>`
        );
        previewTab.document.close();
      }
      window.alert(`Failed to generate PDF: ${message}`);
    } finally {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Button
      variant="default"
      className="h-8 rounded-lg px-4 text-sm leading-none"
      disabled={isGeneratingPdf}
      onClick={() => void handleGenerate()}
    >
      {isGeneratingPdf ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {isGeneratingPdf ? 'Generating...' : 'Pdf'}
    </Button>
  );
};

const FarmerSeedReportTable = () => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultFarmerSeedColumnVisibility);
  const [columnOrder, setColumnOrder] =
    React.useState<string[]>(defaultColumnOrder);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');

  const hasDateFilters = Boolean(fromDate && toDate);
  const hasAppliedDateFilters = Boolean(appliedFromDate && appliedToDate);
  const canApply = Boolean(fromDate && toDate);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetFarmerSeedReport(
      {
        fromDate: hasAppliedDateFilters ? appliedFromDate : undefined,
        toDate: hasAppliedDateFilters ? appliedToDate : undefined,
      },
      { enabled: true }
    );

  const reportData = React.useMemo<FarmerSeedReportRow[]>(
    () =>
      (data ?? []).map((item) => {
        const farmer = getFarmerData(item);
        const totals = computeTotals(item);
        const bagSizes = getBagSizeMetrics(item);

        const getRateFor = (key: BagSizeKey) =>
          bagSizes[key].quantity > 0
            ? bagSizes[key].totalRateAmount / bagSizes[key].quantity
            : 0;

        return {
          id: item._id,
          farmerId: farmer.farmerId,
          farmerName: getFarmerDisplayName(
            farmer.farmerName,
            farmer.accountNumber
          ),
          farmerAddress: farmer.farmerAddress,
          accountNumber: farmer.accountNumber,
          gatePassNo: item.gatePassNo ?? 0,
          invoiceNumber: item.invoiceNumber ?? '-',
          date: toDisplayDate(item.date),
          variety: item.variety ?? '-',
          generation: item.generation ?? '-',
          bag35to40: bagSizes.bag35to40.quantity,
          bag35to40Rate: getRateFor('bag35to40'),
          bag35to40Acres: bagSizes.bag35to40.totalAcres,
          bag40to45: bagSizes.bag40to45.quantity,
          bag40to45Rate: getRateFor('bag40to45'),
          bag40to45Acres: bagSizes.bag40to45.totalAcres,
          bag40to50: bagSizes.bag40to50.quantity,
          bag40to50Rate: getRateFor('bag40to50'),
          bag40to50Acres: bagSizes.bag40to50.totalAcres,
          bag45to50: bagSizes.bag45to50.quantity,
          bag45to50Rate: getRateFor('bag45to50'),
          bag45to50Acres: bagSizes.bag45to50.totalAcres,
          bag50to55: bagSizes.bag50to55.quantity,
          bag50to55Rate: getRateFor('bag50to55'),
          bag50to55Acres: bagSizes.bag50to55.totalAcres,
          totalBags: totals.totalBags,
          totalAcres: totals.totalAcres,
          averageRate: totals.averageRate,
          totalAmount: totals.totalAmount,
          remarks: item.remarks ?? '-',
          createdAt: toDisplayDate(item.createdAt),
          updatedAt: toDisplayDate(item.updatedAt),
        };
      }),
    [data]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<FarmerSeedReportRow>({
    data: reportData,
    columns: reportColumns,
    defaultColumn: {
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_COLUMN_MIN_SIZE,
      maxSize: DEFAULT_COLUMN_MAX_SIZE,
    },
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      grouping,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode,
    columnResizeDirection,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const sortedRows = table.getSortedRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );
  const totalsByColumn = React.useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.bag35to40 += Number(row.original.bag35to40 ?? 0);
        acc.bag40to45 += Number(row.original.bag40to45 ?? 0);
        acc.bag40to50 += Number(row.original.bag40to50 ?? 0);
        acc.bag45to50 += Number(row.original.bag45to50 ?? 0);
        acc.bag50to55 += Number(row.original.bag50to55 ?? 0);
        acc.totalBags += Number(row.original.totalBags ?? 0);
        acc.totalAcres += Number(row.original.totalAcres ?? 0);
        acc.totalAmount += Number(row.original.totalAmount ?? 0);
        return acc;
      },
      {
        bag35to40: 0,
        bag40to45: 0,
        bag40to50: 0,
        bag45to50: 0,
        bag50to55: 0,
        totalBags: 0,
        totalAcres: 0,
        totalAmount: 0,
      }
    );
  }, [filteredRows]);
  const hasVisibleNumericTotals = React.useMemo(
    () => visibleColumnIds.some((columnId) => numericColumnIds.has(columnId)),
    [visibleColumnIds]
  );

  const handleApply = () => {
    if (!hasDateFilters) return;
    const nextFromDate = toApiDate(fromDate);
    const nextToDate = toApiDate(toDate);
    if (!nextFromDate || !nextToDate) return;
    setAppliedFromDate(nextFromDate);
    setAppliedToDate(nextToDate);
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  const buildPdfWorkerPayload = React.useCallback(
    (generatedAt: string) =>
      ({
        rows: getLeafRowsForPdf(sortedRows),
        visibleColumnIds,
        grouping,
        coldStorageName,
        generatedAt,
      }) satisfies FarmerSeedPdfWorkerRequest,
    [coldStorageName, grouping, sortedRows, visibleColumnIds]
  );

  return (
    <>
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <div className="space-y-4">
          <Item
            variant="outline"
            size="sm"
            className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
          >
            <div className="flex w-full flex-wrap items-end gap-2.5 xl:flex-nowrap">
              <div className="flex items-end gap-2 self-end">
                <DatePicker
                  id="analytics-seed-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
                <span className="text-muted-foreground mb-2 self-end text-sm">
                  →
                </span>
                <DatePicker
                  id="analytics-seed-to-date"
                  label="To"
                  compact
                  value={toDate}
                  onChange={setToDate}
                />
              </div>

              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              <div className="flex items-center gap-2 self-end">
                <Button
                  className="h-8 rounded-lg px-4 text-sm shadow-none"
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  className="text-muted-foreground h-8 rounded-lg px-4 text-sm"
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
              </div>

              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2 self-end">
                <div className="relative w-[140px] sm:w-[170px]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search invoice…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
                  onClick={() => setIsViewFiltersOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  View Filters
                </Button>
                <FarmerSeedExcelButton
                  table={table}
                  coldStorageName={coldStorageName}
                />
                <FarmerSeedPdfButton buildPayload={buildPdfWorkerPayload} />
                <Button
                  variant="ghost"
                  className="text-muted-foreground h-8 w-8 rounded-lg p-0 leading-none"
                  disabled={isFetching}
                  onClick={() => refetch()}
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
            </div>
          </Item>

          <div className="w-full">
            {isError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load farmer seed report'}
              </p>
            )}

            <FarmerSeedReportDataTable
              table={table}
              rows={rows}
              visibleColumnIds={visibleColumnIds}
              numericColumnIds={numericColumnIds}
              totalsByColumn={totalsByColumn}
              hasVisibleNumericTotals={hasVisibleNumericTotals}
              isLoading={isLoading}
              formatIndianNumber={formatIndianNumber}
            />
          </div>
        </div>
      </main>
      <ViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={setIsViewFiltersOpen}
        table={table}
        defaultColumnOrder={defaultColumnOrder}
        defaultColumnVisibility={defaultFarmerSeedColumnVisibility}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default FarmerSeedReportTable;
