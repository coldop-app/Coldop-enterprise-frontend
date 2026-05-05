import {
  type FilterFn,
  type VisibilityState,
  createColumnHelper,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';

export type IncomingReportRow = {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerAddress: string;
  farmerMobileNumber: string;
  createdByName: string;
  location: string;
  gatePassNo: number;
  manualGatePassNumber: number;
  date: string;
  dateSortValue: number;
  variety: string;
  truckNumber: string;
  bagsReceived: number;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  netWeightPrecision: number;
  status: string;
  remarks: string;
  createdByMobileNumber: string;
  slipNumber: string;
  createdAt: string;
  updatedAt: string;
};

export function getDecimalPlaces(value: number): number {
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

export function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

export const defaultColumnOrder: string[] = [
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

export const defaultIncomingReportColumnVisibility: VisibilityState = {
  farmerMobileNumber: false,
  createdByName: false,
  location: false,
  gatePassNo: false,
  grossWeightKg: false,
  tareWeightKg: false,
};

export const numericColumnIds = new Set([
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
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

const columnHelper = createColumnHelper<IncomingReportRow>();

export const incomingReportColumns = [
  columnHelper.accessor('gatePassNo', {
    header: 'Gate Pass No',
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
    sortingFn: (rowA, rowB) =>
      Number(rowA.original.dateSortValue || 0) -
      Number(rowB.original.dateSortValue || 0),
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('farmerName', {
    header: 'Farmer',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 550,
    maxSize: 550,
    minSize: 500,
  }),
  columnHelper.accessor('farmerAddress', {
    header: 'Address',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    minSize: 200,
    maxSize: 300,
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

export type GlobalFilterValue = string | FilterGroupNode;
export const globalManualGatePassFilterFn: FilterFn<IncomingReportRow> = (
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
