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
import { Item } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetIncomingGatePassReport } from '@/services/store-admin/incoming-gate-pass/analytics/useGetIncomingGatePassReport';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import { useStore } from '@/stores/store';
import { IncomingExcelButton } from './incoming-excel-button';
import { ViewFiltersSheet } from './view-filters-sheet';
import PdfWorker from './pdf.worker?worker';
import type {
  IncomingPdfWorkerRequest,
  IncomingPdfWorkerResponse,
} from './pdf.worker';
import {
  defaultColumnOrder,
  defaultIncomingReportColumnVisibility,
  formatIndianNumber,
  getDecimalPlaces,
  globalManualGatePassFilterFn,
  incomingReportColumns,
  numericColumnIds,
  type GlobalFilterValue,
  type IncomingReportRow,
} from './columns';
import { IncomingReportDataTable } from './incoming-report-data-table';

const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;

type IncomingPdfButtonProps = {
  buildPayload: (generatedAt: string) => IncomingPdfWorkerRequest;
};

type IncomingReportTableProps = {
  enforcedStatus?: string;
};

function getFarmerName(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    const farmerName = gatePass.farmerStorageLinkId.farmerId.name;
    const accountNumber = gatePass.farmerStorageLinkId.accountNumber;

    if (typeof accountNumber === 'number') {
      return `${farmerName} (#${accountNumber})`;
    }

    return farmerName;
  }

  return '-';
}

function getLeafRowsForPdf(
  rows: Row<IncomingReportRow>[]
): IncomingReportRow[] {
  return rows.flatMap((row) => {
    if (row.getIsGrouped()) {
      return row.getLeafRows().map((leafRow) => leafRow.original);
    }
    return row.original;
  });
}

function getFarmerId(gatePass: IncomingGatePassWithLink): string {
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

function getFarmerMobile(gatePass: IncomingGatePassWithLink): string {
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

function getFarmerAddress(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId.address ?? '-';
  }

  return '-';
}

function getCreatedByName(gatePass: IncomingGatePassWithLink): string {
  if (gatePass.createdBy && typeof gatePass.createdBy !== 'string') {
    return gatePass.createdBy.name;
  }

  return '-';
}

function getCreatedByMobile(gatePass: IncomingGatePassWithLink): string {
  if (gatePass.createdBy && typeof gatePass.createdBy !== 'string') {
    return gatePass.createdBy.mobileNumber ?? '-';
  }

  return '-';
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

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  if (year.length !== 4) return undefined;

  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

function subtractWithPrecision(
  grossWeightKg: number,
  tareWeightKg: number
): { value: number; precision: number } {
  const precision = Math.max(
    getDecimalPlaces(grossWeightKg),
    getDecimalPlaces(tareWeightKg)
  );
  const factor = 10 ** precision;
  const value =
    (Math.round(grossWeightKg * factor) - Math.round(tareWeightKg * factor)) /
    factor;

  return { value, precision };
}

function normalizeStatusValue(value: string): string {
  return value.trim().replace(/_/g, ' ').toUpperCase();
}

const IncomingPdfButton = ({ buildPayload }: IncomingPdfButtonProps) => {
  const objectUrlRef = React.useRef<string | null>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

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
      `<!doctype html><html><head><meta charset="utf-8" /><title>Generating PDF...</title></head><body style="font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#f8fafc">Generating PDF...</body></html>`
    );
    previewTab.document.close();

    setIsGeneratingPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedAt = new Date().toLocaleString('en-IN');
      const payload = buildPayload(generatedAt);
      const worker = new PdfWorker();
      workerRef.current = worker;
      const blob = await new Promise<Blob>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<IncomingPdfWorkerResponse>) => {
          const data = event.data;
          if (data.status === 'success') {
            resolve(data.blob);
            return;
          }
          reject(new Error(data.message));
        };
        worker.onmessageerror = () => {
          reject(new Error('PDF worker message channel failed.'));
        };
        worker.onerror = (event) => {
          reject(
            new Error(
              `PDF worker execution failed: ${event.message || 'Unknown worker error'}`
            )
          );
        };
        worker.postMessage(payload);
      });
      const nextUrl = URL.createObjectURL(blob);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = nextUrl;

      if (!previewTab.closed) {
        previewTab.location.replace(nextUrl);
      } else {
        window.open(nextUrl, '_blank');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
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

const IncomingReportTable = ({ enforcedStatus }: IncomingReportTableProps) => {
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
    React.useState<VisibilityState>(defaultIncomingReportColumnVisibility);
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

  const hasDateFilters = Boolean(fromDate && toDate);
  const hasAppliedDateFilters = Boolean(appliedFromDate && appliedToDate);
  const canApply = Boolean(fromDate && toDate);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetIncomingGatePassReport(
      {
        fromDate: hasAppliedDateFilters ? appliedFromDate : undefined,
        toDate: hasAppliedDateFilters ? appliedToDate : undefined,
      },
      {
        enabled: true,
      }
    );

  const incomingReportData = React.useMemo<IncomingReportRow[]>(
    () =>
      (data ?? []).map((item) => {
        const grossWeightKg = item.weightSlip?.grossWeightKg ?? 0;
        const tareWeightKg = item.weightSlip?.tareWeightKg ?? 0;
        const { value: netWeightKg, precision: netWeightPrecision } =
          subtractWithPrecision(grossWeightKg, tareWeightKg);

        return {
          id: item._id,
          farmerId: getFarmerId(item),
          gatePassNo: item.gatePassNo,
          manualGatePassNumber: item.manualGatePassNumber,
          farmerName: getFarmerName(item),
          farmerMobileNumber: getFarmerMobile(item),
          farmerAddress: getFarmerAddress(item),
          createdByName: getCreatedByName(item),
          createdByMobileNumber: getCreatedByMobile(item),
          variety: item.variety,
          location: item.location,
          truckNumber: item.truckNumber,
          bagsReceived: item.bagsReceived,
          slipNumber: item.weightSlip?.slipNumber ?? '-',
          grossWeightKg,
          tareWeightKg,
          netWeightKg,
          netWeightPrecision,
          remarks: item.remarks ?? '-',
          date: toDisplayDate(item.date),
          dateSortValue: toSortableDateValue(item.date),
          createdAt: toDisplayDate(item.createdAt),
          updatedAt: toDisplayDate(item.updatedAt),
          status: item.status,
        };
      }),
    [data]
  );

  const filteredIncomingReportData = React.useMemo(() => {
    if (!enforcedStatus) return incomingReportData;
    const normalizedEnforcedStatus = normalizeStatusValue(enforcedStatus);
    return incomingReportData.filter(
      (row) =>
        normalizeStatusValue(String(row.status)) === normalizedEnforcedStatus
    );
  }, [enforcedStatus, incomingReportData]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<IncomingReportRow>({
    data: filteredIncomingReportData,
    columns: incomingReportColumns,
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
  const totalFilteredEntries = filteredRows.length;
  const currentPageSize = table.getState().pagination.pageSize;
  const currentPageIndex = table.getState().pagination.pageIndex;
  const currentPageStartEntry =
    totalFilteredEntries === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const currentPageEndEntry = Math.min(
    (currentPageIndex + 1) * currentPageSize,
    totalFilteredEntries
  );
  const sortedRows = table.getSortedRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );

  const totalsByColumn = React.useMemo(() => {
    const totals = {
      bagsReceived: 0,
      grossWeightKg: 0,
      tareWeightKg: 0,
      netWeightKg: 0,
      grossPrecision: 0,
      tarePrecision: 0,
      netPrecision: 0,
    };

    for (const row of filteredRows) {
      const original = row.original;
      totals.bagsReceived += Number(original.bagsReceived ?? 0);
      totals.grossWeightKg += Number(original.grossWeightKg ?? 0);
      totals.tareWeightKg += Number(original.tareWeightKg ?? 0);
      totals.netWeightKg += Number(original.netWeightKg ?? 0);
      totals.grossPrecision = Math.max(
        totals.grossPrecision,
        getDecimalPlaces(Number(original.grossWeightKg ?? 0))
      );
      totals.tarePrecision = Math.max(
        totals.tarePrecision,
        getDecimalPlaces(Number(original.tareWeightKg ?? 0))
      );
      totals.netPrecision = Math.max(
        totals.netPrecision,
        Number(original.netWeightPrecision ?? 0)
      );
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
        rows: getLeafRowsForPdf(sortedRows),
        visibleColumnIds,
        grouping,
        coldStorageName,
        generatedAt,
      }) satisfies IncomingPdfWorkerRequest,
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
                  disabled={!canApply}
                  onClick={() => {
                    if (!hasDateFilters) return;
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

              <div className="ml-auto flex flex-wrap items-center justify-end gap-2 self-end">
                <div className="relative w-[140px] sm:w-[170px]">
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
                <IncomingExcelButton
                  table={table}
                  coldStorageName={coldStorageName}
                />
                <IncomingPdfButton buildPayload={buildPdfWorkerPayload} />
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

          {isError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error instanceof Error
                ? error.message
                : 'Failed to load incoming report'}
            </p>
          )}

          <IncomingReportDataTable
            table={table}
            rows={rows}
            visibleColumnIds={visibleColumnIds}
            numericColumnIds={numericColumnIds}
            hasVisibleNumericTotals={hasVisibleNumericTotals}
            totalsByColumn={totalsByColumn}
            formatTotal={formatIndianNumber}
            isLoading={isLoading}
          />
          <div className="border-border/50 bg-background/70 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="incoming-report-page-size"
                className="font-custom text-muted-foreground text-sm"
              >
                Rows per page
              </label>
              <select
                id="incoming-report-page-size"
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
        defaultColumnVisibility={defaultIncomingReportColumnVisibility}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default IncomingReportTable;
