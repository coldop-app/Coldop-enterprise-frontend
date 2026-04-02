'use client';

import type { Ref } from 'react';
import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import type { Row } from '@tanstack/table-core';
import type { ColumnDef } from '@tanstack/table-core';
import type { VisibilityState } from '@tanstack/table-core';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

/** Hoist once: passing `getCoreRowModel()` inline creates a new factory each render and defeats memoization. */
const coreRowModel = getCoreRowModel();
const groupedRowModel = getGroupedRowModel();
const sortedRowModel = getSortedRowModel();
const expandedRowModel = getExpandedRowModel();

function defaultGetRowId<TData>(row: TData, index: number): string {
  const r = row as { id?: string | number };
  return r.id != null ? String(r.id) : String(index);
}

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Item, ItemFooter } from '@/components/ui/item';
import { GripVertical, Layers, Settings2, X } from 'lucide-react';
import {
  GRADING_REPORT_BAG_SIZE_LABELS,
  sizeKeyFromGradedBagColumnId,
} from '@/components/analytics/reports/grading-report/grading-bag-sizes';

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

function toNum(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

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

/** Human-readable labels for column visibility toggle */
const COLUMN_LABELS: Record<string, string> = {
  farmerName: 'Farmer',
  farmerAddress: 'Address',
  farmerMobile: 'Mobile',
  createdByName: 'Created by',
  gatePassNo: 'Gate pass no.',
  manualGatePassNumber: 'Manual GP no.',
  incomingGatePassNo: 'Incoming GP no.',
  incomingManualNo: 'Incoming manual no.',
  incomingGatePassDate: 'Incoming gate pass date',
  date: 'Date',
  variety: 'Variety',
  truckNumber: 'Truck no.',
  bagsReceived: 'Bags received',
  grossWeightKg: 'Gross (kg)',
  tareWeightKg: 'Tare (kg)',
  netWeightKg: 'Net (kg)',
  netProductKg: 'Net product (kg)',
  totalGradedBags: 'Graded bags',
  totalGradedWeightKg: 'Total graded weight (kg)',
  wastageKg: 'Wastage (%)',
  grader: 'Grader',
  remarks: 'Remarks',
};

function getColumnLabel(id: string): string {
  const sizeKey = sizeKeyFromGradedBagColumnId(id);
  if (sizeKey != null) {
    return GRADING_REPORT_BAG_SIZE_LABELS[sizeKey] ?? sizeKey;
  }
  return COLUMN_LABELS[id] ?? id;
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => initialColumnVisibility ?? {}
  );
  const [grouping, setGrouping] = useState<string[]>([]);
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // TanStack Table memoizes row models internally; React Compiler cannot memoize this hook safely.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data,
    columns,
    getRowId: getRowId ?? defaultGetRowId,
    getCoreRowModel: coreRowModel,
    getGroupedRowModel: groupedRowModel,
    getSortedRowModel: sortedRowModel,
    getExpandedRowModel: expandedRowModel,
    onColumnVisibilityChange: setColumnVisibility,
    onGroupingChange: setGrouping,
    onSortingChange: setSorting,
    onExpandedChange: (updater) =>
      setExpanded((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : prev;
        return typeof next === 'object' && next !== null ? next : prev;
      }),
    state: {
      columnVisibility,
      grouping,
      sorting,
      expanded,
    },
    groupedColumnMode: 'reorder',
    enableColumnFilters: false,
    enableGlobalFilter: false,
  });

  const groupedIds = table.getState().grouping ?? [];

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) return;
    const next = [...groupedIds];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, removed);
    setGrouping(next);
  };

  const removeFromGrouping = (columnId: string) => {
    setGrouping(groupedIds.filter((id) => id !== columnId));
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
        function walkRows(modelRows: Row<TData>[], depth: number): void {
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
                firstLeaf: getFirstLeaf(row),
              });
              if (row.subRows?.length) {
                walkRows(row.subRows, depth + 1);
              }
            } else {
              rows.push({ type: 'leaf', row: row.original });
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

  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const id of totalColumnIds) acc[id] = 0;
    for (const row of data as Record<string, unknown>[]) {
      const qtyByCol = row.gradedBagSizeQtyByColumnId as
        | Record<string, number>
        | undefined;
      for (const id of totalColumnIds) {
        const fromBag =
          qtyByCol != null && Object.prototype.hasOwnProperty.call(qtyByCol, id)
            ? qtyByCol[id]
            : undefined;
        const v = fromBag !== undefined ? fromBag : row[id];
        acc[id] += toNum(v);
      }
    }
    return acc;
  }, [data, totalColumnIds]);

  const headerGroups = table.getHeaderGroups();
  const rowModel = table.getRowModel();

  return (
    <div className="space-y-4">
      <Item
        variant="outline"
        size="sm"
        className="flex-col items-stretch gap-4 rounded-xl"
      >
        <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:items-end">
            {toolbarLeftContent}
            <Sheet open={groupByOpen} onOpenChange={setGroupByOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom border-border text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:ring-primary h-9 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  Group by
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="font-custom border-border flex w-full flex-col sm:max-w-[280px]"
              >
                <SheetHeader className="border-border border-b pb-4">
                  <SheetTitle className="text-foreground">Group by</SheetTitle>
                  <SheetDescription>
                    Drag to reorder. Remove groups with the × button.
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col overflow-auto p-4">
                  {groupedIds.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No groups applied. Use the 3-dot menu on a column header
                      (Farmer, Variety, Date, Incoming gate pass date, Grader)
                      to group by that column.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {groupedIds.map((columnId, index) => (
                        <li
                          key={columnId}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          className={`border-border bg-card flex cursor-grab items-center gap-2 rounded-md border px-3 py-2 text-sm active:cursor-grabbing ${
                            dragOverIndex === index
                              ? 'border-primary bg-primary/10'
                              : ''
                          }`}
                        >
                          <GripVertical className="text-muted-foreground h-4 w-4 shrink-0" />
                          <span className="text-foreground min-w-0 flex-1 truncate">
                            {getColumnLabel(columnId)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
                            aria-label={`Remove ${getColumnLabel(columnId)} from groups`}
                            onClick={() => removeFromGrouping(columnId)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {groupedIds.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground mt-4 h-7 text-xs"
                      onClick={() => setGrouping([])}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom border-border text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:ring-primary h-9 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(e) => e.preventDefault()}
                    >
                      {getColumnLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {toolbarRightContent != null ? (
            <div className="w-full shrink-0 sm:w-auto">
              {toolbarRightContent}
            </div>
          ) : null}
        </ItemFooter>
      </Item>
      <div className="border-border bg-card font-custom rounded-xl border text-sm shadow-sm">
        <div
          className="max-h-[min(70vh,56rem)] overflow-auto rounded-xl"
          role="region"
          aria-label="Grading report table"
        >
          <Table>
            <TableHeader>
              {headerGroups.map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-border bg-muted/60 hover:bg-muted/60 border-b-2"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="border-border bg-muted/60 text-foreground sticky top-0 z-20 border-r border-b px-4 py-3.5 font-semibold last:border-r-0"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rowModel.rows?.length ? (
                rowModel.rows.map((row) => {
                  const original =
                    row.original as unknown as RowWithGradingGroupMeta;
                  const rowIndex = original.gradingPassRowIndex ?? 0;
                  const groupSize = original.gradingPassGroupSize ?? 1;

                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      data-depth={row.depth}
                      style={{ contentVisibility: 'auto' }}
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
                        if (isSpanColumn && rowIndex > 0) {
                          return null;
                        }
                        const rowSpan =
                          isSpanColumn && rowIndex === 0
                            ? groupSize
                            : undefined;
                        return (
                          <TableCell
                            key={cell.id}
                            rowSpan={rowSpan}
                            className="border-border text-foreground border-r px-4 py-3 last:border-r-0"
                          >
                            {flexRender(
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
