'use client';

import { useMemo, useRef, useState } from 'react';
import type {
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  GroupingState,
  Header,
  SortingState,
  VisibilityState,
  FilterFn,
} from '@tanstack/react-table';
import {
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
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  RIGHT_ALIGNED_COLUMN_IDS,
  TOTAL_COLUMN_IDS,
  TWO_DECIMAL_TOTAL_COLUMN_IDS,
  type ContractFarmingTableRow,
} from './columns';
import { ViewFiltersSheet } from './view-filters-sheet';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from './advanced-filters';

const DEFAULT_COLUMN_SIZE = 180;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 380;
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');

function toNum(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type GlobalFilterValue = string | FilterGroupNode;

const globalFilterFn: FilterFn<ContractFarmingTableRow> = (
  row,
  _columnId,
  filterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(row.original, filterValue);
  }
  const query = String(filterValue ?? '')
    .trim()
    .toLowerCase();
  if (!query) return true;
  const values = [
    row.original.variety,
    row.original.name,
    row.original.accountNumber,
    row.original.address,
    row.original.generation,
    row.original.sizeName,
  ];
  return values.some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(query)
  );
};

const multiValueFilterFn: FilterFn<ContractFarmingTableRow> = (
  row,
  columnId,
  filterValue
) => {
  const cellValue = String(row.getValue(columnId));
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return false;
  return filterValue.includes(cellValue);
};

interface ContractFarmingDataTableProps {
  columns: ColumnDef<ContractFarmingTableRow>[];
  data: ContractFarmingTableRow[];
  initialColumnVisibility: VisibilityState;
  toolbarLeftContent?: React.ReactNode;
  toolbarRightContent?: React.ReactNode;
}

export function ContractFarmingDataTable({
  columns,
  data,
  initialColumnVisibility,
  toolbarLeftContent,
  toolbarRightContent,
}: ContractFarmingDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility
  );
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterValue>('');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    defaultColumn: {
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_COLUMN_MIN_SIZE,
      maxSize: DEFAULT_COLUMN_MAX_SIZE,
      filterFn: multiValueFilterFn,
    },
    filterFns: { multiValue: multiValueFilterFn },
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      grouping,
      expanded,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    groupedColumnMode: 'reorder',
  });

  const rows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const id of TOTAL_COLUMN_IDS) acc[id] = 0;
    for (const filteredRow of filteredRows) {
      for (const id of TOTAL_COLUMN_IDS) {
        const nextTotal =
          acc[id] +
          toNum((filteredRow.original as Record<string, unknown>)[id]);
        acc[id] = TWO_DECIMAL_TOTAL_COLUMN_IDS.has(id)
          ? roundToTwo(nextTotal)
          : nextTotal;
      }
    }
    return acc;
  }, [filteredRows]);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 42,
    getScrollElement: () => tableContainerRef.current,
    measureElement: isFirefoxBrowser
      ? undefined
      : (element) => element?.getBoundingClientRect().height,
    overscan: 8,
  });

  const renderHeaderCell = (
    header: Header<ContractFarmingTableRow, unknown>
  ) => {
    const isRightAligned = RIGHT_ALIGNED_COLUMN_IDS.has(header.id);
    return (
      <th
        key={header.id}
        style={{
          display: 'flex',
          width: header.getSize(),
          position: 'relative',
        }}
        className="border-border bg-muted/60 text-foreground h-10 overflow-hidden border-r px-3 py-2 text-xs font-semibold uppercase last:border-r-0"
      >
        {header.isPlaceholder ? null : (
          <div
            className={`group flex w-full min-w-0 cursor-pointer items-center ${
              isRightAligned ? 'justify-end' : 'justify-between'
            }`}
            onClick={header.column.getToggleSortingHandler()}
          >
            <span className="font-custom truncate">
              {flexRender(header.column.columnDef.header, header.getContext())}
            </span>
            <span className={isRightAligned ? 'ml-2' : ''}>
              {{
                asc: <ArrowUp className="ml-1 h-3.5 w-3.5" />,
                desc: <ArrowDown className="ml-1 h-3.5 w-3.5" />,
              }[header.column.getIsSorted() as string] ?? (
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
          className={`absolute top-0 right-0 bottom-0 w-1 cursor-col-resize ${
            header.column.getIsResizing()
              ? 'bg-primary/50'
              : 'hover:bg-primary/30 bg-transparent'
          }`}
        />
      </th>
    );
  };

  return (
    <div className="space-y-4">
      <div className="border-border bg-card rounded-xl border p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full flex-wrap items-end gap-3 lg:w-auto">
            {toolbarLeftContent}
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                value={typeof globalFilter === 'string' ? globalFilter : ''}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search contract farming rows..."
                className="font-custom h-10 pl-9"
              />
            </div>
            <ViewFiltersSheet table={table} />
            {toolbarRightContent}
          </div>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="border-border bg-card overflow-x-auto overflow-y-auto rounded-xl border shadow-sm"
        style={{ height: '560px', position: 'relative' }}
      >
        {rows.length === 0 ? (
          <div className="text-muted-foreground font-custom flex h-24 items-center justify-center">
            No records found.
          </div>
        ) : (
          <table
            style={{ display: 'grid', width: table.getTotalSize() }}
            className="font-custom text-sm"
          >
            <thead
              className="border-border border-b-2"
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
                  {headerGroup.headers.map(renderHeaderCell)}
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
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className={`border-border bg-background even:bg-muted/30 dark:even:bg-muted/20 border-b transition-colors ${
                      row.getIsGrouped()
                        ? 'hover:bg-primary/5'
                        : 'hover:bg-primary/5'
                    }`}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
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
                          className={`border-border text-foreground min-w-0 overflow-hidden border-r px-3 py-2 whitespace-nowrap last:border-r-0 ${
                            RIGHT_ALIGNED_COLUMN_IDS.has(cell.column.id)
                              ? 'justify-end'
                              : ''
                          } ${
                            isGroupedCell
                              ? 'bg-primary/10'
                              : isAggregatedCell
                                ? 'bg-secondary/50'
                                : isPlaceholderCell
                                  ? 'bg-muted/40'
                                  : ''
                          }`}
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
            <tfoot
              className="border-border border-t-2"
              style={{
                display: 'grid',
                position: 'sticky',
                bottom: 0,
                zIndex: 9,
              }}
            >
              <tr style={{ display: 'flex', width: '100%' }}>
                {table.getVisibleLeafColumns().map((column, index) => {
                  const totalValue = totals[column.id] ?? 0;
                  return (
                    <td
                      key={`total-${column.id}`}
                      style={{ display: 'flex', width: column.getSize() }}
                      className={`border-border bg-muted/70 text-foreground min-w-0 overflow-hidden border-r px-3 py-2 font-semibold last:border-r-0 ${
                        RIGHT_ALIGNED_COLUMN_IDS.has(column.id)
                          ? 'justify-end'
                          : ''
                      }`}
                    >
                      {index === 0 ? (
                        <span className="font-custom">Total</span>
                      ) : TOTAL_COLUMN_IDS.includes(column.id) ? (
                        <span className="font-custom">
                          {totalValue.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="text-muted-foreground font-custom flex items-center justify-between px-1 text-sm">
        <span>
          Showing {rows.length} of {data.length} entries
        </span>
        <span>Filters: Search + column visibility</span>
      </div>
    </div>
  );
}
