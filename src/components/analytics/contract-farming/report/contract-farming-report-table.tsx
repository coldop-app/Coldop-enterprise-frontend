import * as React from 'react';
import {
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type GroupingState,
  type SortingState,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  type VisibilityState,
  useReactTable,
} from '@tanstack/react-table';
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { Item } from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type ContractFarmingReportFarmer,
  useGetContractFarmingReport,
} from '@/services/store-admin/general/useGetContractFarmingReport';
import { useStore } from '@/stores/store';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import {
  getAverageQuintalPerAcre,
  getBuyBackAmountFromGradeData,
  getGradeWeightPercent,
  getNetAmountPerAcreRupee,
  getNetAmountRupee,
  getOutputPercentage,
  getTotalGradeBags,
  getTotalGradeNetWeightKg,
  getWastageKg,
} from './contract-farming-report-calculations';
import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
  WASTAGE_KG_COLUMN_ID,
  buildColumns,
  buildDefaultContractFarmingColumnOrder,
  defaultContractFarmingColumnVisibility,
  isNumericSortColumnId,
} from './columns';
import { ContractFarmingReportDataTable } from './contract-farming-report-data-table';
import { GRADE_BAG_COLUMN_KEY_PREFIX, type FlattenedRow } from './types';
import { ContractFarmingViewFiltersSheet } from './view-filters-sheet';

const DEFAULT_COLUMN_SIZE = 170;
const DEFAULT_COLUMN_MIN_SIZE = 120;
const DEFAULT_COLUMN_MAX_SIZE = 550;
const WHOLE_NUMBER_TOTAL_COLUMN_IDS = new Set<string>([
  'qty',
  'bbBags',
  TOTAL_GRADED_BAGS_COLUMN_ID,
]);

type GlobalFilterValue = string | FilterGroupNode;

function getGradeHeaders(farmers: ContractFarmingReportFarmer[]): string[] {
  const gradeSet = new Set<string>();
  farmers.forEach((farmer) => {
    farmer.varieties.forEach((variety) => {
      Object.keys(variety.grading ?? {}).forEach((grade) =>
        gradeSet.add(grade)
      );
    });
  });
  return Array.from(gradeSet).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function buildFamilyKeyByAccountBase(
  farmers: ContractFarmingReportFarmer[]
): Map<number, number> {
  const uniqueAccountNumbers = Array.from(
    new Set(farmers.map((farmer) => Number(farmer.accountNumber)))
  );
  const familiesByBase = new Map<
    number,
    { hasWhole: boolean; hasDecimal: boolean }
  >();

  uniqueAccountNumbers.forEach((accountNumber) => {
    const base = Math.trunc(accountNumber);
    const current = familiesByBase.get(base) ?? {
      hasWhole: false,
      hasDecimal: false,
    };
    const isWhole = Number.isInteger(accountNumber);
    familiesByBase.set(base, {
      hasWhole: current.hasWhole || isWhole,
      hasDecimal: current.hasDecimal || !isWhole,
    });
  });

  const groupedBases = Array.from(familiesByBase.entries())
    .filter(([, stats]) => stats.hasWhole && stats.hasDecimal)
    .map(([base]) => base)
    .sort((a, b) => a - b);

  const familyKeyByBase = new Map<number, number>();
  groupedBases.forEach((base, index) => {
    familyKeyByBase.set(base, index + 1);
  });
  return familyKeyByBase;
}

function flattenFarmers(
  farmers: ContractFarmingReportFarmer[],
  gradeHeaders: string[]
): FlattenedRow[] {
  const rows: FlattenedRow[] = [];
  const familyKeyByBase = buildFamilyKeyByAccountBase(farmers);

  farmers.forEach((farmer) => {
    farmer.varieties.forEach((variety) => {
      const gradeData = Object.fromEntries(
        Object.entries(variety.grading ?? {}).map(([grade, value]) => [
          grade,
          {
            bags: Number(value?.bags ?? 0),
            netWeightKg: Number(value?.netWeightKg ?? 0),
          },
        ])
      );

      const sizeRows =
        Array.isArray(variety.seed?.sizes) && variety.seed.sizes.length > 0
          ? variety.seed.sizes
          : [null];

      sizeRows.forEach((size, sizeIndex) => {
        const row: FlattenedRow = {
          rowId: `${farmer.id}-${variety.name}-${size?.name ?? 'no-size'}-${sizeIndex}`,
          familyKey:
            familyKeyByBase.get(Math.trunc(Number(farmer.accountNumber))) ?? 0,
          farmerName: farmer.name,
          mobileNumber: farmer.mobileNumber,
          farmerMobile: farmer.mobileNumber,
          accountNumber: Number(farmer.accountNumber),
          farmerAccount: Number(farmer.accountNumber),
          address: farmer.address,
          farmerAddress: farmer.address,
          varietyName: variety.name,
          generation: variety.seed?.generation ?? '-',
          sizeName: size?.name ?? 'N/A',
          sizeQuantity: Number(size?.quantity ?? 0),
          sizeAcres: Number(size?.acres ?? 0),
          sizeAmountPayable: Number(size?.amountPayable ?? 0),
          sizeAmount: Number(size?.amountPayable ?? 0),
          buyBackBags: Number(variety.buyBack?.bags ?? 0),
          buyBackNetWeightKg: Number(variety.buyBack?.netWeightKg ?? 0),
          incomingNetWeightKg: variety.incomingNetWeightKg ?? null,
          gradeData,
          varietyTotalAcres: Number(variety.seed?.totalAcres ?? 0),
          varietyTotalSeedAmountPayable: Number(
            variety.seed?.totalAmountPayable ?? 0
          ),
        };

        gradeHeaders.forEach((grade) => {
          const key = `${GRADE_BAG_COLUMN_KEY_PREFIX}${grade}` as const;
          const gradeEntry = gradeData[grade];
          row[key] = gradeEntry ? gradeEntry.bags : null;
        });

        rows.push(row);
      });
    });
  });

  return rows;
}

const globalContractFarmingFilterFn = (
  row: { original: FlattenedRow },
  _columnId: string,
  filterValue: GlobalFilterValue
) => {
  if (isAdvancedFilterGroup(filterValue)) {
    const rowRecord: Record<string, unknown> = {
      ...row.original,
      familyKey: row.original.familyKey ?? 0,
      farmer: row.original.farmerName,
      accountNumber: row.original.accountNumber,
      address: row.original.address,
      variety: row.original.varietyName,
      size: row.original.sizeName,
      qty: row.original.sizeQuantity,
      acres: row.original.sizeAcres,
      bbBags: row.original.buyBackBags,
      bbNetWeight: row.original.buyBackNetWeightKg,
      amount: row.original.sizeAmountPayable,
      [TOTAL_GRADED_BAGS_COLUMN_ID]: getTotalGradeBags(row.original),
      [TOTAL_GRADED_NET_WEIGHT_COLUMN_ID]: getTotalGradeNetWeightKg(
        row.original
      ),
      [AVG_QUINTAL_PER_ACRE_COLUMN_ID]: getAverageQuintalPerAcre(row.original),
      [WASTAGE_KG_COLUMN_ID]: getWastageKg(row.original),
      [OUTPUT_PERCENTAGE_COLUMN_ID]: getOutputPercentage(row.original),
      [BUY_BACK_AMOUNT_COLUMN_ID]: getBuyBackAmountFromGradeData(row.original),
      [NET_AMOUNT_COLUMN_ID]: getNetAmountRupee(row.original),
      [NET_AMOUNT_PER_ACRE_COLUMN_ID]: getNetAmountPerAcreRupee(row.original),
    };

    Object.entries(row.original.gradeData ?? {}).forEach(([grade, value]) => {
      const bagsKey = `${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`;
      const pctKey = `${VARIETY_LEVEL_PERCENT_COLUMN_PREFIX}${grade}`;
      rowRecord[bagsKey] = Number(value?.bags ?? 0);
      rowRecord[pctKey] = getGradeWeightPercent(row.original, grade);
    });

    return evaluateFilterGroup(rowRecord, filterValue);
  }
  const term = String(filterValue ?? '')
    .trim()
    .toLowerCase();
  if (!term) return true;
  return (
    row.original.farmerName.toLowerCase().includes(term) ||
    String(row.original.accountNumber).toLowerCase().includes(term) ||
    row.original.varietyName.toLowerCase().includes(term)
  );
};

export default function ContractFarmingReportTable() {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );

  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultContractFarmingColumnVisibility);
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState<GlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    React.useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    React.useState<ColumnResizeDirection>('ltr');

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetContractFarmingReport();

  const farmers = data?.farmers ?? [];
  const gradeHeaders = React.useMemo(() => {
    const fromApi = data?.meta?.allGrades ?? [];
    const fromRows = getGradeHeaders(farmers);
    const all = new Set<string>([...fromApi, ...fromRows]);
    return Array.from(all).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [data?.meta?.allGrades, farmers]);

  const columns = React.useMemo(
    () => buildColumns(gradeHeaders),
    [gradeHeaders]
  );
  const defaultColumnOrder = React.useMemo(
    () => buildDefaultContractFarmingColumnOrder(gradeHeaders),
    [gradeHeaders]
  );

  React.useEffect(() => {
    if (columnOrder.length > 0) return;
    setColumnOrder(defaultColumnOrder);
  }, [columnOrder.length, defaultColumnOrder]);

  const flattenedData = React.useMemo(
    () => flattenFarmers(farmers, gradeHeaders),
    [farmers, gradeHeaders]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<FlattenedRow>({
    data: flattenedData,
    columns,
    defaultColumn: {
      size: DEFAULT_COLUMN_SIZE,
      minSize: DEFAULT_COLUMN_MIN_SIZE,
      maxSize: DEFAULT_COLUMN_MAX_SIZE,
    },
    state: {
      sorting,
      columnVisibility,
      columnOrder,
      columnFilters,
      grouping,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onGroupingChange: setGrouping,
    onGlobalFilterChange: setGlobalFilter,
    columnResizeMode,
    columnResizeDirection,
    globalFilterFn: globalContractFarmingFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.rowId,
  });

  const rows = table.getRowModel().rows;
  const filteredRows = table.getFilteredRowModel().rows;
  const visibleColumnIds = React.useMemo(
    () => table.getVisibleLeafColumns().map((column) => column.id),
    [table]
  );

  const totalsByColumn = React.useMemo(() => {
    const totals: Record<string, number> = {};
    const numericVisibleColumnIds = visibleColumnIds.filter((columnId) =>
      isNumericSortColumnId(columnId)
    );

    numericVisibleColumnIds.forEach((columnId) => {
      totals[columnId] = 0;
    });

    for (const row of filteredRows) {
      for (const columnId of numericVisibleColumnIds) {
        const raw = row.getValue(columnId);
        const value = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(value)) {
          totals[columnId] += value;
        }
      }
    }

    return totals;
  }, [filteredRows, visibleColumnIds]);

  const hasVisibleNumericTotals = React.useMemo(
    () => visibleColumnIds.some((columnId) => isNumericSortColumnId(columnId)),
    [visibleColumnIds]
  );

  const formatTotal = React.useCallback((columnId: string, value: number) => {
    const decimals = WHOLE_NUMBER_TOTAL_COLUMN_IDS.has(columnId) ? 0 : 2;
    const formatted = value.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    if (
      columnId === 'amount' ||
      columnId === BUY_BACK_AMOUNT_COLUMN_ID ||
      columnId === NET_AMOUNT_COLUMN_ID ||
      columnId === NET_AMOUNT_PER_ACRE_COLUMN_ID
    ) {
      return `₹${formatted}`;
    }
    if (
      columnId === OUTPUT_PERCENTAGE_COLUMN_ID ||
      columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)
    ) {
      return `${formatted}%`;
    }
    return formatted;
  }, []);

  return (
    <>
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <div className="mb-3">
          <h1 className="font-custom text-2xl font-bold tracking-tight">
            {coldStorageName} Contract Farming
          </h1>
        </div>
        <div className="space-y-4">
          <Item
            variant="outline"
            size="sm"
            className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
          >
            <div className="flex w-full flex-wrap items-end gap-2.5 xl:flex-nowrap">
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2 self-end">
                <div className="relative w-[170px] sm:w-[220px]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    value={typeof globalFilter === 'string' ? globalFilter : ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="Search farmer / account / variety…"
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
                  variant="ghost"
                  className="text-muted-foreground h-8 w-8 rounded-lg p-0 leading-none"
                  disabled={isFetching}
                  onClick={() => refetch()}
                  aria-label="Refresh"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                  />
                </Button>
              </div>
            </div>
          </Item>

          {isError && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error instanceof Error
                ? error.message
                : 'Failed to load contract farming report'}
            </p>
          )}

          <ContractFarmingReportDataTable
            table={table}
            rows={rows}
            visibleColumnIds={visibleColumnIds}
            hasVisibleNumericTotals={hasVisibleNumericTotals}
            totalsByColumn={totalsByColumn}
            formatTotal={formatTotal}
            isLoading={isLoading}
          />
        </div>
      </main>

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
    </>
  );
}
