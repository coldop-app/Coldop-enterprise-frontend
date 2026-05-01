import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type FilterFn,
  type GroupingState,
  type Row,
  type SortingState,
  type VisibilityState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  Search,
} from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Item } from '@/components/ui/item';
import { useGetStorageGatePassReport } from '@/services/store-admin/storage-gate-pass/analytics/useGetStorageGatePassReport';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import { ViewFiltersSheet } from './view-filters-sheet/index';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import { GRADING_SIZES } from '@/lib/constants';
import type { IncomingReportRow } from './columns';
import { useStore } from '@/stores/store';
import PdfWorker from './pdf.worker?worker';
import type {
  IncomingPdfWorkerRequest,
  IncomingPdfWorkerResponse,
} from './pdf-worker.types';

function getLeafRowsForPdf(
  rows: Row<IncomingReportRow>[]
): IncomingReportRow[] {
  return rows.flatMap((row) => {
    if (row.getIsGrouped()) {
      return row.getLeafRows().map((leafRow) => leafRow.original);
    }
    return row.original;
  });
}

function getFarmerId(gatePass: StorageGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId._id;
  }

  return '-';
}

function getFarmerMobile(gatePass: StorageGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId.mobileNumber ?? '-';
  }

  return '-';
}

function getAccountNumber(gatePass: StorageGatePassWithLink): number | null {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.accountNumber ?? null;
  }
  return null;
}

function getTotalBags(gatePass: StorageGatePassWithLink): number {
  return (gatePass.bagSizes ?? []).reduce((sum, bagSize) => {
    return sum + Number(bagSize.initialQuantity || 0);
  }, 0);
}

type BagSizeColumnId =
  | 'bagBelow25'
  | 'bag25to30'
  | 'bagBelow30'
  | 'bag30to35'
  | 'bag30to40'
  | 'bag35to40'
  | 'bag40to45'
  | 'bag45to50'
  | 'bag50to55'
  | 'bagAbove50'
  | 'bagAbove55'
  | 'bagCut';

const BAG_SIZE_COLUMN_CONFIG: Array<{
  id: BagSizeColumnId;
  label: (typeof GRADING_SIZES)[number];
}> = [
  { id: 'bagBelow25', label: 'Below 25' },
  { id: 'bag25to30', label: '25–30' },
  { id: 'bagBelow30', label: 'Below 30' },
  { id: 'bag30to35', label: '30–35' },
  { id: 'bag30to40', label: '30–40' },
  { id: 'bag35to40', label: '35–40' },
  { id: 'bag40to45', label: '40–45' },
  { id: 'bag45to50', label: '45–50' },
  { id: 'bag50to55', label: '50–55' },
  { id: 'bagAbove50', label: 'Above 50' },
  { id: 'bagAbove55', label: 'Above 55' },
  { id: 'bagCut', label: 'Cut' },
];

const BAG_SIZE_COLUMN_IDS = BAG_SIZE_COLUMN_CONFIG.map((item) => item.id);

function normalizeBagSize(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[–—−-]/g, '-')
    .trim()
    .toLowerCase();
}

const BAG_SIZE_LABEL_TO_COLUMN_ID = new Map(
  BAG_SIZE_COLUMN_CONFIG.map(({ id, label }) => [normalizeBagSize(label), id])
);

function createEmptyBagSizeValues(): Record<BagSizeColumnId, number> {
  return {
    bagBelow25: 0,
    bag25to30: 0,
    bagBelow30: 0,
    bag30to35: 0,
    bag30to40: 0,
    bag35to40: 0,
    bag40to45: 0,
    bag45to50: 0,
    bag50to55: 0,
    bagAbove50: 0,
    bagAbove55: 0,
    bagCut: 0,
  };
}

function getBagSizeValues(
  gatePass: StorageGatePassWithLink
): Record<BagSizeColumnId, number> {
  const values = createEmptyBagSizeValues();

  for (const bagSize of gatePass.bagSizes ?? []) {
    const normalizedSize = normalizeBagSize(String(bagSize.size || ''));
    const columnId = BAG_SIZE_LABEL_TO_COLUMN_ID.get(normalizedSize);
    if (!columnId) continue;
    values[columnId] += Number(bagSize.initialQuantity || 0);
  }

  return values;
}

function toDisplayDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  if (year.length !== 4) return undefined;

  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function formatNumberOrEmpty(value: number, precision = 0): string {
  return Number(value || 0) === 0 ? '' : formatIndianNumber(value, precision);
}

const columnHelper = createColumnHelper<IncomingReportRow>();
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');
const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;

const defaultColumnOrder: string[] = [
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'accountNumber',
  'farmerMobileNumber',
  'variety',
  ...BAG_SIZE_COLUMN_IDS,
  'totalBags',
  'remarks',
];
const numericColumnIds = new Set([
  'accountNumber',
  ...BAG_SIZE_COLUMN_IDS,
  'totalBags',
]);
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;

const multiValueFilterFn = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string[] | string
) => {
  const cellValue = String(row.getValue(columnId));
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return true;
  return filterValue.includes(cellValue);
};

type GlobalFilterValue = string | FilterGroupNode;
const globalManualGatePassFilterFn: FilterFn<IncomingReportRow> = (
  row,
  _columnId,
  filterValue: GlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(row.original, filterValue);
  }
  const normalized = String(filterValue).trim().toLowerCase();
  if (!normalized) return true;
  return String(row.original.manualGatePassNumber ?? '-')
    .toLowerCase()
    .includes(normalized);
};

const columns = [
  columnHelper.accessor('gatePassNo', {
    header: 'System Generated Gate Pass No',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('manualGatePassNumber', {
    header: 'Manual Gate Pass No',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor('accountNumber', {
    header: () => <div className="w-full text-right">Account No.</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 120,
    maxSize: 200,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {info.getValue() ?? '-'}
      </div>
    ),
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('farmerMobileNumber', {
    header: 'Mobile Number',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  ...BAG_SIZE_COLUMN_CONFIG.map(({ id, label }) =>
    columnHelper.accessor(id, {
      id,
      header: () => <div className="w-full text-right">{label} (mm)</div>,
      sortingFn: 'basic',
      filterFn: multiValueFilterFn,
      minSize: 90,
      maxSize: 170,
      cell: (info) => (
        <div className="w-full text-right tabular-nums">
          {formatNumberOrEmpty(Number(info.getValue() || 0), 0)}
        </div>
      ),
    })
  ),
  columnHelper.accessor('totalBags', {
    header: () => <div className="w-full text-right">Total Bags</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('remarks', {
    header: 'Remarks',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 550,
    maxSize: 550,
  }),
];

const TABLE_SKELETON_COLUMNS = 8;
const TABLE_SKELETON_ROWS = 10;

type IncomingPdfButtonProps = {
  buildPayload: (generatedAt: string) => IncomingPdfWorkerRequest;
};

type IncomingReportTableProps = object;

const IncomingPdfButton = ({ buildPayload }: IncomingPdfButtonProps) => {
  const objectUrlRef = React.useRef<string | null>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleGenerate = async () => {
    if (isGeneratingPdf) return;

    const previewTab = window.open('', '_blank');
    if (!previewTab) {
      window.alert(
        'Popup blocked by your browser. Please allow popups and try again.'
      );
      return;
    }
    previewTab.opener = null;
    previewTab.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Generating PDF...</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .spinner {
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        border: 3px solid #d1d5db;
        border-top-color: #16a34a;
        animation: spin 0.8s linear infinite;
      }
      .label {
        font-size: 14px;
        font-weight: 500;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="spinner"></div>
      <div class="label">Generating PDF...</div>
    </div>
  </body>
</html>`);
    previewTab.document.close();

    setIsGeneratingPdf(true);

    try {
      // Let the new tab paint the loading UI before heavy PDF generation starts.
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedAt = new Date().toLocaleString('en-IN');
      const payload = buildPayload(generatedAt);
      const worker = new PdfWorker();
      workerRef.current = worker;
      const blob = await new Promise<Blob>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<IncomingPdfWorkerResponse>) => {
          const data = event.data;
          if (data.status === 'success') {
            resolve(data.blob);
            return;
          }
          reject(new Error(data.message));
        };
        worker.onmessageerror = () => {
          reject(new Error('PDF worker message channel failed.'));
        };
        worker.onerror = (event) => {
          reject(
            new Error(
              `PDF worker execution failed: ${event.message || 'Unknown worker error'}`
            )
          );
        };
        worker.postMessage(payload);
      });
      const nextUrl = URL.createObjectURL(blob);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = nextUrl;

      if (!previewTab.closed) {
        previewTab.location.replace(nextUrl);
      } else {
        window.open(nextUrl, '_blank');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      if (!previewTab.closed) {
        previewTab.document.open();
        previewTab.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>PDF generation failed</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        background: #fff7ed;
        color: #7c2d12;
      }
      .wrap { max-width: 680px; padding: 20px; text-align: center; }
      .title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
      .msg { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="title">Failed to generate PDF</div>
      <div class="msg">${message}</div>
    </div>
  </body>
</html>`);
        previewTab.document.close();
      }
      window.alert(`Failed to generate PDF: ${message}`);
    } finally {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setIsGeneratingPdf(false);
    }
  };

  const handleClick = () => void handleGenerate();

  return (
    <Button
      variant="default"
      className="h-8 rounded-lg px-4 text-sm leading-none"
      disabled={isGeneratingPdf}
      onClick={handleClick}
    >
      {isGeneratingPdf ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {isGeneratingPdf ? 'Generating...' : 'Pdf'}
    </Button>
  );
};

const StorageReportTable = (_props: IncomingReportTableProps) => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      farmerMobileNumber: false,
      gatePassNo: false,
      accountNumber: false,
    });
  const [columnOrder, setColumnOrder] =
    React.useState<string[]>(defaultColumnOrder);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const hasDateFilters = Boolean(fromDate && toDate);
  const hasAppliedDateFilters = Boolean(appliedFromDate && appliedToDate);
  const canApply = Boolean(fromDate && toDate);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetStorageGatePassReport(
      {
        fromDate: hasAppliedDateFilters ? appliedFromDate : undefined,
        toDate: hasAppliedDateFilters ? appliedToDate : undefined,
      },
      {
        enabled: true,
      }
    );

  const incomingReportData = React.useMemo<IncomingReportRow[]>(
    () =>
      (data ?? []).map((item) => {
        const bagSizeValues = getBagSizeValues(item);
        return {
          id: item._id,
          farmerId: getFarmerId(item),
          gatePassNo: item.gatePassNo,
          manualGatePassNumber: item.manualGatePassNumber,
          farmerMobileNumber: getFarmerMobile(item),
          accountNumber: getAccountNumber(item),
          variety: item.variety,
          ...bagSizeValues,
          totalBags: getTotalBags(item),
          remarks: item.remarks ?? '-',
          date: toDisplayDate(item.date),
          createdAt: toDisplayDate(item.createdAt),
          updatedAt: toDisplayDate(item.updatedAt),
        };
      }),
    [data]
  );

  const emptyBagSizeColumnIds = React.useMemo(() => {
    const emptyColumns = new Set<BagSizeColumnId>();
    BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
      const hasAnyValue = incomingReportData.some(
        (row) => Number(row[columnId] ?? 0) > 0
      );
      if (!hasAnyValue) {
        emptyColumns.add(columnId);
      }
    });
    return emptyColumns;
  }, [incomingReportData]);

  React.useEffect(() => {
    setColumnVisibility((current) => {
      const next = { ...current };
      let changed = false;

      BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
        if (emptyBagSizeColumnIds.has(columnId)) {
          if (next[columnId] !== false) {
            next[columnId] = false;
            changed = true;
          }
          return;
        }

        if (next[columnId] === false) {
          delete next[columnId];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [emptyBagSizeColumnIds]);

  const effectiveColumnVisibility = React.useMemo<VisibilityState>(() => {
    const next: VisibilityState = { ...columnVisibility };

    BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
      if (emptyBagSizeColumnIds.has(columnId)) {
        next[columnId] = false;
      }
    });

    return next;
  }, [columnVisibility, emptyBagSizeColumnIds]);

  const table = useReactTable<IncomingReportRow>({
    data: incomingReportData,
    columns,
    defaultColumn: {
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_COLUMN_MIN_SIZE,
      maxSize: DEFAULT_COLUMN_MAX_SIZE,
    },
    state: {
      sorting,
      columnVisibility: effectiveColumnVisibility,
      columnOrder,
      columnFilters,
      grouping,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode,
    columnResizeDirection,
    globalFilterFn: globalManualGatePassFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const sortedRows = table.getSortedRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );
  const totalsByColumn = React.useMemo(() => {
    const totals = {
      ...createEmptyBagSizeValues(),
      totalBags: 0,
    };

    for (const row of filteredRows) {
      const original = row.original;
      BAG_SIZE_COLUMN_IDS.forEach((columnId) => {
        totals[columnId] += Number(original[columnId] ?? 0);
      });
      totals.totalBags += Number(original.totalBags ?? 0);
    }

    return totals;
  }, [filteredRows]);
  const hasVisibleNumericTotals = React.useMemo(
    () => visibleColumnIds.some((columnId) => numericColumnIds.has(columnId)),
    [visibleColumnIds]
  );

  const formatTotal = (value: number): string => formatNumberOrEmpty(value, 0);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 42,
    getScrollElement: () => tableContainerRef.current,
    measureElement: isFirefoxBrowser
      ? undefined
      : (element) => element?.getBoundingClientRect().height,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  const handleApply = () => {
    if (hasDateFilters) {
      const nextFromDate = toApiDate(fromDate);
      const nextToDate = toApiDate(toDate);

      if (!nextFromDate || !nextToDate) return;

      setAppliedFromDate(nextFromDate);
      setAppliedToDate(nextToDate);
    }
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  const buildPdfWorkerPayload = React.useCallback(
    (generatedAt: string) => {
      return {
        rows: getLeafRowsForPdf(sortedRows),
        visibleColumnIds,
        grouping,
        coldStorageName,
        generatedAt,
      } satisfies IncomingPdfWorkerRequest;
    },
    [coldStorageName, grouping, sortedRows, visibleColumnIds]
  );

  return (
    <>
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <div className="space-y-4">
          <Item
            variant="outline"
            size="sm"
            className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
          >
            <div className="flex w-full flex-wrap items-end gap-3 lg:flex-nowrap">
              {/* Date range */}
              <div className="flex items-end gap-2 self-end">
                <DatePicker
                  id="analytics-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
                <span className="text-muted-foreground mb-2 self-end text-sm">
                  →
                </span>
                <DatePicker
                  id="analytics-to-date"
                  label="To"
                  compact
                  value={toDate}
                  onChange={setToDate}
                />
              </div>

              {/* Divider */}
              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              {/* Apply / Reset */}
              <div className="flex items-center gap-2 self-end">
                <Button
                  className="h-8 rounded-lg px-4 text-sm shadow-none"
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  Apply
                </Button>
                <Button
                  variant="outline"
                  className="text-muted-foreground h-8 rounded-lg px-4 text-sm"
                  onClick={handleResetFilters}
                >
                  Reset
                </Button>
              </div>

              {/* Divider */}
              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              {/* Search + Right actions */}
              <div className="ml-auto flex items-center gap-2 self-end">
                <div className="relative min-w-[160px] lg:w-[220px]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search manual gate pass…"
                    className="h-8 pl-8 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
                  onClick={() => setIsViewFiltersOpen(true)}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  View Filters
                </Button>
                <IncomingPdfButton buildPayload={buildPdfWorkerPayload} />
                <Button
                  variant="ghost"
                  className="text-muted-foreground h-8 rounded-lg px-2 leading-none"
                  disabled={isFetching}
                  onClick={() => refetch()}
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
            </div>
          </Item>

          <div className="w-full">
            {isError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load incoming report'}
              </p>
            )}
            <div
              ref={tableContainerRef}
              className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
              style={{
                direction: table.options.columnResizeDirection,
                height: '560px',
                position: 'relative',
              }}
            >
              {isLoading ? (
                <div className="space-y-4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-8 w-44 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-8 gap-2">
                    {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                      (_, index) => (
                        <Skeleton
                          key={`incoming-report-header-skeleton-${index}`}
                          className="h-8 w-full rounded-md"
                        />
                      )
                    )}
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: TABLE_SKELETON_ROWS }).map(
                      (_, rowIndex) => (
                        <div
                          key={`incoming-report-row-skeleton-${rowIndex}`}
                          className="grid grid-cols-8 gap-2"
                        >
                          {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                            (_, columnIndex) => (
                              <Skeleton
                                key={`incoming-report-cell-skeleton-${rowIndex}-${columnIndex}`}
                                className="h-7 w-full rounded-md"
                              />
                            )
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-muted-foreground flex h-24 items-center justify-center">
                  No records found.
                </div>
              ) : (
                <table
                  style={{ display: 'grid', width: table.getTotalSize() }}
                  className="font-custom text-sm"
                >
                  <TableHeader
                    className="bg-secondary border-border/60 text-secondary-foreground border-b backdrop-blur-sm"
                    style={{
                      display: 'grid',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                    }}
                  >
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow
                        key={headerGroup.id}
                        style={{ display: 'flex', width: '100%' }}
                        className="hover:bg-transparent"
                      >
                        {headerGroup.headers.map((header) => {
                          if (header.isPlaceholder) return null;
                          const isRightAligned = numericColumnIds.has(
                            header.id
                          );
                          return (
                            <TableHead
                              key={header.id}
                              style={{
                                display: 'flex',
                                width: header.getSize(),
                                position: 'relative',
                              }}
                              className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0"
                            >
                              <div
                                className={`group flex w-full min-w-0 cursor-pointer items-center gap-1 transition-colors ${
                                  isRightAligned
                                    ? 'justify-end'
                                    : 'justify-between'
                                }`}
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                <span className="truncate">
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                                <span className={isRightAligned ? 'ml-2' : ''}>
                                  {{
                                    asc: (
                                      <ArrowUp className="ml-1 h-3.5 w-3.5" />
                                    ),
                                    desc: (
                                      <ArrowDown className="ml-1 h-3.5 w-3.5" />
                                    ),
                                  }[header.column.getIsSorted() as string] ?? (
                                    <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                  )}
                                </span>
                              </div>
                              <div
                                onDoubleClick={() => header.column.resetSize()}
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                onClick={(event) => event.stopPropagation()}
                                className="hover:bg-primary/25 absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent transition-colors"
                                style={{
                                  transform:
                                    table.options.columnResizeMode ===
                                      'onEnd' && header.column.getIsResizing()
                                      ? `translateX(${
                                          (table.options
                                            .columnResizeDirection === 'rtl'
                                            ? -1
                                            : 1) *
                                          (table.getState().columnSizingInfo
                                            .deltaOffset ?? 0)
                                        }px)`
                                      : '',
                                }}
                              />
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody
                    style={{
                      display: 'grid',
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: 'relative',
                    }}
                  >
                    {virtualRows.map((virtualRow) => {
                      const row = rows[
                        virtualRow.index
                      ] as Row<IncomingReportRow>;
                      return (
                        <TableRow
                          key={row.id}
                          data-index={virtualRow.index}
                          ref={(node) => rowVirtualizer.measureElement(node)}
                          className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${
                            virtualRow.index % 2 === 0
                              ? 'bg-background'
                              : 'bg-muted/25'
                          }`}
                          style={{
                            display: 'flex',
                            position: 'absolute',
                            transform: `translateY(${virtualRow.start}px)`,
                            width: '100%',
                          }}
                        >
                          {row.getVisibleCells().map((cell) => {
                            const isGroupedCell = cell.getIsGrouped();
                            const isAggregatedCell = cell.getIsAggregated();
                            const isPlaceholderCell = cell.getIsPlaceholder();
                            const shouldSuppressAggregation =
                              isAggregatedCell &&
                              (cell.column.id === 'gatePassNo' ||
                                cell.column.id === 'manualGatePassNumber');
                            return (
                              <TableCell
                                key={cell.id}
                                style={{
                                  display: 'flex',
                                  width: cell.column.getSize(),
                                }}
                                className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap last:border-r-0"
                              >
                                {isGroupedCell ? (
                                  <button
                                    type="button"
                                    onClick={row.getToggleExpandedHandler()}
                                    className={`inline-flex items-center gap-1 text-left transition-colors ${
                                      row.getCanExpand()
                                        ? 'hover:text-primary cursor-pointer'
                                        : 'cursor-default'
                                    }`}
                                  >
                                    <span className="text-xs">
                                      {row.getIsExpanded() ? '▼' : '▶'}
                                    </span>
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                    <span className="text-muted-foreground text-xs">
                                      ({row.subRows.length})
                                    </span>
                                  </button>
                                ) : isAggregatedCell ? (
                                  shouldSuppressAggregation ? (
                                    <span className="text-muted-foreground/50">
                                      -
                                    </span>
                                  ) : (
                                    flexRender(
                                      cell.column.columnDef.aggregatedCell ??
                                        cell.column.columnDef.cell,
                                      cell.getContext()
                                    )
                                  )
                                ) : isPlaceholderCell ? null : (
                                  flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  {rows.length > 0 && hasVisibleNumericTotals ? (
                    <TableFooter
                      className="bg-secondary border-border/70 text-secondary-foreground border-t backdrop-blur-sm"
                      style={{
                        display: 'grid',
                        position: 'sticky',
                        bottom: 0,
                        // Reserve space for the native scrollbar so it doesn't overlap totals values.
                        paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                        zIndex: 9,
                      }}
                    >
                      <TableRow
                        style={{ display: 'flex', width: '100%' }}
                        className="hover:bg-transparent"
                      >
                        {visibleColumnIds.map((columnId, columnIndex) => {
                          const cellValue = BAG_SIZE_COLUMN_IDS.includes(
                            columnId as BagSizeColumnId
                          )
                            ? formatTotal(
                                totalsByColumn[columnId as BagSizeColumnId]
                              )
                            : columnId === 'totalBags'
                              ? formatTotal(totalsByColumn.totalBags)
                              : '';
                          const isRightAligned = numericColumnIds.has(columnId);

                          return (
                            <TableCell
                              key={`totals-${columnId}`}
                              style={{
                                display: 'flex',
                                width: table.getColumn(columnId)?.getSize(),
                              }}
                              className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold last:border-r-0 ${
                                isRightAligned ? 'justify-end tabular-nums' : ''
                              }`}
                            >
                              {columnIndex === 0 ? 'Total' : cellValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableFooter>
                  ) : null}
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
      <ViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={setIsViewFiltersOpen}
        table={table}
        defaultColumnOrder={defaultColumnOrder}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default StorageReportTable;
