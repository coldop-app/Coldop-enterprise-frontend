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
          <DropdownMenuItem onSelect={() => column.toggleGrouping()}>
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
          <DropdownMenuItem onSelect={() => column.toggleGrouping()}>
            {column.getIsGrouped()
              ? `Ungroup by ${label}`
              : `Group by ${label}`}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => column.toggleSorting(false)}>
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => column.toggleSorting(true)}>
            Sort descending
          </DropdownMenuItem>
          {isSorted && (
            <DropdownMenuItem
              onSelect={() =>
                table.options.onSortingChange?.((prev) =>
                  prev.filter((s) => s.id !== columnId)
                )
              }
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
}: CellContext<GradingReportRow, unknown>) {
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

/** Farmer column cell: expand/collapse + farmer name and account number for leaf rows */
function FarmerCell({
  row,
  column,
  table,
}: CellContext<GradingReportRow, unknown>) {
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
        {!isGrouped && accountStr && (
          <span className="text-muted-foreground font-normal">
            {accountStr}
          </span>
        )}
      </span>
    </div>
  );
}

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
  /** Row index within a grading-pass group (0 = first row). Used for rowSpan. */
  gradingPassRowIndex?: number;
  /** Number of rows in this grading-pass group. Used for rowSpan. */
  gradingPassGroupSize?: number;
};

/** Column ids that span across grouped incoming rows (grading gate pass level). */
export const GRADING_REPORT_ROW_SPAN_COLUMN_IDS = [
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'totalGradedBags',
  'totalGradedWeightKg',
  'wastageKg',
  'grader',
  'remarks',
] as const;

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
    header: ({ column }) => <GroupableHeader column={column} label="Farmer" />,
    cell: FarmerCell,
    enableGrouping: true,
  },
  // ——— Incoming gate pass ———
  {
    accessorKey: 'incomingGatePassNo',
    header: () => <div className="font-custom text-right">Incoming GP no.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped()
          ? '—'
          : String(row.getValue('incomingGatePassNo') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
  },
  {
    accessorKey: 'incomingManualNo',
    header: () => (
      <div className="font-custom text-right">Incoming manual no.</div>
    ),
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped()
          ? '—'
          : String(row.getValue('incomingManualNo') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
  },
  {
    accessorKey: 'incomingGatePassDate',
    header: ({ column }) => (
      <GroupableHeader column={column} label="Incoming gate pass date" />
    ),
    cell: GroupableCell,
    enableGrouping: true,
  },
  {
    accessorKey: 'variety',
    header: ({ column }) => <GroupableHeader column={column} label="Variety" />,
    cell: GroupableCell,
    enableGrouping: true,
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
    aggregationFn: 'sum',
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
        {row.getIsGrouped() ? '—' : String(row.getValue('gatePassNo') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
  },
  {
    accessorKey: 'manualGatePassNumber',
    header: () => <div className="font-custom text-right">Manual GP no.</div>,
    cell: ({ row }) => (
      <div className="text-right">
        {row.getIsGrouped()
          ? '—'
          : String(row.getValue('manualGatePassNumber') ?? '—')}
      </div>
    ),
    aggregationFn: () => null,
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
    accessorKey: 'totalGradedBags',
    header: () => <div className={gradedHighlightHeader}>Graded bags</div>,
    cell: ({ row }) => (
      <div className={gradedHighlightCell}>
        {formatNum(row.getValue('totalGradedBags') as number)}
      </div>
    ),
    aggregationFn: 'sum',
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
    aggregationFn: 'sum',
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
    aggregationFn: 'sum',
  },
  {
    accessorKey: 'grader',
    header: ({ column }) => <GroupableHeader column={column} label="Grader" />,
    cell: GroupableCell,
    enableGrouping: true,
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
