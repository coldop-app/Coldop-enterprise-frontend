'use client';

import { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/table-core';
import type { CellContext } from '@tanstack/table-core';
import type { VisibilityState } from '@tanstack/table-core';
import { format, parseISO } from 'date-fns';
import {
  useGetNikasiGatePassReports,
  nikasiGatePassReportQueryOptions,
} from '@/services/store-admin/analytics/nikasi/useGetNikasiGatePassReports';
import type {
  NikasiGatePassReportData,
  NikasiGatePassReportItem,
} from '@/types/analytics';
import { DataTable } from '../storage-report/data-table';
import {
  GRADING_SIZES,
  type GradingSize,
} from '@/components/forms/grading/constants';
import { getSizeColumnId } from '../storage-report/columns';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { queryClient } from '@/lib/queryClient';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
  FileDown,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type DispatchBagSizeEntry = {
  size?: string;
  quantityIssued?: number;
};

type DispatchOrderDetailEntry = {
  size?: string;
  quantityIssued?: number;
};

const INITIAL_COLUMN_VISIBILITY: VisibilityState = {
  farmerName: false,
  accountNumber: false,
  farmerAddress: false,
  farmerMobile: false,
  createdByName: false,
  totalBags: false,
};

export type DispatchReportRow = {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  farmerMobile: string;
  createdByName: string;
  gatePassNo: number | string;
  manualGatePassNumber: number | string;
  date: string;
  from: string;
  toField: string;
  variety: string;
  totalBags: number;
  remarks: string;
  dateRaw: string;
  [key: string]: string | number | undefined;
};

function SortableHeader({
  column,
  table,
  label,
}: {
  column: {
    id: string;
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
  table: {
    options: {
      onSortingChange?: (
        updater: (prev: { id: string; desc: boolean }[]) => {
          id: string;
          desc: boolean;
        }[]
      ) => void;
    };
  };
  label: string;
}) {
  const isSorted = column.getIsSorted();
  const columnId = column.id;
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="font-custom">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${label} column options`}
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(false);
            }}
          >
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(true);
            }}
          >
            Sort descending
          </DropdownMenuItem>
          {isSorted && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                table.options.onSortingChange?.((prev) =>
                  prev.filter((s) => s.id !== columnId)
                );
              }}
            >
              Clear sort
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GroupableHeader({
  column,
  label,
}: {
  column: { getIsGrouped: () => boolean; toggleGrouping: () => void };
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-custom">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${label} column options`}
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleGrouping();
            }}
          >
            {column.getIsGrouped()
              ? `Ungroup by ${label}`
              : `Group by ${label}`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GroupableSortableHeader({
  column,
  table,
  label,
}: {
  column: {
    id: string;
    getIsGrouped: () => boolean;
    toggleGrouping: () => void;
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
  table: {
    options: {
      onSortingChange?: (
        updater: (prev: { id: string; desc: boolean }[]) => {
          id: string;
          desc: boolean;
        }[]
      ) => void;
    };
  };
  label: string;
}) {
  const isSorted = column.getIsSorted();
  const columnId = column.id;
  return (
    <div className="flex items-center gap-1">
      <span className="font-custom">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${label} column options`}
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleGrouping();
            }}
          >
            {column.getIsGrouped()
              ? `Ungroup by ${label}`
              : `Group by ${label}`}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(false);
            }}
          >
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(true);
            }}
          >
            Sort descending
          </DropdownMenuItem>
          {isSorted && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                table.options.onSortingChange?.((prev) =>
                  prev.filter((s) => s.id !== columnId)
                );
              }}
            >
              Clear sort
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GroupableCell({
  row,
  column,
  table,
}: CellContext<DispatchReportRow, unknown>) {
  const isGrouped = row.getIsGrouped();
  const canExpand = row.getCanExpand();
  const grouping = table.getState().grouping ?? [];
  const groupingColumnId = grouping[row.depth];
  const isThisColumnGrouping = groupingColumnId === column.id;
  const showExpandCollapse = isGrouped && canExpand && isThisColumnGrouping;
  const value = String(row.getValue(column.id) ?? '—');
  return (
    <div className="font-custom flex items-center gap-1">
      {showExpandCollapse ? (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="text-muted-foreground focus-visible:ring-primary hover:bg-primary/10 hover:text-primary inline-flex shrink-0 rounded p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label={row.getIsExpanded() ? 'Collapse group' : 'Expand group'}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : null}
      <span
        style={{
          paddingLeft: showExpandCollapse ? 0 : row.depth * 20,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function FarmerCell({ row }: CellContext<DispatchReportRow, unknown>) {
  const name = String(row.getValue('farmerName') ?? '—');
  const accountNo = row.original.accountNumber;
  const accountStr =
    accountNo != null && accountNo !== '' && accountNo !== '—'
      ? ` #${accountNo}`
      : '';

  return (
    <span className="font-custom">
      {name}
      {accountStr ? (
        <span className="text-muted-foreground font-normal">{accountStr}</span>
      ) : null}
    </span>
  );
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'do MMM yyyy');
  } catch {
    return iso;
  }
}

function getTotalIssuedBags(
  pass: NikasiGatePassReportItem & {
    bagSize?: DispatchBagSizeEntry[];
    orderDetails?: DispatchOrderDetailEntry[];
  }
): number {
  const sumIssued = (
    list?: Array<DispatchBagSizeEntry | DispatchOrderDetailEntry>
  ): number =>
    list?.reduce((sum, item) => sum + (item.quantityIssued ?? 0), 0) ?? 0;
  const bagSizeTotal = sumIssued(pass.bagSize);
  if (bagSizeTotal > 0) return bagSizeTotal;
  return sumIssued(pass.orderDetails);
}

function normalizeSizeKey(apiSize: string): GradingSize | null {
  const s = String(apiSize ?? '').trim();
  if (!s) return null;
  const normalized = s.replace(/-/g, '–');
  return (GRADING_SIZES as readonly string[]).includes(normalized)
    ? (normalized as GradingSize)
    : (GRADING_SIZES as readonly string[]).includes(s)
      ? (s as GradingSize)
      : null;
}

function getSizeQuantities(
  pass: NikasiGatePassReportItem & {
    bagSize?: DispatchBagSizeEntry[];
    orderDetails?: DispatchOrderDetailEntry[];
  }
): Record<string, number> {
  const entries =
    Array.isArray(pass.bagSize) && pass.bagSize.length > 0
      ? pass.bagSize
      : (pass.orderDetails ?? []);
  const out: Record<string, number> = {};
  for (const entry of entries) {
    const qty = entry.quantityIssued ?? 0;
    if (qty <= 0) continue;
    const sizeKey = normalizeSizeKey(String(entry.size ?? ''));
    if (!sizeKey) continue;
    out[sizeKey] = (out[sizeKey] ?? 0) + qty;
  }
  return out;
}

function isFlatNikasiData(
  data: NikasiGatePassReportData
): data is NikasiGatePassReportItem[] {
  if (!Array.isArray(data) || data.length === 0) return true;
  const first = data[0];
  return (
    first != null &&
    typeof first === 'object' &&
    !('gatePasses' in first) &&
    !('farmers' in first)
  );
}

function mapNikasiPassesToRows(
  passes: (NikasiGatePassReportItem & {
    bagSize?: DispatchBagSizeEntry[];
    orderDetails?: DispatchOrderDetailEntry[];
    createdBy?: { name?: string } | string;
  })[]
): DispatchReportRow[] {
  return passes.map((pass) => {
    const link = pass.farmerStorageLinkId;
    const farmer = link?.farmerId;
    const createdBy = pass.createdBy;
    const createdByName =
      typeof createdBy === 'object' && createdBy !== null && 'name' in createdBy
        ? ((createdBy as { name?: string }).name ?? '—')
        : '—';
    const sizeQuantities = getSizeQuantities(pass);

    const row: DispatchReportRow = {
      id: pass._id,
      farmerName: farmer?.name ?? '—',
      accountNumber: link?.accountNumber ?? '—',
      farmerAddress: farmer?.address ?? '—',
      farmerMobile: farmer?.mobileNumber ?? '—',
      createdByName,
      gatePassNo: pass.gatePassNo ?? '—',
      manualGatePassNumber: pass.manualGatePassNumber ?? '—',
      date: formatDate(pass.date),
      from: pass.from ?? '—',
      toField: pass.toField ?? '—',
      variety: pass.variety ?? '—',
      totalBags: getTotalIssuedBags(pass),
      remarks: pass.remarks ?? '—',
      dateRaw: pass.date ?? '',
    };
    for (const size of GRADING_SIZES) {
      const sizeId = getSizeColumnId(size);
      row[sizeId] = sizeQuantities[size] ?? 0;
    }
    return row;
  });
}

function getDispatchReportColumns(
  sizesWithQuantity: readonly string[]
): ColumnDef<DispatchReportRow>[] {
  return [
    {
      accessorKey: 'farmerName',
      header: () => <span className="font-custom">Farmer</span>,
      cell: FarmerCell,
    },
    {
      accessorKey: 'farmerAddress',
      header: () => <span className="font-custom">Address</span>,
    },
    {
      accessorKey: 'farmerMobile',
      header: () => <span className="font-custom">Mobile</span>,
    },
    {
      accessorKey: 'createdByName',
      header: () => <span className="font-custom">Created by</span>,
    },
    {
      accessorKey: 'gatePassNo',
      header: ({ column, table }) => (
        <SortableHeader column={column} table={table} label="Gate pass no." />
      ),
      cell: ({ row }) => (
        <div className="text-right">
          {String(row.getValue('gatePassNo') ?? '—')}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'manualGatePassNumber',
      header: ({ column, table }) => (
        <SortableHeader column={column} table={table} label="Manual GP no." />
      ),
      cell: ({ row }) => (
        <div className="text-right">
          {String(row.getValue('manualGatePassNumber') ?? '—')}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'date',
      header: ({ column, table }) => (
        <GroupableSortableHeader column={column} table={table} label="Date" />
      ),
      sortingFn: (rowA, rowB) => {
        const a = Date.parse(String(rowA.original.dateRaw ?? ''));
        const b = Date.parse(String(rowB.original.dateRaw ?? ''));
        if (Number.isNaN(a) && Number.isNaN(b)) return 0;
        if (Number.isNaN(a)) return -1;
        if (Number.isNaN(b)) return 1;
        return a - b;
      },
      enableSorting: true,
      enableGrouping: true,
      cell: GroupableCell,
    },
    {
      accessorKey: 'from',
      header: ({ column }) => <GroupableHeader column={column} label="From" />,
      cell: GroupableCell,
      enableGrouping: true,
    },
    {
      accessorKey: 'toField',
      header: ({ column }) => <GroupableHeader column={column} label="To" />,
      cell: GroupableCell,
      enableGrouping: true,
    },
    {
      accessorKey: 'variety',
      header: ({ column }) => (
        <GroupableHeader column={column} label="Variety" />
      ),
      cell: GroupableCell,
      enableGrouping: true,
    },
    ...sizesWithQuantity.map((size) => {
      const sizeId = getSizeColumnId(size);
      return {
        id: sizeId,
        accessorKey: sizeId,
        header: () => <div className="font-custom text-right">{size}</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium">
            {Number(row.getValue(sizeId) ?? 0).toLocaleString()}
          </div>
        ),
      } as ColumnDef<DispatchReportRow>;
    }),
    {
      accessorKey: 'totalBags',
      header: () => <div className="font-custom text-right">Bags</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {Number(row.getValue('totalBags') ?? 0).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: 'remarks',
      header: () => <span className="font-custom">Remarks</span>,
    },
  ];
}

const DispatchReportTable = () => {
  const coldStorage = useStore((s) => s.coldStorage);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    INITIAL_COLUMN_VISIBILITY
  );
  const [pdfRows, setPdfRows] = useState<DispatchReportRow[]>([]);
  const [appliedRange, setAppliedRange] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const { data, isLoading, error } = useGetNikasiGatePassReports({
    groupByFarmer: false,
    groupByVariety: false,
    dateFrom: appliedRange.dateFrom,
    dateTo: appliedRange.dateTo,
  });

  const rows = useMemo((): DispatchReportRow[] => {
    if (!data) return [];
    const flat = isFlatNikasiData(data) ? data : [];
    return mapNikasiPassesToRows(flat);
  }, [data]);

  const rowsForPdf = pdfRows.length > 0 ? pdfRows : rows;

  const sizesWithQuantity = useMemo(() => {
    return GRADING_SIZES.filter((size) =>
      rows.some((row) => (Number(row[getSizeColumnId(size)]) || 0) > 0)
    );
  }, [rows]);

  const columns = useMemo(
    () => getDispatchReportColumns(sizesWithQuantity),
    [sizesWithQuantity]
  );

  const totalColumnIds = useMemo(
    () => ['totalBags', ...sizesWithQuantity.map(getSizeColumnId)],
    [sizesWithQuantity]
  );

  const visibleColumnIds = useMemo(
    () =>
      columns
        .map((col) => {
          if (col.id) return col.id;
          if ('accessorKey' in col && typeof col.accessorKey === 'string') {
            return col.accessorKey;
          }
          return '';
        })
        .filter((id) => id && columnVisibility[id] !== false),
    [columns, columnVisibility]
  );

  const handleApplyDates = () => {
    if (!fromDate && !toDate) return;
    if (fromDate && toDate) {
      const fromStr = formatDateToYYYYMMDD(fromDate);
      const toStr = formatDateToYYYYMMDD(toDate);
      if (toStr < fromStr) {
        toast.error('Invalid date range', {
          description: '"To" date must not be before "From" date.',
        });
        return;
      }
    }

    const params = {
      groupByFarmer: false,
      groupByVariety: false,
      dateFrom: fromDate ? formatDateToYYYYMMDD(fromDate) : undefined,
      dateTo: toDate ? formatDateToYYYYMMDD(toDate) : undefined,
    };
    const fetchPromise = queryClient.fetchQuery(
      nikasiGatePassReportQueryOptions(params)
    );
    toast.promise(fetchPromise, {
      loading: 'Applying date filters…',
      success: 'Date filters applied. Report updated.',
      error: 'Failed to load report for the selected dates.',
    });
    fetchPromise
      .then(() => {
        setAppliedRange({
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        });
        requestAnimationFrame(() => {
          reportContentRef.current?.focus({ preventScroll: true });
        });
      })
      .catch(() => {});
  };

  const handleClearDates = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedRange({});
    toast.success('Date filters cleared. Report updated.');
  };

  const getDateRangeLabel = () => {
    if (appliedRange.dateFrom && appliedRange.dateTo) {
      return `${appliedRange.dateFrom} to ${appliedRange.dateTo}`;
    }
    if (appliedRange.dateFrom) return `From ${appliedRange.dateFrom}`;
    if (appliedRange.dateTo) return `To ${appliedRange.dateTo}`;
    return 'All dates';
  };

  const handleDownloadPdf = async () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingPdf(true);
    try {
      const [{ pdf }, { DispatchReportTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/dispatch-report-table-pdf'),
      ]);
      const blob = await pdf(
        <DispatchReportTablePdf
          companyName={coldStorage?.name ?? 'Cold Storage'}
          dateRangeLabel={getDateRangeLabel()}
          reportTitle="Dispatch Report"
          rows={rowsForPdf}
          visibleColumnIds={visibleColumnIds}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('PDF opened in new tab', {
        description: 'Dispatch report is ready to view or print.',
      });
    } catch {
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <Skeleton className="font-custom h-8 w-48 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <h2 className="font-custom text-2xl font-semibold text-[#333]">
            Dispatch Report
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="font-custom text-destructive">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load dispatch report.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
      <div
        ref={reportContentRef}
        className="space-y-6"
        tabIndex={-1}
        aria-label="Dispatch report content"
      >
        <h2 className="font-custom text-2xl font-semibold text-[#333]">
          Dispatch Report
        </h2>
        <DataTable
          columns={columns}
          data={rows}
          totalColumnIds={totalColumnIds}
          onColumnVisibilityChange={setColumnVisibility}
          onVisibleRowsChange={setPdfRows}
          initialColumnVisibility={INITIAL_COLUMN_VISIBILITY}
          toolbarLeftContent={
            <>
              <DatePicker
                id="dispatch-report-from"
                label="From"
                value={fromDate}
                onChange={setFromDate}
              />
              <DatePicker
                id="dispatch-report-to"
                label="To"
                value={toDate}
                onChange={setToDate}
              />
              <Button
                variant="default"
                size="sm"
                className="font-custom focus-visible:ring-primary h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                onClick={handleApplyDates}
                disabled={!fromDate && !toDate}
              >
                Apply
              </Button>
              {(fromDate ||
                toDate ||
                appliedRange.dateFrom ||
                appliedRange.dateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom focus-visible:ring-primary h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={handleClearDates}
                >
                  Clear
                </Button>
              )}
            </>
          }
          toolbarRightContent={
            <Button
              className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isLoading}
              aria-label={
                isGeneratingPdf
                  ? 'Generating PDF…'
                  : isLoading
                    ? 'Loading report…'
                    : 'View report'
              }
            >
              <FileDown className="h-4 w-4 shrink-0" />
              {isGeneratingPdf ? 'Generating…' : 'View Report'}
            </Button>
          }
        />
      </div>
    </main>
  );
};

export default DispatchReportTable;
