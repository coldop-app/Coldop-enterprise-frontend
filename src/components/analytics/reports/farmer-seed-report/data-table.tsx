'use client';

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnResizeDirection,
  ColumnResizeMode,
  ExpandedState,
  FilterFn,
  GroupingState,
  Header,
  Row,
  VisibilityState,
  SortingState,
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
import type { FarmerSeedReportRow } from './columns';
import { farmerSeedBagSizeColumnId } from './columns';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  numericFilterFields,
  type FilterGroupNode,
} from './advanced-filters';
import { ViewFiltersSheet } from './view-filters-sheet';

const DEFAULT_COLUMN_SIZE = 180;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 420;
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');

const DEFAULT_COLUMN_ORDER = [
  'gatePassNo',
  'invoiceNumber',
  'date',
  'farmerName',
  'variety',
  'generation',
  'totalBags',
  'totalSeedAmount',
];

function toNum(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export interface FarmerSeedReportPdfSnapshot<TData> {
  visibleColumnIds: string[];
  grouping: string[];
  sorting: { id: string; desc: boolean }[];
  rows: Array<
    | {
        type: 'group';
        depth: number;
        groupingColumnId: string;
        groupingValue: unknown;
        displayValue: string;
        firstLeaf?: TData;
      }
    | { type: 'leaf'; row: TData }
  >;
}

export interface FarmerSeedReportDataTableRef<TData> {
  getPdfSnapshot: () => FarmerSeedReportPdfSnapshot<TData> | null;
}

type GlobalFilterValue = string | FilterGroupNode;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  initialColumnVisibility?: VisibilityState;
  totalColumnIds?: readonly string[];
  toolbarLeftContent?: React.ReactNode;
  toolbarRightContent?: React.ReactNode;
  onRowClick?: (row: TData) => void;
}

const TOTAL_COLUMN_IDS = ['totalBags', 'totalSeedAmount'] as const;
const RIGHT_ALIGNED_COLUMN_IDS = new Set([
  'totalBags',
  'rate',
  'totalSeedAmount',
]);

const BAG_SIZE_COLUMN_PREFIX = 'farmerSeedBagSize_';

function getDynamicBagQtyByColumnId(
  row: FarmerSeedReportRow,
  columnId: string
): number | undefined {
  if (!columnId.startsWith(BAG_SIZE_COLUMN_PREFIX)) return undefined;
  const entries = Object.entries(row.bagSizeQtyByName ?? {});
  for (const [sizeName, qty] of entries) {
    if (farmerSeedBagSizeColumnId(sizeName) === columnId) return qty ?? 0;
  }
  return undefined;
}

function getFilterFieldValue(row: FarmerSeedReportRow, field: string): unknown {
  const bagSizeValue = getDynamicBagQtyByColumnId(row, field);
  if (bagSizeValue != null) return bagSizeValue;
  return row[field as keyof FarmerSeedReportRow];
}

const multiValueFilterFn: FilterFn<FarmerSeedReportRow> = (
  row,
  columnId,
  filterValue
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

function getFirstLeaf<TData>(row: Row<TData>): TData | undefined {
  if (!row.getIsGrouped() || !row.subRows.length) return row.original;
  return getFirstLeaf(row.subRows[0] as Row<TData>);
}

export const DataTable = forwardRef(function DataTableInner<TData, TValue>(
  {
    columns,
    data,
    initialColumnVisibility = {},
    totalColumnIds = [...TOTAL_COLUMN_IDS],
    toolbarLeftContent,
    toolbarRightContent,
    onRowClick,
  }: DataTableProps<TData, TValue>,
  ref: React.Ref<FarmerSeedReportDataTableRef<TData>>
) {
  const typedData = data as FarmerSeedReportRow[];
  const typedColumns = columns as ColumnDef<FarmerSeedReportRow, unknown>[];
  const allNumericFilterFields = useMemo(() => {
    const dynamicBagColumnIds = typedColumns
      .map((column) => {
        if (typeof column.id === 'string') return column.id;
        if ('accessorKey' in column && typeof column.accessorKey === 'string') {
          return column.accessorKey;
        }
        return null;
      })
      .filter(
        (id): id is string =>
          id != null && id.startsWith(BAG_SIZE_COLUMN_PREFIX)
      );
    return [...numericFilterFields, ...dynamicBagColumnIds];
  }, [typedColumns]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility
  );
  const [columnOrder, setColumnOrder] =
    useState<string[]>(DEFAULT_COLUMN_ORDER);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterValue>('');
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection] = useState<ColumnResizeDirection>('ltr');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const globalFarmerSeedFilterFn: FilterFn<FarmerSeedReportRow> = (
    row,
    _columnId,
    filterValue
  ) => {
    const value = filterValue as GlobalFilterValue;
    if (isAdvancedFilterGroup(value)) {
      return evaluateFilterGroup(row.original, value, {
        getFieldValue: getFilterFieldValue,
        numericFields: allNumericFilterFields,
      });
    }
    const normalized = String(value ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) return true;
    return (
      String(row.original.invoiceNumber).toLowerCase().includes(normalized) ||
      String(row.original.gatePassNo).toLowerCase().includes(normalized)
    );
  };

  const table = useReactTable<FarmerSeedReportRow>({
    data: typedData,
    columns: typedColumns,
    defaultColumn: {
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_COLUMN_MIN_SIZE,
      maxSize: DEFAULT_COLUMN_MAX_SIZE,
      filterFn: multiValueFilterFn,
    },
    filterFns: {
      multiValue: multiValueFilterFn,
    },
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      grouping,
      globalFilter,
      expanded,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    columnResizeMode,
    columnResizeDirection,
    globalFilterFn: globalFarmerSeedFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    groupedColumnMode: 'reorder',
    getRowId: (row) => String(row.id),
  });

  const rows = table.getRowModel().rows;

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const id of totalColumnIds) acc[id] = 0;
    for (const row of typedData) {
      for (const id of totalColumnIds) {
        acc[id] += toNum(row[id as keyof FarmerSeedReportRow]);
      }
    }
    return acc;
  }, [typedData, totalColumnIds]);

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

  const renderHeaderCell = (header: Header<FarmerSeedReportRow, unknown>) => {
    const isBagSizeColumn = header.id.startsWith(BAG_SIZE_COLUMN_PREFIX);
    const isRightAligned =
      RIGHT_ALIGNED_COLUMN_IDS.has(header.id) || isBagSizeColumn;
    return (
      <th
        key={header.id}
        style={{
          display: 'flex',
          width: header.getSize(),
          position: 'relative',
        }}
        className="border-border bg-muted/60 text-foreground h-10 overflow-hidden border-r px-3 py-2 text-xs font-semibold tracking-wide uppercase last:border-r-0"
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
          style={{
            transform:
              table.options.columnResizeMode === 'onEnd' &&
              header.column.getIsResizing()
                ? `translateX(${
                    (table.options.columnResizeDirection === 'rtl' ? -1 : 1) *
                    (table.getState().columnSizingInfo.deltaOffset ?? 0)
                  }px)`
                : '',
          }}
        />
      </th>
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      getPdfSnapshot: (): FarmerSeedReportPdfSnapshot<TData> | null => {
        const state = table.getState();
        const groupingIds = state.grouping ?? [];
        const visibleIds = table.getVisibleLeafColumns().map((col) => col.id);
        const snapshotRows: FarmerSeedReportPdfSnapshot<TData>['rows'] = [];

        if (groupingIds.length === 0) {
          const sortedRows = table.getSortedRowModel().rows;
          for (const row of sortedRows) {
            snapshotRows.push({ type: 'leaf', row: row.original as TData });
          }
        } else {
          const groupedModel = table.getGroupedRowModel();
          const walkRows = (
            modelRows: Row<FarmerSeedReportRow>[],
            depth: number
          ): void => {
            for (const row of modelRows) {
              if (row.getIsGrouped()) {
                const groupingColumnId = groupingIds[depth];
                const groupingValue = groupingColumnId
                  ? row.getValue(groupingColumnId)
                  : undefined;
                snapshotRows.push({
                  type: 'group',
                  depth,
                  groupingColumnId: groupingColumnId ?? '',
                  groupingValue,
                  displayValue:
                    groupingValue != null && groupingValue !== ''
                      ? String(groupingValue)
                      : '—',
                  firstLeaf: getFirstLeaf(row) as TData | undefined,
                });
                if (row.subRows.length > 0) {
                  walkRows(
                    row.subRows as Row<FarmerSeedReportRow>[],
                    depth + 1
                  );
                }
                continue;
              }
              snapshotRows.push({ type: 'leaf', row: row.original as TData });
            }
          };
          walkRows(groupedModel.rows as Row<FarmerSeedReportRow>[], 0);
        }

        return {
          visibleColumnIds: visibleIds,
          grouping: groupingIds,
          sorting: (state.sorting ?? []).map((item) => ({
            id: item.id,
            desc: item.desc,
          })),
          rows: snapshotRows,
        };
      },
    }),
    [table]
  );

  return (
    <div className="space-y-4">
      <div className="border-border bg-card rounded-xl border p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex w-full flex-wrap items-end gap-3 lg:w-auto">
            {toolbarLeftContent}
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
              <Input
                value={typeof globalFilter === 'string' ? globalFilter : ''}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Search gate pass/invoice..."
                className="font-custom h-10 pl-9"
              />
            </div>
            <ViewFiltersSheet
              table={table}
              defaultColumnOrder={DEFAULT_COLUMN_ORDER}
            />
            {toolbarRightContent}
          </div>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="border-border bg-card overflow-x-auto overflow-y-auto rounded-xl border shadow-sm"
        style={{
          direction: table.options.columnResizeDirection,
          height: '560px',
          position: 'relative',
        }}
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
                  {headerGroup.headers.map((header) =>
                    renderHeaderCell(
                      header as Header<FarmerSeedReportRow, unknown>
                    )
                  )}
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
                const row = rows[virtualRow.index] as Row<FarmerSeedReportRow>;
                const visibleCells = row.getVisibleCells();
                return (
                  <tr
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className={`border-border bg-background even:bg-muted/30 dark:even:bg-muted/20 border-b transition-colors ${
                      row.getIsGrouped()
                        ? 'hover:bg-primary/5'
                        : onRowClick
                          ? 'hover:bg-primary/5 cursor-pointer'
                          : 'hover:bg-primary/5'
                    }`}
                    onClick={() => {
                      if (!row.getIsGrouped() && onRowClick) {
                        onRowClick(row.original as TData);
                      }
                    }}
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                    }}
                  >
                    {visibleCells.map((cell) => {
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
                          className={`border-border text-foreground min-w-0 overflow-hidden border-r px-3 py-2 wrap-break-word whitespace-normal last:border-r-0 ${
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
          </table>
        )}
      </div>

      <div className="text-muted-foreground font-custom flex items-center justify-between px-1 text-sm">
        <span>
          Showing {rows.length} of {typedData.length} entries
        </span>
        <span>Filters: Column-based</span>
      </div>

      {typedData.length > 0 && totalColumnIds.length > 0 ? (
        <div className="text-muted-foreground font-custom flex flex-wrap gap-3 text-xs">
          {(Object.entries(totals) as Array<[string, number]>).map(
            ([columnId, total]) => (
              <span key={columnId}>
                {columnId}: <strong>{total.toLocaleString('en-IN')}</strong>
              </span>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}) as <TData, TValue>(
  props: DataTableProps<TData, TValue> & {
    ref?: React.Ref<FarmerSeedReportDataTableRef<TData>>;
  }
) => React.ReactElement;
