import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type GroupingState,
  type SortingState,
  type VisibilityState,
  createColumnHelper,
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
import {
  useGetContractFarmingReport,
  type ContractFarmingReportData,
  type ContractFarmingReportFarmer,
} from '@/services/store-admin/general/useGetContractFarmingReport';
import {
  evaluateFilterGroup,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import type { FlattenedRow } from './types';
import { ContractFarmingViewFiltersSheet } from './view-filters-sheet/index';
import {
  buildContractFarmingFilterableColumns,
  FILTER_VARIETY_LEVEL_PREFIX,
  formatContractFarmingGradeColumnLabel,
  isContractFarmingCutGrade,
} from './view-filters-sheet/constants';

const multiValueFilterFn = (
  row: { getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: string[] | string
) => {
  const raw = row.getValue(columnId);
  const cellValue = raw === null || raw === undefined ? '' : String(raw);
  if (typeof filterValue === 'string') {
    const normalized = filterValue.trim().toLowerCase();
    if (!normalized) return true;
    return cellValue.toLowerCase().includes(normalized);
  }
  if (!Array.isArray(filterValue)) return true;
  if (filterValue.length === 0) return true;
  return filterValue.includes(cellValue);
};

type RenderRow = FlattenedRow & {
  isFirstFarmerRow: boolean;
  isFirstVarietyRow: boolean;
  isFarmerBlockStart: boolean;
  isVarietyBlockStart: boolean;
  farmerRowSpan: number;
  varietyRowSpan: number;
};

type GroupingOptions = {
  groupByFarmer: boolean;
  groupByVariety: boolean;
};

const BAG_SIZE_DISPLAY_ORDER = [
  'Below 25',
  '25–30',
  'Below 30',
  '30–35',
  '30–40',
  '35–40',
  'Below 40',
  '40–45',
  '40-50',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Below 40 (mm)',
  'Above 50 (mm)',
  'Cut',
] as const;

function normalizeRangeLabel(label: string) {
  return label.replace(/-/g, '–').toLowerCase().trim();
}

const BAG_SIZE_ORDER_INDEX = new Map<string, number>(
  BAG_SIZE_DISPLAY_ORDER.map((size, index) => [
    normalizeRangeLabel(size),
    index,
  ])
);

const BELOW_40_GRADE_VALUES = new Set([
  normalizeRangeLabel('Below 25'),
  normalizeRangeLabel('25–30'),
  normalizeRangeLabel('Below 30'),
  normalizeRangeLabel('30–35'),
  normalizeRangeLabel('30–40'),
  normalizeRangeLabel('35–40'),
]);

const ABOVE_50_GRADE_VALUES = new Set([
  normalizeRangeLabel('50–55'),
  normalizeRangeLabel('Above 50'),
  normalizeRangeLabel('Above 55'),
]);

const BELOW_40_GROUP_GRADE = 'Below 40';
const ABOVE_50_GROUP_GRADE = 'Above 50';

function toGroupedGrade(grade: string): string {
  const normalized = normalizeRangeLabel(grade);
  if (BELOW_40_GRADE_VALUES.has(normalized)) return BELOW_40_GROUP_GRADE;
  if (ABOVE_50_GRADE_VALUES.has(normalized)) return ABOVE_50_GROUP_GRADE;
  return grade;
}

function getGradeBagCount(
  row: FlattenedRow,
  gradeHeader: string
): number | null {
  if (gradeHeader === BELOW_40_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!BELOW_40_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.bags ?? 0);
      },
      0
    );
    return total;
  }

  if (gradeHeader === ABOVE_50_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!ABOVE_50_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.bags ?? 0);
      },
      0
    );
    return total;
  }

  return row.gradeData[gradeHeader]?.bags ?? null;
}

function getGradeNetWeightKg(
  row: FlattenedRow,
  gradeHeader: string
): number | null {
  if (gradeHeader === BELOW_40_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!BELOW_40_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.netWeightKg ?? 0);
      },
      0
    );
    return total;
  }

  if (gradeHeader === ABOVE_50_GROUP_GRADE) {
    const total = Object.entries(row.gradeData).reduce(
      (sum, [grade, value]) => {
        if (!ABOVE_50_GRADE_VALUES.has(normalizeRangeLabel(grade))) return sum;
        return sum + (value?.netWeightKg ?? 0);
      },
      0
    );
    return total;
  }

  return row.gradeData[gradeHeader]?.netWeightKg ?? null;
}

function getGradeWeightPercent(
  row: FlattenedRow,
  gradeHeader: string
): number | null {
  const totalWeight = Object.values(row.gradeData).reduce(
    (sum, value) => sum + (value?.netWeightKg ?? 0),
    0
  );
  if (totalWeight <= 0) return null;
  const gradeWeight = getGradeNetWeightKg(row, gradeHeader) ?? 0;
  return (gradeWeight / totalWeight) * 100;
}

function getTotalGradeBags(row: FlattenedRow): number | null {
  const total = Object.values(row.gradeData).reduce(
    (sum, value) => sum + (value?.bags ?? 0),
    0
  );
  return total > 0 ? total : null;
}

function getTotalGradeNetWeightKg(row: FlattenedRow): number | null {
  const total = Object.values(row.gradeData).reduce(
    (sum, value) => sum + (value?.netWeightKg ?? 0),
    0
  );
  return total > 0 ? total : null;
}

function getGroupedGradeOrderIndex(grade: string): number | undefined {
  const orderGrade =
    grade === BELOW_40_GROUP_GRADE
      ? 'Below 40'
      : grade === ABOVE_50_GROUP_GRADE
        ? 'Above 50'
        : grade;
  return BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(orderGrade));
}

const columnHelper = createColumnHelper<FlattenedRow>();

const VARIETY_LEVEL_COLUMN_PREFIX = FILTER_VARIETY_LEVEL_PREFIX;
const VARIETY_LEVEL_PERCENT_COLUMN_PREFIX = 'grade_weight_pct_';
const TOTAL_GRADED_BAGS_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__totalAfterGrading`;
const TOTAL_GRADED_NET_WEIGHT_COLUMN_ID = `${VARIETY_LEVEL_COLUMN_PREFIX}__netWeightAfterGrading`;

type GlobalFilterValue = string | FilterGroupNode;
const VARIETY_LEVEL_COLUMN_IDS = new Set(['variety', 'bbBags', 'bbNetWeight']);
const BUY_BACK_COLUMN_IDS = new Set(['bbBags', 'bbNetWeight']);

function isNumericSortColumnId(columnId: string) {
  return (
    columnId === 'qty' ||
    columnId === 'acres' ||
    columnId === 'amount' ||
    BUY_BACK_COLUMN_IDS.has(columnId) ||
    columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX) ||
    columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)
  );
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function normalizeReportData(data: ContractFarmingReportData | undefined) {
  return (
    data ?? {
      farmers: [],
      meta: { allGrades: [], allVarieties: [] },
    }
  );
}

function flattenRows(farmers: ContractFarmingReportFarmer[]): FlattenedRow[] {
  const rows: FlattenedRow[] = [];

  farmers.forEach((farmer, farmerIndex) => {
    const farmerVarieties = farmer.varieties ?? [];

    farmerVarieties.forEach((variety, varietyIndex) => {
      const sizes = variety.seed?.sizes ?? [];
      const normalizedSizes =
        sizes.length > 0
          ? [...sizes].sort((a, b) => {
              const aOrder = BAG_SIZE_ORDER_INDEX.get(
                normalizeRangeLabel(a.name)
              );
              const bOrder = BAG_SIZE_ORDER_INDEX.get(
                normalizeRangeLabel(b.name)
              );

              if (aOrder !== undefined && bOrder !== undefined) {
                return aOrder - bOrder;
              }
              if (aOrder !== undefined) return -1;
              if (bOrder !== undefined) return 1;
              return a.name.localeCompare(b.name);
            })
          : [{ name: '-', quantity: 0, acres: 0, amountPayable: 0 }];

      normalizedSizes.forEach((size, sizeIndex) => {
        rows.push({
          rowId: `${farmer.id}-${variety.name}-${sizeIndex}-${farmerIndex}-${varietyIndex}`,
          farmerName: farmer.name,
          farmerMobile: farmer.mobileNumber,
          farmerAccount: farmer.accountNumber,
          farmerAddress: farmer.address,
          varietyName: variety.name,
          generation: variety.seed?.generation ?? '-',
          sizeName: size.name,
          sizeQuantity: size.quantity,
          sizeAcres: size.acres,
          sizeAmount: size.amountPayable,
          buyBackBags: variety.buyBack?.bags ?? null,
          buyBackNetWeightKg: variety.buyBack?.netWeightKg ?? null,
          gradeData: variety.grading ?? {},
        });
      });
    });
  });

  return rows;
}

function recomputeRowSpans(rows: FlattenedRow[], options: GroupingOptions) {
  const { groupByFarmer, groupByVariety } = options;
  const nextRows: RenderRow[] = rows.map((row) => ({
    ...row,
    isFirstFarmerRow: false,
    isFirstVarietyRow: false,
    isFarmerBlockStart: false,
    isVarietyBlockStart: false,
    farmerRowSpan: 1,
    varietyRowSpan: 1,
  }));

  if (nextRows.length === 0) return nextRows;

  if (groupByFarmer) {
    let farmerStart = 0;
    for (let i = 1; i <= nextRows.length; i += 1) {
      const isBoundary =
        i === nextRows.length ||
        nextRows[i].farmerName !== nextRows[farmerStart].farmerName;
      if (isBoundary) {
        const span = i - farmerStart;
        nextRows[farmerStart].isFirstFarmerRow = true;
        nextRows[farmerStart].isFarmerBlockStart = true;
        nextRows[farmerStart].farmerRowSpan = span;
        farmerStart = i;
      }
    }
  } else {
    nextRows.forEach((row, index) => {
      row.isFirstFarmerRow = true;
      row.isFarmerBlockStart = index === 0;
      row.farmerRowSpan = 1;
    });
  }

  if (groupByVariety) {
    let varietyStart = 0;
    for (let i = 1; i <= nextRows.length; i += 1) {
      const isBoundary =
        i === nextRows.length ||
        nextRows[i].farmerName !== nextRows[varietyStart].farmerName ||
        nextRows[i].varietyName !== nextRows[varietyStart].varietyName;
      if (isBoundary) {
        const span = i - varietyStart;
        nextRows[varietyStart].isFirstVarietyRow = true;
        nextRows[varietyStart].varietyRowSpan = span;
        if (!nextRows[varietyStart].isFirstFarmerRow) {
          nextRows[varietyStart].isVarietyBlockStart = true;
        }
        varietyStart = i;
      }
    }
  } else {
    nextRows.forEach((row) => {
      row.isFirstVarietyRow = true;
      row.varietyRowSpan = 1;
      row.isVarietyBlockStart = false;
    });
  }

  return nextRows;
}

function buildColumns(
  gradeHeaders: string[]
): ColumnDef<FlattenedRow, unknown>[] {
  const baseColumns = [
    columnHelper.accessor('farmerName', {
      id: 'farmer',
      header: 'Farmer',
      sortingFn: 'text',
      size: 240,
      minSize: 180,
      maxSize: 550,
      enableGrouping: true,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('farmerMobile', {
      id: 'farmerMobile',
      header: 'Mobile',
      sortingFn: 'text',
      size: 150,
      minSize: 120,
      maxSize: 320,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('farmerAddress', {
      id: 'address',
      header: 'Address',
      sortingFn: 'text',
      size: 230,
      minSize: 160,
      maxSize: 550,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('varietyName', {
      id: 'variety',
      header: 'Variety',
      sortingFn: 'text',
      size: 150,
      minSize: 120,
      maxSize: 260,
      enableGrouping: true,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('generation', {
      id: 'generation',
      header: 'Stage',
      sortingFn: 'text',
      size: 110,
      minSize: 90,
      maxSize: 180,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('sizeName', {
      id: 'size',
      header: 'Size',
      sortingFn: 'text',
      size: 120,
      minSize: 90,
      maxSize: 220,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('sizeQuantity', {
      id: 'qty',
      header: 'Qty (bags)',
      sortingFn: 'basic',
      size: 120,
      minSize: 100,
      maxSize: 220,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('sizeAcres', {
      id: 'acres',
      header: 'Acres',
      sortingFn: 'basic',
      size: 120,
      minSize: 100,
      maxSize: 220,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.accessor('sizeAmount', {
      id: 'amount',
      header: 'Seed amt (₹)',
      sortingFn: 'basic',
      size: 145,
      minSize: 120,
      maxSize: 260,
      enableGrouping: false,
      filterFn: multiValueFilterFn,
    }),
    columnHelper.group({
      id: 'buyBackGroup',
      header: 'Buy back',
      columns: [
        columnHelper.accessor('buyBackBags', {
          id: 'bbBags',
          header: 'Bags',
          sortingFn: 'basic',
          size: 120,
          minSize: 100,
          maxSize: 220,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
        }),
        columnHelper.accessor('buyBackNetWeightKg', {
          id: 'bbNetWeight',
          header: 'Net wt (kg)',
          sortingFn: 'basic',
          size: 140,
          minSize: 120,
          maxSize: 260,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
        }),
      ],
    }),
  ];

  const gradingColumns = gradeHeaders.length
    ? [
        ...gradeHeaders.map((grade) =>
          columnHelper.accessor((row) => getGradeBagCount(row, grade), {
            id: `${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`,
            header: formatContractFarmingGradeColumnLabel(grade),
            sortingFn: 'basic',
            size: 130,
            minSize: 110,
            maxSize: 260,
            enableGrouping: false,
            filterFn: multiValueFilterFn,
          })
        ),
        columnHelper.accessor((row) => getTotalGradeBags(row), {
          id: TOTAL_GRADED_BAGS_COLUMN_ID,
          header: 'Total Bags After Grading',
          sortingFn: 'basic',
          size: 170,
          minSize: 130,
          maxSize: 280,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
        }),
        columnHelper.accessor((row) => getTotalGradeNetWeightKg(row), {
          id: TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
          header: 'Net Weight After Grading',
          sortingFn: 'basic',
          size: 170,
          minSize: 130,
          maxSize: 280,
          enableGrouping: false,
          filterFn: multiValueFilterFn,
        }),
        ...gradeHeaders.map((grade) =>
          columnHelper.accessor((row) => getGradeWeightPercent(row, grade), {
            id: `${VARIETY_LEVEL_PERCENT_COLUMN_PREFIX}${grade}`,
            header: `${formatContractFarmingGradeColumnLabel(grade)} %`,
            sortingFn: 'basic',
            size: 130,
            minSize: 110,
            maxSize: 260,
            enableGrouping: false,
            filterFn: multiValueFilterFn,
          })
        ),
      ]
    : [
        columnHelper.display({
          id: 'noGrades',
          header: 'No grades',
          enableSorting: false,
          enableGrouping: false,
          size: 130,
          minSize: 110,
          maxSize: 260,
        }),
      ];

  return [
    ...baseColumns,
    columnHelper.group({
      id: 'gradingGroup',
      header: 'Grading',
      columns: gradingColumns,
    }),
  ] as ColumnDef<FlattenedRow, unknown>[];
}

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

  const report = React.useMemo(() => normalizeReportData(data), [data]);
  const gradeHeaders = React.useMemo(
    () =>
      [
        ...new Set(
          [...report.meta.allGrades]
            .sort((a, b) => {
              const aOrder = BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(a));
              const bOrder = BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(b));

              if (aOrder !== undefined && bOrder !== undefined) {
                return aOrder - bOrder;
              }
              if (aOrder !== undefined) return -1;
              if (bOrder !== undefined) return 1;
              return a.localeCompare(b);
            })
            .map((grade) => toGroupedGrade(grade))
        ),
      ].sort((a, b) => {
        const aOrder = getGroupedGradeOrderIndex(a);
        const bOrder = getGroupedGradeOrderIndex(b);

        if (aOrder !== undefined && bOrder !== undefined) {
          return aOrder - bOrder;
        }
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        return a.localeCompare(b);
      }),
    [report.meta.allGrades]
  );
  const flattenedRows = React.useMemo(
    () => flattenRows(report.farmers),
    [report.farmers]
  );
  const columns = React.useMemo(
    () => buildColumns(gradeHeaders),
    [gradeHeaders]
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
      'amount',
      'bbBags',
      'bbNetWeight',
      ...gradeHeaders.map((grade) => `${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`),
      TOTAL_GRADED_BAGS_COLUMN_ID,
      TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
      ...gradeHeaders.map(
        (grade) => `${VARIETY_LEVEL_PERCENT_COLUMN_PREFIX}${grade}`
      ),
    ],
    [gradeHeaders]
  );

  const filterableColumns = React.useMemo(
    () => buildContractFarmingFilterableColumns(gradeHeaders),
    [gradeHeaders]
  );
  const deferredGlobalFilter = React.useDeferredValue(
    typeof globalFilter === 'string' ? globalFilter : ''
  );
  const effectiveGlobalFilter: GlobalFilterValue =
    typeof globalFilter === 'string' ? deferredGlobalFilter : globalFilter;

  React.useEffect(() => {
    setColumnOrder((current) => {
      if (current.length === 0) return defaultColumnOrder;
      const preserved = current.filter((id) => defaultColumnOrder.includes(id));
      const missing = defaultColumnOrder.filter(
        (id) => !preserved.includes(id)
      );
      return [...preserved, ...missing];
    });
  }, [defaultColumnOrder]);

  const table = useReactTable({
    data: flattenedRows,
    columns,
    initialState: {
      columnVisibility: { farmerMobile: false },
    },
    defaultColumn: {
      size: 130,
      minSize: 90,
      maxSize: 550,
    },
    state: {
      sorting,
      globalFilter: effectiveGlobalFilter,
      columnFilters,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    enableColumnResizing: true,
    columnResizeMode,
    columnResizeDirection,
    getRowId: (row) => row.rowId,
    globalFilterFn: (row, _columnId, filterValue: GlobalFilterValue) => {
      if (isAdvancedFilterGroup(filterValue)) {
        return evaluateFilterGroup(row.original, filterValue);
      }
      const query = String(filterValue ?? '')
        .trim()
        .toLowerCase();
      if (!query) return true;

      const values = [
        row.original.farmerName,
        row.original.farmerAddress,
        row.original.farmerMobile,
        row.original.varietyName,
        row.original.generation,
        row.original.sizeName,
        String(row.original.farmerAccount),
      ];
      return values.some((value) => value.toLowerCase().includes(query));
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleColumns = table.getVisibleLeafColumns();
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
    [table]
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
  const hasNoGradesPlaceholder = visibleColumnIds.includes('noGrades');
  const hasVisibleBuyBack = visibleBaseColumnIds.some((id) =>
    BUY_BACK_COLUMN_IDS.has(id)
  );
  // Do not memoize against `table` alone — `useReactTable` keeps a stable instance while
  // row model updates; a single memo([table]) would stick to the initial empty snapshot.
  const dataRows = table.getSortedRowModel().rows.map((row) => row.original);
  const renderedRows = recomputeRowSpans(dataRows, {
    groupByFarmer: rowSpanGrouping.includes('farmer'),
    groupByVariety: rowSpanGrouping.includes('variety'),
  });
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

  const headerCellClass =
    'font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase';
  const bodyCellClass =
    'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5';

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

  const renderCellContent = (
    row: RenderRow,
    columnId: string,
    columnWidth: number
  ) => {
    if (columnId === 'farmer') {
      if (!row.isFirstFarmerRow) return null;
      return (
        <td
          rowSpan={row.farmerRowSpan}
          className={`${bodyCellClass} max-w-56 align-top`}
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
          className={`${bodyCellClass} align-top tabular-nums`}
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
          className={`${bodyCellClass} align-top`}
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
          className={`${bodyCellClass} align-top`}
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
          className={bodyCellClass}
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
          className={bodyCellClass}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {row.sizeName}
        </td>
      );
    }

    if (columnId === 'qty') {
      return (
        <td
          className={`${bodyCellClass} text-right tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {formatNumber(row.sizeQuantity, 0)}
        </td>
      );
    }

    if (columnId === 'acres') {
      return (
        <td
          className={`${bodyCellClass} text-right tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {formatNumber(row.sizeAcres)}
        </td>
      );
    }

    if (columnId === 'amount') {
      return (
        <td
          className={`${bodyCellClass} text-right tabular-nums`}
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
            className={`${bodyCellClass} text-right align-top tabular-nums`}
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
            className={`${bodyCellClass} text-right align-top tabular-nums`}
            style={{ width: columnWidth, minWidth: columnWidth }}
          >
            {totalNetWeightKg !== null ? formatNumber(totalNetWeightKg) : '-'}
          </td>
        );
      }
      const grade = columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
      const bags = getGradeBagCount(row, grade);
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${bodyCellClass} text-right align-top tabular-nums`}
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
          className={`${bodyCellClass} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {weightPercent !== null ? `${formatNumber(weightPercent, 2)}%` : '-'}
        </td>
      );
    }

    if (columnId === 'noGrades') {
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${bodyCellClass} text-center align-top`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          -
        </td>
      );
    }

    return null;
  };

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
                  {visibleNonBuyBackBaseColumnIds.map((columnId) => {
                    const column = visibleColumnById.get(columnId);
                    if (!column) return null;
                    return (
                      <th
                        key={columnId}
                        rowSpan={2}
                        className={`${headerCellClass} relative`}
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
                      className={`${headerCellClass} bg-green-50`}
                    >
                      Buy back
                    </th>
                  ) : null}
                  <th
                    colSpan={
                      visibleGradeColumnIds.length +
                      (hasNoGradesPlaceholder ? 1 : 0)
                    }
                    className={headerCellClass}
                  >
                    Grading
                  </th>
                </tr>
                <tr>
                  {visibleBuyBackColumnIds.map((columnId) => {
                    const column = visibleColumnById.get(columnId);
                    if (!column) return null;
                    return (
                      <th
                        key={columnId}
                        className={`${headerCellClass} relative bg-green-50`}
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
                          className={`${headerCellClass} relative`}
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
                          className={`${headerCellClass} relative`}
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
                        className={`${headerCellClass} relative`}
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
                    <th className={headerCellClass}>No grades</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {renderedRows.length > 0 ? (
                  renderedRows.map((row, rowIndex) => {
                    const rowClass = row.isFarmerBlockStart
                      ? 'border-border/70 border-t-2'
                      : row.isVarietyBlockStart
                        ? 'border-border/60 border-t'
                        : 'border-border/40 border-t border-dashed';
                    const stripingClass =
                      rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/25';

                    return (
                      <tr
                        key={row.rowId}
                        className={`hover:bg-accent/40 ${rowClass} ${stripingClass}`}
                      >
                        {visibleColumnIds.map((columnId) => {
                          const column = visibleColumnById.get(columnId);
                          if (!column) return null;
                          return (
                            <React.Fragment key={`${row.rowId}-${columnId}`}>
                              {renderCellContent(
                                row,
                                columnId,
                                column.getSize()
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })
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
        filterableColumns={filterableColumns}
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
