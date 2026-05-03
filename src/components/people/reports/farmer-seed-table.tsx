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

export type AccountingFarmerSeedRow = {
  id: string;
  dateOfSeedDispatch: string;
  seedSizeGiven: string;
  totalBagsGiven: number;
  bagsGivenPerAcre: number;
  seedRatePerBag: number;
  totalSeedAmount: number;
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

const MOCK_ROWS: AccountingFarmerSeedRow[] = [
  {
    id: '1',
    dateOfSeedDispatch: '08/02/2026',
    seedSizeGiven: '30-40',
    totalBagsGiven: 48,
    bagsGivenPerAcre: 2.4,
    seedRatePerBag: 1250,
    totalSeedAmount: 48 * 1250,
  },
  {
    id: '2',
    dateOfSeedDispatch: '22/02/2026',
    seedSizeGiven: '35-40',
    totalBagsGiven: 64,
    bagsGivenPerAcre: 3.2,
    seedRatePerBag: 1325.5,
    totalSeedAmount: Math.round(64 * 1325.5 * 100) / 100,
  },
  {
    id: '3',
    dateOfSeedDispatch: '14/03/2026',
    seedSizeGiven: 'Below 30',
    totalBagsGiven: 36,
    bagsGivenPerAcre: 1.8,
    seedRatePerBag: 1180,
    totalSeedAmount: 36 * 1180,
  },
];

const numericColumnIds = new Set([
  'totalBagsGiven',
  'bagsGivenPerAcre',
  'seedRatePerBag',
  'totalSeedAmount',
]);

const columnHelper = createColumnHelper<AccountingFarmerSeedRow>();

const columns = [
  columnHelper.accessor('dateOfSeedDispatch', {
    header: 'Date of Seed Dispatch',
    sortingFn: 'alphanumeric',
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('seedSizeGiven', {
    header: 'Seed Size Given',
    sortingFn: 'text',
  }),
  columnHelper.accessor('totalBagsGiven', {
    header: () => <div className="w-full text-right">Total Bags Given</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('bagsGivenPerAcre', {
    header: () => <div className="w-full text-right">Bags Given Per Acre</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('seedRatePerBag', {
    header: () => <div className="w-full text-right">Seed Rate Per Bag</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatInr(Number(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('totalSeedAmount', {
    header: () => <div className="w-full text-right">Total Seed Amount</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatInr(Number(info.getValue()))}
      </div>
    ),
  }),
];

const FarmerSeedTable = () => {
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

export default FarmerSeedTable;
