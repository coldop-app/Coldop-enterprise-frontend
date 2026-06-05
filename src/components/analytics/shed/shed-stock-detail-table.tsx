import { useCallback, useMemo, useState } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ShedStockReportSourceVariety,
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
  isUngradedSize,
  normalizeSizeKey,
  sortSizeLabels,
  sumByNormalizedSize,
} from './shed-report-utils';
import {
  buildNotInternalUngradedBagsByVariety,
  buildUngradedBagsByVariety,
  getApiUngradedMetricValue,
  getNotInternalUngradedBags,
  getShedStockVarietyTotal,
  getUngradedShedStockCellValue,
  varietyHasUngradedColumnData,
} from './shed-ungraded-utils';
import {
  buildCellBreakdown,
  buildOverallBreakdown,
  type CellSelection,
  getMetricLabel,
  type ShedStockMetric,
} from './shed-stock-calculation';
import ShedStockCalculationSheet from './shed-stock-calculation-sheet';

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
  ungraded?: ShedStockReportSourceVariety[];
  notInternalTransfer?: ShedStockReportSourceVariety[];
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
  metric: ShedStockMetric,
  ungradedTable: ReturnType<typeof buildUngradedBagsByVariety>,
  notInternalUngraded: ReturnType<typeof buildNotInternalUngradedBagsByVariety>
): string[] {
  const withData = new Set<string>();
  for (const variety of varieties) {
    for (const sizeRow of variety.sizes) {
      if (Number(sizeRow[metric]) !== 0) {
        withData.add(normalizeSizeKey(sizeRow.size));
      }
    }
    if (
      varietyHasUngradedColumnData(
        variety,
        ungradedTable,
        notInternalUngraded,
        metric
      )
    ) {
      withData.add('ungraded');
    }
  }
  return sizes.filter((size) => withData.has(normalizeSizeKey(size)));
}

function getVarietyMetricValue(
  variety: ShedStockReportShedVariety,
  metric: ShedStockMetric,
  ungradedTable: ReturnType<typeof buildUngradedBagsByVariety>
): number {
  if (metric === 'shedStock') {
    return getShedStockVarietyTotal(variety, ungradedTable);
  }
  return variety[metric];
}

function getSizeMetricValue(
  variety: ShedStockReportShedVariety,
  size: string,
  metric: ShedStockMetric,
  ungradedTable: ReturnType<typeof buildUngradedBagsByVariety>,
  notInternalUngraded: ReturnType<typeof buildNotInternalUngradedBagsByVariety>
): number {
  if (isUngradedSize(size)) {
    if (metric === 'shedStock') {
      return getUngradedShedStockCellValue(
        variety,
        ungradedTable,
        notInternalUngraded
      );
    }
    if (metric === 'notInternallyTransferred') {
      const fromSource = getNotInternalUngradedBags(
        notInternalUngraded,
        variety.variety
      );
      if (fromSource > 0) return fromSource;
    }
    return getApiUngradedMetricValue(variety, metric);
  }

  return sumByNormalizedSize(variety.sizes, size, (row) =>
    Number(row[metric] ?? 0)
  );
}

function selectionsMatch(a: CellSelection, b: CellSelection): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'cell':
      return b.type === 'cell' && a.variety === b.variety && a.size === b.size;
    case 'row-total':
      return b.type === 'row-total' && a.variety === b.variety;
    case 'column-total':
      return b.type === 'column-total' && a.size === b.size;
    case 'grand-total':
      return b.type === 'grand-total';
    default:
      return false;
  }
}

const clickableCellClass =
  'cursor-pointer transition-colors duration-200 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset';

const selectedCellClass = 'bg-primary/10 ring-primary/30 ring-2 ring-inset';

const ShedStockDetailTable = ({
  varieties,
  totals,
  ungraded = [],
  notInternalTransfer = [],
  isLoading = false,
  isError = false,
  errorMessage,
}: ShedStockDetailTableProps) => {
  const ungradedTable = useMemo(
    () => buildUngradedBagsByVariety(ungraded),
    [ungraded]
  );
  const notInternalUngraded = useMemo(
    () => buildNotInternalUngradedBagsByVariety(notInternalTransfer),
    [notInternalTransfer]
  );
  const [activeTab, setActiveTab] = useState<ShedStockMetric>('shedStock');
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openBreakdown = useCallback((sel: CellSelection) => {
    setSelection(sel);
    setSheetOpen(true);
  }, []);

  const isSelected = useCallback(
    (sel: CellSelection) =>
      selection != null && selectionsMatch(selection, sel),
    [selection]
  );

  const allSizes = useMemo(() => collectSizeLabels(varieties), [varieties]);

  const effectiveSizes = useMemo(
    () =>
      filterSizesForMetric(
        allSizes,
        varieties,
        activeTab,
        ungradedTable,
        notInternalUngraded
      ),
    [allSizes, varieties, activeTab, ungradedTable, notInternalUngraded]
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
        const value = getSizeMetricValue(
          variety,
          size,
          activeTab,
          ungradedTable,
          notInternalUngraded
        );
        values[size] = value;
        totalsMap[size] = (totalsMap[size] ?? 0) + value;
      }

      rowsData.push({
        variety: variety.variety,
        values,
        total: getVarietyMetricValue(variety, activeTab, ungradedTable),
      });
    }

    return { tableRows: rowsData, columnTotals: totalsMap };
  }, [
    varieties,
    effectiveSizes,
    activeTab,
    ungradedTable,
    notInternalUngraded,
  ]);

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

  const cellBreakdown = useMemo(
    () =>
      selection != null
        ? buildCellBreakdown(
            selection,
            activeTab,
            varieties,
            totals,
            columnTotals,
            ungradedTable,
            notInternalUngraded
          )
        : null,
    [
      selection,
      activeTab,
      varieties,
      totals,
      columnTotals,
      ungradedTable,
      notInternalUngraded,
    ]
  );

  const overallBreakdown = useMemo(
    () => buildOverallBreakdown(totals),
    [totals]
  );

  const ungradedBags = totals.ungradedBags ?? 0;

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
    <>
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div>
                <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
                  Shed Stock
                </h2>
                <p className="font-custom text-muted-foreground mt-1 text-sm">
                  Grading + ungraded − stored − dispatch (excl. internal
                  transfer)
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
            <>
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
                    {table.getRowModel().rows.map((row) => {
                      const varietyName = row.original.variety;
                      return (
                        <TableRow
                          key={row.id}
                          className="border-border hover:bg-transparent"
                        >
                          {row.getVisibleCells().map((cell) => {
                            const columnId = cell.column.id;

                            if (columnId === 'variety') {
                              const sel: CellSelection = {
                                type: 'row-total',
                                variety: varietyName,
                              };
                              return (
                                <TableCell
                                  key={cell.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openBreakdown(sel)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      openBreakdown(sel);
                                    }
                                  }}
                                  className={cn(
                                    'font-custom border-border border px-4 py-2',
                                    clickableCellClass,
                                    isSelected(sel) && selectedCellClass
                                  )}
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              );
                            }

                            if (columnId === 'total') {
                              const sel: CellSelection = {
                                type: 'row-total',
                                variety: varietyName,
                              };
                              return (
                                <TableCell
                                  key={cell.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => openBreakdown(sel)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      openBreakdown(sel);
                                    }
                                  }}
                                  className={cn(
                                    'font-custom border-border border px-4 py-2',
                                    clickableCellClass,
                                    isSelected(sel) && selectedCellClass
                                  )}
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </TableCell>
                              );
                            }

                            const size = columnId;
                            const sel: CellSelection = {
                              type: 'cell',
                              variety: varietyName,
                              size,
                            };
                            return (
                              <TableCell
                                key={cell.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => openBreakdown(sel)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openBreakdown(sel);
                                  }
                                }}
                                className={cn(
                                  'font-custom border-border border px-4 py-2',
                                  clickableCellClass,
                                  isSelected(sel) && selectedCellClass
                                )}
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
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead
                        role="button"
                        tabIndex={0}
                        onClick={() => openBreakdown({ type: 'grand-total' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openBreakdown({ type: 'grand-total' });
                          }
                        }}
                        className={cn(
                          'font-custom bg-muted/50 border-border border px-4 py-2 font-bold',
                          clickableCellClass,
                          isSelected({ type: 'grand-total' }) &&
                            selectedCellClass
                        )}
                      >
                        Bag Total
                      </TableHead>
                      {effectiveSizes.map((size) => {
                        const sel: CellSelection = {
                          type: 'column-total',
                          size,
                        };
                        return (
                          <TableCell
                            key={size}
                            role="button"
                            tabIndex={0}
                            onClick={() => openBreakdown(sel)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openBreakdown(sel);
                              }
                            }}
                            className={cn(
                              'font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums',
                              clickableCellClass,
                              isSelected(sel) && selectedCellClass
                            )}
                          >
                            {(columnTotals[size] ?? 0).toLocaleString('en-IN')}
                          </TableCell>
                        );
                      })}
                      <TableCell
                        role="button"
                        tabIndex={0}
                        onClick={() => openBreakdown({ type: 'grand-total' })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openBreakdown({ type: 'grand-total' });
                          }
                        }}
                        className={cn(
                          'font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums',
                          clickableCellClass,
                          isSelected({ type: 'grand-total' }) &&
                            selectedCellClass
                        )}
                      >
                        {activeTabTotal.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <p className="font-custom text-muted-foreground flex items-center gap-1.5 text-xs">
                <Info className="size-3.5 shrink-0" aria-hidden />
                Click any cell to see how its value is calculated
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ShedStockCalculationSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cellBreakdown={cellBreakdown}
        overallBreakdown={overallBreakdown}
        metricLabel={getMetricLabel(activeTab)}
      />
    </>
  );
};

export default ShedStockDetailTable;
