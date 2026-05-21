import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type GroupingState,
  type PaginationState,
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
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Item } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useGetNikasiGatePassReport,
  type NikasiGatePassReportRow as NikasiApiRow,
} from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';
import { usePreferencesStore, useStore } from '@/stores/store';
import {
  buildBagSizeColumnConfigFromPreferences,
  filterBagSizeColumnConfigWithData,
  mergeBagSizeColumnConfigWithApiSizes,
  sortBagSizeColumnConfigWithUngradedFirst,
} from '@/lib/bag-size-columns';
import { NikasiExcelButton } from './nikasi-excel-button';
import { ViewFiltersSheet } from './view-filters-sheet';
import {
  defaultNikasiReportColumnVisibility,
  formatIndianNumber,
  getDecimalPlaces,
  getNikasiBagValue,
  getNikasiDefaultColumnOrder,
  getNikasiNumericColumnIds,
  getNikasiReportColumns,
  globalNikasiReportSearchFilterFn,
  type GlobalFilterValue,
  type NikasiReportRow,
} from './columns';
import { NikasiReportDataTable } from './nikasi-report-data-table';
import { flattenNikasiGatePassToRows } from './nikasi-report-flatten';

const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;

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

const NikasiReportTable = () => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );

  const preferences = usePreferencesStore((state) => state.preferences);

  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultNikasiReportColumnVisibility);
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
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

  const hasInitializedColumnOrderRef = React.useRef(false);

  const hasDateFilters = Boolean(fromDate && toDate);
  const hasAppliedDateFilters = Boolean(appliedFromDate && appliedToDate);
  const canApply = Boolean(fromDate && toDate);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetNikasiGatePassReport(
      {
        fromDate: hasAppliedDateFilters ? appliedFromDate : undefined,
        toDate: hasAppliedDateFilters ? appliedToDate : undefined,
      },
      { enabled: true }
    );

  const preferenceBagSizeColumnConfig = React.useMemo(
    () => buildBagSizeColumnConfigFromPreferences(preferences?.bagSizes),
    [preferences?.bagSizes]
  );

  const bagSizeColumnConfig = React.useMemo(() => {
    const apiSizes: string[] = [];
    for (const item of data ?? []) {
      for (const line of item.bagSize ?? []) {
        if (line.size) apiSizes.push(String(line.size));
      }
    }
    return sortBagSizeColumnConfigWithUngradedFirst(
      mergeBagSizeColumnConfigWithApiSizes(
        preferenceBagSizeColumnConfig,
        apiSizes
      )
    );
  }, [preferenceBagSizeColumnConfig, data]);

  const rowCtx = React.useMemo(
    () => ({ toDisplayDate, toSortableDateValue }),
    []
  );

  const reportRows = React.useMemo<NikasiReportRow[]>(() => {
    const list = data ?? [];
    return list.flatMap((item: NikasiApiRow) =>
      flattenNikasiGatePassToRows(item, rowCtx)
    );
  }, [data, rowCtx]);

  const visibleBagSizeColumnConfig = React.useMemo(
    () =>
      filterBagSizeColumnConfigWithData(
        bagSizeColumnConfig,
        reportRows,
        getNikasiBagValue
      ),
    [bagSizeColumnConfig, reportRows]
  );

  const bagSizeColumnIds = React.useMemo(
    () => visibleBagSizeColumnConfig.map((item) => item.id),
    [visibleBagSizeColumnConfig]
  );
  const defaultColumnOrder = React.useMemo(
    () => getNikasiDefaultColumnOrder(bagSizeColumnIds),
    [bagSizeColumnIds]
  );
  const numericColumnIds = React.useMemo(
    () => getNikasiNumericColumnIds(bagSizeColumnIds),
    [bagSizeColumnIds]
  );
  const nikasiReportColumns = React.useMemo(
    () => getNikasiReportColumns(visibleBagSizeColumnConfig),
    [visibleBagSizeColumnConfig]
  );

  React.useEffect(() => {
    if (defaultColumnOrder.length === 0) return;
    setColumnOrder((current) => {
      if (
        !hasInitializedColumnOrderRef.current ||
        current.length === 0 ||
        current.length !== defaultColumnOrder.length
      ) {
        hasInitializedColumnOrderRef.current = true;
        return defaultColumnOrder;
      }
      return current;
    });
  }, [defaultColumnOrder]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<NikasiReportRow>({
    data: reportRows,
    columns: nikasiReportColumns,
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
    globalFilterFn: globalNikasiReportSearchFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Keep grouped labels in their configured columns (not reordered to front).
    groupedColumnMode: false,
    getRowId: (row) => row.id,
  });

  const isGroupingActive = grouping.length > 0;

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
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );

  const totalsByColumn = React.useMemo(() => {
    const bagColumnTotals: Record<string, number> = {};
    for (const id of bagSizeColumnIds) {
      bagColumnTotals[id] = 0;
    }

    for (const row of filteredRows) {
      for (const id of bagSizeColumnIds) {
        bagColumnTotals[id] += Number(row.original[id] ?? 0);
      }
    }

    let bagsReceived = 0;
    let netPrecision = 0;

    for (const row of filteredRows) {
      if (row.original.varietyRowIndex !== 0) continue;
      bagsReceived += Number(row.original.bagsReceived ?? 0);
      netPrecision = Math.max(
        netPrecision,
        Number(row.original.netWeightPrecision ?? 0)
      );
    }

    const factor = 10 ** netPrecision;
    let scaledNetSum = 0;
    for (const row of filteredRows) {
      if (row.original.varietyRowIndex !== 0) continue;
      const value = Number(row.original.netWeightKg ?? 0);
      scaledNetSum += Math.round(value * factor);
    }
    const netTotal = scaledNetSum / factor;

    const averageWeightPerBag =
      bagsReceived > 0 ? netTotal / bagsReceived : null;
    const averagePrecision = Math.max(
      getDecimalPlaces(averageWeightPerBag ?? 0),
      netPrecision
    );

    return {
      bagsReceived,
      netWeightKg: netTotal,
      netPrecision,
      averageWeightPerBag,
      averagePrecision,
      bagColumnTotals,
    };
  }, [bagSizeColumnIds, filteredRows]);

  const hasVisibleNumericTotals = React.useMemo(
    () => visibleColumnIds.some((columnId) => numericColumnIds.has(columnId)),
    [numericColumnIds, visibleColumnIds]
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
                  id="nikasi-analytics-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
                <span className="text-muted-foreground mb-2 self-end text-sm">
                  →
                </span>
                <DatePicker
                  id="nikasi-analytics-to-date"
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
                <div className="relative w-[140px] sm:w-[200px]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search gate pass, farmer…"
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
                <NikasiExcelButton
                  table={table}
                  coldStorageName={coldStorageName}
                  bagSizeColumnIds={bagSizeColumnIds}
                />
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
                : 'Failed to load nikasi report'}
            </p>
          )}

          <NikasiReportDataTable
            table={table}
            rows={rows}
            visibleColumnIds={visibleColumnIds}
            numericColumnIds={numericColumnIds}
            hasVisibleNumericTotals={hasVisibleNumericTotals}
            totalsByColumn={totalsByColumn}
            formatTotal={formatIndianNumber}
            isLoading={isLoading}
            isGroupingActive={isGroupingActive}
          />
          <div className="border-border/50 bg-background/70 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="nikasi-report-page-size"
                className="font-custom text-muted-foreground text-sm"
              >
                Rows per page
              </label>
              <select
                id="nikasi-report-page-size"
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
                rows
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
        defaultColumnVisibility={defaultNikasiReportColumnVisibility}
        bagSizeColumnConfig={visibleBagSizeColumnConfig}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default NikasiReportTable;
