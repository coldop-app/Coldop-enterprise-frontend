'use client';

import { useState } from 'react';
import type { ColumnDef } from '@tanstack/table-core';
import type { VisibilityState } from '@tanstack/table-core';
import {
  flexRender,
  getCoreRowModel,
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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Settings2 } from 'lucide-react';

const TOTAL_COLUMN_IDS = ['totalBags'] as const;

function toNum(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Column ids to sum in the total row */
  totalColumnIds?: readonly string[];
}

/** Human-readable labels for column visibility toggle */
const COLUMN_LABELS: Record<string, string> = {
  farmerName: 'Farmer',
  accountNumber: 'Account No.',
  farmerAddress: 'Address',
  farmerMobile: 'Mobile',
  createdByName: 'Created by',
  gatePassNo: 'Gate pass no.',
  manualGatePassNumber: 'Manual GP no.',
  date: 'Date',
  variety: 'Variety',
  totalBags: 'Bags',
  remarks: 'Remarks',
};

function getColumnLabel(id: string): string {
  return COLUMN_LABELS[id] ?? id;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  totalColumnIds = [...TOTAL_COLUMN_IDS],
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnVisibility,
    },
  });

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="font-custom border-border text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:ring-primary h-8 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {getColumnLabel(column.id)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
                  className="border-border hover:bg-muted/50 border-b transition-colors last:border-b-0"
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
}
