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
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
  type FilterField,
} from '@/lib/advanced-filters';
import { useStore } from '@/stores/store';
import { useGetFarmerSeedReport } from '@/services/store-admin/farmer-seed/analytics/useGetFarmerSeedReport';
import type { FarmerSeedReportEntry } from '@/types/farmer-seed';
import { ViewFiltersSheet } from '@/components/analytics/farmer-seed/report/view-filters-sheet/index';
import type { FarmerSeedReportRow } from '@/components/analytics/farmer-seed/report/columns';
import PdfWorker from './pdf.worker?worker';
import type {
  FarmerSeedPdfWorkerRequest,
  FarmerSeedPdfWorkerResponse,
} from '@/components/analytics/farmer-seed/report/pdf.worker';

function toDisplayDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;
  if (year.length !== 4) return undefined;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function formatIndianNumber(value: number, precision = 0): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function formatNumberOrEmpty(value: number, precision = 0): string {
  return Number(value || 0) === 0 ? '' : formatIndianNumber(value, precision);
}

function getFarmerData(item: FarmerSeedReportEntry) {
  if (
    item.farmerStorageLinkId &&
    typeof item.farmerStorageLinkId !== 'string' &&
    item.farmerStorageLinkId.farmerId &&
    typeof item.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return {
      farmerId: item.farmerStorageLinkId.farmerId._id,
      farmerName: item.farmerStorageLinkId.farmerId.name,
      farmerAddress: item.farmerStorageLinkId.farmerId.address ?? '-',
      accountNumber: item.farmerStorageLinkId.accountNumber,
    };
  }

  return {
    farmerId: '-',
    farmerName: '-',
    farmerAddress: '-',
    accountNumber: null as number | null,
  };
}

function getFarmerDisplayName(
  farmerName: string,
  accountNumber: number | null
): string {
  if (typeof accountNumber === 'number') {
    return `${farmerName} (#${accountNumber})`;
  }
  return farmerName;
}

function computeTotals(entry: FarmerSeedReportEntry) {
  const totalBags = (entry.bagSizes || []).reduce(
    (sum, bag) => sum + Number(bag.quantity || 0),
    0
  );
  const totalAcres = (entry.bagSizes || []).reduce(
    (sum, bag) => sum + Number(bag.acres || 0),
    0
  );
  const totalAmount = (entry.bagSizes || []).reduce(
    (sum, bag) => sum + Number(bag.quantity || 0) * Number(bag.rate || 0),
    0
  );
  const averageRate = totalBags > 0 ? totalAmount / totalBags : 0;

  return {
    totalBags,
    totalAcres,
    totalAmount,
    averageRate,
  };
}

type BagSizeKey =
  | 'bag35to40'
  | 'bag40to45'
  | 'bag40to50'
  | 'bag45to50'
  | 'bag50to55';

type BagSizeMetric = {
  quantity: number;
  totalAcres: number;
  totalRateAmount: number;
};

function normalizeBagSizeName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, '');

  const matchedRange = normalized.match(/(\d{2})-(\d{2})/);
  if (matchedRange) {
    return `${matchedRange[1]}-${matchedRange[2]}`;
  }

  return normalized;
}

function createEmptyBagSizeMetric(): BagSizeMetric {
  return {
    quantity: 0,
    totalAcres: 0,
    totalRateAmount: 0,
  };
}

function getBagSizeKey(name: string): BagSizeKey | null {
  switch (name) {
    case '35-40':
      return 'bag35to40';
    case '40-45':
      return 'bag40to45';
    case '40-50':
      return 'bag40to50';
    case '45-50':
      return 'bag45to50';
    case '50-55':
      return 'bag50to55';
    default:
      return null;
  }
}

function getBagSizeMetrics(
  entry: FarmerSeedReportEntry
): Record<BagSizeKey, BagSizeMetric> {
  const metrics: Record<BagSizeKey, BagSizeMetric> = {
    bag35to40: createEmptyBagSizeMetric(),
    bag40to45: createEmptyBagSizeMetric(),
    bag40to50: createEmptyBagSizeMetric(),
    bag45to50: createEmptyBagSizeMetric(),
    bag50to55: createEmptyBagSizeMetric(),
  };

  for (const bag of entry.bagSizes || []) {
    const normalized = normalizeBagSizeName(String(bag.name || ''));
    const bagSizeKey = getBagSizeKey(normalized);
    if (!bagSizeKey) continue;
    const quantity = Number(bag.quantity || 0);
    const rate = Number(bag.rate || 0);
    const acres = Number(bag.acres || 0);

    metrics[bagSizeKey].quantity += quantity;
    metrics[bagSizeKey].totalAcres += acres;
    metrics[bagSizeKey].totalRateAmount += quantity * rate;
  }

  return metrics;
}

function renderBagSizeCell(
  quantity: number,
  rate: number,
  acres: number,
  precision = 2
) {
  if (Number(quantity || 0) === 0) return '';

  return (
    <div className="w-full text-right tabular-nums">
      <div>{formatIndianNumber(quantity, 0)}</div>
      <div className="text-muted-foreground text-[10px] leading-tight font-medium">
        <div>Rate - {formatIndianNumber(rate, precision)}</div>
        <div>Acres - {formatIndianNumber(acres, 2)}</div>
      </div>
    </div>
  );
}

const columnHelper = createColumnHelper<FarmerSeedReportRow>();
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');
const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 110;
const DEFAULT_COLUMN_MAX_SIZE = 560;
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;

const defaultColumnOrder: string[] = [
  'farmerName',
  'gatePassNo',
  'invoiceNumber',
  'date',
  'variety',
  'generation',
  'bag35to40',
  'bag40to45',
  'bag40to50',
  'bag45to50',
  'bag50to55',
  'totalBags',
  'totalAmount',
  'remarks',
];

const numericColumnIds = new Set([
  'gatePassNo',
  'bag35to40',
  'bag40to45',
  'bag40to50',
  'bag45to50',
  'bag50to55',
  'totalBags',
  'totalAmount',
]);

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
const globalFilterFn: FilterFn<FarmerSeedReportRow> = (
  row,
  _columnId,
  filterValue: GlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    const advancedRow = {
      gatePassNo: row.original.gatePassNo,
      date: row.original.date,
      farmerName: row.original.farmerName,
      variety: row.original.variety,
      bagsReceived: row.original.totalBags,
      netWeightKg: row.original.totalAcres,
      status: '',
      location: '',
      truckNumber: '',
    } as Record<FilterField, string | number>;
    return evaluateFilterGroup(advancedRow, filterValue);
  }
  const normalized = String(filterValue).trim().toLowerCase();
  if (!normalized) return true;
  return String(row.original.invoiceNumber ?? '-')
    .toLowerCase()
    .includes(normalized);
};

const columns = [
  columnHelper.accessor('farmerName', {
    header: 'Farmer',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 500,
    maxSize: 550,
  }),
  columnHelper.accessor('gatePassNo', {
    header: () => <div className="w-full text-right">Gate Pass No</div>,
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    minSize: 110,
    maxSize: 200,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue() || 0), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('invoiceNumber', {
    header: 'Invoice Number',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('generation', {
    header: 'Generation',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('bag35to40', {
    header: () => <div className="w-full text-right">35-40 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) =>
      renderBagSizeCell(
        Number(info.getValue() || 0),
        Number(info.row.original.bag35to40Rate || 0),
        Number(info.row.original.bag35to40Acres || 0)
      ),
  }),
  columnHelper.accessor('bag40to45', {
    header: () => <div className="w-full text-right">40-45 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) =>
      renderBagSizeCell(
        Number(info.getValue() || 0),
        Number(info.row.original.bag40to45Rate || 0),
        Number(info.row.original.bag40to45Acres || 0)
      ),
  }),
  columnHelper.accessor('bag40to50', {
    header: () => <div className="w-full text-right">40-50 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) =>
      renderBagSizeCell(
        Number(info.getValue() || 0),
        Number(info.row.original.bag40to50Rate || 0),
        Number(info.row.original.bag40to50Acres || 0)
      ),
  }),
  columnHelper.accessor('bag45to50', {
    header: () => <div className="w-full text-right">45-50 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) =>
      renderBagSizeCell(
        Number(info.getValue() || 0),
        Number(info.row.original.bag45to50Rate || 0),
        Number(info.row.original.bag45to50Acres || 0)
      ),
  }),
  columnHelper.accessor('bag50to55', {
    header: () => <div className="w-full text-right">50-55 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) =>
      renderBagSizeCell(
        Number(info.getValue() || 0),
        Number(info.row.original.bag50to55Rate || 0),
        Number(info.row.original.bag50to55Acres || 0)
      ),
  }),
  columnHelper.accessor('totalBags', {
    header: () => <div className="w-full text-right">Total Bags</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue() || 0), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('totalAmount', {
    header: () => <div className="w-full text-right">Total Rate</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 120,
    maxSize: 220,
    cell: (info) => (
      <div className="w-full text-right font-medium tabular-nums">
        {formatIndianNumber(Number(info.getValue() || 0), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('remarks', {
    header: 'Remarks',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 320,
    maxSize: 560,
    cell: (info) => (
      <div className="font-custom w-full min-w-0 text-left text-sm leading-snug wrap-break-word whitespace-normal">
        {String(info.getValue() ?? '')}
      </div>
    ),
  }),
];

const TABLE_SKELETON_COLUMNS = 8;
const TABLE_SKELETON_ROWS = 10;

function getLeafRowsForPdf(
  rows: Row<FarmerSeedReportRow>[]
): FarmerSeedReportRow[] {
  return rows.flatMap((row) =>
    row.getIsGrouped()
      ? row.getLeafRows().map((leaf) => leaf.original)
      : row.original
  );
}

type FarmerSeedPdfButtonProps = {
  buildPayload: (generatedAt: string) => FarmerSeedPdfWorkerRequest;
};

const FarmerSeedPdfButton = ({ buildPayload }: FarmerSeedPdfButtonProps) => {
  const objectUrlRef = React.useRef<string | null>(null);
  const workerRef = React.useRef<Worker | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  React.useEffect(
    () => () => {
      if (workerRef.current) workerRef.current.terminate();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

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
    previewTab.document.write(
      '<!doctype html><html><body style="font-family:Inter,sans-serif;padding:24px">Generating PDF...</body></html>'
    );
    previewTab.document.close();
    setIsGeneratingPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedAt = new Date().toLocaleString('en-IN');
      const worker = new PdfWorker();
      workerRef.current = worker;
      const blob = await new Promise<Blob>((resolve, reject) => {
        worker.onmessage = (
          event: MessageEvent<FarmerSeedPdfWorkerResponse>
        ) => {
          if (event.data.status === 'success') resolve(event.data.blob);
          else reject(new Error(event.data.message));
        };
        worker.onerror = (event) =>
          reject(new Error(event.message || 'PDF worker execution failed'));
        worker.postMessage(buildPayload(generatedAt));
      });
      const nextUrl = URL.createObjectURL(blob);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = nextUrl;
      if (!previewTab.closed) previewTab.location.replace(nextUrl);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      if (!previewTab.closed) {
        previewTab.document.open();
        previewTab.document.write(
          `<!doctype html><html><body style="font-family:Inter,sans-serif;padding:24px;color:#991b1b">Failed to generate PDF<br/><pre>${message}</pre></body></html>`
        );
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

  return (
    <Button
      variant="default"
      className="h-8 rounded-lg px-4 text-sm leading-none"
      disabled={isGeneratingPdf}
      onClick={() => void handleGenerate()}
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

const FarmerSeedReportTable = () => {
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
      generation: true,
      remarks: true,
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
    useGetFarmerSeedReport(
      {
        fromDate: hasAppliedDateFilters ? appliedFromDate : undefined,
        toDate: hasAppliedDateFilters ? appliedToDate : undefined,
      },
      { enabled: true }
    );

  const reportData = React.useMemo<FarmerSeedReportRow[]>(
    () =>
      (data ?? []).map((item) => {
        const farmer = getFarmerData(item);
        const totals = computeTotals(item);
        const bagSizes = getBagSizeMetrics(item);

        const getRateFor = (key: BagSizeKey) =>
          bagSizes[key].quantity > 0
            ? bagSizes[key].totalRateAmount / bagSizes[key].quantity
            : 0;

        return {
          id: item._id,
          farmerId: farmer.farmerId,
          farmerName: getFarmerDisplayName(
            farmer.farmerName,
            farmer.accountNumber
          ),
          farmerAddress: farmer.farmerAddress,
          accountNumber: farmer.accountNumber,
          gatePassNo: item.gatePassNo ?? 0,
          invoiceNumber: item.invoiceNumber ?? '-',
          date: toDisplayDate(item.date),
          variety: item.variety ?? '-',
          generation: item.generation ?? '-',
          bag35to40: bagSizes.bag35to40.quantity,
          bag35to40Rate: getRateFor('bag35to40'),
          bag35to40Acres: bagSizes.bag35to40.totalAcres,
          bag40to45: bagSizes.bag40to45.quantity,
          bag40to45Rate: getRateFor('bag40to45'),
          bag40to45Acres: bagSizes.bag40to45.totalAcres,
          bag40to50: bagSizes.bag40to50.quantity,
          bag40to50Rate: getRateFor('bag40to50'),
          bag40to50Acres: bagSizes.bag40to50.totalAcres,
          bag45to50: bagSizes.bag45to50.quantity,
          bag45to50Rate: getRateFor('bag45to50'),
          bag45to50Acres: bagSizes.bag45to50.totalAcres,
          bag50to55: bagSizes.bag50to55.quantity,
          bag50to55Rate: getRateFor('bag50to55'),
          bag50to55Acres: bagSizes.bag50to55.totalAcres,
          totalBags: totals.totalBags,
          totalAcres: totals.totalAcres,
          averageRate: totals.averageRate,
          totalAmount: totals.totalAmount,
          remarks: item.remarks ?? '-',
          createdAt: toDisplayDate(item.createdAt),
          updatedAt: toDisplayDate(item.updatedAt),
        };
      }),
    [data]
  );

  const table = useReactTable<FarmerSeedReportRow>({
    data: reportData,
    columns,
    defaultColumn: {
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_COLUMN_MIN_SIZE,
      maxSize: DEFAULT_COLUMN_MAX_SIZE,
    },
    state: {
      sorting,
      columnVisibility,
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
    globalFilterFn,
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
    return filteredRows.reduce(
      (acc, row) => {
        acc.bag35to40 += Number(row.original.bag35to40 ?? 0);
        acc.bag40to45 += Number(row.original.bag40to45 ?? 0);
        acc.bag40to50 += Number(row.original.bag40to50 ?? 0);
        acc.bag45to50 += Number(row.original.bag45to50 ?? 0);
        acc.bag50to55 += Number(row.original.bag50to55 ?? 0);
        acc.totalBags += Number(row.original.totalBags ?? 0);
        acc.totalAmount += Number(row.original.totalAmount ?? 0);
        return acc;
      },
      {
        bag35to40: 0,
        bag40to45: 0,
        bag40to50: 0,
        bag45to50: 0,
        bag50to55: 0,
        totalBags: 0,
        totalAmount: 0,
      }
    );
  }, [filteredRows]);
  const hasVisibleNumericTotals = React.useMemo(
    () => visibleColumnIds.some((columnId) => numericColumnIds.has(columnId)),
    [visibleColumnIds]
  );

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
    if (!hasDateFilters) return;
    const nextFromDate = toApiDate(fromDate);
    const nextToDate = toApiDate(toDate);
    if (!nextFromDate || !nextToDate) return;
    setAppliedFromDate(nextFromDate);
    setAppliedToDate(nextToDate);
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  const buildPdfWorkerPayload = React.useCallback(
    (generatedAt: string) =>
      ({
        rows: getLeafRowsForPdf(sortedRows),
        visibleColumnIds,
        grouping,
        coldStorageName,
        generatedAt,
      }) satisfies FarmerSeedPdfWorkerRequest,
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
              <div className="flex items-end gap-2 self-end">
                <DatePicker
                  id="analytics-seed-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
                <span className="text-muted-foreground mb-2 self-end text-sm">
                  →
                </span>
                <DatePicker
                  id="analytics-seed-to-date"
                  label="To"
                  compact
                  value={toDate}
                  onChange={setToDate}
                />
              </div>

              <div className="bg-border/40 hidden h-7 w-px lg:block" />

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

              <div className="bg-border/40 hidden h-7 w-px lg:block" />

              <div className="ml-auto flex items-center gap-2 self-end">
                <div className="relative min-w-[160px] lg:w-[220px]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search invoice…"
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
                <FarmerSeedPdfButton buildPayload={buildPdfWorkerPayload} />
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
                  : 'Failed to load farmer seed report'}
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
                      (_, i) => (
                        <Skeleton
                          key={`farmer-seed-header-skeleton-${i}`}
                          className="h-8 w-full rounded-md"
                        />
                      )
                    )}
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: TABLE_SKELETON_ROWS }).map(
                      (_, rowI) => (
                        <div
                          key={`farmer-seed-row-skeleton-${rowI}`}
                          className="grid grid-cols-8 gap-2"
                        >
                          {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                            (_, colI) => (
                              <Skeleton
                                key={`farmer-seed-cell-skeleton-${rowI}-${colI}`}
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
                      ] as Row<FarmerSeedReportRow>;
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
                            const isRemarksCell = cell.column.id === 'remarks';
                            return (
                              <TableCell
                                key={cell.id}
                                style={{
                                  display: 'flex',
                                  width: cell.column.getSize(),
                                  minWidth: isRemarksCell ? 0 : undefined,
                                }}
                                className={`font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle last:border-r-0 ${
                                  isRemarksCell
                                    ? 'whitespace-normal'
                                    : 'whitespace-nowrap'
                                }`}
                              >
                                {isGroupedCell ? (
                                  <button
                                    type="button"
                                    onClick={row.getToggleExpandedHandler()}
                                    className={`${
                                      isRemarksCell
                                        ? 'flex w-full min-w-0 flex-wrap items-start gap-1 whitespace-normal'
                                        : 'inline-flex items-center gap-1 whitespace-nowrap'
                                    } text-left transition-colors ${
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
                                  <span className="text-muted-foreground/50">
                                    -
                                  </span>
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
                        paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                        zIndex: 9,
                      }}
                    >
                      <TableRow
                        style={{ display: 'flex', width: '100%' }}
                        className="hover:bg-transparent"
                      >
                        {visibleColumnIds.map((columnId, columnIndex) => {
                          const cellValue =
                            columnId === 'bag35to40'
                              ? formatNumberOrEmpty(totalsByColumn.bag35to40, 0)
                              : columnId === 'bag40to45'
                                ? formatNumberOrEmpty(
                                    totalsByColumn.bag40to45,
                                    0
                                  )
                                : columnId === 'bag40to50'
                                  ? formatNumberOrEmpty(
                                      totalsByColumn.bag40to50,
                                      0
                                    )
                                  : columnId === 'bag45to50'
                                    ? formatNumberOrEmpty(
                                        totalsByColumn.bag45to50,
                                        0
                                      )
                                    : columnId === 'bag50to55'
                                      ? formatNumberOrEmpty(
                                          totalsByColumn.bag50to55,
                                          0
                                        )
                                      : columnId === 'totalBags'
                                        ? formatIndianNumber(
                                            totalsByColumn.totalBags,
                                            0
                                          )
                                        : columnId === 'totalAmount'
                                          ? formatIndianNumber(
                                              totalsByColumn.totalAmount,
                                              2
                                            )
                                          : '';
                          const isRightAligned = numericColumnIds.has(columnId);
                          const isRemarksColumn = columnId === 'remarks';
                          return (
                            <TableCell
                              key={`totals-${columnId}`}
                              style={{
                                display: 'flex',
                                width: table.getColumn(columnId)?.getSize(),
                                minWidth: isRemarksColumn ? 0 : undefined,
                              }}
                              className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold last:border-r-0 ${
                                isRightAligned
                                  ? 'justify-end tabular-nums'
                                  : isRemarksColumn
                                    ? 'h-auto min-h-10 items-start py-2 wrap-break-word whitespace-normal'
                                    : ''
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

export default FarmerSeedReportTable;
