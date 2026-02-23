import React, { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Item } from '@/components/ui/item';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import { GRADING_SIZES } from '@/components/forms/grading/constants';
import { SIZE_HEADER_LABELS } from '@/components/pdf/gradingVoucherCalculations';

/** Row type for table: grading gate pass with optional manual numbers if API returns them */
type GradingGatePassRow = GradingGatePass & {
  manualGatePassNumber?: number;
  incomingManualGatePassNumber?: number;
};

/** Format ISO date string as DD/MM/YY */
function formatDateDDMMYY(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(2);
  return `${day}/${month}/${year}`;
}

/** Format number with locale (e.g. 37144 → "37,144") */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

/** Sum of bags from orderDetails (initialQuantity or currentQuantity) */
function getPostGradingBags(pass: GradingGatePassRow): number {
  if (!pass.orderDetails?.length) return 0;
  return pass.orderDetails.reduce(
    (sum, d) => sum + (d.initialQuantity ?? d.currentQuantity ?? 0),
    0
  );
}

/** Weight received after grading: sum of (bags × weightPerBagKg) across all sizes and types */
function getWtReceivedAfterGrading(pass: GradingGatePassRow): number {
  const { bags: juteBags, weightPerBag: juteWt } =
    getSizeBagsAndWeightJute(pass);
  const { bags: lenoBags, weightPerBag: lenoWt } =
    getSizeBagsAndWeightLeno(pass);
  let sum = 0;
  for (const size of GRADING_SIZES) {
    sum +=
      (juteBags[size] ?? 0) * (juteWt[size] ?? 0) +
      (lenoBags[size] ?? 0) * (lenoWt[size] ?? 0);
  }
  return sum;
}

/** Per-size JUTE bags and weight per bag (kg) from orderDetails */
function getSizeBagsAndWeightJute(pass: GradingGatePassRow): {
  bags: Record<string, number>;
  weightPerBag: Record<string, number>;
} {
  const bags: Record<string, number> = {};
  const weightPerBag: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    bags[size] = 0;
    weightPerBag[size] = 0;
  }
  if (!pass.orderDetails?.length) return { bags, weightPerBag };
  for (const od of pass.orderDetails) {
    if (!GRADING_SIZES.includes(od.size as (typeof GRADING_SIZES)[number]))
      continue;
    const isLeno = od.bagType?.toUpperCase() === 'LENO';
    if (isLeno) continue;
    const qty = od.initialQuantity ?? od.currentQuantity ?? 0;
    bags[od.size] = (bags[od.size] ?? 0) + qty;
    if (od.weightPerBagKg != null) weightPerBag[od.size] = od.weightPerBagKg;
  }
  return { bags, weightPerBag };
}

/** Per-size LENO bags and weight per bag (kg) from orderDetails */
function getSizeBagsAndWeightLeno(pass: GradingGatePassRow): {
  bags: Record<string, number>;
  weightPerBag: Record<string, number>;
} {
  const bags: Record<string, number> = {};
  const weightPerBag: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    bags[size] = 0;
    weightPerBag[size] = 0;
  }
  if (!pass.orderDetails?.length) return { bags, weightPerBag };
  for (const od of pass.orderDetails) {
    if (!GRADING_SIZES.includes(od.size as (typeof GRADING_SIZES)[number]))
      continue;
    const isLeno = od.bagType?.toUpperCase() === 'LENO';
    if (!isLeno) continue;
    const qty = od.initialQuantity ?? od.currentQuantity ?? 0;
    bags[od.size] = (bags[od.size] ?? 0) + qty;
    if (od.weightPerBagKg != null) weightPerBag[od.size] = od.weightPerBagKg;
  }
  return { bags, weightPerBag };
}

const gradingColumns: ColumnDef<GradingGatePassRow>[] = [
  {
    accessorKey: 'incomingGatePassId.gatePassNo',
    id: 'gpNo',
    header: 'Gp No',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="font-custom font-medium">
        {row.original.incomingGatePassId?.gatePassNo ?? '—'}
      </div>
    ),
  },
  {
    id: 'manualNo',
    header: 'Manual No',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom">
        {row.original.incomingManualGatePassNumber ??
          (row.original.incomingGatePassId as { manualGatePassNumber?: number })
            ?.manualGatePassNumber ??
          '—'}
      </div>
    ),
  },
  {
    accessorKey: 'gatePassNo',
    id: 'ggpNo',
    header: 'GGP No',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="font-custom font-medium">{row.original.gatePassNo}</div>
    ),
  },
  {
    id: 'manualGgpNo',
    header: 'Manual GGP',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom">
        {row.original.manualGatePassNumber ?? '—'}
      </div>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Date',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom">{formatDateDDMMYY(row.original.date)}</div>
    ),
  },
  {
    id: 'store',
    header: 'Store',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom max-w-[160px] min-w-0 wrap-break-word whitespace-normal">
        {row.original.incomingGatePassId?.farmerStorageLinkId?.farmerId?.name ??
          '—'}
      </div>
    ),
  },
  {
    accessorKey: 'variety',
    header: 'Variety',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom">{row.original.variety ?? '—'}</div>
    ),
  },
  {
    id: 'truckNumber',
    header: 'Truck',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom">
        {row.original.incomingGatePassId?.truckNumber ?? '—'}
      </div>
    ),
  },
  {
    id: 'bagsReceived',
    header: () => <div className="text-right">Bags Rec.</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom text-right font-medium">
        {formatNumber(row.original.incomingGatePassId?.bagsReceived ?? 0)}
      </div>
    ),
  },
  {
    id: 'grossWeightKg',
    header: () => <div className="text-right">Gross</div>,
    enableSorting: false,
    cell: () => <div className="font-custom text-right font-medium">—</div>,
  },
  {
    id: 'tareWeightKg',
    header: () => <div className="text-right">Tare</div>,
    enableSorting: false,
    cell: () => <div className="font-custom text-right font-medium">—</div>,
  },
  {
    id: 'netWeightKg',
    header: () => <div className="text-right">Net</div>,
    enableSorting: false,
    cell: () => (
      <div className="font-custom text-primary text-right font-medium">—</div>
    ),
  },
  {
    id: 'postGradingBags',
    header: () => <div className="text-right">Post Gr.</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom text-right font-medium">
        {formatNumber(getPostGradingBags(row.original))}
      </div>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    enableSorting: false,
    cell: ({ row }) => {
      const { bags: juteBags } = getSizeBagsAndWeightJute(row.original);
      const { bags: lenoBags } = getSizeBagsAndWeightLeno(row.original);
      const hasJute = Object.values(juteBags).some((v) => v > 0);
      const hasLeno = Object.values(lenoBags).some((v) => v > 0);
      const parts: string[] = [];
      if (hasJute) parts.push('JUTE');
      if (hasLeno) parts.push('LENO');
      return (
        <div className="font-custom text-center text-xs">
          {parts.length ? parts.join(' / ') : '—'}
        </div>
      );
    },
  },
  ...GRADING_SIZES.map(
    (size): ColumnDef<GradingGatePassRow> => ({
      id: `size-${size.replace(/\s/g, '-')}`,
      header: () => (
        <div className="font-custom text-center text-xs">
          {SIZE_HEADER_LABELS[size] ?? size}
        </div>
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const { bags: juteBags, weightPerBag: juteWt } =
          getSizeBagsAndWeightJute(row.original);
        const { bags: lenoBags, weightPerBag: lenoWt } =
          getSizeBagsAndWeightLeno(row.original);
        const jQty = juteBags[size] ?? 0;
        const lQty = lenoBags[size] ?? 0;
        const jWt = juteWt[size];
        const lWt = lenoWt[size];
        const jShow = jQty > 0;
        const lShow = lQty > 0;
        if (!jShow && !lShow) {
          return <div className="font-custom text-center text-xs">—</div>;
        }
        return (
          <div className="font-custom flex flex-col gap-0.5 text-center text-xs">
            {jShow && (
              <span>
                J: {formatNumber(jQty)}
                {jWt != null && !Number.isNaN(jWt) && jWt > 0
                  ? ` (${jWt})`
                  : ''}
              </span>
            )}
            {lShow && (
              <span>
                L: {formatNumber(lQty)}
                {lWt != null && !Number.isNaN(lWt) && lWt > 0
                  ? ` (${lWt})`
                  : ''}
              </span>
            )}
          </div>
        );
      },
    })
  ),
  {
    id: 'wtRecAfterGr',
    header: () => (
      <div className="font-custom text-center text-xs">Wt Rec. After Gr.</div>
    ),
    enableSorting: false,
    cell: () => null,
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom max-w-[180px] text-left wrap-break-word">
        {row.original.remarks ?? '—'}
      </div>
    ),
  },
];

/** Footer totals for grading table */
export interface GradingTableFooterTotals {
  bagsReceived: number;
  postGradingBags: number;
  wtReceivedAfterGrading: number;
  sizeTotals: Record<string, number>;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  footerTotals?: GradingTableFooterTotals;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

function DataTable<TData, TValue>({
  columns,
  data,
  footerTotals,
  searchPlaceholder,
  searchValue = '',
  onSearchChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([
    { id: 'ggpNo', desc: true },
  ]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(next ?? []);
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(pagination) : updater;
      setPagination(next ?? { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });
    },
    state: {
      sorting,
      pagination,
    },
  });

  const rowCount = table.getRowModel().rows.length;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  const totalCols = columns.length;

  return (
    <div className="font-custom space-y-3">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {onSearchChange != null && (
              <div className="relative max-w-sm min-w-[200px] flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="search"
                  placeholder={searchPlaceholder ?? 'Search…'}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="font-custom focus-visible:ring-primary h-9 rounded-lg border bg-white pr-3 pl-9 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-0"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-custom text-sm font-medium text-[#333]">
                Sort by GGP No:
              </span>
              <div className="border-input flex rounded-lg border bg-white shadow-sm">
                <Button
                  variant={sorting[0]?.desc === true ? 'default' : 'ghost'}
                  size="sm"
                  className="font-custom h-9 rounded-lg px-3 text-sm font-medium"
                  onClick={() => setSorting([{ id: 'ggpNo', desc: true }])}
                >
                  Latest first
                </Button>
                <Button
                  variant={sorting[0]?.desc === false ? 'default' : 'ghost'}
                  size="sm"
                  className="font-custom h-9 rounded-lg px-3 text-sm font-medium"
                  onClick={() => setSorting([{ id: 'ggpNo', desc: false }])}
                >
                  Oldest first
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-custom text-sm font-medium text-[#333]">
              Passes per page:
            </span>
            <div className="relative">
              <select
                className="font-custom border-input focus-visible:ring-primary h-9 appearance-none rounded-lg border bg-white px-3 pr-8 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
                value={pagination.pageSize}
                onChange={(e) => {
                  const pageSize = Number(e.target.value);
                  setPagination({ pageIndex: 0, pageSize });
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2" />
            </div>
          </div>
        </div>
      </Item>
      <div className="border-border overflow-x-auto overflow-y-hidden rounded-lg border">
        <Table className="[&_th]:border-border [&_td]:border-border border-collapse [&_td]:border [&_td]:px-3 [&_td]:py-2.5 [&_th]:border [&_th]:px-3 [&_th]:py-2.5">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-secondary hover:bg-secondary"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-custom text-foreground font-bold"
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
            {rowCount ? (
              table.getRowModel().rows.map((row) => {
                const pass = row.original as GradingGatePassRow;
                const jute = getSizeBagsAndWeightJute(pass);
                const leno = getSizeBagsAndWeightLeno(pass);
                const wtRec = getWtReceivedAfterGrading(pass);
                const hasJute = Object.values(jute.bags).some((v) => v > 0);
                const hasLeno = Object.values(leno.bags).some((v) => v > 0);
                const spanClass = 'align-top';
                return (
                  <React.Fragment key={pass._id}>
                    {/* JUTE row */}
                    <TableRow className="bg-background">
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom font-medium">
                          {pass.incomingGatePassId?.gatePassNo ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom">
                          {pass.incomingManualGatePassNumber ??
                            (
                              pass.incomingGatePassId as {
                                manualGatePassNumber?: number;
                              }
                            )?.manualGatePassNumber ??
                            '—'}
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom font-medium">
                          {pass.gatePassNo}
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom">
                          {pass.manualGatePassNumber ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom">
                          {formatDateDDMMYY(pass.date)}
                        </div>
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        className={`min-w-0 whitespace-normal ${spanClass}`}
                      >
                        <div className="font-custom max-w-[160px] wrap-break-word">
                          {pass.incomingGatePassId?.farmerStorageLinkId
                            ?.farmerId?.name ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom">{pass.variety ?? '—'}</div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom">
                          {pass.incomingGatePassId?.truckNumber ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom text-right font-medium">
                          {formatNumber(
                            pass.incomingGatePassId?.bagsReceived ?? 0
                          )}
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom text-right font-medium">
                          —
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom text-right font-medium">
                          —
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom text-primary text-right font-medium">
                          —
                        </div>
                      </TableCell>
                      <TableCell rowSpan={2} className={spanClass}>
                        <div className="font-custom text-right font-medium">
                          {formatNumber(getPostGradingBags(pass))}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-0 whitespace-normal">
                        <div className="font-custom text-center text-xs">
                          {hasJute ? 'JUTE' : '—'}
                        </div>
                      </TableCell>
                      {GRADING_SIZES.map((size) => {
                        const qty = jute.bags[size] ?? 0;
                        const wt = jute.weightPerBag[size];
                        return (
                          <TableCell
                            key={size}
                            className="min-w-0 text-center text-xs whitespace-normal"
                          >
                            <div className="font-custom">
                              {qty > 0
                                ? `${formatNumber(qty)}${wt != null && !Number.isNaN(wt) && wt > 0 ? ` (${wt})` : ''}`
                                : '—'}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell
                        rowSpan={2}
                        className={`text-right ${spanClass}`}
                      >
                        <div className="font-custom font-medium">
                          {wtRec > 0
                            ? formatNumber(Math.round(wtRec * 100) / 100)
                            : '—'}
                        </div>
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        className={`min-w-0 whitespace-normal ${spanClass}`}
                      >
                        <div className="font-custom max-w-[180px] wrap-break-word">
                          {pass.remarks ?? '—'}
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* LENO row */}
                    <TableRow className="bg-background">
                      <TableCell className="min-w-0 whitespace-normal">
                        <div className="font-custom text-center text-xs">
                          {hasLeno ? 'LENO' : '—'}
                        </div>
                      </TableCell>
                      {GRADING_SIZES.map((size) => {
                        const qty = leno.bags[size] ?? 0;
                        const wt = leno.weightPerBag[size];
                        return (
                          <TableCell
                            key={size}
                            className="min-w-0 text-center text-xs whitespace-normal"
                          >
                            <div className="font-custom">
                              {qty > 0
                                ? `${formatNumber(qty)}${wt != null && !Number.isNaN(wt) && wt > 0 ? ` (${wt})` : ''}`
                                : '—'}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="font-custom text-muted-foreground h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {totalRows > 0 && (
            <TableFooter className="border-border bg-primary/10 [&_td]:border [&_td]:px-3 [&_td]:py-2.5">
              <TableRow className="hover:bg-primary/10">
                {footerTotals ? (
                  <>
                    <TableCell
                      colSpan={8}
                      className="font-custom text-foreground font-bold"
                    >
                      Total
                    </TableCell>
                    <TableCell className="font-custom text-right font-bold">
                      {formatNumber(footerTotals.bagsReceived)}
                    </TableCell>
                    <TableCell
                      colSpan={3}
                      className="font-custom text-right font-bold"
                    >
                      —
                    </TableCell>
                    <TableCell className="font-custom text-right font-bold">
                      {formatNumber(footerTotals.postGradingBags)}
                    </TableCell>
                    <TableCell className="font-custom font-bold" />
                    {GRADING_SIZES.map((size) => (
                      <TableCell
                        key={size}
                        className="font-custom text-center text-xs font-bold"
                      >
                        {(footerTotals.sizeTotals[size] ?? 0) > 0
                          ? formatNumber(footerTotals.sizeTotals[size] ?? 0)
                          : '—'}
                      </TableCell>
                    ))}
                    <TableCell className="font-custom text-right font-bold">
                      {(footerTotals.wtReceivedAfterGrading ?? 0) > 0
                        ? formatNumber(
                            Math.round(
                              (footerTotals.wtReceivedAfterGrading ?? 0) * 100
                            ) / 100
                          )
                        : '—'}
                    </TableCell>
                    <TableCell className="font-custom font-bold" />
                  </>
                ) : (
                  <>
                    <TableCell
                      colSpan={totalCols - 1}
                      className="font-custom text-foreground font-bold"
                    >
                      Total
                    </TableCell>
                    <TableCell className="font-custom text-primary text-right font-bold">
                      {formatNumber(rowCount)} gate pass
                      {rowCount !== 1 ? 'es' : ''}
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      {totalRows > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-custom text-muted-foreground text-sm">
            Showing {formatNumber(table.getRowModel().rows.length * 2)} rows (
            {formatNumber(table.getRowModel().rows.length)} gate pass
            {table.getRowModel().rows.length !== 1 ? 'es' : ''}) of{' '}
            {formatNumber(totalRows)} gate pass{totalRows !== 1 ? 'es' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-custom h-8 gap-1 px-2"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="font-custom text-sm">
              Page {currentPage} of {pageCount || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="font-custom h-8 gap-1 px-2"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface GradingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<GradingGatePass[]>;
}

const GradingGatePassAnalyticsScreen = ({
  queryResult,
}: GradingGatePassAnalyticsScreenProps) => {
  const { data, isPending, error } = queryResult;
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const list: GradingGatePassRow[] = (data ?? []).map((pass) => ({
      ...pass,
      manualGatePassNumber: (pass as GradingGatePassRow).manualGatePassNumber,
      incomingManualGatePassNumber: (
        pass.incomingGatePassId as { manualGatePassNumber?: number }
      )?.manualGatePassNumber,
    }));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const name =
        row.incomingGatePassId?.farmerStorageLinkId?.farmerId?.name?.toLowerCase() ??
        '';
      const truck = row.incomingGatePassId?.truckNumber?.toLowerCase() ?? '';
      const gpNo = String(row.gatePassNo ?? '').toLowerCase();
      const incomingGpNo = String(
        row.incomingGatePassId?.gatePassNo ?? ''
      ).toLowerCase();
      return (
        name.includes(q) ||
        truck.includes(q) ||
        gpNo.includes(q) ||
        incomingGpNo.includes(q)
      );
    });
  }, [data, search]);

  if (isPending) {
    return (
      <p className="font-custom text-sm leading-relaxed text-gray-600">
        Loading grading gate passes…
      </p>
    );
  }

  if (error) {
    return (
      <p className="font-custom text-destructive text-sm leading-relaxed">
        Error: {error.message}
      </p>
    );
  }

  const footerTotals =
    filteredRows.length > 0
      ? (() => {
          let bagsReceived = 0;
          let postGradingBags = 0;
          let wtReceivedAfterGrading = 0;
          const sizeTotals: Record<string, number> = {};
          for (const size of GRADING_SIZES) sizeTotals[size] = 0;
          for (const row of filteredRows) {
            bagsReceived += row.incomingGatePassId?.bagsReceived ?? 0;
            postGradingBags += getPostGradingBags(row);
            wtReceivedAfterGrading += getWtReceivedAfterGrading(row);
            const jute = getSizeBagsAndWeightJute(row);
            const leno = getSizeBagsAndWeightLeno(row);
            for (const size of GRADING_SIZES) {
              sizeTotals[size] +=
                (jute.bags[size] ?? 0) + (leno.bags[size] ?? 0);
            }
          }
          return {
            bagsReceived,
            postGradingBags,
            wtReceivedAfterGrading,
            sizeTotals,
          };
        })()
      : undefined;

  return (
    <div className="max-h-[70vh] space-y-3 overflow-auto">
      <DataTable
        columns={gradingColumns}
        data={filteredRows}
        footerTotals={footerTotals}
        searchPlaceholder="Search by farmer name, truck, or gate pass no"
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );
};

export default GradingGatePassAnalyticsScreen;
