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
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AccountingVarietyGroup } from '@/components/people/reports/accounting-report/accounting-variety-grouped';

/** Reserve space for native scrollbar over sticky footer (matches analytics incoming report). */
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;

export type AccountingIncomingRow = {
  id: string;
  manualIncomingGatePassNumber: string;
  incomingDate: string;
  store: string;
  truckNumber: string;
  variety: string;
  bags: number;
  weightSlipNumber: string;
  grossKg: number;
  tareKg: number;
  netKg: number;
  bardanaWeight: number;
  actualKg: number;
};

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/** Same 2dp rounding as `roundMax2`; whole numbers omit decimals, else up to 2 fractional digits. */
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

const MOCK_ROWS: AccountingIncomingRow[] = [
  {
    id: '1',
    manualIncomingGatePassNumber: 'MIG-24089',
    incomingDate: '12/04/2026',
    store: 'Bhatti Cold Store — Block A',
    truckNumber: 'PB-10-AB-4521',
    variety: 'PUSA-1121',
    bags: 248,
    weightSlipNumber: 'WS-2026-00412',
    grossKg: 12480.5,
    tareKg: 8520.0,
    netKg: 3960.5,
    bardanaWeight: 62.25,
    actualKg: 3898.25,
  },
  {
    id: '2',
    manualIncomingGatePassNumber: 'MIG-24090',
    incomingDate: '14/04/2026',
    store: 'Bhatti Cold Store — Block B',
    truckNumber: 'HR-38-CD-9910',
    variety: 'PR-126',
    bags: 312,
    weightSlipNumber: 'WS-2026-00418',
    grossKg: 15620.75,
    tareKg: 10110.5,
    netKg: 5510.25,
    bardanaWeight: 78.0,
    actualKg: 5432.25,
  },
  {
    id: '3',
    manualIncomingGatePassNumber: 'MIG-24091',
    incomingDate: '18/04/2026',
    store: 'Bhatti Cold Store — Block A',
    truckNumber: 'DL-01-EF-3300',
    variety: 'Basmati 1509',
    bags: 180,
    weightSlipNumber: 'WS-2026-00425',
    grossKg: 9025.0,
    tareKg: 6120.25,
    netKg: 2904.75,
    bardanaWeight: 45.0,
    actualKg: 2859.75,
  },
];

const numericColumnIds = new Set([
  'bags',
  'grossKg',
  'tareKg',
  'netKg',
  'bardanaWeight',
  'actualKg',
]);

/** Weight columns summed in footer (analytics-style totals row). */
const TOTALS_WEIGHT_COLUMN_IDS = new Set([
  'grossKg',
  'tareKg',
  'netKg',
  'bardanaWeight',
  'actualKg',
]);

function sumRoundedKg(
  rows: AccountingIncomingRow[],
  key: keyof AccountingIncomingRow
) {
  let sum = 0;
  for (const row of rows) {
    sum += Number(row[key]) || 0;
  }
  return Math.round((sum + Number.EPSILON) * 100) / 100;
}

const columnHelper = createColumnHelper<AccountingIncomingRow>();

const columns = [
  columnHelper.accessor('manualIncomingGatePassNumber', {
    header: 'Manual Incoming Gate Pass Number',
    sortingFn: 'alphanumeric',
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('incomingDate', {
    header: 'Incoming Date',
    sortingFn: 'alphanumeric',
  }),
  columnHelper.accessor('store', {
    header: 'Store',
    sortingFn: 'text',
    minSize: 220,
  }),
  columnHelper.accessor('truckNumber', {
    header: 'Truck Number',
    sortingFn: 'text',
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
  }),
  columnHelper.accessor('bags', {
    header: () => <div className="w-full text-right">Bags</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('weightSlipNumber', {
    header: 'Weight Slip Number',
    sortingFn: 'alphanumeric',
  }),
  columnHelper.accessor('grossKg', {
    header: () => <div className="w-full text-right">Gross (Kg)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianWeightKg(Number(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('tareKg', {
    header: () => <div className="w-full text-right">Tare (Kg)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianWeightKg(Number(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('netKg', {
    header: () => <div className="w-full text-right">Net (Kg)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatIndianWeightKg(Number(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('bardanaWeight', {
    header: () => <div className="w-full text-right">Bardana Weight (Kg)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianWeightKg(Number(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('actualKg', {
    header: () => <div className="w-full text-right">Actual (Kg)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatIndianWeightKg(Number(info.getValue()))}
      </div>
    ),
  }),
];

const MDASH = '\u2014';

export interface IncomingTableProps {
  /** When omitted, demo rows are shown (e.g. accounting report placeholder). */
  rows?: AccountingIncomingRow[];
  /**
   * When set, renders one table with a full-width “Variety: …” row per group,
   * data rows, then a per-variety subtotal row (grand footer omitted).
   */
  varietyGroups?: AccountingVarietyGroup<AccountingIncomingRow>[] | null;
}

const INCOMING_TABLE_COLUMN_COUNT = 12;

function IncomingVarietyGroupedTable({
  groups,
}: {
  groups: AccountingVarietyGroup<AccountingIncomingRow>[];
}) {
  const colCount = INCOMING_TABLE_COLUMN_COUNT;

  const renderDataRow = (row: AccountingIncomingRow, zebra: number) => (
    <TableRow
      key={row.id}
      className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${
        zebra % 2 === 0 ? 'bg-background' : 'bg-muted/25'
      }`}
    >
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        <span className="font-custom font-medium">
          {row.manualIncomingGatePassNumber}
        </span>
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        {row.incomingDate}
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        {row.store}
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        {row.truckNumber}
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        {row.variety}
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        <div className="w-full text-right tabular-nums">
          {formatIndianNumber(Number(row.bags), 0)}
        </div>
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        {row.weightSlipNumber}
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        <div className="w-full text-right tabular-nums">
          {formatIndianWeightKg(Number(row.grossKg))}
        </div>
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        <div className="w-full text-right tabular-nums">
          {formatIndianWeightKg(Number(row.tareKg))}
        </div>
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        <div className="w-full text-right font-medium tabular-nums">
          {formatIndianWeightKg(Number(row.netKg))}
        </div>
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap">
        <div className="w-full text-right tabular-nums">
          {formatIndianWeightKg(Number(row.bardanaWeight))}
        </div>
      </TableCell>
      <TableCell className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap last:border-r-0">
        <div className="w-full text-right font-medium tabular-nums">
          {formatIndianWeightKg(Number(row.actualKg))}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderSubtotalRow = (
    varietyKey: string,
    sectionRows: AccountingIncomingRow[]
  ) => {
    const bagsSum = sectionRows.reduce((s, r) => s + (Number(r.bags) || 0), 0);
    const grossSum = sumRoundedKg(sectionRows, 'grossKg');
    const tareSum = sumRoundedKg(sectionRows, 'tareKg');
    const netSum = sumRoundedKg(sectionRows, 'netKg');
    const bardSum = sumRoundedKg(sectionRows, 'bardanaWeight');
    const actSum = sumRoundedKg(sectionRows, 'actualKg');

    return (
      <TableRow
        key={`ft-${varietyKey}`}
        className="bg-secondary/70 border-border/50 border-b hover:bg-transparent"
      >
        <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 align-middle text-sm font-semibold whitespace-nowrap">
          Total
        </TableCell>
        <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
          {MDASH}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
          {MDASH}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
          {MDASH}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
          {MDASH}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {bagsSum === 0 ? '' : formatIndianNumber(bagsSum, 0)}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-muted-foreground h-10 border-r px-3 py-2.5 text-center text-sm font-semibold">
          {MDASH}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {grossSum === 0 ? (
            ''
          ) : (
            <div className="w-full text-right">
              {formatIndianWeightKg(grossSum)}
            </div>
          )}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {tareSum === 0 ? (
            ''
          ) : (
            <div className="w-full text-right">
              {formatIndianWeightKg(tareSum)}
            </div>
          )}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {netSum === 0 ? (
            ''
          ) : (
            <div className="w-full text-right">
              {formatIndianWeightKg(netSum)}
            </div>
          )}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {bardSum === 0 ? (
            ''
          ) : (
            <div className="w-full text-right">
              {formatIndianWeightKg(bardSum)}
            </div>
          )}
        </TableCell>
        <TableCell className="font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-right text-sm font-semibold whitespace-nowrap tabular-nums last:border-r-0">
          {actSum === 0 ? (
            ''
          ) : (
            <div className="w-full text-right">
              {formatIndianWeightKg(actSum)}
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  };

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
                Manual Incoming Gate Pass Number
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Incoming Date
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Store
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Truck Number
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Variety
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Bags
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Weight Slip Number
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Gross (Kg)
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Tare (Kg)
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Net (Kg)
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none">
                Bardana Weight (Kg)
              </TableHead>
              <TableHead className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-right text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0">
                Actual (Kg)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!hasAnyRows ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="font-custom text-muted-foreground px-3 py-8 text-center"
                >
                  No incoming rows to show.
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
                      colSpan={colCount}
                      className="font-custom text-foreground border-border/40 border-r px-3 py-2.5 text-sm font-semibold tracking-wide last:border-r-0"
                    >
                      Variety: {group.varietyLabel}
                    </TableCell>
                  </TableRow>,
                ];
                let zebra = 0;
                for (const row of group.rows) {
                  block.push(renderDataRow(row, zebra));
                  zebra += 1;
                }
                block.push(renderSubtotalRow(group.varietyKey, group.rows));
                return block;
              })
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

const IncomingTable = ({ rows, varietyGroups }: IncomingTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => rows ?? MOCK_ROWS, [rows]);

  const totalsByColumn = useMemo(() => {
    return {
      grossKg: sumRoundedKg(data, 'grossKg'),
      tareKg: sumRoundedKg(data, 'tareKg'),
      netKg: sumRoundedKg(data, 'netKg'),
      bardanaWeight: sumRoundedKg(data, 'bardanaWeight'),
      actualKg: sumRoundedKg(data, 'actualKg'),
    };
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  if (varietyGroups != null) {
    return <IncomingVarietyGroupedTable groups={varietyGroups} />;
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
          {data.length > 0 ? (
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
                  const totalsText =
                    columnId === 'grossKg'
                      ? formatIndianWeightKg(totalsByColumn.grossKg)
                      : columnId === 'tareKg'
                        ? formatIndianWeightKg(totalsByColumn.tareKg)
                        : columnId === 'netKg'
                          ? formatIndianWeightKg(totalsByColumn.netKg)
                          : columnId === 'bardanaWeight'
                            ? formatIndianWeightKg(totalsByColumn.bardanaWeight)
                            : columnId === 'actualKg'
                              ? formatIndianWeightKg(totalsByColumn.actualKg)
                              : '';

                  let content: ReactNode;
                  if (columnIndex === 0) {
                    content = 'Total';
                  } else if (
                    totalsText &&
                    TOTALS_WEIGHT_COLUMN_IDS.has(columnId)
                  ) {
                    content = (
                      <div className="w-full text-right tabular-nums">
                        {totalsText}
                      </div>
                    );
                  } else {
                    content = '';
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

export default memo(IncomingTable);
