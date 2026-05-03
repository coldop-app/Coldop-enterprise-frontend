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

export type AccountingGradingRow = {
  id: string;
  incomingManualGatePassNumber: string;
  gradingManualGatePassNumber: string;
  variety: string;
  gradingDate: string;
  below30: number;
  below30WeightKg: number;
  below30BagType: string;
  thirtyToForty: number;
  weight30to40Kg: number;
  bagType30to40: string;
  totalKg: number;
};

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

const MOCK_ROWS: AccountingGradingRow[] = [
  {
    id: '1',
    incomingManualGatePassNumber: 'MIG-24089',
    gradingManualGatePassNumber: 'GMG-8842',
    variety: 'PUSA-1121',
    gradingDate: '13/04/2026',
    below30: 42,
    below30WeightKg: 1048.5,
    below30BagType: 'Jute',
    thirtyToForty: 186,
    weight30to40Kg: 2756.25,
    bagType30to40: 'PP',
    totalKg: 3804.75,
  },
  {
    id: '2',
    incomingManualGatePassNumber: 'MIG-24090',
    gradingManualGatePassNumber: 'GMG-8845',
    variety: 'PR-126',
    gradingDate: '15/04/2026',
    below30: 58,
    below30WeightKg: 1422.0,
    below30BagType: 'PP',
    thirtyToForty: 224,
    weight30to40Kg: 3310.5,
    bagType30to40: 'Jute',
    totalKg: 4732.5,
  },
  {
    id: '3',
    incomingManualGatePassNumber: 'MIG-24091',
    gradingManualGatePassNumber: 'GMG-8851',
    variety: 'Basmati 1509',
    gradingDate: '19/04/2026',
    below30: 28,
    below30WeightKg: 695.75,
    below30BagType: 'Jute',
    thirtyToForty: 132,
    weight30to40Kg: 1955.0,
    bagType30to40: 'PP',
    totalKg: 2650.75,
  },
];

const numericColumnIds = new Set([
  'below30',
  'below30WeightKg',
  'thirtyToForty',
  'weight30to40Kg',
  'totalKg',
]);

const columnHelper = createColumnHelper<AccountingGradingRow>();

const columns = [
  columnHelper.accessor('incomingManualGatePassNumber', {
    header: 'Incoming Manual Gate Pass Number',
    sortingFn: 'alphanumeric',
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('gradingManualGatePassNumber', {
    header: 'Grading Manual Gate Pass Number',
    sortingFn: 'alphanumeric',
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
  }),
  columnHelper.accessor('gradingDate', {
    header: 'Grading Date',
    sortingFn: 'alphanumeric',
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
  columnHelper.accessor('below30WeightKg', {
    header: () => <div className="w-full text-right">Weight (Kg)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('below30BagType', {
    header: 'Bag Type',
    sortingFn: 'text',
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
  columnHelper.accessor('weight30to40Kg', {
    header: () => <div className="w-full text-right">Weight (Kg)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('bagType30to40', {
    header: 'Bag Type',
    sortingFn: 'text',
  }),
  columnHelper.accessor('totalKg', {
    header: () => <div className="w-full text-right">Total</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 2)}
      </div>
    ),
  }),
];

const GradingTable = () => {
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

export default GradingTable;
