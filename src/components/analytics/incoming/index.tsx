import { useMemo, useState } from 'react';
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
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import type { IncomingGatePassWithLinkWithStatus } from '@/types/analytics';

/** Row type: base incoming gate pass; may include gradingStatus when from report API */
type IncomingGatePassRow = IncomingGatePassWithLink & {
  gradingStatus?: 'Graded' | 'Ungraded';
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

/** Format weight in kg with 2 decimals */
function formatWeight(kg: number | undefined): string {
  if (kg == null) return '—';
  return `${formatNumber(Math.round(kg * 100) / 100)}`;
}

const incomingColumns: ColumnDef<IncomingGatePassRow>[] = [
  {
    accessorKey: 'gatePassNo',
    header: 'GP No',
    enableSorting: true,
    cell: ({ row }) => (
      <div className="font-custom font-medium">{row.original.gatePassNo}</div>
    ),
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: 'Manual',
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
    id: 'farmerName',
    header: 'Farmer Name',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom max-w-[180px] min-w-0 wrap-break-word whitespace-normal">
        {row.original.farmerStorageLinkId?.farmerId?.name ?? '—'}
      </div>
    ),
  },
  {
    accessorKey: 'truckNumber',
    header: 'Truck No',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom">{row.original.truckNumber ?? '—'}</div>
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
    accessorKey: 'bagsReceived',
    header: () => <div className="text-right">Bags</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom text-right font-medium">
        {formatNumber(row.original.bagsReceived)}
      </div>
    ),
  },
  {
    id: 'grossWeightKg',
    header: () => <div className="text-right">Gross (kg)</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom text-right font-medium">
        {formatWeight(row.original.weightSlip?.grossWeightKg)}
      </div>
    ),
  },
  {
    id: 'tareWeightKg',
    header: () => <div className="text-right">Tare (kg)</div>,
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom text-right font-medium">
        {formatWeight(row.original.weightSlip?.tareWeightKg)}
      </div>
    ),
  },
  {
    id: 'netWeightKg',
    header: () => <div className="text-right">Net (kg)</div>,
    enableSorting: false,
    cell: ({ row }) => {
      const slip = row.original.weightSlip;
      const net =
        slip?.grossWeightKg != null && slip?.tareWeightKg != null
          ? slip.grossWeightKg - slip.tareWeightKg
          : undefined;
      return (
        <div className="font-custom text-primary text-right font-medium">
          {formatWeight(net)}
        </div>
      );
    },
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    enableSorting: false,
    cell: ({ row }) => (
      <div className="font-custom max-w-[240px] text-left wrap-break-word">
        {row.original.remarks ?? '—'}
      </div>
    ),
  },
];

/** Totals for the footer row (Bags, Gross, Tare, Net) */
export interface IncomingTableFooterTotals {
  bags: number;
  grossKg: number;
  tareKg: number;
  netKg: number;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  footerTotals?: IncomingTableFooterTotals;
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
    { id: 'gatePassNo', desc: true },
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
                Sort by GP No:
              </span>
              <div className="border-input flex rounded-lg border bg-white shadow-sm">
                <Button
                  variant={sorting[0]?.desc === true ? 'default' : 'ghost'}
                  size="sm"
                  className="font-custom h-9 rounded-lg px-3 text-sm font-medium"
                  onClick={() => setSorting([{ id: 'gatePassNo', desc: true }])}
                >
                  Latest first
                </Button>
                <Button
                  variant={sorting[0]?.desc === false ? 'default' : 'ghost'}
                  size="sm"
                  className="font-custom h-9 rounded-lg px-3 text-sm font-medium"
                  onClick={() =>
                    setSorting([{ id: 'gatePassNo', desc: false }])
                  }
                >
                  Oldest first
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-custom text-sm font-medium text-[#333]">
              Rows per page:
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
      <div className="border-border overflow-hidden rounded-lg border">
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className="bg-background"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === 'remarks' ||
                        cell.column.id === 'farmerName'
                          ? 'min-w-0 whitespace-normal'
                          : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
                      colSpan={6}
                      className="font-custom text-foreground font-bold"
                    >
                      Total
                    </TableCell>
                    <TableCell className="font-custom text-right font-bold">
                      {formatNumber(footerTotals.bags)}
                    </TableCell>
                    <TableCell className="font-custom text-right font-bold">
                      {formatWeight(footerTotals.grossKg)}
                    </TableCell>
                    <TableCell className="font-custom text-right font-bold">
                      {formatWeight(footerTotals.tareKg)}
                    </TableCell>
                    <TableCell className="font-custom text-primary text-right font-bold">
                      {formatWeight(footerTotals.netKg)}
                    </TableCell>
                    <TableCell className="font-custom font-bold" />
                  </>
                ) : (
                  <>
                    <TableCell
                      colSpan={columns.length - 1}
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
            Showing {table.getRowModel().rows.length} of{' '}
            {formatNumber(totalRows)} row{totalRows !== 1 ? 's' : ''}
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

interface IncomingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<
    IncomingGatePassWithLink[] | IncomingGatePassWithLinkWithStatus[]
  >;
}

const IncomingGatePassAnalyticsScreen = ({
  queryResult,
}: IncomingGatePassAnalyticsScreenProps) => {
  const { data, isPending, error } = queryResult;
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const list: IncomingGatePassRow[] = (data ?? []).map(
      (pass): IncomingGatePassRow => {
        const gradingStatus =
          'gradingStatus' in pass &&
          (pass.gradingStatus === 'Graded' || pass.gradingStatus === 'Ungraded')
            ? pass.gradingStatus
            : undefined;
        return { ...pass, gradingStatus };
      }
    );
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const name = row.farmerStorageLinkId?.farmerId?.name?.toLowerCase() ?? '';
      const truck = row.truckNumber?.toLowerCase() ?? '';
      return name.includes(q) || truck.includes(q);
    });
  }, [data, search]);

  if (isPending) {
    return (
      <p className="font-custom text-sm leading-relaxed text-gray-600">
        Loading incoming gate passes…
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
      ? filteredRows.reduce<IncomingTableFooterTotals>(
          (acc, row) => {
            const slip = row.weightSlip;
            const net =
              slip?.grossWeightKg != null && slip?.tareWeightKg != null
                ? slip.grossWeightKg - slip.tareWeightKg
                : 0;
            return {
              bags: acc.bags + row.bagsReceived,
              grossKg: acc.grossKg + (slip?.grossWeightKg ?? 0),
              tareKg: acc.tareKg + (slip?.tareWeightKg ?? 0),
              netKg: acc.netKg + net,
            };
          },
          { bags: 0, grossKg: 0, tareKg: 0, netKg: 0 }
        )
      : undefined;

  return (
    <div className="max-h-[70vh] space-y-3 overflow-auto">
      <DataTable
        columns={incomingColumns}
        data={filteredRows}
        footerTotals={footerTotals}
        searchPlaceholder="Search by farmer name or truck number"
        searchValue={search}
        onSearchChange={setSearch}
      />
    </div>
  );
};

export default IncomingGatePassAnalyticsScreen;
