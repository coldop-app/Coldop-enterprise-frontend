import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  type GroupingState,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from '@tanstack/react-table';
import { DatePicker } from '@/components/date-picker';
import { BarChart3, RefreshCw } from 'lucide-react';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import {
  incomingReportColumns,
  incomingReportDefaultColumnOrder,
} from './columns';
import { IncomingReportDataTable } from './data-table';
import {
  evaluateFilterGroup,
  INCOMING_GATE_PASSES,
  isAdvancedFilterGroup,
  type GlobalFilterValue,
  type IncomingRecord,
} from './incoming-digital-report-shared';

export default function IncomingReportMain() {
  const [data] = React.useState(() => INCOMING_GATE_PASSES);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>(
    incomingReportDefaultColumnOrder
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');
  const defaultColumn = React.useMemo(
    () => ({ size: 170, minSize: 100, maxSize: 360 }),
    []
  );
  const globalFilterFn = React.useCallback(
    (
      row: { original: IncomingRecord },
      _columnId: string,
      filterValue: unknown
    ) => {
      const incomingFilter = filterValue as GlobalFilterValue;
      if (isAdvancedFilterGroup(incomingFilter)) {
        return evaluateFilterGroup(row.original, incomingFilter);
      }
      const normalized = String(incomingFilter ?? '')
        .trim()
        .toLowerCase();
      if (!normalized) return true;
      return (
        String(row.original.truckNumber).toLowerCase().includes(normalized) ||
        String(row.original.variety).toLowerCase().includes(normalized) ||
        String(row.original.gatePassNo).toLowerCase().includes(normalized)
      );
    },
    []
  );

  const table = useReactTable<IncomingRecord>({
    data,
    columns: incomingReportColumns,
    defaultColumn,
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
    getRowId: (row) => String(row.gatePassNo),
  });

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Item
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-xl shadow-sm"
        >
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <BarChart3 className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                Incoming Gate Pass Report
              </ItemTitle>
            </div>

            <ItemActions>
              <Button variant="outline" size="sm" className="font-custom gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        <Item
          variant="outline"
          size="sm"
          className="border-border/70 rounded-2xl p-2 shadow-sm sm:p-3"
        >
          <div className="flex w-full flex-nowrap items-end gap-4 overflow-x-auto px-1 py-1">
            <div className="min-w-max">
              <DatePicker
                id="analytics-from-date"
                label="From"
                compact
                // value={fromDate}
                // onChange={setFromDate}
              />
            </div>

            <div className="min-w-max">
              <DatePicker
                id="analytics-to-date"
                label="To"
                compact
                // value={toDate}
                // onChange={setToDate}
              />
            </div>

            <Button
              className="font-custom rounded-lg px-5 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md"
              // disabled={!fromDate || !toDate}
              onClick={() => undefined}
            >
              Apply
            </Button>
            <Button
              variant="secondary"
              className="font-custom border-border/70 bg-background/80 hover:bg-secondary rounded-lg border px-5 text-[#333] transition-colors duration-200 ease-in-out"
              // onClick={handleResetFilters}
            >
              Reset
            </Button>
          </div>
        </Item>

        <IncomingReportDataTable
          table={table}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          defaultColumnOrder={incomingReportDefaultColumnOrder}
          columnResizeMode={columnResizeMode}
          columnResizeDirection={columnResizeDirection}
          onColumnResizeModeChange={setColumnResizeMode}
          onColumnResizeDirectionChange={setColumnResizeDirection}
          totalRowsCount={data.length}
        />
      </div>
    </main>
  );
}
