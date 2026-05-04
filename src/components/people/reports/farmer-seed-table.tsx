import { type ReactNode, memo, useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { FarmerSeedRow } from '@/components/people/reports/helpers/seed-prepare';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AccountingVarietyGroup } from '@/components/people/reports/accounting-report/accounting-variety-grouped';

const TABLE_SCROLLBAR_CLEARANCE_PX = 14;
const MDASH = '\u2014';
const FARMER_SEED_COLUMN_COUNT = 6;

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

const columnHelper = createColumnHelper<FarmerSeedRow>();

const columns = [
  columnHelper.accessor('date', {
    header: 'Date',
    sortingFn: 'alphanumeric',
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('seedSize', {
    header: () => (
      <>
        Seed Size{' '}
        <span className="font-custom tracking-normal normal-case">(mm)</span>
      </>
    ),
    sortingFn: 'text',
  }),
  columnHelper.accessor('totalBagsGiven', {
    id: 'totalBagsGiven',
    header: () => <div className="w-full text-right">Total Bags given</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('bagsPerAcre', {
    header: () => <div className="w-full text-right">Bags/Acre</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('seedRatePerBag', {
    header: () => <div className="w-full text-right">Seed Rate/Bag (Rs)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('totalSeedAmount', {
    header: () => (
      <div className="w-full text-right">Total Seed Amount (Rs)</div>
    ),
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
];

const numericColumnIds = new Set([
  'totalBagsGiven',
  'bagsPerAcre',
  'seedRatePerBag',
  'totalSeedAmount',
]);

export interface FarmerSeedTableProps {
  rows?: FarmerSeedRow[];
  varietyGroups?: AccountingVarietyGroup<FarmerSeedRow>[] | null;
}

function FarmerSeedVarietyGroupedTable({
  groups,
}: {
  groups: AccountingVarietyGroup<FarmerSeedRow>[];
}) {
  const hasAnyRows = groups.some((g) => g.rows.length > 0);

  return (
    <div className="w-full">
      <div
        className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative max-h-[560px] overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
        style={{ position: 'relative' }}
      >
        <table className="font-custom w-full min-w-max border-collapse text-sm">
          <TableHeader className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Date
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Seed Size{' '}
                <span className="font-custom tracking-normal normal-case">
                  (mm)
                </span>
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Total Bags given
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Bags/Acre
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Seed Rate/Bag (Rs)
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0">
                Total Seed Amount (Rs)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!hasAnyRows ? (
              <TableRow>
                <TableCell
                  colSpan={FARMER_SEED_COLUMN_COUNT}
                  className="font-custom text-muted-foreground px-3 py-8 text-center"
                >
                  No farmer seed rows to show.
                </TableCell>
              </TableRow>
            ) : (
              groups.flatMap((group) => {
                const block: ReactNode[] = [
                  <TableRow
                    key={`vh-${group.varietyKey}`}
                    className="bg-muted/60 border-border/50 border-b hover:bg-transparent"
                  >
                    <TableCell
                      colSpan={FARMER_SEED_COLUMN_COUNT}
                      className="font-custom text-foreground border-border/40 border-r px-3 py-2.5 text-sm font-semibold tracking-wide last:border-r-0"
                    >
                      Variety: {group.varietyLabel}
                    </TableCell>
                  </TableRow>,
                ];
                let zebra = 0;
                for (const row of group.rows) {
                  const stripe =
                    zebra % 2 === 0 ? 'bg-background' : 'bg-muted/25';
                  zebra += 1;
                  block.push(
                    <TableRow
                      key={row.id}
                      className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${stripe}`}
                    >
                      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
                        <span className="font-custom font-medium">
                          {row.date}
                        </span>
                      </TableCell>
                      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
                        {row.seedSize}
                      </TableCell>
                      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
                        <div className="w-full text-right tabular-nums">
                          {formatIndianNumber(Number(row.totalBagsGiven), 0)}
                        </div>
                      </TableCell>
                      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
                        <div className="w-full text-right tabular-nums">
                          {formatIndianNumber(Number(row.bagsPerAcre), 2)}
                        </div>
                      </TableCell>
                      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
                        <div className="w-full text-right tabular-nums">
                          {formatIndianNumber(Number(row.seedRatePerBag), 2)}
                        </div>
                      </TableCell>
                      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap last:border-r-0">
                        <div className="w-full text-right font-medium tabular-nums">
                          {formatIndianNumber(Number(row.totalSeedAmount), 2)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                const bagSum = group.rows.reduce(
                  (s, r) => s + (Number(r.totalBagsGiven) || 0),
                  0
                );
                const amtSum = group.rows.reduce(
                  (s, r) => s + (Number(r.totalSeedAmount) || 0),
                  0
                );
                block.push(
                  <TableRow
                    key={`ft-${group.varietyKey}`}
                    className="bg-secondary/70 border-border/50 border-b hover:bg-transparent"
                  >
                    <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold whitespace-nowrap">
                      Total
                    </TableCell>
                    <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
                      {MDASH}
                    </TableCell>
                    <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
                      {bagSum === 0 ? '' : formatIndianNumber(bagSum, 0)}
                    </TableCell>
                    <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
                      {MDASH}
                    </TableCell>
                    <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
                      {MDASH}
                    </TableCell>
                    <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums last:border-r-0">
                      {amtSum === 0 ? '' : formatIndianNumber(amtSum, 2)}
                    </TableCell>
                  </TableRow>
                );
                return block;
              })
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

const FarmerSeedTable = ({
  rows = [],
  varietyGroups,
}: FarmerSeedTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const totalSeedAmount = useMemo(() => {
    return rows.reduce(
      (sum, row) => sum + (Number(row.totalSeedAmount) || 0),
      0
    );
  }, [rows]);

  const totalBagsGiven = useMemo(() => {
    return rows.reduce(
      (sum, row) => sum + (Number(row.totalBagsGiven) || 0),
      0
    );
  }, [rows]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  if (varietyGroups != null) {
    return <FarmerSeedVarietyGroupedTable groups={varietyGroups} />;
  }

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
                        className={`group flex w-full min-w-0 cursor-pointer items-center gap-1 transition-colors ${
                          isRightAligned ? 'justify-end' : 'justify-between'
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </span>
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
                  colSpan={columns.length}
                  className="font-custom text-muted-foreground px-3 py-8 text-center"
                >
                  No farmer seed rows to show.
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
          {rows.length > 0 ? (
            <TableFooter
              className="bg-secondary border-border/70 text-secondary-foreground sticky bottom-0 border-t backdrop-blur-sm [&>tr]:border-b-0"
              style={{
                paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                zIndex: 9,
              }}
            >
              <TableRow className="hover:bg-transparent">
                {table.getVisibleLeafColumns().map((column, index) => {
                  const isNumeric = numericColumnIds.has(column.id);
                  let content = '';
                  if (index === 0) {
                    content = 'Total';
                  } else if (column.id === 'totalBagsGiven') {
                    content =
                      totalBagsGiven === 0
                        ? ''
                        : formatIndianNumber(totalBagsGiven, 0);
                  } else if (column.id === 'totalSeedAmount') {
                    content = formatIndianNumber(totalSeedAmount, 2);
                  }

                  return (
                    <TableCell
                      key={`footer-${column.id}`}
                      className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 align-middle text-sm font-semibold whitespace-nowrap last:border-r-0 ${
                        isNumeric && index !== 0
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

export default memo(FarmerSeedTable);
