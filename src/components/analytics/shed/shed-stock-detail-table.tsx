import { useMemo, useState } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import type {
  ShedStockReportShedTotals,
  ShedStockReportShedVariety,
} from '@/types/analytics';
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
  normalizeSizeKey,
  sortSizeLabels,
  sumByNormalizedSize,
} from './shed-report-utils';

type ShedStockMetric = keyof Pick<
  ShedStockReportShedVariety,
  | 'gradingInitial'
  | 'stored'
  | 'dispatched'
  | 'internallyTransferred'
  | 'notInternallyTransferred'
  | 'shedStock'
>;

const TAB_CONFIG: { id: ShedStockMetric; label: string }[] = [
  { id: 'gradingInitial', label: 'Grading Initial' },
  { id: 'stored', label: 'Stored' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'internallyTransferred', label: 'Internally Transferred' },
  { id: 'notInternallyTransferred', label: 'Not Internally Transferred' },
  { id: 'shedStock', label: 'Shed Stock' },
];

interface TableRowData {
  variety: string;
  values: Record<string, number>;
  total: number;
}

export interface ShedStockDetailTableProps {
  varieties: ShedStockReportShedVariety[];
  totals: ShedStockReportShedTotals;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
}

function collectSizeLabels(varieties: ShedStockReportShedVariety[]): string[] {
  const labels: string[] = [];
  for (const variety of varieties) {
    for (const { size } of variety.sizes) {
      labels.push(size);
    }
  }
  return sortSizeLabels(labels);
}

function filterSizesForMetric(
  sizes: string[],
  varieties: ShedStockReportShedVariety[],
  metric: ShedStockMetric
): string[] {
  const withData = new Set<string>();
  for (const variety of varieties) {
    for (const sizeRow of variety.sizes) {
      if (Number(sizeRow[metric]) !== 0) {
        withData.add(normalizeSizeKey(sizeRow.size));
      }
    }
  }
  return sizes.filter((size) => withData.has(normalizeSizeKey(size)));
}

function getVarietyMetricValue(
  variety: ShedStockReportShedVariety,
  metric: ShedStockMetric
): number {
  return variety[metric];
}

function getSizeMetricValue(
  variety: ShedStockReportShedVariety,
  size: string,
  metric: ShedStockMetric
): number {
  return sumByNormalizedSize(variety.sizes, size, (row) =>
    Number(row[metric] ?? 0)
  );
}

const ShedStockDetailTable = ({
  varieties,
  totals,
  isLoading = false,
  isError = false,
  errorMessage,
}: ShedStockDetailTableProps) => {
  const [activeTab, setActiveTab] = useState<ShedStockMetric>('shedStock');

  const allSizes = useMemo(() => collectSizeLabels(varieties), [varieties]);

  const effectiveSizes = useMemo(
    () => filterSizesForMetric(allSizes, varieties, activeTab),
    [allSizes, varieties, activeTab]
  );

  const { tableRows, columnTotals } = useMemo(() => {
    const rowsData: TableRowData[] = [];
    const totalsMap: Record<string, number> = {};

    for (const size of effectiveSizes) {
      totalsMap[size] = 0;
    }

    for (const variety of varieties) {
      const values: Record<string, number> = {};

      for (const size of effectiveSizes) {
        const value = getSizeMetricValue(variety, size, activeTab);
        values[size] = value;
        totalsMap[size] = (totalsMap[size] ?? 0) + value;
      }

      rowsData.push({
        variety: variety.variety,
        values,
        total: getVarietyMetricValue(variety, activeTab),
      });
    }

    return { tableRows: rowsData, columnTotals: totalsMap };
  }, [varieties, effectiveSizes, activeTab]);

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
  }, [effectiveSizes]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table instance
  const table = useReactTable({
    data: tableRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const ungradedBags = totals.ungradedBags ?? 0;

  // When the Shed Stock tab is active the canonical total shown in the footer
  // must include ungraded bags (same formula as the overview card).
  const activeTabTotal =
    activeTab === 'shedStock'
      ? totals.shedStock + ungradedBags
      : totals[activeTab];

  if (isLoading) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <p className="font-custom text-muted-foreground text-center text-sm">
            Loading shed stock...
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
            {errorMessage ?? 'Failed to load shed stock.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (varieties.length === 0) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <p className="font-custom text-muted-foreground text-center text-sm">
            No shed stock data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="font-custom border-border rounded-xl shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
                Shed Stock
              </h2>
              <p className="font-custom text-muted-foreground mt-1 text-sm">
                Grading + ungraded − stored − dispatch (excl. internal transfer)
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {[
                { label: 'Grading', value: totals.gradingInitial },
                { label: 'Ungraded', value: ungradedBags },
                { label: 'Stored', value: totals.stored, minus: true },
                {
                  label: 'Not Int. Transfer',
                  value: totals.notInternallyTransferred,
                  minus: true,
                },
              ].map(({ label, value, minus }) => (
                <span
                  key={label}
                  className={`font-custom inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${
                    minus
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {minus ? '−' : '+'} {label}: {value.toLocaleString('en-IN')}
                </span>
              ))}
              <span className="font-custom bg-foreground/10 text-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 font-bold">
                = Shed Stock:{' '}
                {(totals.shedStock + ungradedBags).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="border-border flex flex-wrap gap-1 border-b">
            {TAB_CONFIG.map(({ id, label }) => {
              const count = totals[id];
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
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
        {effectiveSizes.length === 0 ? (
          <p className="font-custom text-muted-foreground text-center text-sm">
            No size data for this metric.
          </p>
        ) : (
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
                {table.getRowModel().rows.map((row) => (
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
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                    Bag Total
                  </TableHead>
                  {effectiveSizes.map((size) => (
                    <TableCell
                      key={size}
                      className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums"
                    >
                      {(columnTotals[size] ?? 0).toLocaleString('en-IN')}
                    </TableCell>
                  ))}
                  <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums">
                    {activeTabTotal.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ShedStockDetailTable;
