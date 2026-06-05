import { useMemo } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ShedStockReportSourceVariety } from '@/types/analytics';
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
import {
  collectSizeLabelsFromRows,
  filterSizeLabelsWithData,
  normalizeSizeKey,
} from './shed-report-utils';
import type { ShedSizeBagRow } from './shed-stock-summary-table';

interface TableRowData {
  variety: string;
  values: Record<string, number>;
  total: number;
}

export interface ShedUngradedTableProps {
  varieties: ShedStockReportSourceVariety[];
  totalBags: number;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

function toSizeBagRows(
  varieties: ShedStockReportSourceVariety[]
): ShedSizeBagRow[] {
  return varieties.map((v) => ({
    variety: v.variety,
    sizes: v.sizes.map((s) => ({ size: s.size, bags: s.bags })),
  }));
}

function buildSizeBagMap(
  sizes: ReadonlyArray<{ size: string; bags: number }>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const { size, bags } of sizes) {
    const key = normalizeSizeKey(size);
    map.set(key, (map.get(key) ?? 0) + Number(bags));
  }
  return map;
}

function hasSizeBreakdown(varieties: ShedStockReportSourceVariety[]): boolean {
  return varieties.some((v) => v.sizes.some((s) => Number(s.bags) > 0));
}

const ShedUngradedTable = ({
  varieties,
  totalBags,
  isLoading = false,
  isError = false,
  errorMessage,
}: ShedUngradedTableProps) => {
  const sizeRows = useMemo(() => toSizeBagRows(varieties), [varieties]);
  const showSizeColumns = useMemo(
    () => hasSizeBreakdown(varieties),
    [varieties]
  );

  const effectiveSizes = useMemo(() => {
    if (!showSizeColumns) return [];
    const candidate = collectSizeLabelsFromRows(sizeRows);
    return filterSizeLabelsWithData(candidate, sizeRows);
  }, [showSizeColumns, sizeRows]);

  const { tableRows, columnTotals } = useMemo(() => {
    const rowsData: TableRowData[] = [];
    const totalsMap: Record<string, number> = {};

    for (const size of effectiveSizes) {
      totalsMap[size] = 0;
    }

    for (const varietyRow of varieties) {
      if (showSizeColumns) {
        const sizeMap = buildSizeBagMap(varietyRow.sizes);
        const values: Record<string, number> = {};
        let rowTotal = 0;

        for (const size of effectiveSizes) {
          const value = sizeMap.get(normalizeSizeKey(size)) ?? 0;
          values[size] = value;
          rowTotal += value;
          totalsMap[size] = (totalsMap[size] ?? 0) + value;
        }

        rowsData.push({
          variety: varietyRow.variety,
          values,
          total: rowTotal,
        });
      } else {
        rowsData.push({
          variety: varietyRow.variety,
          values: {},
          total: varietyRow.totalBags,
        });
      }
    }

    return { tableRows: rowsData, columnTotals: totalsMap };
  }, [varieties, effectiveSizes, showSizeColumns]);

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

    if (showSizeColumns) {
      for (const size of effectiveSizes) {
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
    }

    cols.push({
      accessorKey: 'total',
      header: () => (
        <span className="font-custom font-bold">
          {showSizeColumns ? 'Total' : 'Ungraded Bags'}
        </span>
      ),
      cell: ({ getValue }) => (
        <span className="font-custom text-primary font-bold tabular-nums">
          {Number(getValue()).toLocaleString('en-IN')}
        </span>
      ),
    });

    return cols;
  }, [effectiveSizes, showSizeColumns]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table instance
  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <p className="font-custom text-muted-foreground text-center text-sm">
            Loading ungraded bags...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <p className="font-custom text-destructive text-center text-sm">
            {errorMessage ?? 'Failed to load ungraded bags.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (varieties.length === 0 && totalBags === 0) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <p className="font-custom text-muted-foreground text-center text-sm">
            No ungraded bags in the shed.
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
            Ungraded Bags
          </h2>
          <p className="font-custom text-muted-foreground mt-1 text-sm">
            Ungraded bags in the shed by variety
            {showSizeColumns ? ' and size' : ''}.
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
                    No data.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {tableRows.length > 0 && (
              <TableFooter>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                    Bag Total
                  </TableHead>
                  {showSizeColumns &&
                    effectiveSizes.map((size) => (
                      <TableCell
                        key={size}
                        className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums"
                      >
                        {(columnTotals[size] ?? 0).toLocaleString('en-IN')}
                      </TableCell>
                    ))}
                  <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums">
                    {totalBags.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShedUngradedTable;
