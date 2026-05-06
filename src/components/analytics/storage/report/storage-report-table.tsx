import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type GroupingState,
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { FileText, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item } from '@/components/ui/item';
import { useGetStorageGatePassReport } from '@/services/store-admin/storage-gate-pass/analytics/useGetStorageGatePassReport';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import { useStore } from '@/stores/store';
import { ViewFiltersSheet } from './view-filters-sheet/index';
import PdfWorker from './pdf.worker?worker';
import type {
  IncomingPdfWorkerRequest,
  IncomingPdfWorkerResponse,
} from './pdf-worker.types';
import { StorageExcelButton } from './storage-excel-button';
import {
  BAG_SIZE_COLUMN_IDS,
  defaultColumnOrder,
  defaultStorageReportColumnVisibility,
  globalManualGatePassFilterFn,
  numericColumnIds,
  storageReportColumns,
  type GlobalFilterValue,
  type IncomingReportRow,
} from './columns';
import { StorageReportDataTable } from './storage-report-data-table';

function getLeafRowsForPdf(
  rows: Row<IncomingReportRow>[]
): IncomingReportRow[] {
  return rows.flatMap((row) => {
    if (row.getIsGrouped())
      return row.getLeafRows().map((leaf) => leaf.original);
    return row.original;
  });
}

function getFarmerId(gatePass: StorageGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId._id;
  }
  return '-';
}

function getFarmerMobile(gatePass: StorageGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId.mobileNumber ?? '-';
  }
  return '-';
}

function getAccountNumber(gatePass: StorageGatePassWithLink): number | null {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.accountNumber ?? null;
  }
  return null;
}

type BagSizeValues = Pick<
  IncomingReportRow,
  | 'bagBelow25'
  | 'bag25to30'
  | 'bagBelow30'
  | 'bag30to35'
  | 'bag30to40'
  | 'bag35to40'
  | 'bag40to45'
  | 'bag45to50'
  | 'bag50to55'
  | 'bagAbove50'
  | 'bagAbove55'
  | 'bagCut'
>;

function createEmptyBagSizeValues(): BagSizeValues {
  return {
    bagBelow25: 0,
    bag25to30: 0,
    bagBelow30: 0,
    bag30to35: 0,
    bag30to40: 0,
    bag35to40: 0,
    bag40to45: 0,
    bag45to50: 0,
    bag50to55: 0,
    bagAbove50: 0,
    bagAbove55: 0,
    bagCut: 0,
  };
}

function normalizeBagSize(value: string): string {
  return value
    .replace(/\bmm\b/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/[–—−-]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const BAG_SIZE_LABEL_TO_COLUMN_ID = new Map([
  [normalizeBagSize('Below 25'), 'bagBelow25'],
  [normalizeBagSize('25–30'), 'bag25to30'],
  [normalizeBagSize('Below 30'), 'bagBelow30'],
  [normalizeBagSize('30–35'), 'bag30to35'],
  [normalizeBagSize('30–40'), 'bag30to40'],
  [normalizeBagSize('35–40'), 'bag35to40'],
  [normalizeBagSize('40–45'), 'bag40to45'],
  [normalizeBagSize('45–50'), 'bag45to50'],
  [normalizeBagSize('50–55'), 'bag50to55'],
  [normalizeBagSize('Above 50'), 'bagAbove50'],
  [normalizeBagSize('Above 55'), 'bagAbove55'],
  [normalizeBagSize('Cut'), 'bagCut'],
]);

function getBagSizeValues(gatePass: StorageGatePassWithLink): BagSizeValues {
  const values = createEmptyBagSizeValues();
  for (const bagSize of gatePass.bagSizes ?? []) {
    const normalizedSize = normalizeBagSize(String(bagSize.size || ''));
    const columnId = BAG_SIZE_LABEL_TO_COLUMN_ID.get(normalizedSize);
    if (!columnId) continue;
    values[columnId as keyof BagSizeValues] += Number(
      bagSize.initialQuantity || 0
    );
  }
  return values;
}

function getTotalBags(gatePass: StorageGatePassWithLink): number {
  return (gatePass.bagSizes ?? []).reduce(
    (sum, bagSize) => sum + Number(bagSize.initialQuantity || 0),
    0
  );
}

function toDisplayDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

function toSortableDateValue(value?: string): number {
  if (!value) return 0;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 0;
  return parsed.getTime();
}

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;
  if (year.length !== 4) return undefined;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

type IncomingPdfButtonProps = {
  buildPayload: (generatedAt: string) => IncomingPdfWorkerRequest;
};

const IncomingPdfButton = ({ buildPayload }: IncomingPdfButtonProps) => {
  const objectUrlRef = React.useRef<string | null>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (isGeneratingPdf) return;
    const previewTab = window.open('', '_blank');
    if (!previewTab) return;
    setIsGeneratingPdf(true);
    try {
      const generatedAt = new Date().toLocaleString('en-IN');
      const payload = buildPayload(generatedAt);
      const worker = new PdfWorker();
      workerRef.current = worker;
      const blob = await new Promise<Blob>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<IncomingPdfWorkerResponse>) => {
          const data = event.data;
          if (data.status === 'success') resolve(data.blob);
          else reject(new Error(data.message));
        };
        worker.onerror = (event) => reject(new Error(event.message));
        worker.postMessage(payload);
      });
      const nextUrl = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = nextUrl;
      previewTab.location.replace(nextUrl);
    } finally {
      if (workerRef.current) workerRef.current.terminate();
      workerRef.current = null;
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

const StorageReportTable = () => {
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
    React.useState<VisibilityState>(defaultStorageReportColumnVisibility);
  const [columnOrder, setColumnOrder] =
    React.useState<string[]>(defaultColumnOrder);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');
  const hasInitializedBagVisibilityRef = React.useRef(false);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetStorageGatePassReport(
      {
        fromDate: appliedFromDate || undefined,
        toDate: appliedToDate || undefined,
      },
      { enabled: true }
    );

  const incomingReportData = React.useMemo<IncomingReportRow[]>(
    () =>
      (data ?? []).map((item) => ({
        id: item._id,
        farmerId: getFarmerId(item),
        gatePassNo: item.gatePassNo,
        manualGatePassNumber: item.manualGatePassNumber,
        farmerMobileNumber: getFarmerMobile(item),
        accountNumber: getAccountNumber(item),
        variety: item.variety,
        ...getBagSizeValues(item),
        totalBags: getTotalBags(item),
        remarks: item.remarks ?? '-',
        date: toDisplayDate(item.date),
        dateSortValue: toSortableDateValue(item.date),
        createdAt: toDisplayDate(item.createdAt),
        updatedAt: toDisplayDate(item.updatedAt),
      })),
    [data]
  );

  const emptyBagSizeColumnIds = React.useMemo(() => {
    const emptyColumns = new Set<string>();
    BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
      const hasAnyValue = incomingReportData.some(
        (row) => Number(row[columnId] ?? 0) > 0
      );
      if (!hasAnyValue) emptyColumns.add(columnId);
    });
    return emptyColumns;
  }, [incomingReportData]);

  React.useEffect(() => {
    if (
      hasInitializedBagVisibilityRef.current ||
      incomingReportData.length === 0
    )
      return;

    setColumnVisibility((current) => {
      const next = { ...current };
      BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
        next[columnId] = !emptyBagSizeColumnIds.has(columnId);
      });
      return next;
    });
    hasInitializedBagVisibilityRef.current = true;
  }, [emptyBagSizeColumnIds, incomingReportData.length]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<IncomingReportRow>({
    data: incomingReportData,
    columns: storageReportColumns,
    defaultColumn: { size: 170, minSize: 120, maxSize: 550 },
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      grouping,
      pagination,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode,
    columnResizeDirection,
    globalFilterFn: globalManualGatePassFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const emptyGroupedBagSizeColumnIds = React.useMemo(() => {
    if (grouping.length === 0) return new Set<string>();
    const emptyColumns = new Set<string>();
    BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
      const hasAnyValue = filteredRows.some(
        (row) => Number(row.original[columnId] ?? 0) > 0
      );
      if (!hasAnyValue) emptyColumns.add(columnId);
    });
    return emptyColumns;
  }, [filteredRows, grouping.length]);

  React.useEffect(() => {
    if (grouping.length === 0) return;
    setColumnVisibility((current) => {
      const next = { ...current };
      BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
        if (current[columnId] === false) return;
        next[columnId] = !emptyGroupedBagSizeColumnIds.has(columnId);
      });
      return next;
    });
  }, [emptyGroupedBagSizeColumnIds, grouping.length]);

  const totalFilteredEntries = filteredRows.length;
  const currentPageSize = table.getState().pagination.pageSize;
  const currentPageIndex = table.getState().pagination.pageIndex;
  const currentPageStartEntry =
    totalFilteredEntries === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const currentPageEndEntry = Math.min(
    (currentPageIndex + 1) * currentPageSize,
    totalFilteredEntries
  );
  const visibleColumnIds = React.useMemo(
    () => table.getVisibleLeafColumns().map((column) => column.id),
    [table]
  );

  const totalsByColumn = React.useMemo(() => {
    const totals: Record<string, number> & { totalBags: number } = {
      ...createEmptyBagSizeValues(),
      totalBags: 0,
    };
    for (const row of filteredRows) {
      BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
        totals[columnId] += Number(row.original[columnId] ?? 0);
      });
      totals.totalBags += Number(row.original.totalBags ?? 0);
    }
    return totals;
  }, [filteredRows]);

  const hasVisibleNumericTotals = React.useMemo(
    () => visibleColumnIds.some((columnId) => numericColumnIds.has(columnId)),
    [visibleColumnIds]
  );

  const buildPdfWorkerPayload = React.useCallback(
    (generatedAt: string) =>
      ({
        rows: getLeafRowsForPdf(table.getSortedRowModel().rows),
        visibleColumnIds,
        grouping,
        coldStorageName,
        generatedAt,
      }) satisfies IncomingPdfWorkerRequest,
    [coldStorageName, grouping, table, visibleColumnIds]
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
            <div className="flex w-full flex-wrap items-end gap-3 lg:flex-nowrap">
              <div className="flex items-end gap-2 self-end">
                <DatePicker
                  id="analytics-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
                <span className="text-muted-foreground mb-2 self-end text-sm">
                  →
                </span>
                <DatePicker
                  id="analytics-to-date"
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
                  disabled={!fromDate || !toDate}
                  onClick={() => {
                    const nextFromDate = toApiDate(fromDate);
                    const nextToDate = toApiDate(toDate);
                    if (!nextFromDate || !nextToDate) return;
                    setAppliedFromDate(nextFromDate);
                    setAppliedToDate(nextToDate);
                  }}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  className="text-muted-foreground h-8 rounded-lg px-4 text-sm"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                    setAppliedFromDate('');
                    setAppliedToDate('');
                  }}
                >
                  Reset
                </Button>
              </div>
              <div className="bg-border/40 hidden h-7 w-px lg:block" />
              <div className="ml-auto flex items-center gap-2 self-end">
                <div className="relative min-w-[160px] lg:w-[220px]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search manual gate pass…"
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
                <StorageExcelButton
                  table={table}
                  coldStorageName={coldStorageName}
                />
                <IncomingPdfButton buildPayload={buildPdfWorkerPayload} />
                <Button
                  variant="ghost"
                  className="text-muted-foreground h-8 rounded-lg px-2 leading-none"
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

          {isError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error instanceof Error
                ? error.message
                : 'Failed to load storage report'}
            </p>
          )}

          <StorageReportDataTable
            table={table}
            rows={rows}
            visibleColumnIds={visibleColumnIds}
            numericColumnIds={numericColumnIds}
            hasVisibleNumericTotals={hasVisibleNumericTotals}
            totalsByColumn={totalsByColumn}
            isLoading={isLoading}
          />
          <div className="border-border/50 bg-background/70 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="storage-report-page-size"
                className="font-custom text-muted-foreground text-sm"
              >
                Rows per page
              </label>
              <select
                id="storage-report-page-size"
                value={currentPageSize}
                onChange={(event) =>
                  table.setPageSize(Number(event.target.value))
                }
                className="font-custom border-input bg-background text-foreground h-8 rounded-md border px-2 text-sm"
              >
                {[50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-custom text-muted-foreground text-sm">
                Showing{' '}
                <span className="text-foreground font-semibold">
                  {currentPageStartEntry}-{currentPageEndEntry}
                </span>{' '}
                of{' '}
                <span className="text-foreground font-semibold">
                  {totalFilteredEntries}
                </span>{' '}
                entries
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <ViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={setIsViewFiltersOpen}
        table={table}
        defaultColumnOrder={defaultColumnOrder}
        defaultColumnVisibility={defaultStorageReportColumnVisibility}
        emptyBagSizeColumnIds={emptyBagSizeColumnIds}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default StorageReportTable;
