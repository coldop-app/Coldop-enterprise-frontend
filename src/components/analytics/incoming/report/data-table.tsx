'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full space-y-3">
      {/* Optional header row */}
      {title && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-foreground text-sm font-medium tracking-tight">
            {title}
          </h3>
          <span className="text-muted-foreground bg-muted border-border/50 rounded-full border px-2.5 py-1 text-xs">
            {data.length} {data.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      )}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-border/60 border-b hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'h-10 px-4 text-[11px] font-medium tracking-widest uppercase',
                    'text-muted-foreground/70',
                    'first:pl-5 last:pr-5'
                  )}
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
                className={cn(
                  'border-border/40 border-b last:border-0',
                  'transition-colors duration-100',
                  'hover:bg-muted/40',
                  'data-[state=selected]:bg-primary/5'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      'text-foreground/90 px-4 py-3 text-sm',
                      'first:pl-5 last:pr-5',
                      'first:text-foreground first:font-medium'
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="text-muted-foreground h-32 text-center text-sm"
              >
                No results found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
