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

export type NikasiReportRow = {
  id: string;
  gatePassNo: number;
  manualGatePassNumber: string;
  date: string;
  dateSortValue: number;
  farmerAddress: string;
  farmerMobile: string;
  storageAccountLabel: string;
  linkedByName: string;
  location: string;
  dispatchLedgerMobile: string;
  createdByName: string;
  nikasiFrom: string;
  nikasiTo: string;
  truckNumber: string;
  variety: string;
  bagsReceived: number;
  netWeightKg: number;
  netWeightPrecision: number;
  averageWeightPerBag: number;
  averageWeightPrecision: number;
  remarks: string;
  isInternalTransferLabel: string;
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
  'farmerAddress',
  'farmerMobile',
  'storageAccountLabel',
  'linkedByName',
  'location',
  'dispatchLedgerMobile',
  'createdByName',
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'nikasiFrom',
  'nikasiTo',
  'truckNumber',
  'variety',
  'bagsReceived',
  'netWeightKg',
  'averageWeightPerBag',
  'isInternalTransferLabel',
  'remarks',
];

export const defaultNikasiReportColumnVisibility: VisibilityState = {
  farmerMobile: false,
  storageAccountLabel: false,
  linkedByName: false,
  dispatchLedgerMobile: false,
  createdByName: false,
  gatePassNo: false,
  averageWeightPerBag: false,
};

export const numericColumnIds = new Set([
  'bagsReceived',
  'netWeightKg',
  'averageWeightPerBag',
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

const columnHelper = createColumnHelper<NikasiReportRow>();

export const nikasiReportColumns = [
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
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('date', {
    header: 'Date',
    sortingFn: (rowA, rowB) =>
      Number(rowA.original.dateSortValue || 0) -
      Number(rowB.original.dateSortValue || 0),
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('farmerAddress', {
    header: 'Address',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    minSize: 200,
    maxSize: 300,
  }),
  columnHelper.accessor('farmerMobile', {
    header: 'Mobile Number',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('storageAccountLabel', {
    header: 'Storage account',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('linkedByName', {
    header: 'Linked by',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('location', {
    header: 'Dispatch ledger',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('dispatchLedgerMobile', {
    header: 'Ledger mobile',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('createdByName', {
    header: 'Created by',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('nikasiFrom', {
    header: 'From',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('nikasiTo', {
    header: 'To',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('truckNumber', {
    header: 'Truck No.',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('variety', {
    header: 'Variety / bags',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 400,
    maxSize: 500,
  }),
  columnHelper.accessor('bagsReceived', {
    header: () => <div className="w-full text-right">Bags issued</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 100,
    maxSize: 160,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue()), 0)}
      </div>
    ),
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
          {formatIndianNumber(Number(safeTotal), maxPrecision)}
        </div>
      );
    },
    minSize: 110,
    maxSize: 200,
    cell: (info) => {
      const { netWeightKg, netWeightPrecision } = info.row.original;
      return (
        <div className="w-full text-right font-medium tabular-nums">
          {formatIndianNumber(Number(netWeightKg), netWeightPrecision)}
        </div>
      );
    },
  }),
  columnHelper.accessor('averageWeightPerBag', {
    header: () => <div className="w-full text-right">Avg / bag (kg)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 120,
    maxSize: 180,
    cell: (info) => {
      const { averageWeightPerBag, averageWeightPrecision } = info.row.original;
      return (
        <div className="w-full text-right tabular-nums">
          {formatIndianNumber(
            Number(averageWeightPerBag),
            averageWeightPrecision
          )}
        </div>
      );
    },
  }),
  columnHelper.accessor('isInternalTransferLabel', {
    header: 'Internal',
    sortingFn: 'text',
    filterFn: (row, columnId, filterValue: string[]) => {
      const v = row.getValue(columnId) as string;
      if (!Array.isArray(filterValue)) return true;
      if (filterValue.length === 0) return true;
      return filterValue.includes(v);
    },
    cell: (info) => {
      const value = info.getValue();
      const isYes = value === 'Yes';
      return (
        <Badge
          variant={isYes ? 'secondary' : 'outline'}
          className={`font-custom h-7 self-center rounded-lg border px-2.5 text-[11px] leading-none tracking-wide uppercase ${
            isYes
              ? 'border-muted-foreground/25 bg-muted/80 text-muted-foreground'
              : 'border-primary/35 bg-primary/12 text-primary'
          }`}
        >
          {value}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('remarks', {
    header: 'Remarks',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 400,
    maxSize: 500,
  }),
];

export type GlobalFilterValue = string | FilterGroupNode;

export const globalNikasiReportSearchFilterFn: FilterFn<NikasiReportRow> = (
  row,
  _columnId,
  filterValue: GlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(
      row.original as unknown as Record<string, unknown>,
      filterValue
    );
  }
  const normalized = String(filterValue).trim().toLowerCase();
  if (!normalized) return true;
  const o = row.original;
  const haystack = [
    o.gatePassNo,
    o.manualGatePassNumber,
    o.farmerAddress,
    o.farmerMobile,
    o.location,
    o.truckNumber,
    o.nikasiFrom,
    o.nikasiTo,
    o.variety,
  ]
    .map((v) => String(v ?? '').toLowerCase())
    .join(' ');
  return haystack.includes(normalized);
};
