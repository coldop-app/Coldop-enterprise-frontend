import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type ExpandedState,
  type GroupingState,
  type Row as TanStackRow,
  type SortingState,
  type VisibilityState,
  type Updater,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { FileText, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { Item } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGetContractFarmingReport } from '@/services/store-admin/general/useGetContractFarmingReport';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import {
  buildGradeHeaders,
  flattenRows,
  normalizeReportData,
} from './contract-farming-report-calculations';
import {
  buildColumns,
  buildContractFarmingGradingLeafColumnIds,
  BUY_BACK_COLUMN_IDS,
  CONTRACT_FARMING_GRADING_COLUMN_LAYOUT_VERSION,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  SEED_AMOUNT_COLUMN_ID,
  TRAILING_TWO_ROW_HEADER_ID_SET,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
} from './columns';
import type { FlattenedRow } from './types';
import { formatContractFarmingFooterRow } from './contract-farming-footer-totals';
import { ContractFarmingReportDataTable } from './contract-farming-report-data-table';
import { ContractFarmingViewFiltersSheet } from './view-filters-sheet/index';
import { usePreferencesStore } from '@/stores/store';

type GlobalFilterValue = string | FilterGroupNode;

/** Stable row-model factories — avoid recreating on every render (TanStack Table docs). */
const CF_GET_CORE_ROW_MODEL = getCoreRowModel();
const CF_GET_FILTERED_ROW_MODEL = getFilteredRowModel();
const CF_GET_SORTED_ROW_MODEL = getSortedRowModel();
const CF_GET_GROUPED_ROW_MODEL = getGroupedRowModel();
const CF_GET_EXPANDED_ROW_MODEL = getExpandedRowModel();

const CF_TABLE_DEFAULT_COLUMN = {
  size: 130,
  minSize: 90,
  maxSize: 550,
} as const;

const CF_TABLE_INITIAL_STATE = {
  columnVisibility: { farmerMobile: false },
} as const;

function cfGetRowId(row: FlattenedRow): string {
  return row.rowId;
}

/**
 * Pairs (base, decimal) where both accounts exist (e.g. 68 and 68.1 shown as (#68) / (#68.1)).
 */
function cfFindAccountFamilyPairs(
  accountNumbers: ReadonlyArray<number>
): Array<{ base: number; decimal: number }> {
  const unique = [...new Set(accountNumbers)];
  const set = new Set(unique);
  const pairs: Array<{ base: number; decimal: number }> = [];
  for (const acct of unique) {
    if (Number.isInteger(acct)) continue;
    const base = Math.trunc(acct);
    if (set.has(base)) {
      pairs.push({ base, decimal: acct });
    }
  }
  pairs.sort((a, b) => a.base - b.base || a.decimal - b.decimal);
  return pairs;
}

function cfBuildAccountFamilies(
  accountNumbers: ReadonlyArray<number>
): Record<number, number[]> {
  const pairs = cfFindAccountFamilyPairs(accountNumbers);
  const grouped = pairs.reduce<Record<number, number[]>>((acc, pair) => {
    const existing = acc[pair.base];
    if (existing) {
      existing.push(pair.decimal);
    } else {
      acc[pair.base] = [pair.decimal];
    }
    return acc;
  }, {});

  for (const base of Object.keys(grouped)) {
    grouped[Number(base)].sort((a, b) => a - b);
  }

  return grouped;
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
    o.address,
    o.mobileNumber,
    o.varietyName,
    o.generation,
    o.sizeName,
    String(o.accountNumber),
  ];
  return values.some((value) => value.toLowerCase().includes(query));
}

const ContractFarmingReportTable = () => {
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [isClubFamiliesMode, setIsClubFamiliesMode] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({ farmerMobile: false });
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [grouping, setGrouping] = React.useState<GroupingState>([
    'farmer',
    'variety',
  ]);
  const [expanded, setExpanded] = React.useState<ExpandedState>(true);
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
    () => flattenRows(report.farmers, gradeHeaders),
    [report.farmers, gradeHeaders]
  );
  const clubFamilyBaseSet = React.useMemo(() => {
    const families = cfBuildAccountFamilies(
      flattenedRows.map((row) => row.accountNumber)
    );
    return new Set(
      Object.keys(families)
        .map(Number)
        .filter((base) => families[base].length > 0)
    );
  }, [flattenedRows]);
  const clubFamilyNamesByBase = React.useMemo(() => {
    const map: Record<number, string[]> = {};
    flattenedRows.forEach((row) => {
      const base = Math.trunc(row.accountNumber);
      if (!clubFamilyBaseSet.has(base)) return;
      const existing = map[base];
      if (!existing) {
        map[base] = [row.farmerName];
        return;
      }
      if (!existing.includes(row.farmerName)) {
        existing.push(row.farmerName);
      }
    });
    return map;
  }, [clubFamilyBaseSet, flattenedRows]);
  const clubbedRows = React.useMemo(() => {
    if (!isClubFamiliesMode) return flattenedRows;

    const families = cfBuildAccountFamilies(
      flattenedRows.map((row) => row.accountNumber)
    );
    if (clubFamilyBaseSet.size === 0) return flattenedRows;

    return flattenedRows.map((row) => {
      const base = Math.trunc(row.accountNumber);
      if (!clubFamilyBaseSet.has(base)) {
        return row;
      }

      const familyAccounts = [base, ...families[base]]
        .filter((account, idx, arr) => arr.indexOf(account) === idx)
        .sort((a, b) => a - b);

      return {
        ...row,
        farmerName: `Family ${base} (${familyAccounts.join(', ')})`,
        clubbedFarmerNames: clubFamilyNamesByBase[base] ?? [],
        accountNumber: base,
        farmerAccount: base,
      };
    });
  }, [
    clubFamilyBaseSet,
    clubFamilyNamesByBase,
    flattenedRows,
    isClubFamiliesMode,
  ]);
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

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table
  const table = useReactTable<FlattenedRow>({
    data: clubbedRows,
    columns,
    initialState: CF_TABLE_INITIAL_STATE,
    defaultColumn: CF_TABLE_DEFAULT_COLUMN,
    state: {
      sorting,
      globalFilter: effectiveGlobalFilter,
      columnFilters,
      columnVisibility,
      columnOrder: effectiveColumnOrder,
      grouping,
      expanded,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
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
    getGroupedRowModel: CF_GET_GROUPED_ROW_MODEL,
    getExpandedRowModel: CF_GET_EXPANDED_ROW_MODEL,
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

  const handleClubFamiliesClick = React.useCallback(() => {
    setIsClubFamiliesMode((prev) => !prev);
  }, []);

  React.useEffect(() => {
    if (isClubFamiliesMode) {
      setGrouping(['farmer', 'variety']);
      setExpanded({});
      return;
    }

    setExpanded(true);
  }, [isClubFamiliesMode]);

  const footerLeafOriginals = table
    .getFilteredRowModel()
    .flatRows.filter((r) => !r.getIsGrouped())
    .map((r) => r.original);

  const footerCells =
    footerLeafOriginals.length > 0
      ? formatContractFarmingFooterRow(footerLeafOriginals, visibleColumnIds)
      : null;
  const totalColumns = Math.max(visibleColumnIds.length, 1);

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
                variant="outline"
                className={`h-8 rounded-lg px-4 text-sm leading-none ${
                  isClubFamiliesMode
                    ? 'border-yellow-300 bg-yellow-100/70 text-yellow-900 hover:bg-yellow-100'
                    : ''
                }`}
                onClick={handleClubFamiliesClick}
              >
                {isClubFamiliesMode ? 'Unclub Families' : 'Club Families'}
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

        <ContractFarmingReportDataTable
          table={table}
          rows={table.getRowModel().rows}
          visibleColumnById={visibleColumnById}
          visibleColumnIds={visibleColumnIds}
          visibleLeadingNonBuyBackBaseColumnIds={
            visibleLeadingNonBuyBackBaseColumnIds
          }
          visibleBuyBackColumnIds={visibleBuyBackColumnIds}
          visibleGradeColumnIds={visibleGradeColumnIds}
          hasNoGradesPlaceholder={hasNoGradesPlaceholder}
          hasVisibleBuyBack={hasVisibleBuyBack}
          leafHeaderByColumnId={leafHeaderByColumnId}
          footerCells={footerCells}
          totalColumns={totalColumns}
          isLoading={isLoading}
          isClubFamiliesMode={isClubFamiliesMode}
          clubFamilyBaseSet={clubFamilyBaseSet}
          columnResizeMode={columnResizeMode}
          columnResizeDirection={columnResizeDirection}
        />
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
        onGroupingChange={setGrouping}
      />
    </main>
  );
};

export default ContractFarmingReportTable;
