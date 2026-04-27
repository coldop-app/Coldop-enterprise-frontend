'use client';

import type { Ref } from 'react';
import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Row } from '@tanstack/table-core';
import type { ColumnDef } from '@tanstack/table-core';
import type { VisibilityState } from '@tanstack/table-core';
import type {
  ColumnFiltersState,
  ColumnResizeDirection,
  ColumnResizeMode,
  ExpandedState,
  FilterFn,
  GroupingState,
  Header,
  SortingState,
} from '@tanstack/table-core';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  type Table as TanstackTable,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GradingReportRow } from './columns';
import type { FilterGroupNode } from './advanced-filters';
import { ViewFiltersSheet } from './view-filters-sheet';
import {
  gradingGlobalFilterFn,
  gradingNumericFilterFields,
} from './grading-filter-utils';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/** Hoist once: passing `getCoreRowModel()` inline creates a new factory each render and defeats memoization. */
const coreRowModel = getCoreRowModel();
const groupedRowModel = getGroupedRowModel();
const sortedRowModel = getSortedRowModel();
const expandedRowModel = getExpandedRowModel();

function defaultGetRowId<TData>(row: TData, index: number): string {
  const r = row as { id?: string | number };
  return r.id != null ? String(r.id) : String(index);
}

const TOTAL_COLUMN_IDS = [
  'bagsReceived',
  'totalGradedBags',
  'totalGradedWeightKg',
  'wastageKg',
  'grossWeightKg',
  'netWeightKg',
  'netProductKg',
] as const;

const DEFAULT_TOTAL_COLUMN_IDS: readonly string[] = [...TOTAL_COLUMN_IDS];
const DEFAULT_COLUMN_SIZE = 180;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 420;
const DEFAULT_COLUMN_ORDER_BASE = [
  'farmerName',
  'date',
  'incomingGatePassNo',
  'incomingManualNo',
  'incomingGatePassDate',
  'variety',
  'bagsReceived',
  'netProductKg',
  'gatePassNo',
  'manualGatePassNumber',
  'totalGradedBags',
  // dynamic gradedBagSize_* columns are inserted here
  'totalGradedWeightKg',
  'wastageKg',
  'grader',
];
const BAG_SIZE_COLUMN_PREFIX = 'gradedBagSize_';
const RIGHT_ALIGNED_COLUMN_IDS = new Set([
  'accountNumber',
  'gatePassNo',
  'manualGatePassNumber',
  'incomingGatePassNo',
  'incomingManualNo',
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'netProductKg',
  'totalGradedBags',
  'totalGradedWeightKg',
  'wastageKg',
]);
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');

function resolveColumnId<TValue>(
  column: ColumnDef<Record<string, unknown>, TValue>
): string | null {
  if (typeof column.id === 'string') return column.id;
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey;
  }
  return null;
}

function buildDefaultColumnOrder<TValue>(
  columns: ColumnDef<Record<string, unknown>, TValue>[]
): string[] {
  const allIds = columns
    .map(resolveColumnId)
    .filter((id): id is string => !!id);
  const allIdSet = new Set(allIds);
  const bagSizeIds = allIds.filter((id) =>
    id.startsWith(BAG_SIZE_COLUMN_PREFIX)
  );
  const beforeBagAndTail = DEFAULT_COLUMN_ORDER_BASE.filter(
    (id) => id !== 'totalGradedWeightKg' && allIdSet.has(id)
  );
  const tail = DEFAULT_COLUMN_ORDER_BASE.filter(
    (id) => id === 'totalGradedWeightKg' && allIdSet.has(id)
  );
  const preferred = [...beforeBagAndTail, ...bagSizeIds, ...tail];
  const seen = new Set(preferred);
  const remaining = allIds.filter((id) => !seen.has(id));
  return [...preferred, ...remaining];
}

function toNum(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

const multiValueFilterFn: FilterFn<Record<string, unknown>> = (
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

/** Row with optional grading-pass group meta for rowSpan */
interface RowWithGradingGroupMeta {
  gradingPassRowIndex?: number;
  gradingPassGroupSize?: number;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Stable row id for reconciliation (defaults to `String(row.id)` when present). */
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  /** Column ids to sum in the total row */
  totalColumnIds?: readonly string[];
  /** Initial column visibility state (column id -> visible). Omit or use {} for all visible. */
  initialColumnVisibility?: VisibilityState;
  /** Column ids that should rowSpan across grouped rows (e.g. grading gate pass columns). Row data must have gradingPassRowIndex and gradingPassGroupSize. */
  rowSpanColumnIds?: readonly string[];
  /** Optional content to render on the left side of the toolbar (filters, Columns) */
  toolbarLeftContent?: React.ReactNode;
  /** Optional content to render on the right side of the toolbar (e.g. primary action) */
  toolbarRightContent?: React.ReactNode;
}

/** Snapshot of table state for PDF: visible columns, grouping, sorting, and row model (groups + leaves). */
export interface GradingReportPdfSnapshot<TData> {
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

export interface GradingReportDataTableRef<TData> {
  getPdfSnapshot: () => GradingReportPdfSnapshot<TData> | null;
}

function getFirstLeaf<TData>(row: Row<TData>): TData | undefined {
  if (!row.getIsGrouped() || !row.subRows?.length) return row.original;
  return getFirstLeaf(row.subRows[0]);
}

const DataTableInner = forwardRef(function DataTableInner<TData, TValue>(
  {
    columns,
    data,
    getRowId,
    totalColumnIds = DEFAULT_TOTAL_COLUMN_IDS,
    initialColumnVisibility,
    rowSpanColumnIds,
    toolbarLeftContent,
    toolbarRightContent,
  }: DataTableProps<TData, TValue>,
  ref: Ref<GradingReportDataTableRef<TData>>
) {
  const typedData = data as unknown as Record<string, unknown>[];
  const typedColumns = columns as ColumnDef<Record<string, unknown>, TValue>[];
  const defaultColumnOrder = useMemo(
    () => buildDefaultColumnOrder(typedColumns),
    [typedColumns]
  );
  const allNumericFilterFields = useMemo(() => {
    const dynamicBagColumns = typedColumns
      .map(resolveColumnId)
      .filter(
        (columnId): columnId is string =>
          columnId != null && columnId.startsWith(BAG_SIZE_COLUMN_PREFIX)
      );
    return [...gradingNumericFilterFields, ...dynamicBagColumns];
  }, [typedColumns]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => initialColumnVisibility ?? {}
  );
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    buildDefaultColumnOrder(typedColumns)
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState<string | FilterGroupNode>(
    ''
  );
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection] = useState<ColumnResizeDirection>('ltr');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const globalFilterFn: FilterFn<Record<string, unknown>> = (
    row,
    _columnId,
    filterValue
  ) =>
    gradingGlobalFilterFn(
      row.original as unknown as GradingReportRow,
      filterValue as string | FilterGroupNode,
      allNumericFilterFields
    );

  // TanStack Table memoizes row models internally; React Compiler cannot memoize this hook safely.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
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
    getRowId:
      (getRowId as
        | ((
            originalRow: Record<string, unknown>,
            index: number,
            parent?: Row<Record<string, unknown>>
          ) => string)
        | undefined) ?? defaultGetRowId,
    getCoreRowModel: coreRowModel,
    getGroupedRowModel: groupedRowModel,
    getSortedRowModel: sortedRowModel,
    getExpandedRowModel: expandedRowModel,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onColumnVisibilityChange: setColumnVisibility,
    onGroupingChange: setGrouping,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode,
    columnResizeDirection,
    onExpandedChange: (updater) =>
      setExpanded((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : prev;
        return typeof next === 'object' && next !== null ? next : prev;
      }),
    globalFilterFn,
    state: {
      columnVisibility,
      grouping,
      sorting,
      columnOrder,
      columnFilters,
      globalFilter,
      expanded,
    },
    groupedColumnMode: 'reorder',
    enableColumnFilters: true,
    enableGlobalFilter: true,
  });

  const renderHeaderCell = (
    header: Header<Record<string, unknown>, unknown>
  ) => {
    const isBagSizeColumn = header.id.startsWith('gradedBagSize_');
    const isRightAligned =
      RIGHT_ALIGNED_COLUMN_IDS.has(header.id) || isBagSizeColumn;
    return (
      <TableHead
        key={header.id}
        style={{
          width: header.getSize(),
          minWidth: header.getSize(),
          maxWidth: header.getSize(),
        }}
        className="border-border bg-muted/60 text-foreground sticky top-0 z-20 border-r border-b p-0 font-semibold last:border-r-0"
      >
        <div
          className={`group relative flex h-full min-h-[46px] w-full items-center px-4 py-3.5 ${
            isRightAligned ? 'justify-end' : 'justify-between'
          }`}
        >
          <button
            type="button"
            className={`flex w-full items-center gap-1 ${
              header.column.getCanSort()
                ? 'cursor-pointer'
                : 'pointer-events-none cursor-default'
            } ${isRightAligned ? 'justify-end text-right' : 'justify-between text-left'}`}
            onClick={header.column.getToggleSortingHandler()}
          >
            <span className="font-custom truncate">
              {header.isPlaceholder
                ? null
                : flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
            </span>
            <span className={isRightAligned ? 'ml-2' : ''}>
              {{
                asc: <ArrowUp className="ml-1 h-3.5 w-3.5" />,
                desc: <ArrowDown className="ml-1 h-3.5 w-3.5" />,
              }[header.column.getIsSorted() as string] ?? (
                <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </span>
          </button>
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
        </div>
      </TableHead>
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      getPdfSnapshot: (): GradingReportPdfSnapshot<TData> | null => {
        const state = table.getState();
        const groupingIds = state.grouping ?? [];
        const visibleColumnIds = table
          .getAllColumns()
          .filter((col) => col.getIsVisible())
          .map((col) => col.id);
        const rows: GradingReportPdfSnapshot<TData>['rows'] = [];
        const sortedModel = table.getSortedRowModel();
        function walkRows(
          modelRows: Row<Record<string, unknown>>[],
          depth: number
        ): void {
          for (const row of modelRows) {
            if (row.getIsGrouped()) {
              const groupingColumnId = groupingIds[depth];
              const groupingValue = groupingColumnId
                ? row.getValue(groupingColumnId)
                : undefined;
              const displayValue =
                groupingValue != null && groupingValue !== ''
                  ? String(groupingValue)
                  : '—';
              rows.push({
                type: 'group',
                depth,
                groupingColumnId: groupingColumnId ?? '',
                groupingValue,
                displayValue,
                firstLeaf: getFirstLeaf(row) as TData | undefined,
              });
              if (row.subRows?.length) {
                walkRows(row.subRows, depth + 1);
              }
            } else {
              rows.push({ type: 'leaf', row: row.original as TData });
            }
          }
        }
        walkRows(sortedModel.rows, 0);
        return {
          visibleColumnIds,
          grouping: groupingIds,
          sorting: state.sorting ?? [],
          rows,
        };
      },
    }),
    [table]
  );

  const spanColumnSet = useMemo(
    () =>
      rowSpanColumnIds != null && rowSpanColumnIds.length > 0
        ? new Set(rowSpanColumnIds)
        : null,
    [rowSpanColumnIds]
  );
  const filteredLeafRows = table.getFilteredRowModel().rows;

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const id of totalColumnIds) acc[id] = 0;
    for (const filteredRow of filteredLeafRows) {
      const row = filteredRow.original as Record<string, unknown>;
      const rowPassIndex =
        typeof row.gradingPassRowIndex === 'number'
          ? row.gradingPassRowIndex
          : 0;
      const qtyByCol = row.gradedBagSizeQtyByColumnId as
        | Record<string, number>
        | undefined;
      for (const id of totalColumnIds) {
        if (rowPassIndex > 0 && spanColumnSet?.has(id)) continue;
        const fromBag =
          qtyByCol != null && Object.prototype.hasOwnProperty.call(qtyByCol, id)
            ? qtyByCol[id]
            : undefined;
        const v = fromBag !== undefined ? fromBag : row[id];
        acc[id] += toNum(v);
      }
    }
    return acc;
  }, [filteredLeafRows, totalColumnIds, spanColumnSet]);

  const headerGroups = table.getHeaderGroups();
  const rowModel = table.getRowModel();
  const rows = rowModel.rows;
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 44,
    getScrollElement: () => tableContainerRef.current,
    measureElement: isFirefoxBrowser
      ? undefined
      : (element) => element?.getBoundingClientRect().height,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

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
                placeholder="Search manual grading gate pass no..."
                className="font-custom h-10 pl-9"
              />
            </div>
            <ViewFiltersSheet
              table={table as unknown as TanstackTable<GradingReportRow>}
              defaultColumnOrder={defaultColumnOrder}
              allNumericFilterFields={allNumericFilterFields}
            />
            {toolbarRightContent != null ? (
              <div className="w-full shrink-0 sm:w-auto">
                {toolbarRightContent}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="border-border bg-card font-custom rounded-xl border text-sm shadow-sm">
        <div
          ref={tableContainerRef}
          className="overflow-x-auto overflow-y-auto rounded-xl"
          style={{
            direction: table.options.columnResizeDirection,
            height: '560px',
            position: 'relative',
          }}
          role="region"
          aria-label="Grading report table"
        >
          <Table
            style={{ display: 'grid', width: table.getTotalSize() }}
            className="font-custom text-sm"
          >
            <TableHeader>
              {headerGroups.map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  style={{ display: 'flex', width: '100%' }}
                  className="border-border bg-muted/60 hover:bg-muted/60 border-b-2"
                >
                  {headerGroup.headers.map((header) =>
                    renderHeaderCell(
                      header as Header<Record<string, unknown>, unknown>
                    )
                  )}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody
              style={{
                display: 'grid',
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {rows.length > 0 ? (
                virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  const original =
                    row.original as unknown as RowWithGradingGroupMeta;
                  const rowIndex = original.gradingPassRowIndex ?? 0;

                  return (
                    <TableRow
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={(node) => rowVirtualizer.measureElement(node)}
                      data-state={row.getIsSelected() && 'selected'}
                      data-depth={row.depth}
                      style={{
                        display: 'flex',
                        position: 'absolute',
                        transform: `translateY(${virtualRow.start}px)`,
                        width: '100%',
                      }}
                      className={`border-border border-b transition-colors last:border-b-0 ${
                        row.getIsGrouped()
                          ? 'bg-primary/15 hover:bg-primary/20'
                          : row.depth > 0
                            ? 'bg-secondary/40 hover:bg-secondary/50'
                            : 'hover:bg-muted/50'
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isSpanColumn =
                          spanColumnSet != null &&
                          spanColumnSet.has(cell.column.id);
                        const hideRepeatedSpanValue =
                          isSpanColumn && rowIndex > 0;
                        return (
                          <TableCell
                            key={cell.id}
                            style={{
                              display: 'flex',
                              width: cell.column.getSize(),
                              minWidth: cell.column.getSize(),
                              maxWidth: cell.column.getSize(),
                            }}
                            className="border-border text-foreground border-r px-4 py-3 wrap-break-word whitespace-normal last:border-r-0"
                          >
                            {hideRepeatedSpanValue
                              ? null
                              : flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="border-border border-b hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="text-muted-foreground border-r-0 py-12 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {data.length > 0 && totalColumnIds.length > 0 && (
              <TableFooter>
                <TableRow className="border-border bg-muted/60 font-custom font-bold">
                  {headerGroups[0]?.headers.map((header, idx) => {
                    const columnId = header.column.id;
                    const total = totals[columnId];
                    const isTotalCol = total !== undefined;
                    return (
                      <TableCell
                        key={header.id}
                        style={{
                          width: header.getSize(),
                          minWidth: header.getSize(),
                          maxWidth: header.getSize(),
                        }}
                        className="border-border text-foreground border-r px-4 py-3 last:border-r-0"
                      >
                        {idx === 0 ? (
                          <span className="font-custom font-bold">Total</span>
                        ) : isTotalCol ? (
                          <div className="font-custom text-right font-bold">
                            {total.toLocaleString()}
                          </div>
                        ) : (
                          ''
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </div>
    </div>
  );
}) as <TData, TValue>(
  props: DataTableProps<TData, TValue> & {
    ref?: Ref<GradingReportDataTableRef<TData>>;
  }
) => React.ReactElement;

export const DataTable = DataTableInner;
