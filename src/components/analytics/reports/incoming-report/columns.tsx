import type { ColumnDef } from '@tanstack/table-core';

export type IncomingReportRow = {
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
  truckNumber: string;
  bags: number;
  grossWeightKg: number | string;
  tareWeightKg: number | string;
  netWeightKg: number | string;
  status: string;
  totalGradedBags: number | string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
};

function formatNum(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

export const columns: ColumnDef<IncomingReportRow>[] = [
  {
    accessorKey: 'farmerName',
    header: 'Farmer',
  },
  {
    accessorKey: 'accountNumber',
    header: () => <div className="text-right">Account No.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('accountNumber') ?? '—')}
      </div>
    ),
  },
  {
    accessorKey: 'farmerAddress',
    header: 'Address',
  },
  {
    accessorKey: 'farmerMobile',
    header: 'Mobile',
  },
  {
    accessorKey: 'createdByName',
    header: 'Created by',
  },
  {
    accessorKey: 'gatePassNo',
    header: () => <div className="text-right">Gate pass no.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('gatePassNo') ?? '—')}
      </div>
    ),
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: () => <div className="text-right">Manual GP no.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('manualGatePassNumber') ?? '—')}
      </div>
    ),
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    accessorKey: 'variety',
    header: 'Variety',
  },
  {
    accessorKey: 'truckNumber',
    header: 'Truck no.',
  },
  {
    accessorKey: 'bags',
    header: () => <div className="text-right">Bags</div>,
    cell: ({ row }) => {
      const v = row.getValue('bags') as number;
      return <div className="text-right font-medium">{v.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: 'grossWeightKg',
    header: () => <div className="text-right">Gross (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('grossWeightKg') as number | string)}
      </div>
    ),
  },
  {
    accessorKey: 'tareWeightKg',
    header: () => <div className="text-right">Tare (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('tareWeightKg') as number | string)}
      </div>
    ),
  },
  {
    accessorKey: 'netWeightKg',
    header: () => <div className="text-right">Net (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('netWeightKg') as number | string)}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'totalGradedBags',
    header: () => <div className="text-right">Graded bags</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('totalGradedBags') as number | string)}
      </div>
    ),
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created at',
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated at',
  },
];
