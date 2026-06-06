import { memo, useMemo, useState } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  canonicalSizeLabel,
  normalizeSizeKey,
  sortSizeLabels,
} from '@/components/analytics/shed/shed-report-utils';
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
import { cn } from '@/lib/utils';
import {
  type GetNikasiSummaryParams,
  useGetNikasiSummary,
} from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiSummary';
import type {
  NikasiGatePassSummaryData,
  NikasiSummarySizeItem,
} from '@/types/analytics';

type TransferTab = 'not-internally-transferred' | 'internally-transferred';

const TRANSFER_TABS: { id: TransferTab; label: string }[] = [
  { id: 'not-internally-transferred', label: 'Not Internally Transferred' },
  { id: 'internally-transferred', label: 'Internally Transferred' },
];

interface TableRowData {
  variety: string;
  values: Record<string, number>;
  total: number;
}

function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildSubtitle(dateParams?: GetNikasiSummaryParams): string {
  if (dateParams?.dateFrom && dateParams?.dateTo) {
    return `Showing dispatches from ${formatDateLabel(dateParams.dateFrom)} to ${formatDateLabel(dateParams.dateTo)}.`;
  }
  return 'Showing all dispatches for this cold storage.';
}

function getQuantityForTab(
  sizeItem: NikasiSummarySizeItem,
  tab: TransferTab
): number {
  if (tab === 'not-internally-transferred') {
    if (sizeItem.notInternallyTransferred != null) {
      return Number(sizeItem.notInternallyTransferred) || 0;
    }
    return (
      sizeItem.byInternalTransfer?.find((entry) => !entry.isInternalTransfer)
        ?.quantityIssued ?? 0
    );
  }

  if (sizeItem.internallyTransferred != null) {
    return Number(sizeItem.internallyTransferred) || 0;
  }
  return (
    sizeItem.byInternalTransfer?.find((entry) => entry.isInternalTransfer)
      ?.quantityIssued ?? 0
  );
}

function getVarietyTotalForTab(
  variety: NikasiGatePassSummaryData[number],
  tab: TransferTab
): number {
  if (tab === 'not-internally-transferred') {
    if (variety.notInternallyTransferred != null) {
      return Number(variety.notInternallyTransferred) || 0;
    }
  } else if (variety.internallyTransferred != null) {
    return Number(variety.internallyTransferred) || 0;
  }

  return (variety.sizes ?? []).reduce(
    (sum, sizeItem) => sum + getQuantityForTab(sizeItem, tab),
    0
  );
}

function transformSummaryData(
  data: NikasiGatePassSummaryData,
  tab: TransferTab
): {
  rows: TableRowData[];
  sizes: string[];
  totals: Record<string, number>;
  grandTotal: number;
} {
  const rawSizes: string[] = [];

  for (const variety of data) {
    for (const sizeItem of variety.sizes ?? []) {
      rawSizes.push(sizeItem.size);
    }
  }

  const effectiveSizes = sortSizeLabels(rawSizes);
  const rows: TableRowData[] = [];
  const totalsMap: Record<string, number> = {};

  for (const size of effectiveSizes) {
    totalsMap[size] = 0;
  }

  for (const variety of data) {
    const sizeLookup = new Map<string, number>();

    for (const sizeItem of variety.sizes ?? []) {
      const sizeKey = normalizeSizeKey(sizeItem.size);
      sizeLookup.set(
        sizeKey,
        (sizeLookup.get(sizeKey) ?? 0) + getQuantityForTab(sizeItem, tab)
      );
    }

    const values: Record<string, number> = {};
    let rowTotal = 0;

    for (const size of effectiveSizes) {
      const quantity = sizeLookup.get(normalizeSizeKey(size)) ?? 0;
      values[size] = quantity;
      rowTotal += quantity;
      totalsMap[size] = (totalsMap[size] ?? 0) + quantity;
    }

    if (rowTotal > 0) {
      rows.push({
        variety: variety.variety,
        values,
        total: rowTotal,
      });
    }
  }

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  return {
    rows,
    sizes: effectiveSizes,
    totals: totalsMap,
    grandTotal,
  };
}

export interface NikasiSummaryTableProps {
  dateParams?: GetNikasiSummaryParams;
  summary?: NikasiGatePassSummaryData;
  tableTitle?: string;
  subtitle?: string;
}

const NikasiSummaryTable = ({
  dateParams,
  summary,
  tableTitle = 'Dispatch Summary',
  subtitle,
}: NikasiSummaryTableProps) => {
  const [activeTab, setActiveTab] = useState<TransferTab>(
    'not-internally-transferred'
  );

  const queryParams: GetNikasiSummaryParams = {
    ...(dateParams?.dateFrom ? { dateFrom: dateParams.dateFrom } : {}),
    ...(dateParams?.dateTo ? { dateTo: dateParams.dateTo } : {}),
  };
  const nikasiSummaryQuery = useGetNikasiSummary(queryParams);
  const fetchedSummary = nikasiSummaryQuery.data ?? [];
  const baseSummary = summary ?? fetchedSummary;

  const tabTotals = useMemo(
    () => ({
      'not-internally-transferred': baseSummary.reduce(
        (sum, variety) =>
          sum + getVarietyTotalForTab(variety, 'not-internally-transferred'),
        0
      ),
      'internally-transferred': baseSummary.reduce(
        (sum, variety) =>
          sum + getVarietyTotalForTab(variety, 'internally-transferred'),
        0
      ),
    }),
    [baseSummary]
  );

  const { rows, sizes, totals, grandTotal } = useMemo(
    () => transformSummaryData(baseSummary, activeTab),
    [baseSummary, activeTab]
  );

  const columns = useMemo<ColumnDef<TableRowData>[]>(() => {
    const cols: ColumnDef<TableRowData>[] = [
      {
        accessorKey: 'variety',
        header: () => <span className="font-custom font-bold">Variety</span>,
        cell: ({ getValue }) => (
          <span className="font-custom font-medium">
            {getValue() as string}
          </span>
        ),
      },
    ];

    for (const size of sizes) {
      cols.push({
        id: size,
        accessorFn: (row) => row.values[size] ?? 0,
        header: () => (
          <span className="font-custom font-bold">
            {canonicalSizeLabel(size)}
          </span>
        ),
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
  }, [sizes]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table instance
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const resolvedSubtitle = subtitle ?? buildSubtitle(dateParams);
  const isLoading =
    summary == null &&
    (nikasiSummaryQuery.isLoading || nikasiSummaryQuery.isFetching);
  const isError = summary == null && nikasiSummaryQuery.isError;

  if (isLoading) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <p className="font-custom text-muted-foreground text-center text-sm">
            Loading dispatch summary...
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
            {nikasiSummaryQuery.error?.message ??
              'Failed to load dispatch summary.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (sizes.length === 0) {
    return (
      <Card className="font-custom border-border rounded-xl shadow-sm">
        <CardContent className="p-4 py-8 sm:p-5">
          <div className="space-y-1 text-center">
            <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
              {tableTitle}
            </h2>
            <p className="font-custom text-muted-foreground text-sm">
              {resolvedSubtitle}
            </p>
            <p className="font-custom text-muted-foreground pt-4 text-sm">
              No dispatch data for the selected filters.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="font-custom border-border rounded-xl shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
              {tableTitle}
            </h2>
            <p className="font-custom text-muted-foreground mt-1 text-sm">
              {resolvedSubtitle}
            </p>
          </div>
          <div className="border-border flex flex-wrap gap-1 border-b">
            {TRANSFER_TABS.map(({ id, label }) => {
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
                  {label} ({tabTotals[id].toLocaleString('en-IN')})
                </button>
              );
            })}
          </div>
        </div>
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-border hover:bg-transparent"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="font-custom border-border border px-4 py-2"
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
                <TableRow className="border-border hover:bg-transparent">
                  <TableCell
                    colSpan={table.getHeaderGroups()[0]?.headers.length ?? 1}
                    className="font-custom text-muted-foreground border-border h-24 border px-4 py-2 text-center"
                  >
                    No dispatch data for this transfer type.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                    Bag Total
                  </TableHead>
                  {sizes.map((size) => (
                    <TableCell
                      key={size}
                      className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums"
                    >
                      {(totals[size] ?? 0).toLocaleString('en-IN')}
                    </TableCell>
                  ))}
                  <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums">
                    {grandTotal.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(NikasiSummaryTable);
