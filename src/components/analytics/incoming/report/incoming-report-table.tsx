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
import { pdf, type DocumentProps } from '@react-pdf/renderer';
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
import { useGetIncomingGatePassReport } from '@/services/store-admin/incoming-gate-pass/analytics/useGetIncomingGatePassReport';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import { ViewFiltersSheet } from './view-filters-sheet/index';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import type { IncomingReportRow } from './columns';
import { InwardLedgerReportDocument } from './pdf/incoming-report-table-pdf';
import { prepareIncomingReportPdf } from './pdf/pdf-prepare';

function getFarmerName(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    const farmerName = gatePass.farmerStorageLinkId.farmerId.name;
    const accountNumber = gatePass.farmerStorageLinkId.accountNumber;

    if (typeof accountNumber === 'number') {
      return `${farmerName} (#${accountNumber})`;
    }

    return farmerName;
  }

  return '-';
}

function getFarmerId(gatePass: IncomingGatePassWithLink): string {
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

function getFarmerMobile(gatePass: IncomingGatePassWithLink): string {
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

function getFarmerAddress(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId.address ?? '-';
  }

  return '-';
}

function getCreatedByName(gatePass: IncomingGatePassWithLink): string {
  if (gatePass.createdBy && typeof gatePass.createdBy !== 'string') {
    return gatePass.createdBy.name;
  }

  return '-';
}

function getCreatedByMobile(gatePass: IncomingGatePassWithLink): string {
  if (gatePass.createdBy && typeof gatePass.createdBy !== 'string') {
    return gatePass.createdBy.mobileNumber ?? '-';
  }

  return '-';
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

function subtractWithPrecision(
  grossWeightKg: number,
  tareWeightKg: number
): { value: number; precision: number } {
  const precision = Math.max(
    getDecimalPlaces(grossWeightKg),
    getDecimalPlaces(tareWeightKg)
  );
  const factor = 10 ** precision;
  const value =
    (Math.round(grossWeightKg * factor) - Math.round(tareWeightKg * factor)) /
    factor;

  return { value, precision };
}

function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

const columnHelper = createColumnHelper<IncomingReportRow>();
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');
const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;

const defaultColumnOrder: string[] = [
  'farmerName',
  'farmerAddress',
  'farmerMobileNumber',
  'createdByName',
  'location',
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'variety',
  'truckNumber',
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'status',
  'remarks',
];
const numericColumnIds = new Set([
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
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
  }),
  columnHelper.accessor('date', {
    header: 'Date',
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
    header: 'Created By',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('variety', {
    header: 'Variety',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('location', {
    header: 'Location',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('truckNumber', {
    header: 'Truck No.',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('bagsReceived', {
    header: () => <div className="w-full text-right">Bags</div>,
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
    header: () => <div className="w-full text-right">Gross (kg)</div>,
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
    header: () => <div className="w-full text-right">Tare (kg)</div>,
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
    header: () => <div className="w-full text-right">Net (kg)</div>,
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
      const isGraded = value === 'GRADED';
      return (
        <Badge
          variant={isGraded ? 'default' : 'secondary'}
          className={`font-custom rounded-md border px-2 py-0.5 text-[11px] tracking-wide uppercase ${
            isGraded
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

type IncomingPdfButtonProps = {
  buildDocument: () => React.ReactElement<DocumentProps>;
  onRegenerate: () => void;
};

const IncomingPdfButton = ({
  buildDocument,
  onRegenerate,
}: IncomingPdfButtonProps) => {
  const objectUrlRef = React.useRef<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  React.useEffect(() => {
    return () => {
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
    onRegenerate();

    try {
      const document = buildDocument();
      const blob = await pdf(document).toBlob();
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

const IncomingReportTable = () => {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [appliedFromDate, setAppliedFromDate] = React.useState('');
  const [appliedToDate, setAppliedToDate] = React.useState('');
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
  const [pdfGeneratedAt, setPdfGeneratedAt] = React.useState(() =>
    new Date().toLocaleString('en-IN')
  );
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const hasDateFilters = Boolean(fromDate && toDate);
  const hasAppliedDateFilters = Boolean(appliedFromDate && appliedToDate);
  const canApply = Boolean(fromDate && toDate);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetIncomingGatePassReport(
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
        const grossWeightKg = item.weightSlip?.grossWeightKg ?? 0;
        const tareWeightKg = item.weightSlip?.tareWeightKg ?? 0;
        const { value: netWeightKg, precision: netWeightPrecision } =
          subtractWithPrecision(grossWeightKg, tareWeightKg);

        return {
          id: item._id,
          farmerId: getFarmerId(item),
          gatePassNo: item.gatePassNo,
          manualGatePassNumber: item.manualGatePassNumber,
          farmerName: getFarmerName(item),
          farmerMobileNumber: getFarmerMobile(item),
          farmerAddress: getFarmerAddress(item),
          createdByName: getCreatedByName(item),
          createdByMobileNumber: getCreatedByMobile(item),
          variety: item.variety,
          location: item.location,
          truckNumber: item.truckNumber,
          bagsReceived: item.bagsReceived,
          slipNumber: item.weightSlip?.slipNumber ?? '-',
          grossWeightKg,
          tareWeightKg,
          netWeightKg,
          netWeightPrecision,
          remarks: item.remarks ?? '-',
          date: toDisplayDate(item.date),
          createdAt: toDisplayDate(item.createdAt),
          updatedAt: toDisplayDate(item.updatedAt),
          status: item.status,
        };
      }),
    [data]
  );

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
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );
  const pdfRows = rows.map((row) => row.original);
  const preparedPdfReport = React.useMemo(
    () =>
      prepareIncomingReportPdf({
        rows: pdfRows,
        visibleColumnIds,
      }),
    [pdfRows, visibleColumnIds]
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

  const handleRegeneratePdf = () => {
    setPdfGeneratedAt(new Date().toLocaleString('en-IN'));
  };

  const pdfDocument = React.useMemo(
    () => (
      <InwardLedgerReportDocument
        generatedAt={pdfGeneratedAt}
        report={preparedPdfReport}
      />
    ),
    [pdfGeneratedAt, preparedPdfReport]
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
                <IncomingPdfButton
                  buildDocument={() => pdfDocument}
                  onRegenerate={handleRegeneratePdf}
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
                              {columnIndex === 0 ? 'Totals' : cellValue}
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

export default IncomingReportTable;
