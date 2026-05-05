import * as React from 'react';
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

export type FarmerSeedReportRow = {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerAddress: string;
  accountNumber: number | null;
  gatePassNo: number;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  bag35to40: number;
  bag35to40Rate: number;
  bag35to40Acres: number;
  bag40to45: number;
  bag40to45Rate: number;
  bag40to45Acres: number;
  bag40to50: number;
  bag40to50Rate: number;
  bag40to50Acres: number;
  bag45to50: number;
  bag45to50Rate: number;
  bag45to50Acres: number;
  bag50to55: number;
  bag50to55Rate: number;
  bag50to55Acres: number;
  totalBags: number;
  totalAcres: number;
  averageRate: number;
  totalAmount: number;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

export function formatIndianNumber(value: number, precision = 0): string {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

function renderBagQuantityCell(quantity: number) {
  if (Number(quantity || 0) === 0) return '';
  return (
    <div className="w-full text-right tabular-nums">
      {formatIndianNumber(quantity, 0)}
    </div>
  );
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
export const globalFilterFn: FilterFn<FarmerSeedReportRow> = (
  row,
  _columnId,
  filterValue: GlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(
      row.original as Record<string, unknown>,
      filterValue
    );
  }
  const normalized = String(filterValue).trim().toLowerCase();
  if (!normalized) return true;
  return String(row.original.invoiceNumber ?? '-')
    .toLowerCase()
    .includes(normalized);
};

const columnHelper = createColumnHelper<FarmerSeedReportRow>();

export const reportColumns = [
  columnHelper.accessor('farmerName', {
    header: 'Farmer',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
    size: 500,
    maxSize: 550,
  }),
  columnHelper.accessor('totalAcres', {
    header: () => <div className="w-full text-right">Acres Planted</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 100,
    maxSize: 160,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue() || 0), 2)}
      </div>
    ),
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
    header: 'Stage',
    sortingFn: 'text',
    filterFn: multiValueFilterFn,
  }),
  columnHelper.accessor('bag35to40', {
    header: () => <div className="w-full text-right">35-40 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => renderBagQuantityCell(Number(info.getValue() || 0)),
  }),
  columnHelper.accessor('bag40to45', {
    header: () => <div className="w-full text-right">40-45 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => renderBagQuantityCell(Number(info.getValue() || 0)),
  }),
  columnHelper.accessor('bag40to50', {
    header: () => <div className="w-full text-right">40-50 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => renderBagQuantityCell(Number(info.getValue() || 0)),
  }),
  columnHelper.accessor('bag45to50', {
    header: () => <div className="w-full text-right">45-50 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => renderBagQuantityCell(Number(info.getValue() || 0)),
  }),
  columnHelper.accessor('bag50to55', {
    header: () => <div className="w-full text-right">50-55 (mm)</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 90,
    maxSize: 180,
    cell: (info) => renderBagQuantityCell(Number(info.getValue() || 0)),
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
  columnHelper.accessor('averageRate', {
    header: () => <div className="w-full text-right">Rate per Bag</div>,
    sortingFn: 'basic',
    filterFn: multiValueFilterFn,
    minSize: 100,
    maxSize: 160,
    cell: (info) => (
      <div className="w-full text-right tabular-nums">
        {formatIndianNumber(Number(info.getValue() || 0), 2)}
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

export const defaultColumnOrder: string[] = [
  'farmerName',
  'totalAcres',
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
  'averageRate',
  'totalAmount',
  'remarks',
];

export const defaultFarmerSeedColumnVisibility: VisibilityState = {
  generation: true,
  remarks: true,
};

export const numericColumnIds = new Set([
  'gatePassNo',
  'bag35to40',
  'bag40to45',
  'bag40to50',
  'bag45to50',
  'bag50to55',
  'totalBags',
  'totalAcres',
  'averageRate',
  'totalAmount',
]);
