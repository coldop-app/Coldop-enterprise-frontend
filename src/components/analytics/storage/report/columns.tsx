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
import { GRADING_SIZES } from '@/lib/constants';

export type IncomingReportRow = {
  id: string;
  farmerId: string;
  farmerMobileNumber: string;
  accountNumber: number | null;
  gatePassNo: number;
  manualGatePassNumber?: number;
  date: string;
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

export const BAG_SIZE_COLUMN_CONFIG: Array<{
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

export const BAG_SIZE_COLUMN_IDS = BAG_SIZE_COLUMN_CONFIG.map(
  (item) => item.id
);

export function formatIndianNumber(value: number, precision = 0): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function formatNumberOrEmpty(value: number, precision = 0): string {
  return Number(value || 0) === 0 ? '' : formatIndianNumber(value, precision);
}

export const defaultColumnOrder: string[] = [
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

export const defaultStorageReportColumnVisibility: VisibilityState = {
  farmerMobileNumber: false,
  gatePassNo: false,
  accountNumber: false,
};

export const numericColumnIds = new Set([
  'accountNumber',
  ...BAG_SIZE_COLUMN_IDS,
  'totalBags',
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

export const storageReportColumns = [
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
