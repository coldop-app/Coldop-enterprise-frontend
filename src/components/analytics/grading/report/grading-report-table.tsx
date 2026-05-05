import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type GroupingState,
  type SortingState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import {
  useGetGradingGatePassReport,
  type GetGradingGatePassReportParams,
} from '@/services/store-admin/grading-gate-pass/analytics/useGetGradingGatePassReport';
import { usePreferencesStore, useStore } from '@/stores/store';
import {
  DEFAULT_COLUMN_MAX_SIZE,
  DEFAULT_COLUMN_MIN_SIZE,
  DEFAULT_COLUMN_SIZE,
  defaultGradingReportColumnVisibility,
  defaultGradingColumnOrder,
  expandGradingReportRows,
  formatIndianNumber,
  getGradingNumericValue,
  globalGradingFilterFn,
  gradingNumericColumnIds,
  gradingReportColumns,
  type GradingReportTableRow,
  type GlobalFilterValue,
} from './columns';
import { GradingExcelButton } from './grading-excel-button';
import { GradingReportDataTable } from './grading-report-data-table';
import { ViewFiltersSheet } from './view-filters-sheet/index';

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  if (year.length !== 4) return undefined;

  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

const GradingReportTable = () => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState(
    defaultGradingReportColumnVisibility
  );
  const [columnOrder, setColumnOrder] = React.useState<string[]>(() => [
    ...defaultGradingColumnOrder,
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');

  const bagWeightsRevision = usePreferencesStore((store) =>
    [
      store.preferences?.custom?.bagConfig?.juteBagWeight,
      store.preferences?.custom?.bagConfig?.lenoBagWeight,
    ].join(':')
  );

  const hasDateFilters = Boolean(fromDate && toDate);
  const canApply = hasDateFilters;

  const reportParams = React.useMemo<GetGradingGatePassReportParams>(() => {
    const from = appliedFromDate.trim();
    const to = appliedToDate.trim();
    if (!from || !to) return {};

    return { fromDate: from, toDate: to };
  }, [appliedFromDate, appliedToDate]);

  const { data, isLoading, isFetching, error, refetch, isError } =
    useGetGradingGatePassReport(reportParams);

  const tableData = React.useMemo(
    () => expandGradingReportRows(data ?? []),
    [data]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<GradingReportTableRow>({
    data: tableData,
    columns: gradingReportColumns,
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
    globalFilterFn: globalGradingFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => `${row.gradingGatePass._id}_${row.incomingSubIndex}`,
  });

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

  const rows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );
  const hasVisibleNumericTotals = React.useMemo(
    () =>
      visibleColumnIds.some((columnId) =>
        gradingNumericColumnIds.has(columnId)
      ),
    [visibleColumnIds]
  );
  const totalsByColumn = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of filteredRows) {
      for (const columnId of gradingNumericColumnIds) {
        const value = getGradingNumericValue(row.original, columnId);
        if (value == null) continue;
        totals.set(columnId, (totals.get(columnId) ?? 0) + value);
      }
    }
    return totals;
  }, [filteredRows]);

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
                  id="grading-report-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
                <span className="text-muted-foreground mb-2 self-end text-sm">
                  →
                </span>
                <DatePicker
                  id="grading-report-to-date"
                  label="To"
                  compact
                  value={toDate}
                  onChange={setToDate}
                />
              </div>

              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              <div className="flex items-center gap-2 self-end">
                <Button
                  type="button"
                  className="h-8 rounded-lg px-4 text-sm shadow-none"
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-muted-foreground h-8 rounded-lg px-4 text-sm"
                  onClick={handleResetFilters}
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
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    placeholder="Search manual gate pass…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
                  onClick={() => setIsViewFiltersOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  View Filters
                </Button>
                <GradingExcelButton
                  table={table}
                  coldStorageName={coldStorageName}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground h-8 rounded-lg px-2 leading-none"
                  disabled={isFetching}
                  aria-label="Refresh"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  <RefreshCw
                    className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
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
                  : 'Failed to load grading gate pass report'}
              </p>
            )}

            <GradingReportDataTable
              table={table}
              rows={rows}
              visibleColumnIds={visibleColumnIds}
              hasVisibleNumericTotals={hasVisibleNumericTotals}
              numericColumnIds={gradingNumericColumnIds}
              totalsByColumn={totalsByColumn}
              formatTotal={formatIndianNumber}
              isLoading={isLoading}
              key={bagWeightsRevision}
            />
          </div>
        </div>
      </main>

      <ViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={setIsViewFiltersOpen}
        table={table}
        defaultColumnOrder={defaultGradingColumnOrder}
        defaultColumnVisibility={defaultGradingReportColumnVisibility}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default GradingReportTable;
