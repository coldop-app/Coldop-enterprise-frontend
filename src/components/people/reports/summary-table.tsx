import { type ReactNode, memo, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from '@tanstack/react-table';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import { usePreferencesStore } from '@/stores/usePreferencesStore';
import {
  prepareAccountingGradingSummary,
  visibleSummarySizeLabels,
  type GradingBagTypeQtySummaryRow,
} from '@/components/people/reports/helpers/summary-prepare';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const TABLE_SCROLLBAR_CLEARANCE_PX = 14;

export type {
  GradingBagTypeQtySummaryRow,
  GradingSummaryColumnTotals,
} from '@/components/people/reports/helpers/summary-prepare';

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/** Matches grading report: whole kg omit decimals; fractional shows up to 2dp. */
function formatIndianWeightKg(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return formatIndianNumber(0, 0);
  }
  const scaled = Math.round((n + Number.EPSILON) * 100);
  const rounded = scaled / 100;
  const hasFraction = scaled % 100 !== 0;
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

function sizeColumnSlug(label: string): string {
  return label.replace(/[^a-zA-Z0-9]+/g, '_');
}

export interface SummaryTableProps {
  gradingGatePasses?: GradingGatePass[] | null;
}

const columnHelper = createColumnHelper<GradingBagTypeQtySummaryRow>();

function qtyForSize(
  row: GradingBagTypeQtySummaryRow,
  label: string
): number | null {
  const q = row.bagsBySize[label];
  if (q === undefined) return null;
  const n = Number(q) || 0;
  return n === 0 ? null : n;
}

function useSummaryColumns(visibleSizes: readonly string[]) {
  return useMemo((): ColumnDef<GradingBagTypeQtySummaryRow, any>[] => {
    const base: ColumnDef<GradingBagTypeQtySummaryRow, any>[] = [
      columnHelper.accessor('typeLabel', {
        id: 'type',
        header: 'Type',
        cell: (info) => (
          <span className="font-custom font-medium">{info.getValue()}</span>
        ),
      }),
    ];

    for (const label of visibleSizes) {
      const slug = sizeColumnSlug(label);
      base.push(
        columnHelper.accessor((row) => qtyForSize(row, label), {
          id: `size_${slug}_bags`,
          header: () => <div className="w-full text-right">{label}</div>,
          cell: (info) => {
            const v = info.getValue() as number | null;
            if (v === null || v === undefined) {
              return '';
            }
            return (
              <div className="w-full text-right tabular-nums">
                {formatIndianNumber(v, 0)}
              </div>
            );
          },
        })
      );
    }

    base.push(
      columnHelper.accessor('weightPerBagKg', {
        id: 'weightPerBagKg',
        header: () => (
          <div className="w-full text-right">Weight Per Bag (Kg)</div>
        ),
        cell: (info) => {
          const v = Number(info.getValue());
          if (!Number.isFinite(v) || v === 0) {
            return '';
          }
          return (
            <div className="w-full text-right tabular-nums">
              {formatIndianWeightKg(v)}
            </div>
          );
        },
      })
    );
    base.push(
      columnHelper.accessor('weightReceivedKg', {
        id: 'weightReceivedKg',
        header: () => (
          <div className="w-full text-right">Weight Received (kg)</div>
        ),
        cell: (info) => {
          const v = Number(info.getValue());
          if (!Number.isFinite(v) || v === 0) {
            return '';
          }
          return (
            <div className="w-full text-right tabular-nums">
              {formatIndianWeightKg(v)}
            </div>
          );
        },
      })
    );
    base.push(
      columnHelper.accessor('bardanaWeightKg', {
        id: 'bardanaWeightKg',
        header: () => (
          <div className="w-full text-right">Bardana Weight (kg)</div>
        ),
        cell: (info) => {
          const v = Number(info.getValue());
          if (!Number.isFinite(v) || v === 0) {
            return '';
          }
          return (
            <div className="w-full text-right tabular-nums">
              {formatIndianWeightKg(v)}
            </div>
          );
        },
      })
    );
    base.push(
      columnHelper.accessor('actualWeightKg', {
        id: 'actualWeightKg',
        header: () => (
          <div className="w-full text-right">Actual Weight (kg)</div>
        ),
        cell: (info) => {
          const v = Number(info.getValue());
          if (!Number.isFinite(v) || v === 0) {
            return '';
          }
          return (
            <div className="w-full text-right tabular-nums">
              {formatIndianWeightKg(v)}
            </div>
          );
        },
      })
    );
    base.push(
      columnHelper.accessor('rate', {
        id: 'rate',
        header: () => <div className="w-full text-right">Rate (₹)</div>,
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v === null || v === undefined || !Number.isFinite(Number(v))) {
            return '';
          }
          const n = Number(v);
          return (
            <div className="w-full text-right tabular-nums">
              {formatIndianWeightKg(n)}
            </div>
          );
        },
      })
    );
    base.push(
      columnHelper.accessor('amountPayable', {
        id: 'amountPayable',
        header: () => (
          <div className="w-full text-right">Amount Payable (₹)</div>
        ),
        cell: (info) => {
          const v = info.getValue() as number | null;
          if (v === null || v === undefined || !Number.isFinite(Number(v))) {
            return '';
          }
          const n = Number(v);
          return (
            <div className="w-full text-right tabular-nums">
              {formatIndianNumber(n, 2)}
            </div>
          );
        },
      })
    );
    base.push(
      columnHelper.accessor('gradedSizesPercent', {
        id: 'gradedSizesPercent',
        header: () => (
          <div className="w-full text-right">% of Graded Sizes</div>
        ),
        cell: (info) => {
          const v = Number(info.getValue());
          if (!Number.isFinite(v) || v === 0) {
            return '';
          }
          return (
            <div className="w-full text-right tabular-nums">
              {formatIndianNumber(v, 2)}%
            </div>
          );
        },
      })
    );

    return base;
  }, [visibleSizes]);
}

function useNumericColumnIds(
  columns: ColumnDef<GradingBagTypeQtySummaryRow, any>[]
) {
  return useMemo(() => {
    const set = new Set<string>([
      'weightPerBagKg',
      'weightReceivedKg',
      'bardanaWeightKg',
      'actualWeightKg',
      'rate',
      'amountPayable',
      'gradedSizesPercent',
    ]);
    for (const col of columns) {
      const id =
        typeof col.id === 'string'
          ? col.id
          : 'accessorKey' in col && typeof col.accessorKey === 'string'
            ? col.accessorKey
            : null;
      if (!id) continue;
      if (id.startsWith('size_') && id.endsWith('_bags')) {
        set.add(id);
      }
    }
    return set;
  }, [columns]);
}

const SummaryTable = ({ gradingGatePasses }: SummaryTableProps) => {
  const preferences = usePreferencesStore((s) => s.preferences);
  const {
    rows: summaryRows,
    columnTotals,
    orderedSizeLabels,
  } = useMemo(
    () => prepareAccountingGradingSummary(gradingGatePasses, preferences),
    [gradingGatePasses, preferences]
  );

  const visibleSizes = useMemo(
    () => visibleSummarySizeLabels(orderedSizeLabels, columnTotals),
    [orderedSizeLabels, columnTotals]
  );

  const columns = useSummaryColumns(visibleSizes);
  const numericColumnIds = useNumericColumnIds(columns);
  const totalWeightReceivedKg = useMemo(
    () =>
      summaryRows.reduce(
        (sum, row) => sum + (Number(row.weightReceivedKg) || 0),
        0
      ),
    [summaryRows]
  );
  const totalBardanaWeightKg = useMemo(
    () =>
      summaryRows.reduce(
        (sum, row) => sum + (Number(row.bardanaWeightKg) || 0),
        0
      ),
    [summaryRows]
  );
  const totalActualWeightKg = useMemo(
    () =>
      summaryRows.reduce(
        (sum, row) => sum + (Number(row.actualWeightKg) || 0),
        0
      ),
    [summaryRows]
  );
  const totalAmountPayable = useMemo(
    () =>
      summaryRows.reduce(
        (sum, row) => sum + (Number(row.amountPayable) || 0),
        0
      ),
    [summaryRows]
  );
  const totalGradedSizesPercent = useMemo(
    () =>
      summaryRows.reduce(
        (sum, row) => sum + (Number(row.gradedSizesPercent) || 0),
        0
      ),
    [summaryRows]
  );

  const table = useReactTable({
    data: summaryRows,
    columns,
    enableSorting: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const showEmpty =
    !gradingGatePasses?.length ||
    visibleSizes.length === 0 ||
    summaryRows.length === 0;

  const emptyMessage = !gradingGatePasses?.length
    ? 'No grading gate passes.'
    : 'No nonzero bag quantities in grading data.';

  return (
    <div className="w-full">
      <div
        className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative max-h-[560px] overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
        style={{ position: 'relative' }}
      >
        <table className="font-custom w-full min-w-max border-collapse text-sm">
          <TableHeader className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder) return null;
                  const isRightAligned = numericColumnIds.has(header.id);
                  return (
                    <TableHead
                      key={header.id}
                      className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0"
                    >
                      <div
                        className={`flex w-full min-w-0 items-center gap-1 ${
                          isRightAligned ? 'justify-end' : 'justify-between'
                        }`}
                      >
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {showEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length || 1}
                  className="font-custom text-muted-foreground px-3 py-8 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/25'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap last:border-r-0"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {!showEmpty ? (
            <TableFooter
              className="bg-secondary border-border/70 text-secondary-foreground sticky bottom-0 border-t backdrop-blur-sm [&>tr]:border-b-0"
              style={{
                paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                zIndex: 9,
              }}
            >
              <TableRow className="hover:bg-transparent">
                {table.getVisibleLeafColumns().map((column, columnIndex) => {
                  const columnId = column.id;
                  const isNumeric = numericColumnIds.has(columnId);
                  const footerCenterMutedDash =
                    columnId === 'weightPerBagKg' || columnId === 'rate';
                  const footerRightNumeric =
                    isNumeric && columnIndex !== 0 && !footerCenterMutedDash;

                  const labelForSlug = (slug: string) =>
                    visibleSizes.find((l) => sizeColumnSlug(l) === slug);

                  let content: ReactNode = '';
                  if (columnId === 'type') {
                    content = (
                      <span className="font-custom font-semibold">Total</span>
                    );
                  } else if (
                    columnId === 'weightPerBagKg' ||
                    columnId === 'rate'
                  ) {
                    content = (
                      <span className="font-custom text-muted-foreground">
                        —
                      </span>
                    );
                  } else if (columnId === 'weightReceivedKg') {
                    content =
                      totalWeightReceivedKg === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right tabular-nums">
                          {formatIndianWeightKg(totalWeightReceivedKg)}
                        </div>
                      );
                  } else if (columnId === 'bardanaWeightKg') {
                    content =
                      totalBardanaWeightKg === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right tabular-nums">
                          {formatIndianWeightKg(totalBardanaWeightKg)}
                        </div>
                      );
                  } else if (columnId === 'actualWeightKg') {
                    content =
                      totalActualWeightKg === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right tabular-nums">
                          {formatIndianWeightKg(totalActualWeightKg)}
                        </div>
                      );
                  } else if (columnId === 'amountPayable') {
                    content =
                      totalAmountPayable === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right tabular-nums">
                          {formatIndianNumber(totalAmountPayable, 2)}
                        </div>
                      );
                  } else if (columnId === 'gradedSizesPercent') {
                    content =
                      totalGradedSizesPercent === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right tabular-nums">
                          {formatIndianNumber(totalGradedSizesPercent, 2)}%
                        </div>
                      );
                  } else {
                    const bagMatch = /^size_(.+)_bags$/.exec(columnId);
                    if (bagMatch) {
                      const label = labelForSlug(bagMatch[1]);
                      const n = label != null ? (columnTotals[label] ?? 0) : 0;
                      content =
                        n === 0 ? (
                          ''
                        ) : (
                          <div className="w-full text-right tabular-nums">
                            {formatIndianNumber(n, 0)}
                          </div>
                        );
                    }
                  }

                  return (
                    <TableCell
                      key={`footer-${column.id}`}
                      className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 align-middle text-sm font-semibold whitespace-nowrap last:border-r-0 ${
                        footerCenterMutedDash
                          ? 'text-center'
                          : footerRightNumeric
                            ? 'text-right tabular-nums'
                            : ''
                      }`}
                    >
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          ) : null}
        </table>
      </div>
    </div>
  );
};

export default memo(SummaryTable);
