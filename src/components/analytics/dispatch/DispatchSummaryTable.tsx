import { useMemo } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { NikasiSummaryVarietyItem } from '@/types/analytics';

interface DispatchTableRow {
  variety: string;
  values: Record<string, number>;
  total: number;
}

export interface DispatchSummaryTableProps {
  varieties: NikasiSummaryVarietyItem[];
  /** Size column order (from parent) */
  sizes: string[];
  /** Card title; default "Dispatch summary" */
  tableTitle?: string;
  /** Optional subtitle under the title */
  subtitle?: string;
}

export function DispatchSummaryTable({
  varieties,
  sizes,
  tableTitle = 'Dispatch summary',
  subtitle = 'Quantity issued by variety and bag size for the selected date range.',
}: DispatchSummaryTableProps) {
  const { rows, totals, grandTotal } = useMemo(() => {
    const rowsData: DispatchTableRow[] = [];
    const columnTotals: Record<string, number> = {};
    for (const s of sizes) {
      columnTotals[s] = 0;
    }

    for (const v of varieties) {
      const bySize = new Map(v.sizes.map((x) => [x.size, x.quantityIssued]));
      const values: Record<string, number> = {};
      for (const size of sizes) {
        const q = bySize.get(size) ?? 0;
        values[size] = q;
        columnTotals[size] = (columnTotals[size] ?? 0) + q;
      }
      rowsData.push({
        variety: v.variety,
        values,
        total: v.quantityIssued,
      });
    }

    const grandTotal = rowsData.reduce((acc, r) => acc + r.total, 0);
    return { rows: rowsData, totals: columnTotals, grandTotal };
  }, [varieties, sizes]);

  const columns = useMemo<ColumnDef<DispatchTableRow>[]>(() => {
    const cols: ColumnDef<DispatchTableRow>[] = [
      {
        accessorKey: 'variety',
        header: () => <span className="font-custom font-bold">Varieties</span>,
        cell: ({ getValue }) => (
          <span className="font-custom font-medium">
            {getValue() as string}
          </span>
        ),
      },
    ];
    for (const size of sizes) {
      cols.push({
        id: size,
        accessorFn: (row) => row.values[size] ?? 0,
        header: () => <span className="font-custom font-bold">{size}</span>,
        cell: ({ getValue }) => (
          <span className="font-custom font-medium tabular-nums">
            {Number(getValue()).toLocaleString('en-IN')}
          </span>
        ),
      });
    }
    cols.push({
      accessorKey: 'total',
      header: () => <span className="font-custom font-bold">Total</span>,
      cell: ({ getValue }) => (
        <span className="font-custom text-primary font-bold tabular-nums">
          {Number(getValue()).toLocaleString('en-IN')}
        </span>
      ),
    });
    return cols;
  }, [sizes]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (sizes.length === 0) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <p className="font-custom text-muted-foreground text-center text-sm">
            No size columns for dispatch summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="font-custom border-border rounded-xl shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
            {tableTitle}
          </h2>
          <p className="font-custom text-muted-foreground mt-1 text-sm">
            {subtitle}
          </p>
        </div>
        <div className="border-border overflow-x-auto rounded-lg border">
          <Table className="border-collapse">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-border bg-muted hover:bg-muted"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="font-custom border-border border px-4 py-2 font-bold"
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
                    className="border-border hover:bg-transparent"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="font-custom border-border border px-4 py-2"
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
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={table.getHeaderGroups()[0]?.headers.length ?? 1}
                    className="font-custom text-muted-foreground border-border h-24 border px-4 py-2 text-center"
                  >
                    No dispatch data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                    Bag Total
                  </TableHead>
                  {sizes.map((size) => (
                    <TableCell
                      key={size}
                      className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums"
                    >
                      {(totals[size] ?? 0).toLocaleString('en-IN')}
                    </TableCell>
                  ))}
                  <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums">
                    {grandTotal.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
