/* eslint-disable react-refresh/only-export-components -- column defs export columns + type; header/cell helpers are local */
import type { ColumnDef, CellContext } from '@tanstack/table-core';
import { ChevronDown, ChevronRight } from 'lucide-react';

/** Reusable cell with expand/collapse only in the column that owns this row's group */
function GroupableCell({
  row,
  column,
  table,
}: CellContext<IncomingReportRow, unknown>) {
  const isGrouped = row.getIsGrouped();
  const canExpand = row.getCanExpand();
  const grouping = table.getState().grouping ?? [];
  const groupingColumnId = grouping[row.depth];
  const isThisColumnGrouping = groupingColumnId === column.id;
  const showExpandCollapse = isGrouped && canExpand && isThisColumnGrouping;
  const value = String(row.getValue(column.id) ?? '—');
  return (
    <div className="font-custom flex items-center gap-1">
      {showExpandCollapse ? (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="text-muted-foreground focus-visible:ring-primary hover:bg-primary/10 hover:text-primary inline-flex shrink-0 rounded p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label={row.getIsExpanded() ? 'Collapse group' : 'Expand group'}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : null}
      <span
        style={{
          paddingLeft: showExpandCollapse ? 0 : row.depth * 20,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function FarmerCell({
  row,
  column,
  table,
}: CellContext<IncomingReportRow, unknown>) {
  const isGrouped = row.getIsGrouped();
  const canExpand = row.getCanExpand();
  const grouping = table.getState().grouping ?? [];
  const groupingColumnId = grouping[row.depth];
  const isThisColumnGrouping = groupingColumnId === column.id;
  const showExpandCollapse = isGrouped && canExpand && isThisColumnGrouping;
  const name = String(row.getValue('farmerName') ?? '—');
  const accountNo = row.original.accountNumber;
  const accountStr =
    accountNo != null && accountNo !== '' && accountNo !== '—'
      ? ` #${accountNo}`
      : '';

  return (
    <div className="font-custom flex items-center gap-1">
      {showExpandCollapse ? (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          className="text-muted-foreground focus-visible:ring-primary hover:bg-primary/10 hover:text-primary inline-flex shrink-0 rounded p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label={row.getIsExpanded() ? 'Collapse group' : 'Expand group'}
        >
          {row.getIsExpanded() ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : null}
      <span
        style={{
          paddingLeft: showExpandCollapse ? 0 : row.depth * 20,
        }}
      >
        {name}
        {!isGrouped && accountStr ? (
          <span className="text-muted-foreground font-normal">
            {accountStr}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export type IncomingReportRow = {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  farmerMobile: string;
  createdByName: string;
  location: string;
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
    cell: FarmerCell,
    enableGrouping: true,
    sortingFn: 'text',
  },
  {
    accessorKey: 'farmerAddress',
    header: 'Address',
    cell: GroupableCell,
    enableGrouping: true,
  },
  {
    accessorKey: 'farmerMobile',
    header: 'Mobile',
    enableGrouping: true,
  },
  {
    accessorKey: 'createdByName',
    header: 'Created by',
    enableGrouping: true,
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: GroupableCell,
    enableGrouping: true,
  },
  {
    accessorKey: 'gatePassNo',
    header: 'System generated Gate Pass No.',
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped() ? '—' : String(row.getValue('gatePassNo') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
    enableGrouping: true,
    enableSorting: true,
    sortingFn: 'alphanumeric',
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: 'Manual Gate Pass No.',
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped()
          ? '—'
          : String(row.getValue('manualGatePassNumber') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
    enableGrouping: true,
    enableSorting: true,
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: GroupableCell,
    enableGrouping: true,
    enableSorting: true,
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'variety',
    header: 'Variety',
    cell: GroupableCell,
    enableGrouping: true,
    sortingFn: 'text',
  },
  {
    accessorKey: 'truckNumber',
    header: 'Truck no.',
    enableGrouping: true,
  },
  {
    accessorKey: 'bags',
    header: () => <div className="text-right">Bags</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('bags') as number | string)}
      </div>
    ),
    aggregationFn: 'sum',
    enableGrouping: true,
    sortingFn: 'basic',
  },
  {
    accessorKey: 'grossWeightKg',
    header: () => <div className="text-right">Gross (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('grossWeightKg') as number | string)}
      </div>
    ),
    enableGrouping: true,
  },
  {
    accessorKey: 'tareWeightKg',
    header: () => <div className="text-right">Tare (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('tareWeightKg') as number | string)}
      </div>
    ),
    enableGrouping: true,
  },
  {
    accessorKey: 'netWeightKg',
    header: () => <div className="text-right">Net (kg)</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatNum(row.getValue('netWeightKg') as number | string)}
      </div>
    ),
    enableGrouping: true,
    sortingFn: 'basic',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: GroupableCell,
    enableGrouping: true,
    sortingFn: 'text',
  },
  {
    accessorKey: 'remarks',
    header: 'Remarks',
    cell: GroupableCell,
    enableGrouping: true,
  },
];
