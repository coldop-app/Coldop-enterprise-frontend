import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type AccountingSummaryRow = {
  id: string;
  type: string;
  below30: number;
  thirtyToForty: number;
  thirtyFiveToForty: number;
  weightPerBagKg: number;
  weightReceivedKg: number;
  bardanaWeightKg: number;
  actualWeightKg: number;
  rate: number;
  amountPayable: number;
  percentageGradedSizes: number;
};

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function formatInr(value: number): string {
  return value.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const MOCK_ROWS: AccountingSummaryRow[] = [
  {
    id: '1',
    type: 'Incoming (net)',
    below30: 42,
    thirtyToForty: 186,
    thirtyFiveToForty: 142,
    weightPerBagKg: 49.75,
    weightReceivedKg: 9253.5,
    bardanaWeightKg: 58.25,
    actualWeightKg: 9195.25,
    rate: 2850.5,
    amountPayable: Math.round((9195.25 / 100) * 2850.5 * 100) / 100,
    percentageGradedSizes: 76.25,
  },
  {
    id: '2',
    type: 'Graded payable',
    below30: 58,
    thirtyToForty: 224,
    thirtyFiveToForty: 168,
    weightPerBagKg: 50.2,
    weightReceivedKg: 11312.8,
    bardanaWeightKg: 72.4,
    actualWeightKg: 11240.4,
    rate: 2922.0,
    amountPayable: Math.round((11240.4 / 100) * 2922.0 * 100) / 100,
    percentageGradedSizes: 82.4,
  },
  {
    id: '3',
    type: 'Final settlement',
    below30: 28,
    thirtyToForty: 132,
    thirtyFiveToForty: 96,
    weightPerBagKg: 48.9,
    weightReceivedKg: 6458.25,
    bardanaWeightKg: 41.0,
    actualWeightKg: 6417.25,
    rate: 2788.75,
    amountPayable: Math.round((6417.25 / 100) * 2788.75 * 100) / 100,
    percentageGradedSizes: 71.5,
  },
];

const numericColumnIds = new Set([
  'below30',
  'thirtyToForty',
  'thirtyFiveToForty',
  'weightPerBagKg',
  'weightReceivedKg',
  'bardanaWeightKg',
  'actualWeightKg',
  'rate',
  'amountPayable',
  'percentageGradedSizes',
]);

const columnHelper = createColumnHelper<AccountingSummaryRow>();

const columns = [
  columnHelper.accessor('type', {
    header: 'Type',
    sortingFn: 'text',
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('below30', {
    header: () => <div className="w-full text-right">Below 30</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('thirtyToForty', {
    header: () => <div className="w-full text-right">30-40</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('thirtyFiveToForty', {
    header: () => <div className="w-full text-right">35-40</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('weightPerBagKg', {
    header: () => <div className="w-full text-right">Weight per bag</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('weightReceivedKg', {
    header: () => <div className="w-full text-right">Weight Received</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('bardanaWeightKg', {
    header: () => <div className="w-full text-right">Bardana Weight</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('actualWeightKg', {
    header: () => <div className="w-full text-right">Actual Weight</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('rate', {
    header: () => <div className="w-full text-right">Rate</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('amountPayable', {
    header: () => <div className="w-full text-right">Amount Payable</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatInr(Number(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('percentageGradedSizes', {
    header: () => (
      <div className="w-full text-right">Percentage of Graded Sizes</div>
    ),
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}%
      </div>
    ),
  }),
];

const SummaryTable = () => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => MOCK_ROWS, []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

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
            {table.getRowModel().rows.map((row, index) => (
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  );
};

export default SummaryTable;
