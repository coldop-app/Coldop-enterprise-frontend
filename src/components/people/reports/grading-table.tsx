import { type ReactNode, memo, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type Table,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  ACCOUNTING_GRADING_BAG_SIZE_ORDER,
  computeGradingTableTotals,
  extraGradingSizeLabelsFromRows,
  gradingTotalsAverageWeightPerBagKg,
  sizeLabelsWithAnyQuantity,
  totalBagsForAccountingGradingRow,
  type AccountingGradingRow,
} from '@/components/people/reports/helpers/grading-prepare';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AccountingVarietyGroup } from '@/components/people/reports/accounting-report/accounting-variety-grouped';

/** Reserve space for native scrollbar over sticky footer (matches accounting incoming table). */
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;

export type {
  AccountingGradingRow,
  AccountingGradingRowSizes,
  GradingSizeCell,
} from './helpers/grading-prepare';

const columnHelper = createColumnHelper<AccountingGradingRow>();

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/** Same 2dp rounding semantics as incoming table; whole numbers omit decimals. */
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

export interface GradingTableProps {
  /** When omitted or empty, the table body shows no rows. */
  rows?: AccountingGradingRow[];
  /** Single table with per-variety blocks (grand footer omitted). */
  varietyGroups?: AccountingVarietyGroup<AccountingGradingRow>[] | null;
}

function useGradingColumns(
  sizeLabelsOrdered: readonly string[]
): ColumnDef<AccountingGradingRow, any>[] {
  return useMemo((): ColumnDef<AccountingGradingRow, any>[] => {
    const base: ColumnDef<AccountingGradingRow, any>[] = [
      columnHelper.accessor('incomingManualGatePassNumber', {
        id: 'incomingManualGatePassNumber',
        header: 'Incoming Manual Gate Pass Number',
        cell: (info) =>
          info.row.original.isContinuation ? (
            ''
          ) : (
            <span className="font-custom font-medium">{info.getValue()}</span>
          ),
      }),
      columnHelper.accessor('gradingManualGatePassNumber', {
        id: 'gradingManualGatePassNumber',
        header: 'Grading Manual Gate Pass Number',
        cell: (info) =>
          info.row.original.isContinuation ? (
            ''
          ) : (
            <span className="font-custom font-medium">{info.getValue()}</span>
          ),
      }),
      columnHelper.accessor('variety', {
        id: 'variety',
        header: 'Variety',
        cell: (info) =>
          info.row.original.isContinuation ? '' : info.getValue(),
      }),
      columnHelper.accessor((row) => row.gradingDateSortValue, {
        id: 'gradingDate',
        header: 'Grading Date',
        cell: (info) =>
          info.row.original.isContinuation ? '' : info.row.original.gradingDate,
      }),
    ];

    const sizeCols: ColumnDef<AccountingGradingRow, any>[] =
      sizeLabelsOrdered.flatMap((label) => {
        const slug = sizeColumnSlug(label);
        return [
          columnHelper.accessor((row) => row.sizes[label]?.bags ?? null, {
            id: `size_${slug}_bags`,
            header: () => (
              <div className="w-full text-right">
                {label}{' '}
                <span className="font-custom tracking-normal normal-case">
                  (mm)
                </span>
              </div>
            ),
            cell: (info) => {
              const v = info.row.original.sizes[label];
              if (v === undefined) {
                return null;
              }
              const bags = Number(v.bags) || 0;
              if (bags === 0) {
                return '';
              }
              return (
                <div className="w-full text-right tabular-nums">
                  {formatIndianNumber(bags, 0)}
                </div>
              );
            },
          }),
          columnHelper.accessor(
            (row) => row.sizes[label]?.weightPerBagKg ?? null,
            {
              id: `size_${slug}_weightKg`,
              header: () => (
                <div className="w-full text-right">Weight (Kg)</div>
              ),
              cell: (info) => {
                const v = info.row.original.sizes[label];
                if (v === undefined) {
                  return null;
                }
                const kg = Number(v.weightPerBagKg);
                if (!Number.isFinite(kg) || kg === 0) {
                  return '';
                }
                return (
                  <div className="w-full text-right tabular-nums">
                    {formatIndianWeightKg(kg)}
                  </div>
                );
              },
            }
          ),
          columnHelper.accessor((row) => row.sizes[label]?.bagType ?? null, {
            id: `size_${slug}_bagType`,
            header: 'Bag Type',
            cell: (info) => {
              const v = info.row.original.sizes[label];
              if (v === undefined) {
                return null;
              }
              return v.bagType ?? '';
            },
          }),
        ];
      });

    base.push(...sizeCols);

    base.push(
      columnHelper.accessor(
        (row) => totalBagsForAccountingGradingRow(row, sizeLabelsOrdered),
        {
          id: 'totalBags',
          header: () => <div className="w-full text-right">Total bags</div>,
          cell: (info) => {
            const n = totalBagsForAccountingGradingRow(
              info.row.original,
              sizeLabelsOrdered
            );
            return (
              <div className="w-full text-right font-medium tabular-nums">
                {n === 0 ? '' : formatIndianNumber(n, 0)}
              </div>
            );
          },
        }
      )
    );

    return base;
  }, [sizeLabelsOrdered]);
}

function useNumericColumnIds(columns: ColumnDef<AccountingGradingRow, any>[]) {
  return useMemo(() => {
    const set = new Set<string>(['totalBags']);
    for (const col of columns) {
      const id =
        typeof col.id === 'string'
          ? col.id
          : 'accessorKey' in col && typeof col.accessorKey === 'string'
            ? col.accessorKey
            : null;
      if (!id) continue;
      if (id.endsWith('_bags') || id.endsWith('_weightKg')) {
        set.add(id);
      }
    }
    return set;
  }, [columns]);
}

function GradingSubtotalCells({
  totals,
  table,
  sizeLabelsOrdered,
}: {
  totals: ReturnType<typeof computeGradingTableTotals>;
  table: Table<AccountingGradingRow>;
  sizeLabelsOrdered: readonly string[];
}) {
  return table.getVisibleLeafColumns().map((column, columnIndex) => {
    const columnId = column.id;
    const isNumeric =
      /^size_.+_(bags|weightKg)$/.test(columnId) || columnId === 'totalBags';
    const bagMatch = /^size_(.+)_bags$/.exec(columnId);
    const weightMatch = /^size_(.+)_weightKg$/.exec(columnId);

    const labelForSlug = (slug: string) =>
      sizeLabelsOrdered.find((l) => sizeColumnSlug(l) === slug);

    let content: ReactNode = '';
    if (columnIndex === 0) {
      content = 'Total';
    } else if (bagMatch) {
      const label = labelForSlug(bagMatch[1]);
      const n = label != null ? (totals.bySize[label]?.bags ?? 0) : 0;
      content =
        n === 0 ? (
          ''
        ) : (
          <div className="w-full text-right tabular-nums">
            {formatIndianNumber(n, 0)}
          </div>
        );
    } else if (weightMatch) {
      const label = labelForSlug(weightMatch[1]);
      const kg =
        label != null ? gradingTotalsAverageWeightPerBagKg(totals, label) : 0;
      content =
        kg === 0 ? (
          ''
        ) : (
          <div className="w-full text-right tabular-nums">
            {formatIndianWeightKg(kg)}
          </div>
        );
    } else if (columnId === 'totalBags') {
      content =
        totals.totalBags === 0 ? (
          ''
        ) : (
          <div className="w-full text-right font-medium tabular-nums">
            {formatIndianNumber(totals.totalBags, 0)}
          </div>
        );
    }

    return (
      <TableCell
        key={`sub-${column.id}`}
        className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 align-middle text-sm font-semibold whitespace-nowrap last:border-r-0 ${
          isNumeric && columnIndex !== 0 ? 'text-right tabular-nums' : ''
        }`}
      >
        {content}
      </TableCell>
    );
  });
}

const GradingTable = ({ rows, varietyGroups }: GradingTableProps) => {
  const data = useMemo(
    () =>
      varietyGroups != null
        ? varietyGroups.flatMap((g) => g.rows)
        : (rows ?? []),
    [rows, varietyGroups]
  );

  const sizeLabelsOrdered = useMemo(() => {
    const extras = extraGradingSizeLabelsFromRows(data);
    return [...ACCOUNTING_GRADING_BAG_SIZE_ORDER, ...extras];
  }, [data]);

  const totals = useMemo(
    () => computeGradingTableTotals(data, sizeLabelsOrdered),
    [data, sizeLabelsOrdered]
  );

  const visibleSizeLabels = useMemo(
    () => sizeLabelsWithAnyQuantity(sizeLabelsOrdered, totals),
    [sizeLabelsOrdered, totals]
  );

  const columns = useGradingColumns(visibleSizeLabels);
  const numericColumnIds = useNumericColumnIds(columns);

  const table = useReactTable({
    data,
    columns,
    enableSorting: false,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const showVarietyGroups = varietyGroups != null && varietyGroups.length > 0;

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
                  const canSort = header.column.getCanSort();
                  return (
                    <TableHead
                      key={header.id}
                      className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0"
                    >
                      <div
                        className={`group flex w-full min-w-0 items-center gap-1 transition-colors ${
                          canSort ? 'cursor-pointer' : 'cursor-default'
                        } ${isRightAligned ? 'justify-end' : 'justify-between'}`}
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                      >
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
                        {canSort ? (
                          <span
                            className={
                              isRightAligned ? 'ml-2 shrink-0' : 'shrink-0'
                            }
                          >
                            {{
                              asc: <ArrowUp className="ml-1 h-3.5 w-3.5" />,
                              desc: <ArrowDown className="ml-1 h-3.5 w-3.5" />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </span>
                        ) : null}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length || 1}
                  className="font-custom text-muted-foreground px-3 py-8 text-center"
                >
                  No grading gate passes to show.
                </TableCell>
              </TableRow>
            ) : showVarietyGroups ? (
              varietyGroups!.flatMap((group) => {
                const out: ReactNode[] = [
                  <TableRow
                    key={`vh-${group.varietyKey}`}
                    className="bg-muted/60 border-border/50 border-b hover:bg-transparent"
                  >
                    <TableCell
                      colSpan={columns.length}
                      className="font-custom text-foreground border-border/40 border-r px-3 py-2.5 text-sm font-semibold tracking-wide last:border-r-0"
                    >
                      Variety: {group.varietyLabel}
                    </TableCell>
                  </TableRow>,
                ];
                let zebra = 0;
                for (const dataRow of group.rows) {
                  const tRow = table.getRow(dataRow.id);
                  if (!tRow) continue;
                  const stripeClass =
                    zebra % 2 === 0 ? 'bg-background' : 'bg-muted/25';
                  zebra += 1;
                  out.push(
                    <TableRow
                      key={dataRow.id}
                      className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${stripeClass}`}
                    >
                      {tRow.getVisibleCells().map((cell) => (
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
                  );
                }
                const secTotals = computeGradingTableTotals(
                  group.rows,
                  sizeLabelsOrdered
                );
                out.push(
                  <TableRow
                    key={`ft-${group.varietyKey}`}
                    className="bg-secondary/70 border-border/50 border-b hover:bg-transparent"
                  >
                    {GradingSubtotalCells({
                      totals: secTotals,
                      table,
                      sizeLabelsOrdered,
                    })}
                  </TableRow>
                );
                return out;
              })
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
          {data.length > 0 && !showVarietyGroups ? (
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
                  const bagMatch = /^size_(.+)_bags$/.exec(columnId);
                  const weightMatch = /^size_(.+)_weightKg$/.exec(columnId);

                  const labelForSlug = (slug: string) =>
                    sizeLabelsOrdered.find((l) => sizeColumnSlug(l) === slug);

                  let content: ReactNode = '';
                  if (columnIndex === 0) {
                    content = 'Total';
                  } else if (bagMatch) {
                    const label = labelForSlug(bagMatch[1]);
                    const n =
                      label != null ? (totals.bySize[label]?.bags ?? 0) : 0;
                    content =
                      n === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right tabular-nums">
                          {formatIndianNumber(n, 0)}
                        </div>
                      );
                  } else if (weightMatch) {
                    const label = labelForSlug(weightMatch[1]);
                    const kg =
                      label != null
                        ? gradingTotalsAverageWeightPerBagKg(totals, label)
                        : 0;
                    content =
                      kg === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right tabular-nums">
                          {formatIndianWeightKg(kg)}
                        </div>
                      );
                  } else if (columnId === 'totalBags') {
                    content =
                      totals.totalBags === 0 ? (
                        ''
                      ) : (
                        <div className="w-full text-right font-medium tabular-nums">
                          {formatIndianNumber(totals.totalBags, 0)}
                        </div>
                      );
                  }

                  return (
                    <TableCell
                      key={`footer-${column.id}`}
                      className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 align-middle text-sm font-semibold whitespace-nowrap last:border-r-0 ${
                        isNumeric && columnIndex !== 0
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

export default memo(GradingTable);
