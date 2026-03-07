import type { ColumnDef } from '@tanstack/table-core';

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
};

function formatNum(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

export const columns: ColumnDef<StorageReportRow>[] = [
  {
    accessorKey: 'farmerName',
    header: () => <span className="font-custom">Farmer</span>,
  },
  {
    accessorKey: 'accountNumber',
    header: () => <div className="font-custom text-right">Account No.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('accountNumber') ?? '—')}
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
  {
    accessorKey: 'remarks',
    header: () => <span className="font-custom">Remarks</span>,
  },
];
