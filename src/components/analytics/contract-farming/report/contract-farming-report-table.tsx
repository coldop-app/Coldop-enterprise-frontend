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
import { Badge } from '@/components/ui/badge';
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
import { ViewFiltersSheet } from './view-filters-sheet/index';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import type { ContractFarmingReportRow } from './columns';
import { useStore } from '@/stores/store';
import { useGetContractFarmingReport } from '@/services/store-admin/general/useGetContractFarmingReport';
import { BUY_BACK_COST, GRADING_SIZES } from '@/lib/constants';
import PdfWorker from './pdf.worker?worker';
import type {
  ContractFarmingPdfWorkerRequest,
  ContractFarmingPdfWorkerResponse,
} from './pdf.worker';

function getLeafRowsForPdf(
  rows: Row<ContractFarmingReportRow>[]
): ContractFarmingReportRow[] {
  return rows.flatMap((row) => {
    if (row.getIsGrouped()) {
      return row.getLeafRows().map((leafRow) => leafRow.original);
    }
    return row.original;
  });
}

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  if (year.length !== 4) return undefined;

  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const asString = value.toString().toLowerCase();
  if (!asString.includes('e')) {
    return asString.includes('.') ? (asString.split('.')[1]?.length ?? 0) : 0;
  }

  const [base, exponentPart] = asString.split('e');
  const exponent = Number(exponentPart);
  const baseDecimals = base.includes('.')
    ? (base.split('.')[1]?.length ?? 0)
    : 0;

  if (!Number.isFinite(exponent)) return baseDecimals;
  if (exponent >= 0) return Math.max(0, baseDecimals - exponent);
  return baseDecimals + Math.abs(exponent);
}

function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeKey(value: string): string {
  return value.replace(/–/g, '-').replace(/\s+/g, '').toLowerCase();
}

function toSizeColumnId(size: string): string {
  return `grading_${normalizeKey(size)}`;
}

function toSizeRateLabel(size: string): string {
  return size.replace(/–/g, '-');
}

function resolveBuyBackRate(variety: string, size: string): number {
  const normalizedVariety = variety.trim().toLowerCase();
  const rateEntry = BUY_BACK_COST.find((item) =>
    normalizedVariety.includes(item.variety.toLowerCase())
  );
  if (!rateEntry) return 0;

  const targetKey = normalizeKey(size);
  const matched = Object.entries(rateEntry.sizeRates).find(
    ([rateSize]) => normalizeKey(rateSize) === targetKey
  );
  return round2(Number(matched?.[1] ?? 0));
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatIndianNumber(round2(value), 2)}%`;
}

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

const columnHelper = createColumnHelper<ContractFarmingReportRow>();
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');
const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;

const defaultColumnOrder: string[] = [
  'serialNumber',
  'familyKey',
  'gatePassNo',
  'variety',
  'farmerName',
  'farmerAddress',
  'createdByName',
  'manualGatePassNumber',
  'location',
  'date',
  'bagsReceived',
  'netWeightKg',
  ...GRADING_SIZES.map((size) => toSizeColumnId(size)),
  'totalGradingBags',
  'below40Percent',
  'range40To50Percent',
  'above50Percent',
  'cutPercent',
  'netWeightAfterGradingKg',
  'buyBackAmount',
  'totalSeedAmount',
  'netAmountPayable',
  'netAmountPerAcre',
  'yieldPerAcreQuintals',
  'truckNumber',
  'grossWeightKg',
  'tareWeightKg',
  'status',
  'remarks',
];
const numericColumnIds = new Set([
  'serialNumber',
  'manualGatePassNumber',
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'totalGradingBags',
  'below40Percent',
  'range40To50Percent',
  'above50Percent',
  'cutPercent',
  'netWeightAfterGradingKg',
  'buyBackAmount',
  'totalSeedAmount',
  'netAmountPayable',
  'netAmountPerAcre',
  'yieldPerAcreQuintals',
  ...GRADING_SIZES.map((size) => toSizeColumnId(size)),
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
const globalManualGatePassFilterFn: FilterFn<ContractFarmingReportRow> = (
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
  columnHelper.accessor('serialNumber', {
    header: 'S. No.',
    sortingFn: 'basic',
    size: 80,
    maxSize: 120,
    cell: (info) => <span>{info.getValue() ?? '-'}</span>,
  }),
  columnHelper.accessor('familyKey', {
    header: 'Family',
    sortingFn: 'alphanumeric',
    size: 110,
    maxSize: 180,
    cell: (info) => {
      const isFamilyTotal = info.row.original.rowKind === 'family-total';
      return (
        <span
          className={
            isFamilyTotal
              ? 'text-primary font-semibold'
              : 'bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium'
          }
        >
          {info.getValue() || '-'}
        </span>
      );
    },
  }),
  columnHelper.accessor('gatePassNo', {
    header: 'Account No.',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
    cell: (info) => (
      <span className="font-custom font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('manualGatePassNumber', {
    header: 'Size Qty',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('date', {
    header: 'Generation',
    sortingFn: 'alphanumeric',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('farmerName', {
    header: 'Farmer',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 550,
    maxSize: 550,
  }),
  columnHelper.accessor('farmerAddress', {
    header: 'Address',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('farmerMobileNumber', {
    header: 'Mobile Number',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('createdByName', {
    header: 'Size Name',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('location', {
    header: 'Planted Acres',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('truckNumber', {
    header: 'Buy-Back Varieties',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('bagsReceived', {
    header: () => <div className="w-full text-right">Buy-Back Bags</div>,
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
  columnHelper.accessor('grossWeightKg', {
    header: () => <div className="w-full text-right">Size Acres</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 120,
    maxSize: 220,
    cell: (info) => {
      const value = info.row.original.grossWeightKg;
      const precision = getDecimalPlaces(value);
      return (
        <div className="w-full text-right tabular-nums">
          {formatIndianNumber(value, precision)}
        </div>
      );
    },
  }),
  columnHelper.accessor('tareWeightKg', {
    header: () => <div className="w-full text-right">Seed Payable</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 120,
    maxSize: 220,
    cell: (info) => {
      const value = info.row.original.tareWeightKg;
      const precision = getDecimalPlaces(value);
      return (
        <div className="w-full text-right tabular-nums">
          {formatIndianNumber(value, precision)}
        </div>
      );
    },
  }),
  columnHelper.accessor('netWeightKg', {
    header: () => <div className="w-full text-right">Buy-Back Net (kg)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    aggregationFn: (_columnId, leafRows) => {
      const maxPrecision = leafRows.reduce((max, row) => {
        const precision = Number(row.original.netWeightPrecision ?? 0);
        return Math.max(max, precision);
      }, 0);
      const factor = 10 ** maxPrecision;
      const scaledSum = leafRows.reduce((sum, row) => {
        const value = Number(row.original.netWeightKg ?? 0);
        return sum + Math.round(value * factor);
      }, 0);
      return scaledSum / factor;
    },
    aggregatedCell: (info) => {
      const groupedRows = info.row.getLeafRows();
      const maxPrecision = groupedRows.reduce((max, row) => {
        const precision = Number(row.original.netWeightPrecision ?? 0);
        return Math.max(max, precision);
      }, 0);
      const factor = 10 ** maxPrecision;
      const scaledSum = groupedRows.reduce((sum, row) => {
        const value = Number(row.original.netWeightKg ?? 0);
        return sum + Math.round(value * factor);
      }, 0);
      const safeTotal = scaledSum / factor;
      return (
        <div className="w-full text-right font-medium tabular-nums">
          {formatIndianNumber(safeTotal, maxPrecision)}
        </div>
      );
    },
    minSize: 110,
    maxSize: 200,
    cell: (info) => {
      const { netWeightKg, netWeightPrecision } = info.row.original;
      return (
        <div className="w-full text-right font-medium tabular-nums">
          {formatIndianNumber(netWeightKg, netWeightPrecision)}
        </div>
      );
    },
  }),
  ...GRADING_SIZES.map((size) =>
    columnHelper.accessor(
      (row) => Number(row.gradingBuckets?.[toSizeColumnId(size)] ?? 0),
      {
        id: toSizeColumnId(size),
        header: () => <div className="w-full text-right">{size}</div>,
        sortingFn: 'basic',
        minSize: 95,
        maxSize: 180,
        cell: (info) => (
          <div className="w-full text-right tabular-nums">
            {formatIndianNumber(Number(info.getValue() ?? 0), 0)}
          </div>
        ),
      }
    )
  ),
  columnHelper.accessor('totalGradingBags', {
    header: () => <div className="w-full text-right">Total Grading Bags</div>,
    sortingFn: 'basic',
    minSize: 120,
    maxSize: 220,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue() ?? 0), 0)}
      </div>
    ),
  }),
  columnHelper.accessor('below40Percent', {
    header: () => <div className="w-full text-right">Below 40 %</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatPercent(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('range40To50Percent', {
    header: () => <div className="w-full text-right">40-50 %</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatPercent(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('above50Percent', {
    header: () => <div className="w-full text-right">Above 50 %</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatPercent(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('cutPercent', {
    header: () => <div className="w-full text-right">Cut %</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatPercent(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('netWeightAfterGradingKg', {
    header: () => (
      <div className="w-full text-right">Net After Grading (kg)</div>
    ),
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue() ?? 0), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('buyBackAmount', {
    header: () => <div className="w-full text-right">Buy Back Amount</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue() ?? 0), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('totalSeedAmount', {
    header: () => <div className="w-full text-right">Total Seed Amount</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {info.getValue() == null
          ? '—'
          : formatIndianNumber(Number(info.getValue() ?? 0), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('netAmountPayable', {
    header: () => <div className="w-full text-right">Net Amount Payable</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {info.getValue() == null
          ? '—'
          : formatIndianNumber(Number(info.getValue() ?? 0), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('netAmountPerAcre', {
    header: () => <div className="w-full text-right">Net Amount / Acre</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {info.getValue() == null
          ? '—'
          : formatIndianNumber(Number(info.getValue() ?? 0), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('yieldPerAcreQuintals', {
    header: () => <div className="w-full text-right">Yield / Acre (Qtl)</div>,
    sortingFn: 'basic',
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {info.getValue() == null
          ? '—'
          : formatIndianNumber(Number(info.getValue() ?? 0), 2)}
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    sortingFn: 'text',
    filterFn: (row, columnId, filterValue: string[]) => {
      const statusValue = row.getValue(columnId) as string;
      if (!Array.isArray(filterValue)) return true;
      if (filterValue.length === 0) return true;
      return filterValue.includes(statusValue);
    },
    cell: (info) => {
      const value = info.getValue();
      const isActive = value === 'ACTIVE';
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={`font-custom rounded-md border px-2 py-0.5 text-[11px] tracking-wide uppercase ${
            isActive
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-muted-foreground/20 bg-muted text-muted-foreground'
          }`}
        >
          {String(value).replace('_', ' ')}
        </Badge>
      );
    },
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

type ContractFarmingPdfButtonProps = {
  buildPayload: (generatedAt: string) => ContractFarmingPdfWorkerRequest;
};

type ContractFarmingReportTableProps = {
  enforcedStatus?: string;
};

function normalizeStatusValue(value: string): string {
  return value.trim().replace(/_/g, ' ').toUpperCase();
}

const ContractFarmingPdfButton = ({
  buildPayload,
}: ContractFarmingPdfButtonProps) => {
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
        worker.onmessage = (
          event: MessageEvent<ContractFarmingPdfWorkerResponse>
        ) => {
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

const ContractFarmingReportTable = ({
  enforcedStatus,
}: ContractFarmingReportTableProps) => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      farmerMobileNumber: false,
      createdByName: false,
      location: false,
      gatePassNo: false,
      grossWeightKg: false,
      tareWeightKg: false,
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
  const canApply = Boolean(fromDate && toDate);

  const {
    data: contractFarmingReportResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetContractFarmingReport();

  const contractFarmingReportData = React.useMemo<
    ContractFarmingReportRow[]
  >(() => {
    const groupedRows = Object.entries(
      contractFarmingReportResponse?.byVariety ?? {}
    )
      .sort(([left], [right]) => left.localeCompare(right, 'en-IN'))
      .flatMap(([variety, farmers]) => {
        const positiveSeedFarmers = (farmers ?? []).filter((farmer) =>
          (farmer.sizes ?? []).some((size) => Number(size.quantity ?? 0) > 0)
        );

        const sortedFarmers = positiveSeedFarmers.sort((left, right) => {
          const leftAccount = Number(left.accountNumber ?? 0);
          const rightAccount = Number(right.accountNumber ?? 0);
          const leftFamily = Math.floor(
            Number.isFinite(leftAccount) ? leftAccount : 0
          );
          const rightFamily = Math.floor(
            Number.isFinite(rightAccount) ? rightAccount : 0
          );
          if (leftFamily !== rightFamily) return leftFamily - rightFamily;
          if (leftAccount !== rightAccount) return leftAccount - rightAccount;
          return (left.name ?? '').localeCompare(right.name ?? '', 'en-IN');
        });

        const rowsForVariety: ContractFarmingReportRow[] = [];

        for (
          let farmerIndex = 0;
          farmerIndex < sortedFarmers.length;
          farmerIndex += 1
        ) {
          const farmer = sortedFarmers[farmerIndex]!;
          const parsedAccount = Number(farmer.accountNumber ?? 0);
          const familyKey = Number.isFinite(parsedAccount)
            ? String(Math.floor(parsedAccount))
            : '-';
          const displayAccount = Number.isFinite(parsedAccount)
            ? parsedAccount
            : 0;
          const buyBackEntries = Object.entries(farmer['buy-back-bags'] ?? {});
          const selectedBuyBack = buyBackEntries.find(
            ([buyBackVariety]) =>
              buyBackVariety.trim().toLowerCase() ===
              variety.trim().toLowerCase()
          )?.[1];
          const buyBackBags = round2(Number(selectedBuyBack?.bags ?? 0));
          const buyBackNet = round2(Number(selectedBuyBack?.netWeightKg ?? 0));
          const buyBackVarieties =
            buyBackEntries.map(([key]) => key).join(', ') || '-';

          const sizeEntries = farmer.sizes?.length
            ? farmer.sizes
            : [
                {
                  name: '-',
                  quantity: 0,
                  acres: Number(farmer.acresPlanted ?? 0),
                  amountPayable: 0,
                },
              ];
          const generations = farmer.generations ?? [];

          const gradingBySize = new Map<
            string,
            { initialBags: number; netWeightKg: number }
          >();
          const gradingEntries = farmer.grading ?? {};
          for (const [gradingVariety, gradingValue] of Object.entries(
            gradingEntries
          )) {
            if (typeof gradingValue !== 'object' || gradingValue == null)
              continue;
            const matchesVariety =
              gradingVariety.trim().toLowerCase() ===
              variety.trim().toLowerCase();
            const candidate = matchesVariety
              ? gradingValue
              : Object.values(gradingValue).some(
                    (entry) =>
                      typeof entry === 'object' &&
                      entry != null &&
                      'initialBags' in entry &&
                      'netWeightKg' in entry
                  )
                ? gradingEntries
                : null;
            const sizeMap = matchesVariety
              ? gradingValue
              : candidate === gradingEntries
                ? gradingEntries
                : null;
            if (!sizeMap) continue;
            for (const [sizeKey, bucket] of Object.entries(sizeMap)) {
              if (typeof bucket !== 'object' || bucket == null) continue;
              const normalizedSizeKey = toSizeColumnId(sizeKey);
              const existing = gradingBySize.get(normalizedSizeKey) ?? {
                initialBags: 0,
                netWeightKg: 0,
              };
              const initialBags = round2(
                existing.initialBags +
                  Number((bucket as { initialBags?: number }).initialBags ?? 0)
              );
              const netWeightKg = round2(
                existing.netWeightKg +
                  Number((bucket as { netWeightKg?: number }).netWeightKg ?? 0)
              );
              gradingBySize.set(normalizedSizeKey, {
                initialBags,
                netWeightKg,
              });
            }
          }

          const gradingBuckets = Object.fromEntries(
            GRADING_SIZES.map((size) => {
              const id = toSizeColumnId(size);
              const matched = gradingBySize.get(id);
              return [id, round2(Number(matched?.initialBags ?? 0))];
            })
          ) as Record<string, number>;

          const totalGradingBags = round2(
            Object.values(gradingBuckets).reduce(
              (sum, value) => sum + Number(value || 0),
              0
            )
          );
          const weightsBySize = Object.fromEntries(
            GRADING_SIZES.map((size) => {
              const id = toSizeColumnId(size);
              return [
                id,
                round2(Number(gradingBySize.get(id)?.netWeightKg ?? 0)),
              ];
            })
          ) as Record<string, number>;
          const totalWeight = round2(
            Object.values(weightsBySize).reduce(
              (sum, value) => sum + Number(value || 0),
              0
            )
          );
          const below40Keys = [
            'Below 25',
            '25–30',
            'Below 30',
            '30–35',
            '30–40',
            '35–40',
          ];
          const range40To50Keys = ['40–45', '45–50'];
          const cutKeys = ['Cut'];
          const sumWeight = (labels: string[]) =>
            round2(
              labels.reduce(
                (sum, label) =>
                  sum + Number(weightsBySize[toSizeColumnId(label)] ?? 0),
                0
              )
            );
          const below40Weight = sumWeight(below40Keys);
          const range40To50Weight = sumWeight(range40To50Keys);
          const cutWeight = sumWeight(cutKeys);
          const above50Weight = round2(
            totalWeight - below40Weight - range40To50Weight - cutWeight
          );
          const toPct = (value: number): number | null =>
            totalWeight > 0 ? round2((value / totalWeight) * 100) : null;

          const buyBackAmount = round2(
            GRADING_SIZES.reduce((sum, size) => {
              const rate = resolveBuyBackRate(variety, toSizeRateLabel(size));
              const sizeWeight = Number(
                weightsBySize[toSizeColumnId(size)] ?? 0
              );
              return sum + round2(sizeWeight * rate);
            }, 0)
          );
          const totalSeedAmount = round2(
            sizeEntries.reduce(
              (sum, size) => sum + Number(size.amountPayable ?? 0),
              0
            )
          );
          const acresFromSizes = round2(
            sizeEntries.reduce((sum, size) => sum + Number(size.acres ?? 0), 0)
          );
          const acresForNet =
            acresFromSizes > 0
              ? acresFromSizes
              : round2(Number(farmer.acresPlanted ?? 0));
          const netAmountPayable = round2(buyBackAmount - totalSeedAmount);
          const netAmountPerAcre =
            acresForNet > 0 ? round2(netAmountPayable / acresForNet) : null;
          const yieldPerAcreQuintals =
            acresForNet > 0 ? round2(totalWeight / acresForNet / 100) : null;

          for (
            let sizeIndex = 0;
            sizeIndex < sizeEntries.length;
            sizeIndex += 1
          ) {
            const size = sizeEntries[sizeIndex]!;
            const generation =
              generations.length === 0
                ? '—'
                : !farmer.sizes?.length
                  ? generations.join(', ')
                  : generations.length === sizeEntries.length
                    ? (generations[sizeIndex] ?? '—')
                    : generations.length === 1
                      ? (generations[0] ?? '—')
                      : (generations[sizeIndex] ?? '—');

            rowsForVariety.push({
              id: `${farmer.id ?? `${variety}-${farmerIndex}`}-${size.name ?? 'size'}-${sizeIndex}`,
              rowKind: 'data',
              serialNumber:
                rowsForVariety.filter((row) => row.rowKind !== 'family-total')
                  .length + 1,
              familyKey,
              farmerId: farmer.id ?? '-',
              gatePassNo: displayAccount,
              manualGatePassNumber: round2(Number(size.quantity ?? 0)),
              farmerName: farmer.name ?? '-',
              farmerMobileNumber: farmer.mobileNumber ?? '-',
              farmerAddress: farmer.address ?? '-',
              createdByName: size.name ?? '-',
              createdByMobileNumber: '-',
              variety,
              location: formatIndianNumber(
                round2(Number(size.acres ?? farmer.acresPlanted ?? 0)),
                2
              ),
              truckNumber: buyBackVarieties,
              bagsReceived: buyBackBags,
              slipNumber: '-',
              grossWeightKg: round2(Number(size.acres ?? 0)),
              tareWeightKg: round2(Number(size.amountPayable ?? 0)),
              netWeightKg: buyBackNet,
              netWeightPrecision: 2,
              gradingBuckets,
              totalGradingBags,
              below40Percent: toPct(below40Weight),
              range40To50Percent: toPct(range40To50Weight),
              above50Percent: toPct(above50Weight),
              cutPercent: toPct(cutWeight),
              netWeightAfterGradingKg: totalWeight,
              buyBackAmount,
              totalSeedAmount,
              netAmountPayable,
              netAmountPerAcre,
              yieldPerAcreQuintals,
              remarks: `Seed payable ${formatIndianNumber(totalSeedAmount, 2)} | Buy-back ${formatIndianNumber(buyBackAmount, 2)}`,
              date: generation,
              createdAt: '-',
              updatedAt: '-',
              status: 'ACTIVE',
            });
          }
        }

        const familyGroups = new Map<string, ContractFarmingReportRow[]>();
        rowsForVariety.forEach((row) => {
          const list = familyGroups.get(row.familyKey ?? '-') ?? [];
          list.push(row);
          familyGroups.set(row.familyKey ?? '-', list);
        });

        const withFamilyRows: ContractFarmingReportRow[] = [];
        familyGroups.forEach((familyRows, family) => {
          withFamilyRows.push(...familyRows);
          const hasDecimalMember = familyRows.some(
            (row) => !Number.isInteger(Number(row.gatePassNo))
          );
          if (!hasDecimalMember) return;

          const subtotal = (
            selector: (
              row: ContractFarmingReportRow
            ) => number | null | undefined
          ) =>
            round2(
              familyRows.reduce(
                (sum, row) => sum + Number(selector(row) ?? 0),
                0
              )
            );
          withFamilyRows.push({
            id: `family-total-${variety}-${family}`,
            rowKind: 'family-total',
            serialNumber: undefined,
            familyKey: family,
            farmerId: '-',
            gatePassNo: Number(family),
            manualGatePassNumber: subtotal((row) => row.manualGatePassNumber),
            farmerName: `Family ${family} total`,
            farmerMobileNumber: '-',
            farmerAddress: '-',
            createdByName: '—',
            createdByMobileNumber: '-',
            variety,
            location: formatIndianNumber(
              subtotal((row) => Number(row.location.replace(/,/g, ''))),
              2
            ),
            truckNumber: '—',
            bagsReceived: subtotal((row) => row.bagsReceived),
            slipNumber: '-',
            grossWeightKg: subtotal((row) => row.grossWeightKg),
            tareWeightKg: subtotal((row) => row.tareWeightKg),
            netWeightKg: subtotal((row) => row.netWeightKg),
            netWeightPrecision: 2,
            gradingBuckets: Object.fromEntries(
              GRADING_SIZES.map((size) => {
                const id = toSizeColumnId(size);
                return [id, subtotal((row) => row.gradingBuckets?.[id] ?? 0)];
              })
            ),
            totalGradingBags: subtotal((row) => row.totalGradingBags ?? 0),
            below40Percent: null,
            range40To50Percent: null,
            above50Percent: null,
            cutPercent: null,
            netWeightAfterGradingKg: subtotal(
              (row) => row.netWeightAfterGradingKg ?? 0
            ),
            buyBackAmount: subtotal((row) => row.buyBackAmount ?? 0),
            totalSeedAmount: subtotal((row) => row.totalSeedAmount ?? 0),
            netAmountPayable: subtotal((row) => row.netAmountPayable ?? 0),
            netAmountPerAcre: null,
            yieldPerAcreQuintals: null,
            remarks: 'Family subtotal',
            date: '—',
            createdAt: '-',
            updatedAt: '-',
            status: 'ACTIVE',
          });
        });

        return withFamilyRows;
      });

    return groupedRows;
  }, [contractFarmingReportResponse]);

  const filteredContractFarmingReportData = React.useMemo(() => {
    if (!enforcedStatus) return contractFarmingReportData;

    const normalizedEnforcedStatus = normalizeStatusValue(enforcedStatus);
    return contractFarmingReportData.filter(
      (row) =>
        normalizeStatusValue(String(row.status)) === normalizedEnforcedStatus
    );
  }, [enforcedStatus, contractFarmingReportData]);

  const table = useReactTable<ContractFarmingReportRow>({
    data: filteredContractFarmingReportData,
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
      bagsReceived: 0,
      grossWeightKg: 0,
      tareWeightKg: 0,
      netWeightKg: 0,
      grossPrecision: 0,
      tarePrecision: 0,
      netPrecision: 0,
    };

    for (const row of filteredRows) {
      const original = row.original;
      totals.bagsReceived += Number(original.bagsReceived ?? 0);
      totals.grossWeightKg += Number(original.grossWeightKg ?? 0);
      totals.tareWeightKg += Number(original.tareWeightKg ?? 0);
      totals.netWeightKg += Number(original.netWeightKg ?? 0);
      totals.grossPrecision = Math.max(
        totals.grossPrecision,
        getDecimalPlaces(Number(original.grossWeightKg ?? 0))
      );
      totals.tarePrecision = Math.max(
        totals.tarePrecision,
        getDecimalPlaces(Number(original.tareWeightKg ?? 0))
      );
      totals.netPrecision = Math.max(
        totals.netPrecision,
        Number(original.netWeightPrecision ?? 0)
      );
    }

    return totals;
  }, [filteredRows]);
  const hasVisibleNumericTotals = React.useMemo(
    () => visibleColumnIds.some((columnId) => numericColumnIds.has(columnId)),
    [visibleColumnIds]
  );

  const formatTotal = (value: number, precision = 0): string =>
    formatIndianNumber(value, precision);

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
    }
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const buildPdfWorkerPayload = React.useCallback(
    (generatedAt: string) => {
      return {
        rows: getLeafRowsForPdf(sortedRows),
        visibleColumnIds,
        grouping,
        coldStorageName,
        generatedAt,
      } satisfies ContractFarmingPdfWorkerRequest;
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
                    placeholder="Search account or qty…"
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
                <ContractFarmingPdfButton
                  buildPayload={buildPdfWorkerPayload}
                />
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
                  : 'Failed to load contract farming report'}
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
                          key={`contract-farming-report-header-skeleton-${index}`}
                          className="h-8 w-full rounded-md"
                        />
                      )
                    )}
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: TABLE_SKELETON_ROWS }).map(
                      (_, rowIndex) => (
                        <div
                          key={`contract-farming-report-row-skeleton-${rowIndex}`}
                          className="grid grid-cols-8 gap-2"
                        >
                          {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                            (_, columnIndex) => (
                              <Skeleton
                                key={`contract-farming-report-cell-skeleton-${rowIndex}-${columnIndex}`}
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
                      ] as Row<ContractFarmingReportRow>;
                      return (
                        <TableRow
                          key={row.id}
                          data-index={virtualRow.index}
                          ref={(node) => rowVirtualizer.measureElement(node)}
                          className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${
                            row.original.rowKind === 'family-total'
                              ? 'bg-primary/10 font-semibold'
                              : virtualRow.index % 2 === 0
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
                          const cellValue =
                            columnId === 'bagsReceived'
                              ? formatTotal(totalsByColumn.bagsReceived, 0)
                              : columnId === 'grossWeightKg'
                                ? formatTotal(
                                    totalsByColumn.grossWeightKg,
                                    totalsByColumn.grossPrecision
                                  )
                                : columnId === 'tareWeightKg'
                                  ? formatTotal(
                                      totalsByColumn.tareWeightKg,
                                      totalsByColumn.tarePrecision
                                    )
                                  : columnId === 'netWeightKg'
                                    ? formatTotal(
                                        totalsByColumn.netWeightKg,
                                        totalsByColumn.netPrecision
                                      )
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

export default ContractFarmingReportTable;
