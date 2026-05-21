/* eslint-disable react-refresh/only-export-components -- column defs, IDs, and helpers colocated for the report table */
import {
  type FilterFn,
  type VisibilityState,
  createColumnHelper,
} from '@tanstack/react-table';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import {
  buildBagSizeColumnConfigFromPreferences,
  DEFAULT_BAG_SIZE_COLUMN_CONFIG as SHARED_DEFAULT_BAG_SIZE_COLUMN_CONFIG,
} from '@/lib/bag-size-columns';

export type IncomingReportRow = {
  id: string;
  farmerId: string;
  farmerMobileNumber: string;
  accountNumber: number | null;
  gatePassNo: number;
  manualGatePassNumber?: number;
  date: string;
  dateSortValue: number;
  variety: string;
  bagBelow25: number;
  bag25to30: number;
  bagBelow30: number;
  bag30to35: number;
  bag30to40: number;
  bag35to40: number;
  bag40to45: number;
  bag45to50: number;
  bag50to55: number;
  bagAbove50: number;
  bagAbove55: number;
  bagCut: number;
  totalBags: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export type BagSizeColumnId =
  | 'bagBelow25'
  | 'bag25to30'
  | 'bagBelow30'
  | 'bag30to35'
  | 'bag30to40'
  | 'bag35to40'
  | 'bag40to45'
  | 'bag40to50'
  | 'bag45to50'
  | 'bag50to55'
  | 'bagAbove50'
  | 'bagAbove55'
  | 'bagCut'
  | 'bagUngraded'
  | `bagSize__${string}`;

export function getIncomingBagValue(
  row: IncomingReportRow,
  columnId: BagSizeColumnId | string
): number {
  return Number(
    (row as IncomingReportRow & Record<string, number>)[columnId] ?? 0
  );
}

export const DEFAULT_BAG_SIZE_COLUMN_CONFIG: Array<{
  id: BagSizeColumnId;
  label: string;
}> = SHARED_DEFAULT_BAG_SIZE_COLUMN_CONFIG as Array<{
  id: BagSizeColumnId;
  label: string;
}>;

const BASE_COLUMN_ORDER = [
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'accountNumber',
  'farmerMobileNumber',
  'variety',
] as const;

export function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function formatNumberOrEmpty(value: number, precision = 0): string {
  return Number(value || 0) === 0 ? '' : formatIndianNumber(value, precision);
}

export const defaultStorageReportColumnVisibility: VisibilityState = {
  farmerMobileNumber: false,
  gatePassNo: false,
  accountNumber: false,
};

export function getBagSizeColumnConfig(
  preferenceBagSizes: string[] | undefined
): Array<{ id: BagSizeColumnId; label: string }> {
  return buildBagSizeColumnConfigFromPreferences(preferenceBagSizes) as Array<{
    id: BagSizeColumnId;
    label: string;
  }>;
}

export function getDefaultColumnOrder(
  bagSizeColumnIds: BagSizeColumnId[]
): string[] {
  return [...BASE_COLUMN_ORDER, ...bagSizeColumnIds, 'totalBags', 'remarks'];
}

export function getNumericColumnIds(
  bagSizeColumnIds: BagSizeColumnId[]
): Set<string> {
  return new Set(['accountNumber', ...bagSizeColumnIds, 'totalBags']);
}

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

const columnHelper = createColumnHelper<IncomingReportRow>();

export function getStorageReportColumns(
  bagSizeColumnConfig: Array<{ id: BagSizeColumnId; label: string }>
) {
  return [
    columnHelper.accessor('gatePassNo', {
      header: 'System Generated Gate Pass No',
      sortingFn: 'alphanumeric',
      filterFn: multiValueFilterFn,
      minSize: 120,
      maxSize: 220,
      cell: (info) => (
        <span className="font-custom font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('manualGatePassNumber', {
      header: 'Manual Gate Pass No',
      sortingFn: 'alphanumeric',
      filterFn: multiValueFilterFn,
      minSize: 200,
      maxSize: 300,
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
      sortingFn: (rowA, rowB) =>
        Number(rowA.original.dateSortValue || 0) -
        Number(rowB.original.dateSortValue || 0),
      filterFn: multiValueFilterFn,
      minSize: 120,
      maxSize: 220,
    }),
    columnHelper.accessor('farmerMobileNumber', {
      header: 'Mobile Number',
      sortingFn: 'text',
      filterFn: multiValueFilterFn,
      minSize: 120,
      maxSize: 200,
    }),
    columnHelper.accessor('variety', {
      header: 'Variety',
      sortingFn: 'text',
      filterFn: multiValueFilterFn,
      minSize: 120,
      maxSize: 220,
    }),
    ...bagSizeColumnConfig.map(({ id, label }) =>
      columnHelper.accessor(id as keyof IncomingReportRow, {
        id,
        header: () => <div className="w-full text-right">{label} (mm)</div>,
        sortingFn: 'basic',
        filterFn: multiValueFilterFn,
        aggregationFn: 'sum',
        aggregatedCell: (info) => (
          <div className="w-full text-right font-medium tabular-nums">
            {formatNumberOrEmpty(Number(info.getValue() || 0), 0)}
          </div>
        ),
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
      aggregationFn: 'sum',
      aggregatedCell: (info) => (
        <div className="w-full text-right font-medium tabular-nums">
          {formatIndianNumber(Number(info.getValue() || 0), 0)}
        </div>
      ),
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
      size: 200,
      minSize: 120,
      maxSize: 220,
      cell: (info) => (
        <div className="font-custom min-w-0 text-left text-sm leading-snug wrap-break-word whitespace-normal">
          {String(info.getValue() ?? '')}
        </div>
      ),
    }),
  ];
}
