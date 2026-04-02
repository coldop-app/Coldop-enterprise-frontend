/* eslint-disable react-refresh/only-export-components -- column defs export columns + type; header/cell helpers are local */
import type { ColumnDef, CellContext, SortingFn } from '@tanstack/table-core';
import {
  GRADING_REPORT_BAG_SIZE_LABELS,
  gradedBagSizeColumnId,
  type GradedSizeBreakdownEntry,
} from '@/components/analytics/reports/grading-report/grading-bag-sizes';
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

/** Right-aligned column: sort only (no grouping) */
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
  /** Wastage (%) = ((incoming net product − total graded weight) / incoming net product) × 100. */
  wastageKg: number | string;
  grader: string;
  remarks: string;
  /** Row index within a grading-pass group (0 = first row). Used for rowSpan. */
  gradingPassRowIndex?: number;
  /** Number of rows in this grading-pass group. Used for rowSpan. */
  gradingPassGroupSize?: number;
  /** Per-size graded qty, weight/bag, and bag-type split; only on first row of a grading-pass group. */
  gradedSizeBreakdown?: Record<string, GradedSizeBreakdownEntry>;
  /** Qty per bag-size column id for footer totals (same ids as `gradedBagSize_*` columns). */
  gradedBagSizeQtyByColumnId?: Record<string, number>;
  /** Grading gate pass no. for sorting (same value on every row of a pass group). */
  sortGatePassNo: number;
  /** Grading manual GP no. for sorting (NaN = missing). */
  sortManualGatePassNumber: number;
  /** ISO date string for sorting (grading pass date; same on every row of a pass group). */
  sortGradingPassDate: string;
};

/** Base column ids that span across grouped incoming rows (grading gate pass level). Bag-size columns are appended dynamically — see `gradingReportRowSpanColumnIds`. */
export const GRADING_REPORT_ROW_SPAN_BASE_IDS = [
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'totalGradedBags',
  'totalGradedWeightKg',
  'wastageKg',
  'grader',
  'remarks',
] as const;

/** @deprecated Use `GRADING_REPORT_ROW_SPAN_BASE_IDS` + dynamic bag-size ids from `gradingReportRowSpanColumnIds`. */
export const GRADING_REPORT_ROW_SPAN_COLUMN_IDS =
  GRADING_REPORT_ROW_SPAN_BASE_IDS;

export function gradingReportRowSpanColumnIds(
  visibleBagSizes: readonly string[]
): string[] {
  const bagIds = visibleBagSizes.map((s) => gradedBagSizeColumnId(s));
  return [...GRADING_REPORT_ROW_SPAN_BASE_IDS, ...bagIds];
}

function compareNumbersForSort(a: number, b: number): number {
  const aNaN = Number.isNaN(a);
  const bNaN = Number.isNaN(b);
  if (aNaN && bNaN) return 0;
  if (aNaN) return 1;
  if (bNaN) return -1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function compareIsoDateStrings(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

const sortGatePassNoFn: SortingFn<GradingReportRow> = (rowA, rowB) =>
  compareNumbersForSort(
    rowA.original.sortGatePassNo,
    rowB.original.sortGatePassNo
  );

const sortManualGatePassNumberFn: SortingFn<GradingReportRow> = (rowA, rowB) =>
  compareNumbersForSort(
    rowA.original.sortManualGatePassNumber,
    rowB.original.sortManualGatePassNumber
  );

const sortGradingPassDateFn: SortingFn<GradingReportRow> = (rowA, rowB) =>
  compareIsoDateStrings(
    rowA.original.sortGradingPassDate,
    rowB.original.sortGradingPassDate
  );

function formatNum(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

function formatWeightKg(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(Math.round(value * 10) / 10);
}

function formatPercent(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
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

function buildBagSizeColumns(
  visibleBagSizes: readonly string[]
): ColumnDef<GradingReportRow>[] {
  return visibleBagSizes.map((size) => {
    const colId = gradedBagSizeColumnId(size);
    const headerLabel = GRADING_REPORT_BAG_SIZE_LABELS[size] ?? size;
    return {
      id: colId,
      accessorFn: (row) =>
        row.gradedBagSizeQtyByColumnId?.[colId] ??
        row.gradedSizeBreakdown?.[size]?.qty ??
        0,
      header: () => <div className={gradedHighlightHeader}>{headerLabel}</div>,
      cell: ({ row }) => {
        const breakdown = row.original.gradedSizeBreakdown?.[size];
        const qty = breakdown?.qty ?? 0;
        const wPerBag = breakdown?.weightPerBagKg;
        const isEmpty = qty === 0 || breakdown == null;
        const parts = breakdown?.bagTypeParts ?? [];
        return (
          <div className={gradedHighlightCell}>
            {isEmpty ? (
              ''
            ) : (
              <span className="flex flex-col items-end gap-0.5">
                <span className="font-medium">{formatNum(qty)}</span>
                <span className="text-muted-foreground text-xs font-normal">
                  ({formatWeightKg(wPerBag)})
                </span>
                {parts.length === 1 ? (
                  <span className="text-muted-foreground font-custom text-[10px] leading-tight font-normal">
                    {`${parts[0].label} (${formatWeightKg(parts[0].weightPerBagKg)})`}
                  </span>
                ) : parts.length > 1 ? (
                  <span className="text-muted-foreground font-custom flex flex-col items-end gap-0.5 text-[10px] leading-tight font-normal">
                    {parts.map((p, i) => (
                      <span key={`${p.label}-${i}`}>
                        {`${p.label} ${formatNum(p.qty)} (${formatWeightKg(p.weightPerBagKg)})`}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            )}
          </div>
        );
      },
      aggregationFn: 'sum',
    } satisfies ColumnDef<GradingReportRow>;
  });
}

export function createGradingReportColumns(
  visibleBagSizes: readonly string[]
): ColumnDef<GradingReportRow>[] {
  return [
    // ——— Farmer (first column) ———
    {
      accessorKey: 'farmerName',
      header: ({ column }) => (
        <GroupableHeader column={column} label="Farmer" />
      ),
      cell: FarmerCell,
      enableGrouping: true,
    },
    // ——— Incoming gate pass ———
    {
      accessorKey: 'incomingGatePassNo',
      header: () => (
        <div className="font-custom text-right">Incoming GP no.</div>
      ),
      enableSorting: false,
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
      enableSorting: false,
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
      enableSorting: false,
      cell: GroupableCell,
      enableGrouping: true,
    },
    {
      accessorKey: 'variety',
      header: ({ column }) => (
        <GroupableHeader column={column} label="Variety" />
      ),
      cell: GroupableCell,
      enableGrouping: true,
    },
    {
      accessorKey: 'truckNumber',
      header: () => <span className="font-custom">Truck no.</span>,
    },
    {
      accessorKey: 'bagsReceived',
      header: () => (
        <div className={incomingHighlightHeader}>Bags received</div>
      ),
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
      header: ({ column, table }) => (
        <SortableHeader column={column} table={table} label="Gate pass no." />
      ),
      sortingFn: sortGatePassNoFn,
      sortDescFirst: false,
      cell: ({ row }) => (
        <div className="text-right">
          {row.getIsGrouped() ? '—' : String(row.getValue('gatePassNo') ?? '—')}
        </div>
      ),
      aggregationFn: () => null,
    },
    {
      accessorKey: 'manualGatePassNumber',
      header: ({ column, table }) => (
        <SortableHeader column={column} table={table} label="Manual GP no." />
      ),
      sortingFn: sortManualGatePassNumberFn,
      sortDescFirst: false,
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
      sortingFn: sortGradingPassDateFn,
      sortDescFirst: false,
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
    ...buildBagSizeColumns(visibleBagSizes),
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
      header: () => <div className={wastageHighlightHeader}>Wastage (%)</div>,
      cell: ({ row }) => {
        const val = row.getValue('wastageKg');
        if (val === '—' || val == null) {
          return <div className={wastageHighlightCell}>—</div>;
        }
        return (
          <div className={wastageHighlightCell}>
            {formatPercent(val as number)}
          </div>
        );
      },
      aggregationFn: 'sum',
    },
    {
      accessorKey: 'grader',
      header: ({ column }) => (
        <GroupableHeader column={column} label="Grader" />
      ),
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
}

/** No bag-size columns (same as `createGradingReportColumns([])`). */
export const columns: ColumnDef<GradingReportRow>[] =
  createGradingReportColumns([]);
