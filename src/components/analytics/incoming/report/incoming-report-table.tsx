import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type FilterFn,
  type GroupingState,
  type Header,
  type Row,
  type SortingState,
  type VisibilityState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { useGetIncomingGatePassReport } from '@/services/store-admin/incoming-gate-pass/analytics/useGetIncomingGatePassReport';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import { ViewFiltersSheet } from './view-filters-sheet';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import type { IncomingReportRow } from './columns';

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

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  if (year.length !== 4) return undefined;

  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

const columnHelper = createColumnHelper<IncomingReportRow>();
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');
const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;

const defaultColumnOrder: string[] = [
  'farmerName',
  'farmerAddress',
  'location',
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'variety',
  'truckNumber',
  'bagsReceived',
  'netWeightKg',
  'status',
  'remarks',
];

const multiValueFilterFn = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string[] | string
) => {
  const cellValue = String(row.getValue(columnId));
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return false;
  return filterValue.includes(cellValue);
};

type GlobalFilterValue = string | FilterGroupNode;
const globalGatePassFilterFn: FilterFn<IncomingReportRow> = (
  row,
  _columnId,
  filterValue: GlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(row.original, filterValue);
  }
  const normalized = String(filterValue).trim().toLowerCase();
  if (!normalized) return true;
  return String(row.original.gatePassNo).toLowerCase().includes(normalized);
};

const columns = [
  columnHelper.accessor('gatePassNo', {
    header: 'Gate Pass',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('manualGatePassNumber', {
    header: 'Manual GP',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('farmerName', {
    header: 'Farmer',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 550,
    maxSize: 550,
  }),
  columnHelper.accessor('farmerAddress', {
    header: 'Address',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('location', {
    header: 'Location',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('truckNumber', {
    header: 'Truck No.',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('bagsReceived', {
    header: () => <div className="w-full text-right">Bags</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">{info.getValue()}</div>
    ),
  }),
  columnHelper.accessor('netWeightKg', {
    header: () => <div className="w-full text-right">Net (kg)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 110,
    maxSize: 200,
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    sortingFn: 'text',
    filterFn: (row, columnId, filterValue: string[]) => {
      const statusValue = row.getValue(columnId) as string;
      if (!Array.isArray(filterValue)) return true;
      if (filterValue.length === 0) return false;
      return filterValue.includes(statusValue);
    },
    cell: (info) => {
      const value = info.getValue();
      const isGraded = value === 'GRADED';
      return (
        <Badge
          variant={isGraded ? 'default' : 'secondary'}
          className="font-custom rounded-sm text-xs uppercase"
        >
          {String(value).replace('_', ' ')}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('remarks', {
    header: 'Remarks',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 550,
    maxSize: 550,
  }),
];

const IncomingReportTable = () => {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
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
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

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
      (data ?? []).map((item) => ({
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
        grossWeightKg: item.weightSlip?.grossWeightKg ?? 0,
        tareWeightKg: item.weightSlip?.tareWeightKg ?? 0,
        netWeightKg:
          (item.weightSlip?.grossWeightKg ?? 0) -
          (item.weightSlip?.tareWeightKg ?? 0),
        remarks: item.remarks ?? '-',
        date: toDisplayDate(item.date),
        createdAt: toDisplayDate(item.createdAt),
        updatedAt: toDisplayDate(item.updatedAt),
        status: item.status,
      })),
    [data]
  );

  const table = useReactTable<IncomingReportRow>({
    data: incomingReportData,
    columns,
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
    globalFilterFn: globalGatePassFilterFn,
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
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 42,
    getScrollElement: () => tableContainerRef.current,
    measureElement: isFirefoxBrowser
      ? undefined
      : (element) => element?.getBoundingClientRect().height,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  const handleApply = () => {
    if (hasDateFilters) {
      const nextFromDate = toApiDate(fromDate);
      const nextToDate = toApiDate(toDate);

      if (!nextFromDate || !nextToDate) return;

      setAppliedFromDate(nextFromDate);
      setAppliedToDate(nextToDate);
    }
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  return (
    <>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom gap-2"
                  disabled={isFetching}
                  onClick={() => refetch()}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
                  />
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
            <div className="flex w-full flex-wrap items-end gap-4 px-1 py-1">
              <div className="min-w-max">
                <DatePicker
                  id="analytics-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
              </div>

              <div className="min-w-max">
                <DatePicker
                  id="analytics-to-date"
                  label="To"
                  compact
                  value={toDate}
                  onChange={setToDate}
                />
              </div>

              <Button
                className="font-custom rounded-lg px-5 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md"
                disabled={!canApply}
                onClick={handleApply}
              >
                Apply
              </Button>
              <Button
                variant="secondary"
                className="font-custom border-border/70 bg-background/80 hover:bg-secondary rounded-lg border px-5 text-[#333] transition-colors duration-200 ease-in-out"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative w-60">
                  <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-2 h-4 w-4" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    placeholder="Search gate pass..."
                    className="font-custom h-9 pl-8"
                  />
                </div>
                <Button
                  variant="outline"
                  className="font-custom rounded-lg px-5"
                  onClick={() => setIsViewFiltersOpen(true)}
                >
                  View Filters
                </Button>
              </div>
            </div>
          </Item>

          <Item
            variant="outline"
            size="sm"
            className="rounded-2xl p-3 shadow-sm"
          >
            {isError && (
              <p className="mb-3 text-sm text-red-600">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load incoming report'}
              </p>
            )}
            {isLoading && (
              <p className="mb-3 text-sm text-gray-600">Loading report...</p>
            )}
            <div
              ref={tableContainerRef}
              className="overflow-x-auto overflow-y-auto rounded-lg border"
              style={{
                direction: table.options.columnResizeDirection,
                height: '560px',
                position: 'relative',
              }}
            >
              {rows.length === 0 ? (
                <div className="text-muted-foreground flex h-24 items-center justify-center">
                  No records found.
                </div>
              ) : (
                <table
                  style={{ display: 'grid', width: table.getTotalSize() }}
                  className="font-custom text-sm"
                >
                  <thead
                    className="bg-muted/40 border-b"
                    style={{
                      display: 'grid',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr
                        key={headerGroup.id}
                        style={{ display: 'flex', width: '100%' }}
                      >
                        {visibleColumnIds.map((columnId) => {
                          const header = headerGroup.headers.find(
                            (groupHeader) => groupHeader.id === columnId
                          ) as Header<IncomingReportRow, unknown> | undefined;
                          if (!header) return null;
                          const isRightAligned =
                            header.id === 'bagsReceived' ||
                            header.id === 'netWeightKg';
                          return (
                            <th
                              key={header.id}
                              style={{
                                display: 'flex',
                                width: header.getSize(),
                                position: 'relative',
                              }}
                              className="font-custom border-r px-3 py-2 text-xs font-semibold tracking-wide uppercase select-none"
                            >
                              {header.isPlaceholder ? null : (
                                <div
                                  className={`group flex w-full min-w-0 cursor-pointer items-center ${
                                    isRightAligned
                                      ? 'justify-end'
                                      : 'justify-between'
                                  }`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  <span className="truncate">
                                    {flexRender(
                                      header.column.columnDef.header,
                                      header.getContext()
                                    )}
                                  </span>
                                  <span
                                    className={isRightAligned ? 'ml-2' : ''}
                                  >
                                    {{
                                      asc: (
                                        <ArrowUp className="ml-1 h-3.5 w-3.5" />
                                      ),
                                      desc: (
                                        <ArrowDown className="ml-1 h-3.5 w-3.5" />
                                      ),
                                    }[
                                      header.column.getIsSorted() as string
                                    ] ?? (
                                      <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                    )}
                                  </span>
                                </div>
                              )}
                              <div
                                onDoubleClick={() => header.column.resetSize()}
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                onClick={(event) => event.stopPropagation()}
                                className="hover:bg-primary/30 absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent"
                                style={{
                                  transform:
                                    table.options.columnResizeMode ===
                                      'onEnd' && header.column.getIsResizing()
                                      ? `translateX(${
                                          (table.options
                                            .columnResizeDirection === 'rtl'
                                            ? -1
                                            : 1) *
                                          (table.getState().columnSizingInfo
                                            .deltaOffset ?? 0)
                                        }px)`
                                      : '',
                                }}
                              />
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody
                    style={{
                      display: 'grid',
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: 'relative',
                    }}
                  >
                    {virtualRows.map((virtualRow) => {
                      const row = rows[
                        virtualRow.index
                      ] as Row<IncomingReportRow>;
                      const visibleCells = row.getVisibleCells();
                      return (
                        <tr
                          key={row.id}
                          data-index={virtualRow.index}
                          ref={(node) => rowVirtualizer.measureElement(node)}
                          className="hover:bg-muted/30 border-b transition-colors"
                          style={{
                            display: 'flex',
                            position: 'absolute',
                            transform: `translateY(${virtualRow.start}px)`,
                            width: '100%',
                          }}
                        >
                          {visibleColumnIds.map((columnId) => {
                            const cell = visibleCells.find(
                              (visibleCell) =>
                                visibleCell.column.id === columnId
                            );
                            if (!cell) return null;
                            const isGroupedCell = cell.getIsGrouped();
                            const isAggregatedCell = cell.getIsAggregated();
                            const isPlaceholderCell = cell.getIsPlaceholder();
                            return (
                              <td
                                key={cell.id}
                                style={{
                                  display: 'flex',
                                  width: cell.column.getSize(),
                                }}
                                className="font-custom border-r px-3 py-2 align-middle whitespace-nowrap"
                              >
                                {isGroupedCell ? (
                                  <button
                                    type="button"
                                    onClick={row.getToggleExpandedHandler()}
                                    className={`inline-flex items-center gap-1 text-left ${
                                      row.getCanExpand()
                                        ? 'cursor-pointer'
                                        : 'cursor-default'
                                    }`}
                                  >
                                    <span className="text-xs">
                                      {row.getIsExpanded() ? '▼' : '▶'}
                                    </span>
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                    <span className="text-muted-foreground text-xs">
                                      ({row.subRows.length})
                                    </span>
                                  </button>
                                ) : isAggregatedCell ? (
                                  flexRender(
                                    cell.column.columnDef.aggregatedCell ??
                                      cell.column.columnDef.cell,
                                    cell.getContext()
                                  )
                                ) : isPlaceholderCell ? null : (
                                  flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Item>
        </div>
      </main>
      <ViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={setIsViewFiltersOpen}
        table={table}
        defaultColumnOrder={defaultColumnOrder}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default IncomingReportTable;
