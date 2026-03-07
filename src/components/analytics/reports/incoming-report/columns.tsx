/* eslint-disable react-refresh/only-export-components -- column defs export columns + type; header/cell helpers are local */
import type { ColumnDef, CellContext } from '@tanstack/table-core';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';

/** Reusable header with vertical 3-dot menu for groupable columns */
function GroupableHeader({
  column,
  label,
}: {
  column: { getIsGrouped: () => boolean; toggleGrouping: () => void };
  label: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-custom">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${label} column options`}
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleGrouping();
            }}
          >
            {column.getIsGrouped()
              ? `Ungroup by ${label}`
              : `Group by ${label}`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type SortState = { id: string; desc: boolean }[];

/** Reusable header with vertical 3-dot menu for sortable columns (Account No., Gate pass no., Manual GP no.) */
function SortableHeader({
  column,
  table,
  label,
}: {
  column: {
    id: string;
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
  table: {
    options: {
      onSortingChange?: (updater: (prev: SortState) => SortState) => void;
    };
  };
  label: string;
}) {
  const isSorted = column.getIsSorted();
  const columnId = column.id;
  return (
    <div className="flex items-center justify-end gap-1">
      <span className="font-custom">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${label} column options`}
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(false);
            }}
          >
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(true);
            }}
          >
            Sort descending
          </DropdownMenuItem>
          {isSorted && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                table.options.onSortingChange?.((prev) =>
                  prev.filter((s) => s.id !== columnId)
                );
              }}
            >
              Clear sort
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Header with 3-dot menu for columns that support both grouping and sorting (e.g. Date) */
function GroupableSortableHeader({
  column,
  table,
  label,
}: {
  column: {
    id: string;
    getIsGrouped: () => boolean;
    toggleGrouping: () => void;
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
  table: {
    options: {
      onSortingChange?: (updater: (prev: SortState) => SortState) => void;
    };
  };
  label: string;
}) {
  const isSorted = column.getIsSorted();
  const columnId = column.id;
  return (
    <div className="flex items-center gap-1">
      <span className="font-custom">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="focus-visible:ring-primary h-8 w-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`${label} column options`}
          >
            <MoreVertical className="h-4 w-4 text-gray-600" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleGrouping();
            }}
          >
            {column.getIsGrouped()
              ? `Ungroup by ${label}`
              : `Group by ${label}`}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(false);
            }}
          >
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              column.toggleSorting(true);
            }}
          >
            Sort descending
          </DropdownMenuItem>
          {isSorted && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                table.options.onSortingChange?.((prev) =>
                  prev.filter((s) => s.id !== columnId)
                );
              }}
            >
              Clear sort
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

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
    header: ({ column }) => <GroupableHeader column={column} label="Farmer" />,
    cell: GroupableCell,
    enableGrouping: true,
  },
  {
    accessorKey: 'accountNumber',
    header: ({ column, table }) => (
      <SortableHeader column={column} table={table} label="Account No." />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped()
          ? '—'
          : String(row.getValue('accountNumber') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
    enableSorting: true,
  },
  {
    accessorKey: 'farmerAddress',
    header: ({ column }) => <GroupableHeader column={column} label="Address" />,
    cell: GroupableCell,
    enableGrouping: true,
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
    header: ({ column, table }) => (
      <SortableHeader column={column} table={table} label="Gate pass no." />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped() ? '—' : String(row.getValue('gatePassNo') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
    enableSorting: true,
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: ({ column, table }) => (
      <SortableHeader column={column} table={table} label="Manual GP no." />
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped()
          ? '—'
          : String(row.getValue('manualGatePassNumber') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
    enableSorting: true,
  },
  {
    accessorKey: 'date',
    header: ({ column, table }) => (
      <GroupableSortableHeader column={column} table={table} label="Date" />
    ),
    cell: GroupableCell,
    enableGrouping: true,
    enableSorting: true,
  },
  {
    accessorKey: 'variety',
    header: ({ column }) => <GroupableHeader column={column} label="Variety" />,
    cell: GroupableCell,
    enableGrouping: true,
  },
  {
    accessorKey: 'truckNumber',
    header: 'Truck no.',
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
    header: ({ column }) => <GroupableHeader column={column} label="Status" />,
    cell: GroupableCell,
    enableGrouping: true,
  },
  {
    accessorKey: 'remarks',
    header: ({ column }) => <GroupableHeader column={column} label="Remarks" />,
    cell: GroupableCell,
    enableGrouping: true,
  },
];
