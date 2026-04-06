'use client';

import { useMemo, useState } from 'react';
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
import type { ShedStockReportShedVariety } from '@/types/analytics';
import { cn } from '@/lib/utils';

type ShedMetric = 'gradingInitial' | 'stored' | 'dispatched' | 'shedStock';

const SHED_TAB_CONFIG: { id: ShedMetric; label: string }[] = [
  { id: 'shedStock', label: 'Shed stock' },
  { id: 'gradingInitial', label: 'Grading initial' },
  { id: 'stored', label: 'Stored' },
  { id: 'dispatched', label: 'Dispatch' },
];

interface TableRowData {
  variety: string;
  values: Record<string, number>;
  total: number;
}

function buildMetricMap(
  variety: ShedStockReportShedVariety,
  metric: ShedMetric
): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of variety.sizes) {
    let v: number;
    switch (metric) {
      case 'gradingInitial':
        v = s.gradingInitial;
        break;
      case 'stored':
        v = s.stored;
        break;
      case 'dispatched':
        v = s.dispatched;
        break;
      default:
        v = s.shedStock;
    }
    m.set(s.size, v);
  }
  return m;
}

export interface ShedStockMetricsTableProps {
  varieties: ShedStockReportShedVariety[];
  sizes: string[];
  /** API totals row (footer grand total and tab counts) */
  totals: {
    gradingInitial: number;
    stored: number;
    dispatched: number;
    shedStock: number;
  };
}

export function ShedStockMetricsTable({
  varieties,
  sizes,
  totals,
}: ShedStockMetricsTableProps) {
  const [activeMetric, setActiveMetric] = useState<ShedMetric>('shedStock');

  const { rows, columnTotals } = useMemo(() => {
    const rowsData: TableRowData[] = [];
    const colTotals: Record<string, number> = {};
    for (const size of sizes) {
      colTotals[size] = 0;
    }

    for (const v of varieties) {
      const metricMap = buildMetricMap(v, activeMetric);
      const values: Record<string, number> = {};
      let rowTotal = 0;
      for (const size of sizes) {
        const val = metricMap.get(size) ?? 0;
        values[size] = val;
        rowTotal += val;
        colTotals[size] = (colTotals[size] ?? 0) + val;
      }
      rowsData.push({ variety: v.variety, values, total: rowTotal });
    }

    return { rows: rowsData, columnTotals: colTotals };
  }, [varieties, sizes, activeMetric]);

  const grandTotal = useMemo(() => {
    switch (activeMetric) {
      case 'gradingInitial':
        return totals.gradingInitial;
      case 'stored':
        return totals.stored;
      case 'dispatched':
        return totals.dispatched;
      default:
        return totals.shedStock;
    }
  }, [activeMetric, totals]);

  const columns = useMemo<ColumnDef<TableRowData>[]>(() => {
    const cols: ColumnDef<TableRowData>[] = [
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
        cell: ({ getValue }) => {
          const n = Number(getValue());
          const negative =
            activeMetric === 'shedStock' && n < 0 ? 'text-destructive' : '';
          return (
            <span
              className={cn('font-custom font-medium tabular-nums', negative)}
            >
              {n.toLocaleString('en-IN')}
            </span>
          );
        },
      });
    }
    cols.push({
      accessorKey: 'total',
      header: () => <span className="font-custom font-bold">Total</span>,
      cell: ({ getValue }) => {
        const n = Number(getValue());
        const negative =
          activeMetric === 'shedStock' && n < 0
            ? 'text-destructive font-bold'
            : 'text-primary font-bold';
        return (
          <span className={cn('font-custom tabular-nums', negative)}>
            {n.toLocaleString('en-IN')}
          </span>
        );
      },
    });
    return cols;
  }, [sizes, activeMetric]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (sizes.length === 0) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
            Shed stock
          </h2>
          <p className="font-custom text-muted-foreground mt-2 text-center text-sm">
            No shed stock sizes for this range.
          </p>
        </CardContent>
      </Card>
    );
  }

  const footerTotalClass =
    activeMetric === 'shedStock' && grandTotal < 0
      ? 'font-custom bg-destructive/10 text-destructive border-border border px-4 py-2 font-bold tabular-nums'
      : 'font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums';

  return (
    <Card className="font-custom border-border rounded-xl shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
              Shed stock
            </h2>
            <p className="font-custom text-muted-foreground mt-1 text-sm">
              View computed shed stock, grading initial, stored, or dispatch
              quantities by size.
            </p>
          </div>
          <div className="border-border flex flex-wrap gap-1 border-b">
            {SHED_TAB_CONFIG.map(({ id, label }) => {
              const count =
                id === 'gradingInitial'
                  ? totals.gradingInitial
                  : id === 'stored'
                    ? totals.stored
                    : id === 'dispatched'
                      ? totals.dispatched
                      : totals.shedStock;
              const isActive = activeMetric === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveMetric(id)}
                  className={cn(
                    'font-custom focus-visible:ring-primary border-b-2 px-3 pt-1 pb-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    isActive
                      ? 'border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  )}
                >
                  {label} ({count.toLocaleString('en-IN')})
                </button>
              );
            })}
          </div>
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
                    No shed stock data.
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
                  {sizes.map((size) => {
                    const v = columnTotals[size] ?? 0;
                    const neg =
                      activeMetric === 'shedStock' && v < 0
                        ? 'text-destructive'
                        : '';
                    return (
                      <TableCell
                        key={size}
                        className={cn(
                          'font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums',
                          neg
                        )}
                      >
                        {v.toLocaleString('en-IN')}
                      </TableCell>
                    );
                  })}
                  <TableCell className={footerTotalClass}>
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
