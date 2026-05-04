import * as React from 'react';
import {
  type Column,
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type GroupingState,
  type Row as TanStackRow,
  type SortingState,
  type VisibilityState,
  type Updater,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Item } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetContractFarmingReport } from '@/services/store-admin/general/useGetContractFarmingReport';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import {
  buildGradeHeaders,
  flattenRows,
  formatNumber,
  getAverageQuintalPerAcre,
  getBuyBackAmountFromGradeData,
  getGradeBagCount,
  getGradeWeightPercent,
  getNetAmountPerAcreRupee,
  getNetAmountRupee,
  getOutputPercentage,
  getTotalGradeBags,
  getTotalGradeNetWeightKg,
  getWastageKg,
  normalizeReportData,
  recomputeRowSpans,
  type RenderRow,
} from './contract-farming-report-calculations';
import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  buildColumns,
  buildContractFarmingGradingLeafColumnIds,
  BUY_BACK_AMOUNT_COLUMN_ID,
  BUY_BACK_COLUMN_IDS,
  CONTRACT_FARMING_GRADING_COLUMN_LAYOUT_VERSION,
  isNumericSortColumnId,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  SEED_AMOUNT_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  TRAILING_TWO_ROW_HEADER_COLUMN_IDS,
  TRAILING_TWO_ROW_HEADER_ID_SET,
  VARIETY_LEVEL_COLUMN_IDS,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
  WASTAGE_KG_COLUMN_ID,
} from './columns';
import type { FlattenedRow } from './types';
import { formatContractFarmingFooterRow } from './contract-farming-footer-totals';
import { ContractFarmingViewFiltersSheet } from './view-filters-sheet/index';
import {
  formatContractFarmingGradeColumnLabel,
  isContractFarmingCutGrade,
} from './view-filters-sheet/constants';
import { usePreferencesStore } from '@/stores/store';

type GlobalFilterValue = string | FilterGroupNode;

/** Stable row-model factories — avoid recreating on every render (TanStack Table docs). */
const CF_GET_CORE_ROW_MODEL = getCoreRowModel();
const CF_GET_FILTERED_ROW_MODEL = getFilteredRowModel();
const CF_GET_SORTED_ROW_MODEL = getSortedRowModel();

const CF_TABLE_DEFAULT_COLUMN = {
  size: 130,
  minSize: 90,
  maxSize: 550,
} as const;

const CF_TABLE_INITIAL_STATE = {
  columnVisibility: { farmerMobile: false },
} as const;

const CF_HEADER_CELL_CLASS =
  'font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase';
const CF_BODY_CELL_CLASS =
  'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5';

function cfGetRowId(row: FlattenedRow): string {
  return row.rowId;
}

function cfGlobalFilterFn(
  row: TanStackRow<FlattenedRow>,
  _columnId: string,
  filterValue: GlobalFilterValue
): boolean {
  if (isAdvancedFilterGroup(filterValue)) {
    return evaluateFilterGroup(row.original, filterValue);
  }
  const query = String(filterValue ?? '')
    .trim()
    .toLowerCase();
  if (!query) return true;

  const o = row.original;
  const values = [
    o.farmerName,
    o.farmerAddress,
    o.farmerMobile,
    o.varietyName,
    o.generation,
    o.sizeName,
    String(o.farmerAccount),
  ];
  return values.some((value) => value.toLowerCase().includes(query));
}

function renderCfBodyCellContent(
  row: RenderRow,
  columnId: string,
  columnWidth: number
): React.ReactNode {
  if (columnId === 'farmer') {
    if (!row.isFirstFarmerRow) return null;
    return (
      <td
        rowSpan={row.farmerRowSpan}
        className={`${CF_BODY_CELL_CLASS} max-w-56 align-top`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        <div className="font-medium">
          {row.farmerName}
          <span className="text-muted-foreground ml-1 text-sm font-normal">
            (#{row.farmerAccount})
          </span>
        </div>
      </td>
    );
  }

  if (columnId === 'farmerMobile') {
    if (!row.isFirstFarmerRow) return null;
    return (
      <td
        rowSpan={row.farmerRowSpan}
        className={`${CF_BODY_CELL_CLASS} align-top tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {row.farmerMobile}
      </td>
    );
  }

  if (columnId === 'address') {
    if (!row.isFirstFarmerRow) return null;
    return (
      <td
        rowSpan={row.farmerRowSpan}
        className={`${CF_BODY_CELL_CLASS} align-top`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {row.farmerAddress}
      </td>
    );
  }

  if (columnId === 'variety') {
    if (!row.isFirstVarietyRow) return null;
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className={`${CF_BODY_CELL_CLASS} align-top`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {row.varietyName}
        </span>
      </td>
    );
  }

  if (columnId === 'generation') {
    return (
      <td
        className={CF_BODY_CELL_CLASS}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          {row.generation}
        </span>
      </td>
    );
  }

  if (columnId === 'size') {
    return (
      <td
        className={CF_BODY_CELL_CLASS}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {row.sizeName}
      </td>
    );
  }

  if (columnId === 'qty') {
    return (
      <td
        className={`${CF_BODY_CELL_CLASS} text-right tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {formatNumber(row.sizeQuantity, 0)}
      </td>
    );
  }

  if (columnId === 'acres') {
    return (
      <td
        className={`${CF_BODY_CELL_CLASS} text-right tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {formatNumber(row.sizeAcres)}
      </td>
    );
  }

  if (columnId === SEED_AMOUNT_COLUMN_ID) {
    return (
      <td
        className={`${CF_BODY_CELL_CLASS} text-right tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {row.sizeAmount > 0 ? `₹${formatNumber(row.sizeAmount)}` : '-'}
      </td>
    );
  }

  const isVarietyLevelColumn =
    VARIETY_LEVEL_COLUMN_IDS.has(columnId) ||
    columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX) ||
    columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX) ||
    columnId === NET_AMOUNT_COLUMN_ID ||
    columnId === NET_AMOUNT_PER_ACRE_COLUMN_ID ||
    columnId === 'noGrades';

  if (isVarietyLevelColumn && !row.isFirstVarietyRow) {
    return null;
  }

  if (columnId === 'bbBags') {
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className="font-custom border-border/40 border-r bg-green-50 px-3 py-2.5 text-right align-top tabular-nums"
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {formatNumber(row.buyBackBags, 0)}
      </td>
    );
  }

  if (columnId === 'bbNetWeight') {
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className="font-custom border-border/40 border-r bg-green-50 px-3 py-2.5 text-right align-top tabular-nums"
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {formatNumber(row.buyBackNetWeightKg)}
      </td>
    );
  }

  if (columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX)) {
    if (columnId === TOTAL_GRADED_BAGS_COLUMN_ID) {
      const totalBags = getTotalGradeBags(row);
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {totalBags !== null ? formatNumber(totalBags, 0) : '-'}
        </td>
      );
    }
    if (columnId === TOTAL_GRADED_NET_WEIGHT_COLUMN_ID) {
      const totalNetWeightKg = getTotalGradeNetWeightKg(row);
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {totalNetWeightKg !== null ? formatNumber(totalNetWeightKg) : '-'}
        </td>
      );
    }
    if (columnId === AVG_QUINTAL_PER_ACRE_COLUMN_ID) {
      const avg = getAverageQuintalPerAcre(row);
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {avg !== null ? formatNumber(avg) : '-'}
        </td>
      );
    }
    if (columnId === WASTAGE_KG_COLUMN_ID) {
      const wastage = getWastageKg(row);
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {wastage !== null ? formatNumber(wastage) : '-'}
        </td>
      );
    }
    if (columnId === OUTPUT_PERCENTAGE_COLUMN_ID) {
      const outputPct = getOutputPercentage(row);
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {outputPct !== null ? `${formatNumber(outputPct, 2)}%` : '-'}
        </td>
      );
    }
    if (columnId === BUY_BACK_AMOUNT_COLUMN_ID) {
      const buyBackAmt = getBuyBackAmountFromGradeData(row);
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {buyBackAmt !== null ? `₹${formatNumber(buyBackAmt)}` : '-'}
        </td>
      );
    }
    const grade = columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
    const bags = getGradeBagCount(row, grade);
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {bags !== null ? formatNumber(bags, 0) : '-'}
      </td>
    );
  }

  if (columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)) {
    const grade = columnId.replace(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX, '');
    const weightPercent = getGradeWeightPercent(row, grade);
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {weightPercent !== null ? `${formatNumber(weightPercent, 2)}%` : '-'}
      </td>
    );
  }

  if (columnId === NET_AMOUNT_COLUMN_ID) {
    const net = getNetAmountRupee(row);
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {net !== null ? `₹${formatNumber(net)}` : '-'}
      </td>
    );
  }

  if (columnId === NET_AMOUNT_PER_ACRE_COLUMN_ID) {
    const perAcre = getNetAmountPerAcreRupee(row);
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className={`${CF_BODY_CELL_CLASS} text-right align-top tabular-nums`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        {perAcre !== null ? `₹${formatNumber(perAcre)}` : '-'}
      </td>
    );
  }

  if (columnId === 'noGrades') {
    return (
      <td
        rowSpan={row.varietyRowSpan}
        className={`${CF_BODY_CELL_CLASS} text-center align-top`}
        style={{ width: columnWidth, minWidth: columnWidth }}
      >
        -
      </td>
    );
  }

  return null;
}

type CfBodyRowProps = {
  row: RenderRow;
  rowIndex: number;
  visibleColumnIds: readonly string[];
  visibleColumnById: Map<string, Column<FlattenedRow, unknown>>;
};

const ContractFarmingReportBodyRow = React.memo(
  function ContractFarmingReportBodyRow({
    row,
    rowIndex,
    visibleColumnIds,
    visibleColumnById,
  }: CfBodyRowProps) {
    const rowClass = row.isFarmerBlockStart
      ? 'border-border/70 border-t-2'
      : row.isVarietyBlockStart
        ? 'border-border/60 border-t'
        : 'border-border/40 border-t border-dashed';
    const stripingClass = rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/25';

    return (
      <tr className={`hover:bg-accent/40 ${rowClass} ${stripingClass}`}>
        {visibleColumnIds.map((columnId) => {
          const column = visibleColumnById.get(columnId);
          if (!column) return null;
          return (
            <React.Fragment key={`${row.rowId}-${columnId}`}>
              {renderCfBodyCellContent(row, columnId, column.getSize())}
            </React.Fragment>
          );
        })}
      </tr>
    );
  }
);

const ContractFarmingReportTable = () => {
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({ farmerMobile: false });
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  // rowspan grouping is UI-only — keep it out of TanStack `grouping` so leaf columns stay sortable
  const [rowSpanGrouping, setRowSpanGrouping] = React.useState<GroupingState>([
    'farmer',
    'variety',
  ]);
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetContractFarmingReport();
  /** Re-evaluate grading-derived columns when cold-storage prefs (buy-back rates) change. */
  const buyBackCostPrefsKey = usePreferencesStore((state) =>
    JSON.stringify(state.preferences?.custom?.buyBackCost ?? null)
  );

  const report = React.useMemo(() => normalizeReportData(data), [data]);
  const gradeHeaders = React.useMemo(
    () => buildGradeHeaders(report.meta.allGrades),
    [report.meta.allGrades]
  );
  const flattenedRows = React.useMemo(
    () => flattenRows(report.farmers),
    [report.farmers]
  );
  const columns = React.useMemo(
    () => buildColumns(gradeHeaders),
    // buyBackCostPrefsKey: accessors read prefs from store; rebuilding columns busts table when rates change
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buyBackCostPrefsKey intentional cache bust
    [gradeHeaders, buyBackCostPrefsKey]
  );
  const defaultColumnOrder = React.useMemo(
    () => [
      'farmer',
      'farmerMobile',
      'address',
      'variety',
      'generation',
      'size',
      'qty',
      'acres',
      'bbBags',
      'bbNetWeight',
      ...buildContractFarmingGradingLeafColumnIds(gradeHeaders),
      SEED_AMOUNT_COLUMN_ID,
      NET_AMOUNT_COLUMN_ID,
      NET_AMOUNT_PER_ACRE_COLUMN_ID,
    ],
    // CONTRACT_FARMING_GRADING_COLUMN_LAYOUT_VERSION busts cache when grading tail order changes (same gradeHeaders / HMR).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional invalidate key, not a reactive prop
    [gradeHeaders, CONTRACT_FARMING_GRADING_COLUMN_LAYOUT_VERSION]
  );

  const deferredGlobalFilter = React.useDeferredValue(
    typeof globalFilter === 'string' ? globalFilter : ''
  );
  const effectiveGlobalFilter: GlobalFilterValue =
    typeof globalFilter === 'string' ? deferredGlobalFilter : globalFilter;

  /** Empty `columnOrder` otherwise uses TanStack’s definition order (not our grading sequence) on first paint */
  const effectiveColumnOrder = React.useMemo(
    () => (columnOrder.length > 0 ? columnOrder : defaultColumnOrder),
    [columnOrder, defaultColumnOrder]
  );

  const onColumnOrderChange = React.useCallback(
    (updater: Updater<string[]>) => {
      setColumnOrder((prev) => {
        const resolvedPrev = prev.length > 0 ? prev : defaultColumnOrder;
        return typeof updater === 'function' ? updater(resolvedPrev) : updater;
      });
    },
    [defaultColumnOrder]
  );

  React.useEffect(() => {
    setColumnOrder((current) => {
      if (current.length === 0) return current;
      const defaultIndex = (id: string) => {
        const i = defaultColumnOrder.indexOf(id);
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      const preserved = current
        .filter((id) => defaultColumnOrder.includes(id))
        .sort((a, b) => defaultIndex(a) - defaultIndex(b));
      const missing = defaultColumnOrder.filter(
        (id) => !preserved.includes(id)
      );
      return [...preserved, ...missing];
    });
  }, [defaultColumnOrder]);

  const table = useReactTable<FlattenedRow>({
    data: flattenedRows,
    columns,
    initialState: CF_TABLE_INITIAL_STATE,
    defaultColumn: CF_TABLE_DEFAULT_COLUMN,
    state: {
      sorting,
      globalFilter: effectiveGlobalFilter,
      columnFilters,
      columnVisibility,
      columnOrder: effectiveColumnOrder,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange,
    enableColumnResizing: true,
    columnResizeMode,
    columnResizeDirection,
    getRowId: cfGetRowId,
    globalFilterFn: cfGlobalFilterFn,
    getCoreRowModel: CF_GET_CORE_ROW_MODEL,
    getFilteredRowModel: CF_GET_FILTERED_ROW_MODEL,
    /** Per-render factories — generics differ from hoisted plugin row models in this TS setup */
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: CF_GET_SORTED_ROW_MODEL,
  });

  const { columnSizing } = table.getState();
  const visibleColumns = React.useMemo(
    () => table.getVisibleLeafColumns(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `table` is stable; need sizing/visibility/column defs to bust memo for BodyRow widths
    [table, columnVisibility, columnOrder, columns, columnSizing]
  );
  const visibleColumnById = React.useMemo(
    () => new Map(visibleColumns.map((column) => [column.id, column])),
    [visibleColumns]
  );
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );
  const visibleBaseColumnIds = React.useMemo(
    () =>
      visibleColumnIds.filter(
        (columnId) =>
          !columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX) &&
          !columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX) &&
          columnId !== 'noGrades'
      ),
    [visibleColumnIds]
  );
  const visibleNonBuyBackBaseColumnIds = React.useMemo(
    () =>
      visibleBaseColumnIds.filter(
        (columnId) => !BUY_BACK_COLUMN_IDS.has(columnId)
      ),
    [visibleBaseColumnIds]
  );
  /** Seed amt & net amount render after grading in header — keep out of the leading rowspan strip */
  const visibleLeadingNonBuyBackBaseColumnIds = React.useMemo(
    () =>
      visibleNonBuyBackBaseColumnIds.filter(
        (id) => !TRAILING_TWO_ROW_HEADER_ID_SET.has(id)
      ),
    [visibleNonBuyBackBaseColumnIds]
  );
  const visibleBuyBackColumnIds = React.useMemo(
    () =>
      visibleBaseColumnIds.filter((columnId) =>
        BUY_BACK_COLUMN_IDS.has(columnId)
      ),
    [visibleBaseColumnIds]
  );
  const leafHeaderByColumnId = React.useMemo(
    () =>
      new Map(
        table
          .getFlatHeaders()
          .filter((header) => header.subHeaders.length === 0)
          .map((header) => [header.column.id, header])
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- match visibleColumns bust (resize / visibility / defs)
    [table, columnSizing, columnVisibility, columns, columnOrder]
  );
  const visibleGradeColumnIds = React.useMemo(
    () =>
      visibleColumnIds.filter(
        (columnId) =>
          columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX) ||
          columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)
      ),
    [visibleColumnIds]
  );
  const hasNoGradesPlaceholder = React.useMemo(
    () => visibleColumnIds.includes('noGrades'),
    [visibleColumnIds]
  );
  const hasVisibleBuyBack = React.useMemo(() => {
    return visibleBaseColumnIds.some((id) => BUY_BACK_COLUMN_IDS.has(id));
  }, [visibleBaseColumnIds]);

  const rowSpanOptions = React.useMemo(
    () => ({
      groupByFarmer: rowSpanGrouping.includes('farmer'),
      groupByVariety: rowSpanGrouping.includes('variety'),
    }),
    [rowSpanGrouping]
  );

  const sortedRowModel = table.getSortedRowModel();
  const dataRows = React.useMemo(
    () => sortedRowModel.rows.map((row) => row.original),
    [sortedRowModel.rows]
  );
  const renderedRows = React.useMemo(
    () => recomputeRowSpans(dataRows, rowSpanOptions),
    [dataRows, rowSpanOptions]
  );
  const footerCells = React.useMemo(
    () =>
      dataRows.length > 0
        ? formatContractFarmingFooterRow(dataRows, visibleColumnIds)
        : null,
    [dataRows, visibleColumnIds]
  );
  const totalColumns = Math.max(visibleColumnIds.length, 1);

  const renderLeafSortHeader = React.useCallback(
    (columnId: string, label: React.ReactNode) => {
      const column = table.getColumn(columnId);
      if (!column || !column.getCanSort()) {
        return label;
      }

      const alignRight = isNumericSortColumnId(columnId);
      return (
        <div
          className={`group focus-visible:ring-primary flex min-h-10 w-full min-w-0 cursor-pointer items-center gap-1 transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            alignRight ? 'justify-end' : 'justify-between'
          }`}
          onClick={column.getToggleSortingHandler()}
        >
          <span
            className={
              alignRight ? 'text-right leading-tight' : 'min-w-0 truncate'
            }
          >
            {label}
          </span>
          <span className={alignRight ? 'ml-2 shrink-0' : 'shrink-0'}>
            {{
              asc: <ArrowUp className="ml-1 h-3.5 w-3.5" />,
              desc: <ArrowDown className="ml-1 h-3.5 w-3.5" />,
            }[column.getIsSorted() as string] ?? (
              <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </span>
        </div>
      );
    },
    [table]
  );

  const getColumnLabel = React.useCallback(
    (columnId: string) => {
      const header = table.getColumn(columnId)?.columnDef.header;
      if (typeof header === 'string') return header;
      if (columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX)) {
        if (columnId === TOTAL_GRADED_BAGS_COLUMN_ID) {
          return 'Total Bags After Grading';
        }
        if (columnId === TOTAL_GRADED_NET_WEIGHT_COLUMN_ID) {
          return 'Net Weight After Grading';
        }
        if (columnId === AVG_QUINTAL_PER_ACRE_COLUMN_ID) {
          return 'Average Quintal Per Acre';
        }
        if (columnId === WASTAGE_KG_COLUMN_ID) {
          return 'Wastage (kg)';
        }
        if (columnId === OUTPUT_PERCENTAGE_COLUMN_ID) {
          return 'Output Percentage';
        }
        if (columnId === BUY_BACK_AMOUNT_COLUMN_ID) {
          return 'Buy Back Amount';
        }
        const grade = columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
        return formatContractFarmingGradeColumnLabel(grade);
      }
      if (columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)) {
        const grade = columnId.replace(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX, '');
        return `${formatContractFarmingGradeColumnLabel(grade)} %`;
      }
      return columnId;
    },
    [table]
  );

  const renderLeafResizeHandle = React.useCallback(
    (columnId: string) => {
      const column =
        visibleColumnById.get(columnId) ?? table.getColumn(columnId);
      const header = leafHeaderByColumnId.get(columnId);
      if (!column || !header) return null;
      return (
        <div
          onDoubleClick={(e) => {
            e.preventDefault();
            column.resetSize();
          }}
          onMouseDown={(e) => {
            header.getResizeHandler()(e);
          }}
          onTouchStart={(e) => {
            header.getResizeHandler()(e);
          }}
          role="presentation"
          onClick={(event) => event.stopPropagation()}
          className="hover:bg-primary/25 absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none bg-transparent transition-colors select-none"
          style={{
            transform:
              columnResizeMode === 'onEnd' && column.getIsResizing()
                ? `translateX(${
                    (columnResizeDirection === 'rtl' ? -1 : 1) *
                    (table.getState().columnSizingInfo.deltaOffset ?? 0)
                  }px)`
                : '',
          }}
        />
      );
    },
    [
      columnResizeDirection,
      columnResizeMode,
      leafHeaderByColumnId,
      table,
      visibleColumnById,
    ]
  );

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-4">
        <Item
          variant="outline"
          size="sm"
          className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
        >
          <div className="flex w-full flex-wrap items-end gap-3 lg:flex-nowrap">
            <div className="ml-auto flex items-center gap-2 self-end">
              <div className="relative min-w-[160px] lg:w-[220px]">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  value={typeof globalFilter === 'string' ? globalFilter : ''}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  placeholder="Search table..."
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
                onClick={() => setIsViewFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                View Filters
              </Button>
              <Button
                variant="default"
                className="h-8 rounded-lg px-4 text-sm leading-none"
              >
                <FileText className="h-3.5 w-3.5" />
                Pdf
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground h-8 rounded-lg px-2 leading-none"
                aria-label="Refresh"
                onClick={() => void refetch()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </Item>

        {isError ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {(error as Error)?.message || 'Failed to fetch report data.'}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            Showing farmer, variety, seed, buy-back and grading details from the
            contract-farming report API.
          </p>
        )}

        <div
          className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
          style={{
            direction: columnResizeDirection,
            position: 'relative',
          }}
        >
          {isLoading ? (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-8 gap-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton
                    key={`contract-farming-header-skeleton-${index}`}
                    className="h-8 w-full rounded-md"
                  />
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <div
                    key={`contract-farming-row-skeleton-${rowIndex}`}
                    className="grid grid-cols-8 gap-2"
                  >
                    {Array.from({ length: 8 }).map((_, columnIndex) => (
                      <Skeleton
                        key={`contract-farming-cell-skeleton-${rowIndex}-${columnIndex}`}
                        className="h-7 w-full rounded-md"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <table className="font-custom min-w-full border-collapse text-sm">
              <thead className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm">
                <tr>
                  {visibleLeadingNonBuyBackBaseColumnIds.map((columnId) => {
                    const column = visibleColumnById.get(columnId);
                    if (!column) return null;
                    return (
                      <th
                        key={columnId}
                        rowSpan={2}
                        className={`${CF_HEADER_CELL_CLASS} relative`}
                        style={{
                          width: column.getSize(),
                          minWidth: column.getSize(),
                        }}
                      >
                        {renderLeafSortHeader(
                          columnId,
                          getColumnLabel(columnId)
                        )}
                        {renderLeafResizeHandle(columnId)}
                      </th>
                    );
                  })}
                  {hasVisibleBuyBack ? (
                    <th
                      colSpan={visibleBuyBackColumnIds.length}
                      className={`${CF_HEADER_CELL_CLASS} bg-green-50`}
                    >
                      Buy back
                    </th>
                  ) : null}
                  <th
                    colSpan={
                      visibleGradeColumnIds.length +
                      (hasNoGradesPlaceholder ? 1 : 0)
                    }
                    className={CF_HEADER_CELL_CLASS}
                  >
                    Grading
                  </th>
                  {TRAILING_TWO_ROW_HEADER_COLUMN_IDS.map((columnId) => {
                    const col = visibleColumnById.get(columnId);
                    if (!col) return null;
                    const w = col.getSize();
                    return (
                      <th
                        key={columnId}
                        rowSpan={2}
                        className={`${CF_HEADER_CELL_CLASS} relative`}
                        style={{
                          width: w,
                          minWidth: w,
                        }}
                      >
                        {renderLeafSortHeader(
                          columnId,
                          getColumnLabel(columnId)
                        )}
                        {renderLeafResizeHandle(columnId)}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {visibleBuyBackColumnIds.map((columnId) => {
                    const column = visibleColumnById.get(columnId);
                    if (!column) return null;
                    return (
                      <th
                        key={columnId}
                        className={`${CF_HEADER_CELL_CLASS} relative bg-green-50`}
                        style={{
                          width: column.getSize(),
                          minWidth: column.getSize(),
                        }}
                      >
                        {renderLeafSortHeader(
                          columnId,
                          getColumnLabel(columnId)
                        )}
                        {renderLeafResizeHandle(columnId)}
                      </th>
                    );
                  })}
                  {visibleGradeColumnIds.map((columnId) => {
                    const column = visibleColumnById.get(columnId);
                    if (!column) return null;
                    if (columnId === TOTAL_GRADED_BAGS_COLUMN_ID) {
                      return (
                        <th
                          key={columnId}
                          className={`${CF_HEADER_CELL_CLASS} relative`}
                          style={{
                            width: column.getSize(),
                            minWidth: column.getSize(),
                          }}
                        >
                          {renderLeafSortHeader(
                            columnId,
                            'Total Bags After Grading'
                          )}
                          {renderLeafResizeHandle(columnId)}
                        </th>
                      );
                    }
                    if (columnId === TOTAL_GRADED_NET_WEIGHT_COLUMN_ID) {
                      return (
                        <th
                          key={columnId}
                          className={`${CF_HEADER_CELL_CLASS} relative`}
                          style={{
                            width: column.getSize(),
                            minWidth: column.getSize(),
                          }}
                        >
                          {renderLeafSortHeader(
                            columnId,
                            'Net Weight After Grading'
                          )}
                          {renderLeafResizeHandle(columnId)}
                        </th>
                      );
                    }
                    if (columnId === AVG_QUINTAL_PER_ACRE_COLUMN_ID) {
                      return (
                        <th
                          key={columnId}
                          className={`${CF_HEADER_CELL_CLASS} relative`}
                          style={{
                            width: column.getSize(),
                            minWidth: column.getSize(),
                          }}
                        >
                          {renderLeafSortHeader(
                            columnId,
                            'Average Quintal Per Acre'
                          )}
                          {renderLeafResizeHandle(columnId)}
                        </th>
                      );
                    }
                    if (columnId === WASTAGE_KG_COLUMN_ID) {
                      return (
                        <th
                          key={columnId}
                          className={`${CF_HEADER_CELL_CLASS} relative`}
                          style={{
                            width: column.getSize(),
                            minWidth: column.getSize(),
                          }}
                        >
                          {renderLeafSortHeader(columnId, 'Wastage (kg)')}
                          {renderLeafResizeHandle(columnId)}
                        </th>
                      );
                    }
                    if (columnId === OUTPUT_PERCENTAGE_COLUMN_ID) {
                      return (
                        <th
                          key={columnId}
                          className={`${CF_HEADER_CELL_CLASS} relative`}
                          style={{
                            width: column.getSize(),
                            minWidth: column.getSize(),
                          }}
                        >
                          {renderLeafSortHeader(
                            columnId,
                            <span className="block leading-tight">
                              Output Percentage
                              <br />
                              <span className="text-muted-foreground text-[10px] font-normal tracking-normal normal-case">
                                (%)
                              </span>
                            </span>
                          )}
                          {renderLeafResizeHandle(columnId)}
                        </th>
                      );
                    }
                    if (columnId === BUY_BACK_AMOUNT_COLUMN_ID) {
                      return (
                        <th
                          key={columnId}
                          className={`${CF_HEADER_CELL_CLASS} relative`}
                          style={{
                            width: column.getSize(),
                            minWidth: column.getSize(),
                          }}
                        >
                          {renderLeafSortHeader(columnId, 'Buy Back Amount')}
                          {renderLeafResizeHandle(columnId)}
                        </th>
                      );
                    }
                    const isPercentColumn = columnId.startsWith(
                      VARIETY_LEVEL_PERCENT_COLUMN_PREFIX
                    );
                    const grade = isPercentColumn
                      ? columnId.replace(
                          VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
                          ''
                        )
                      : columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
                    const headerContent = isContractFarmingCutGrade(grade) ? (
                      <span className="block leading-tight">Cut</span>
                    ) : (
                      <span className="block leading-tight">
                        {grade}
                        <br />
                        <span className="text-muted-foreground text-[10px] font-normal tracking-normal normal-case">
                          {isPercentColumn ? '(%)' : '(MM)'}
                        </span>
                      </span>
                    );
                    return (
                      <th
                        key={columnId}
                        className={`${CF_HEADER_CELL_CLASS} relative`}
                        style={{
                          width: column.getSize(),
                          minWidth: column.getSize(),
                        }}
                      >
                        {renderLeafSortHeader(columnId, headerContent)}
                        {renderLeafResizeHandle(columnId)}
                      </th>
                    );
                  })}
                  {hasNoGradesPlaceholder ? (
                    <th className={CF_HEADER_CELL_CLASS}>No grades</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {renderedRows.length > 0 ? (
                  renderedRows.map((row, rowIndex) => (
                    <ContractFarmingReportBodyRow
                      key={row.rowId}
                      row={row}
                      rowIndex={rowIndex}
                      visibleColumnIds={visibleColumnIds}
                      visibleColumnById={visibleColumnById}
                    />
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={totalColumns}
                      className="text-muted-foreground h-24 text-center"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
                {footerCells ? (
                  <tr className="bg-muted/45 border-border/70 border-t-2">
                    {visibleColumnIds.map((columnId) => {
                      const column = visibleColumnById.get(columnId);
                      if (!column) return null;
                      const w = column.getSize();
                      const text = footerCells[columnId] ?? '';
                      const alignRight = isNumericSortColumnId(columnId);
                      const buyBackCell = BUY_BACK_COLUMN_IDS.has(columnId);
                      return (
                        <td
                          key={`cf-footer-${columnId}`}
                          className={`${CF_BODY_CELL_CLASS} text-foreground font-custom font-semibold ${
                            alignRight ? 'text-right tabular-nums' : ''
                          } ${buyBackCell ? 'bg-green-50' : ''} ${
                            columnId === 'noGrades'
                              ? 'text-center font-medium'
                              : ''
                          }`}
                          style={{ width: w, minWidth: w }}
                        >
                          {text}
                        </td>
                      );
                    })}
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ContractFarmingViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={setIsViewFiltersOpen}
        table={table}
        defaultColumnOrder={defaultColumnOrder}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
        rowSpanGrouping={rowSpanGrouping}
        onRowSpanGroupingChange={setRowSpanGrouping}
      />
    </main>
  );
};

export default ContractFarmingReportTable;
