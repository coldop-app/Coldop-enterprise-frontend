import type { ColumnDef } from '@tanstack/table-core';
import { GRADING_SIZES } from '@/components/forms/grading/constants';

/** Stable column id for a size (used for accessorKey and total row). */
export function getSizeColumnId(size: string): string {
  return `bags_${size.replace(/–/g, '-')}`;
}

export type StorageReportRow = {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  farmerMobile: string;
  createdByName: string;
  gatePassNo: number | string;
  manualGatePassNumber: number | string;
  date: string;
  variety: string;
  totalBags: number;
  remarks: string;
  /** Flattened size columns: keys are getSizeColumnId(size), values are bag count for that size */
  [key: string]: string | number | undefined;
};

function formatNum(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

function formatAccountSuffix(accountNo: number | string): string {
  return accountNo != null && accountNo !== '' && accountNo !== '—'
    ? ` #${accountNo}`
    : '';
}

/** Base columns (no size columns). */
const baseColumns: ColumnDef<StorageReportRow>[] = [
  {
    accessorKey: 'farmerName',
    header: () => <span className="font-custom">Farmer</span>,
    cell: ({ row }) => (
      <div className="font-custom">
        {String(row.getValue('farmerName') ?? '—')}
        {formatAccountSuffix(row.original.accountNumber) ? (
          <span className="text-muted-foreground font-normal">
            {formatAccountSuffix(row.original.accountNumber)}
          </span>
        ) : null}
      </div>
    ),
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
    header: () => <div className="font-custom text-right">Gate pass no.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('gatePassNo') ?? '—')}
      </div>
    ),
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: () => <div className="font-custom text-right">Manual GP no.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('manualGatePassNumber') ?? '—')}
      </div>
    ),
  },
  {
    accessorKey: 'date',
    header: () => <span className="font-custom">Date</span>,
  },
  {
    accessorKey: 'variety',
    header: () => <span className="font-custom">Variety</span>,
  },
  {
    accessorKey: 'totalBags',
    header: () => <div className="font-custom text-right">Bags</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('totalBags') as number)}
      </div>
    ),
  },
];

/** Size columns to insert after totalBags. Only include sizes that have quantity in the data. */
export function getSizeColumns(
  sizesWithQuantity: readonly string[]
): ColumnDef<StorageReportRow>[] {
  return sizesWithQuantity.map((size) => {
    const id = getSizeColumnId(size);
    return {
      id,
      accessorKey: id,
      header: () => <div className="font-custom text-right">{size}</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">
          {formatNum((row.getValue(id) as number) ?? 0)}
        </div>
      ),
    };
  });
}

/** All GRADING_SIZES in display order (for computing which sizes have quantity). */
export const ALL_GRADING_SIZES = [...GRADING_SIZES];

/** Build full columns: base + size columns (only those with quantity) + remarks. */
export function getStorageReportColumns(
  sizesWithQuantity: readonly string[]
): ColumnDef<StorageReportRow>[] {
  const sizeCols = getSizeColumns(sizesWithQuantity);
  return [
    ...baseColumns,
    ...sizeCols,
    {
      accessorKey: 'remarks',
      header: () => <span className="font-custom">Remarks</span>,
    },
  ];
}

/** Legacy default columns (no size columns) for backwards compatibility. */
export const columns: ColumnDef<StorageReportRow>[] = [
  ...baseColumns,
  {
    accessorKey: 'remarks',
    header: () => <span className="font-custom">Remarks</span>,
  },
];
