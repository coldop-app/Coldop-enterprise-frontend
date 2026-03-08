import type { ColumnDef } from '@tanstack/table-core';

export type GradingReportRow = {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  farmerMobile: string;
  createdByName: string;
  gatePassNo: number | string;
  manualGatePassNumber: number | string;
  incomingGatePassNo: number | string;
  incomingManualNo: number | string;
  incomingGatePassDate: string;
  date: string;
  variety: string;
  truckNumber: string;
  bagsReceived: number;
  grossWeightKg: number | string;
  tareWeightKg: number | string;
  netWeightKg: number | string;
  totalGradedBags: number;
  grader: string;
  remarks: string;
};

function formatNum(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

/** Incoming section: GP no., manual no., date, truck, bags (highlight), gross, net (highlight) */
const incomingHighlightCell =
  'text-right font-semibold bg-primary/10 text-foreground';
const incomingHighlightHeader = 'font-custom text-right font-semibold';

export const columns: ColumnDef<GradingReportRow>[] = [
  // ——— Incoming gate pass ———
  {
    accessorKey: 'incomingGatePassNo',
    header: () => <div className="font-custom text-right">Incoming GP no.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('incomingGatePassNo') ?? '—')}
      </div>
    ),
  },
  {
    accessorKey: 'incomingManualNo',
    header: () => (
      <div className="font-custom text-right">Incoming manual no.</div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {String(row.getValue('incomingManualNo') ?? '—')}
      </div>
    ),
  },
  {
    accessorKey: 'incomingGatePassDate',
    header: () => <span className="font-custom">Incoming gate pass date</span>,
  },
  {
    accessorKey: 'truckNumber',
    header: () => <span className="font-custom">Truck no.</span>,
  },
  {
    accessorKey: 'bagsReceived',
    header: () => <div className={incomingHighlightHeader}>Bags received</div>,
    cell: ({ row }) => (
      <div className={incomingHighlightCell}>
        {formatNum(row.getValue('bagsReceived') as number)}
      </div>
    ),
  },
  {
    accessorKey: 'grossWeightKg',
    header: () => <div className="font-custom text-right">Gross (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('grossWeightKg') as number | string)}
      </div>
    ),
  },
  {
    accessorKey: 'tareWeightKg',
    header: () => <div className="font-custom text-right">Tare (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('tareWeightKg') as number | string)}
      </div>
    ),
  },
  {
    accessorKey: 'netWeightKg',
    header: () => <div className={incomingHighlightHeader}>Net (kg)</div>,
    cell: ({ row }) => (
      <div className={incomingHighlightCell}>
        {formatNum(row.getValue('netWeightKg') as number | string)}
      </div>
    ),
  },
  // ——— Grading gate pass ———
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
    accessorKey: 'totalGradedBags',
    header: () => <div className="font-custom text-right">Graded bags</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('totalGradedBags') as number)}
      </div>
    ),
  },
  {
    accessorKey: 'grader',
    header: () => <span className="font-custom">Grader</span>,
  },
  {
    accessorKey: 'remarks',
    header: () => <span className="font-custom">Remarks</span>,
  },
  // ——— Farmer / created by ———
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
];
