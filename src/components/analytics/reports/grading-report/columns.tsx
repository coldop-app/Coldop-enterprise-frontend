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
  /** Net product (kg) = Net − (bags × JUTE_BAG_WEIGHT), same as grading voucher table */
  netProductKg: number | string;
  totalGradedBags: number;
  /** Total graded weight (kg) from order details (after bag deduction). */
  totalGradedWeightKg: number;
  /** Wastage (kg) = incoming net product − total graded weight. */
  wastageKg: number | string;
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

/** Graded section: graded bags and total graded weight (same primary highlight) */
const gradedHighlightCell =
  'text-right font-semibold bg-primary/10 text-foreground';
const gradedHighlightHeader = 'font-custom text-right font-semibold';

/** Wastage: elegant red highlight */
const wastageHighlightCell =
  'text-right font-semibold bg-rose-500/10 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200';
const wastageHighlightHeader =
  'font-custom text-right font-semibold text-rose-800 dark:text-rose-200';

export const columns: ColumnDef<GradingReportRow>[] = [
  // ——— Farmer (first column) ———
  {
    accessorKey: 'farmerName',
    header: () => <span className="font-custom">Farmer</span>,
    cell: ({ row }) => {
      const name = String(row.getValue('farmerName') ?? '—');
      const accountNo = row.original.accountNumber;
      const accountStr =
        accountNo != null && accountNo !== '' && accountNo !== '—'
          ? `#${accountNo}`
          : null;
      return (
        <span className="font-custom">
          {name}
          {accountStr != null ? (
            <span className="text-muted-foreground font-normal">
              {' '}
              {accountStr}
            </span>
          ) : null}
        </span>
      );
    },
  },
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
    accessorKey: 'variety',
    header: () => <span className="font-custom">Variety</span>,
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
  {
    accessorKey: 'netProductKg',
    header: () => (
      <div className={incomingHighlightHeader}>
        Net product (kg)
        <span className="text-muted-foreground ml-1 text-[10px] font-normal">
          (excl bardana)
        </span>
      </div>
    ),
    cell: ({ row }) => (
      <div className={incomingHighlightCell}>
        {formatNum(row.getValue('netProductKg') as number | string)}
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
    accessorKey: 'totalGradedBags',
    header: () => <div className={gradedHighlightHeader}>Graded bags</div>,
    cell: ({ row }) => (
      <div className={gradedHighlightCell}>
        {formatNum(row.getValue('totalGradedBags') as number)}
      </div>
    ),
  },
  {
    accessorKey: 'totalGradedWeightKg',
    header: () => (
      <div className={gradedHighlightHeader}>
        Total graded weight (kg)
        <span className="text-muted-foreground ml-1 text-[10px] font-normal">
          (excl bardana)
        </span>
      </div>
    ),
    cell: ({ row }) => (
      <div className={gradedHighlightCell}>
        {formatNum(row.getValue('totalGradedWeightKg') as number)}
      </div>
    ),
  },
  {
    accessorKey: 'wastageKg',
    header: () => <div className={wastageHighlightHeader}>Wastage (kg)</div>,
    cell: ({ row }) => {
      const val = row.getValue('wastageKg');
      if (val === '—' || val == null) {
        return <div className={wastageHighlightCell}>—</div>;
      }
      return (
        <div className={wastageHighlightCell}>{formatNum(val as number)}</div>
      );
    },
  },
  {
    accessorKey: 'grader',
    header: () => <span className="font-custom">Grader</span>,
  },
  {
    accessorKey: 'remarks',
    header: () => <span className="font-custom">Remarks</span>,
  },
  // ——— Other farmer / created by ———
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
