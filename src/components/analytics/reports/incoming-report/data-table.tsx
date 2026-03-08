'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';
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

const TOTAL_COLUMN_IDS = [
  'bags',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
] as const;

function toNum(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Snapshot of table state for PDF: visible columns, grouping, sorting, and row model (groups + leaves). */
export interface IncomingReportPdfSnapshot<TData> {
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

export interface IncomingReportDataTableRef<TData> {
  getPdfSnapshot: () => IncomingReportPdfSnapshot<TData> | null;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column ids to sum in the total row (e.g. bags, grossWeightKg, tareWeightKg, netWeightKg) */
  totalColumnIds?: readonly string[];
  /** Optional content to render on the left side of the toolbar (filters, Group by, Columns) */
  toolbarLeftContent?: React.ReactNode;
  /** Optional content to render on the right side of the toolbar (e.g. primary action) */
  toolbarRightContent?: React.ReactNode;
}

/** Human-readable labels for column visibility toggle */
const COLUMN_LABELS: Record<string, string> = {
  farmerName: 'Farmer',
  accountNumber: 'Account No.',
  farmerAddress: 'Address',
  farmerMobile: 'Mobile',
  createdByName: 'Created by',
  location: 'Location',
  gatePassNo: 'Gate pass no.',
  manualGatePassNumber: 'Manual GP no.',
  date: 'Date',
  variety: 'Variety',
  truckNumber: 'Truck no.',
  bags: 'Bags',
  grossWeightKg: 'Gross (kg)',
  tareWeightKg: 'Tare (kg)',
  netWeightKg: 'Net (kg)',
  status: 'Status',
  totalGradedBags: 'Graded bags',
  remarks: 'Remarks',
  createdAt: 'Created at',
  updatedAt: 'Updated at',
};

function getColumnLabel(id: string): string {
  return COLUMN_LABELS[id] ?? id;
}

function getFirstLeaf<TData>(row: Row<TData>): TData | undefined {
  if (!row.getIsGrouped() || !row.subRows?.length) return row.original;
  return getFirstLeaf(row.subRows[0]);
}

export const DataTable = forwardRef(function DataTableInner<TData, TValue>(
  {
    columns,
    data,
    totalColumnIds = [...TOTAL_COLUMN_IDS],
    toolbarLeftContent,
    toolbarRightContent,
  }: DataTableProps<TData, TValue>,
  ref: React.Ref<IncomingReportDataTableRef<TData>>
) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [grouping, setGrouping] = useState<string[]>([]);
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
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
  });

  const groupedIds = table.getState().grouping ?? [];
  const totals = (() => {
    const acc: Record<string, number> = {};
    for (const id of totalColumnIds) acc[id] = 0;
    for (const row of data as Record<string, unknown>[]) {
      for (const id of totalColumnIds) {
        acc[id] += toNum(row[id]);
      }
    }
    return acc;
  })();

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
      getPdfSnapshot: (): IncomingReportPdfSnapshot<TData> | null => {
        const state = table.getState();
        const groupingIds = state.grouping ?? [];
        const visibleColumnIds = table
          .getAllColumns()
          .filter((col) => col.getIsVisible())
          .map((col) => col.id);
        const rows: IncomingReportPdfSnapshot<TData>['rows'] = [];
        // Use sorted row model so PDF honours the same order as the UI (grouped then sorted).
        // Walk full tree so PDF includes all groups/leaves regardless of expanded state.
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
                      (Farmer, Address, Date, Variety, Status) to group by that
                      column.
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
              <DropdownMenuContent align="end" className="w-[180px]">
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
      <div className="border-border bg-card font-custom overflow-hidden rounded-xl border text-sm shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-border bg-muted/60 hover:bg-muted/60 border-b-2"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="border-border text-foreground border-r px-4 py-3.5 font-semibold last:border-r-0"
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  data-depth={row.depth}
                  className={`border-border border-b transition-colors last:border-b-0 ${
                    row.getIsGrouped()
                      ? 'bg-primary/15 hover:bg-primary/20'
                      : row.depth > 0
                        ? 'bg-secondary/40 hover:bg-secondary/50'
                        : 'hover:bg-muted/50'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-border text-foreground border-r px-4 py-3 last:border-r-0"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
                {table.getHeaderGroups()[0]?.headers.map((header, idx) => {
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
  );
}) as <TData, TValue>(
  props: DataTableProps<TData, TValue> & {
    ref?: React.Ref<IncomingReportDataTableRef<TData>>;
  }
) => React.ReactElement;
