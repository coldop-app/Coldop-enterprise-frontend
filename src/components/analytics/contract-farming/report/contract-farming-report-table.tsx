import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnResizeMode,
  type GroupingState,
  type SortingState,
  type VisibilityState,
  createColumnHelper,
  getCoreRowModel,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  useGetContractFarmingReport,
  type ContractFarmingReportData,
  type ContractFarmingReportFarmer,
} from '@/services/store-admin/general/useGetContractFarmingReport';

type FlattenedRow = {
  rowId: string;
  farmerName: string;
  farmerMobile: string;
  farmerAccount: number;
  farmerAddress: string;
  varietyName: string;
  generation: string;
  sizeName: string;
  sizeQuantity: number;
  sizeAcres: number;
  sizeAmount: number;
  buyBackBags: number | null;
  buyBackNetWeightKg: number | null;
  gradeData: Record<string, { bags: number; netWeightKg: number }>;
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
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
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

const columnHelper = createColumnHelper<FlattenedRow>();
const VARIETY_LEVEL_COLUMN_PREFIX = 'grade_bags_';
const VARIETY_LEVEL_COLUMN_IDS = new Set(['variety', 'bbBags', 'bbNetWeight']);
const BUY_BACK_COLUMN_IDS = new Set(['bbBags', 'bbNetWeight']);

function isNumericSortColumnId(columnId: string) {
  return (
    columnId === 'qty' ||
    columnId === 'acres' ||
    columnId === 'amount' ||
    BUY_BACK_COLUMN_IDS.has(columnId) ||
    columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX)
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
      filterFn: 'includesString',
    }),
    columnHelper.accessor('farmerAddress', {
      id: 'address',
      header: 'Address',
      sortingFn: 'text',
      size: 230,
      minSize: 160,
      maxSize: 550,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('varietyName', {
      id: 'variety',
      header: 'Variety',
      sortingFn: 'text',
      size: 150,
      minSize: 120,
      maxSize: 260,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('generation', {
      id: 'generation',
      header: 'Gen',
      sortingFn: 'text',
      size: 110,
      minSize: 90,
      maxSize: 180,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('sizeName', {
      id: 'size',
      header: 'Size',
      sortingFn: 'text',
      size: 120,
      minSize: 90,
      maxSize: 220,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('sizeQuantity', {
      id: 'qty',
      header: 'Qty (bags)',
      sortingFn: 'basic',
      size: 120,
      minSize: 100,
      maxSize: 220,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('sizeAcres', {
      id: 'acres',
      header: 'Acres',
      sortingFn: 'basic',
      size: 120,
      minSize: 100,
      maxSize: 220,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('sizeAmount', {
      id: 'amount',
      header: 'Seed amt (₹)',
      sortingFn: 'basic',
      size: 145,
      minSize: 120,
      maxSize: 260,
      filterFn: 'includesString',
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
          filterFn: 'includesString',
        }),
        columnHelper.accessor('buyBackNetWeightKg', {
          id: 'bbNetWeight',
          header: 'Net wt (kg)',
          sortingFn: 'basic',
          size: 140,
          minSize: 120,
          maxSize: 260,
          filterFn: 'includesString',
        }),
      ],
    }),
  ];

  const gradingColumns = gradeHeaders.length
    ? gradeHeaders.map((grade) =>
        columnHelper.accessor((row) => row.gradeData[grade]?.bags ?? null, {
          id: `${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`,
          header: `${grade} (Bags)`,
          sortingFn: 'basic',
          size: 130,
          minSize: 110,
          maxSize: 260,
          filterFn: 'includesString',
        })
      )
    : [
        columnHelper.display({
          id: 'noGrades',
          header: 'No grades',
          enableSorting: false,
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
  const [search, setSearch] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnOrder, setColumnOrder] = React.useState<string[]>([]);
  // rowspan grouping is UI-only — keep it out of TanStack `grouping` so leaf columns stay sortable
  const [rowSpanGrouping, setRowSpanGrouping] = React.useState<GroupingState>([
    'farmer',
    'variety',
  ]);
  const [columnResizeMode] = React.useState<ColumnResizeMode>('onChange');
  const [columnFilterSearch, setColumnFilterSearch] = React.useState('');
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetContractFarmingReport();

  const report = React.useMemo(() => normalizeReportData(data), [data]);
  const gradeHeaders = React.useMemo(
    () =>
      [...report.meta.allGrades].sort((a, b) => {
        const aOrder = BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(a));
        const bOrder = BAG_SIZE_ORDER_INDEX.get(normalizeRangeLabel(b));

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
    ],
    [gradeHeaders]
  );

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
    defaultColumn: {
      size: 130,
      minSize: 90,
      maxSize: 550,
    },
    state: {
      sorting,
      globalFilter: search,
      columnFilters,
      columnVisibility,
      columnOrder,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    columnResizeMode,
    getRowId: (row) => row.rowId,
    globalFilterFn: (row, _columnId, filterValue) => {
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
    getSortedRowModel: getSortedRowModel(),
  });

  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnIds = React.useMemo(
    () => visibleColumns.map((column) => column.id),
    [visibleColumns]
  );
  const visibleBaseColumnIds = React.useMemo(
    () =>
      visibleColumnIds.filter(
        (columnId) =>
          !columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX) &&
          columnId !== 'noGrades'
      ),
    [visibleColumnIds]
  );
  const visibleGradeColumnIds = React.useMemo(
    () =>
      visibleColumnIds.filter((columnId) =>
        columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX)
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
        const grade = columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
        return `${grade} (Bags)`;
      }
      return columnId;
    },
    [table]
  );

  const resetColumns = () => {
    setColumnOrder(defaultColumnOrder);
    setColumnVisibility({});
    setColumnFilters([]);
    setSorting([]);
    setRowSpanGrouping(['farmer', 'variety']);
    setColumnFilterSearch('');
    setSearch('');
    table.resetColumnSizing();
  };

  const setColumnOrderByDirection = (
    columnId: string,
    direction: 'up' | 'down'
  ) => {
    setColumnOrder((current) => {
      const index = current.indexOf(columnId);
      if (index < 0) return current;
      if (direction === 'up' && index === 0) return current;
      if (direction === 'down' && index === current.length - 1) return current;

      const next = [...current];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  };

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
      const grade = columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
      const gradeEntry = row.gradeData[grade];
      return (
        <td
          rowSpan={row.varietyRowSpan}
          className={`${bodyCellClass} text-right align-top tabular-nums`}
          style={{ width: columnWidth, minWidth: columnWidth }}
        >
          {gradeEntry ? formatNumber(gradeEntry.bags, 0) : '-'}
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
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
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

        <div className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1">
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
                  {visibleBaseColumnIds
                    .filter((columnId) => !BUY_BACK_COLUMN_IDS.has(columnId))
                    .map((columnId) => {
                      const column = table.getColumn(columnId);
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
                          <div
                            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                            role="presentation"
                            onClick={(event) => event.stopPropagation()}
                          />
                        </th>
                      );
                    })}
                  {hasVisibleBuyBack ? (
                    <th
                      colSpan={
                        visibleBaseColumnIds.filter((id) =>
                          BUY_BACK_COLUMN_IDS.has(id)
                        ).length
                      }
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
                  {visibleBaseColumnIds
                    .filter((columnId) => BUY_BACK_COLUMN_IDS.has(columnId))
                    .map((columnId) => {
                      const column = table.getColumn(columnId);
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
                          <div
                            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                            role="presentation"
                            onClick={(event) => event.stopPropagation()}
                          />
                        </th>
                      );
                    })}
                  {visibleGradeColumnIds.map((columnId) => {
                    const column = table.getColumn(columnId);
                    if (!column) return null;
                    const grade = columnId.replace(
                      VARIETY_LEVEL_COLUMN_PREFIX,
                      ''
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
                        {renderLeafSortHeader(
                          columnId,
                          <span className="block leading-tight">
                            {grade}
                            <br />
                            <span className="text-muted-foreground text-[10px] font-normal tracking-normal normal-case">
                              Bags
                            </span>
                          </span>
                        )}
                        <div
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                          role="presentation"
                          onClick={(event) => event.stopPropagation()}
                        />
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
                  renderedRows.map((row) => {
                    const rowClass = row.isFarmerBlockStart
                      ? 'border-border/70 border-t-2'
                      : row.isVarietyBlockStart
                        ? 'border-border/60 border-t'
                        : 'border-border/40 border-t border-dashed';
                    const stripingClass =
                      Number(row.rowId.split('-').pop() ?? 0) % 2 === 0
                        ? 'bg-background'
                        : 'bg-muted/25';

                    return (
                      <tr
                        key={row.rowId}
                        className={`hover:bg-accent/40 ${rowClass} ${stripingClass}`}
                      >
                        {visibleColumnIds.map((columnId) => {
                          const column = table.getColumn(columnId);
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

      <Sheet open={isViewFiltersOpen} onOpenChange={setIsViewFiltersOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <div className="space-y-4">
            <div>
              <SheetTitle className="font-custom text-base font-semibold">
                View Filters
              </SheetTitle>
              <SheetDescription>
                Show, hide and reset report columns.
              </SheetDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 text-xs"
                onClick={() => table.toggleAllColumnsVisible(true)}
              >
                Show all
              </Button>
              <Button
                variant="outline"
                className="h-8 text-xs"
                onClick={resetColumns}
              >
                Reset all
              </Button>
            </div>

            <div className="space-y-2">
              {columnOrder.map((columnId) => {
                const column = table.getColumn(columnId);
                if (!column) return null;

                return (
                  <div
                    key={columnId}
                    className="bg-background flex items-center gap-3 rounded-md border p-2"
                  >
                    <Checkbox
                      checked={column.getIsVisible()}
                      onCheckedChange={(checked) =>
                        column.toggleVisibility(!!checked)
                      }
                    />
                    <div className="flex-1">
                      <p className="font-custom text-sm font-medium">
                        {getColumnLabel(columnId)}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Width: {Math.round(column.getSize())}px
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setColumnOrderByDirection(columnId, 'up')
                        }
                      >
                        Up
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setColumnOrderByDirection(columnId, 'down')
                        }
                      >
                        Down
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-2">
              <p className="font-custom text-sm font-medium">Sorting</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  className="border-border rounded-md border px-2 py-1.5 text-sm"
                  value={sorting[0]?.id ?? ''}
                  onChange={(event) => {
                    const nextColumnId = event.target.value;
                    if (!nextColumnId) {
                      setSorting([]);
                      return;
                    }
                    const prevDirection = sorting[0]?.desc ?? false;
                    setSorting([{ id: nextColumnId, desc: prevDirection }]);
                  }}
                >
                  <option value="">No sort</option>
                  {columnOrder.map((columnId) => (
                    <option key={columnId} value={columnId}>
                      {getColumnLabel(columnId)}
                    </option>
                  ))}
                </select>
                <select
                  className="border-border rounded-md border px-2 py-1.5 text-sm"
                  value={sorting[0]?.desc ? 'desc' : 'asc'}
                  disabled={sorting.length === 0}
                  onChange={(event) => {
                    if (!sorting[0]) return;
                    setSorting([
                      {
                        id: sorting[0].id,
                        desc: event.target.value === 'desc',
                      },
                    ]);
                  }}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
                <Button
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setSorting([])}
                >
                  Clear sort
                </Button>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="font-custom text-sm font-medium">Column Filters</p>
              <Input
                value={columnFilterSearch}
                onChange={(event) => setColumnFilterSearch(event.target.value)}
                placeholder="Search columns..."
                className="h-8"
              />
              <div className="space-y-2">
                {columnOrder
                  .filter((columnId) =>
                    getColumnLabel(columnId)
                      .toLowerCase()
                      .includes(columnFilterSearch.trim().toLowerCase())
                  )
                  .map((columnId) => {
                    const column = table.getColumn(columnId);
                    if (!column) return null;
                    return (
                      <div
                        key={`filter-${columnId}`}
                        className="bg-background rounded-md border p-2"
                      >
                        <p className="font-custom mb-1 text-xs font-medium">
                          {getColumnLabel(columnId)}
                        </p>
                        <Input
                          value={String(column.getFilterValue() ?? '')}
                          onChange={(event) =>
                            column.setFilterValue(event.target.value)
                          }
                          placeholder={`Filter ${getColumnLabel(columnId).toLowerCase()}...`}
                          className="h-8 text-sm"
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="font-custom text-sm font-medium">Grouping</p>
              <div className="bg-background space-y-2 rounded-md border p-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={rowSpanGrouping.includes('farmer')}
                    onCheckedChange={(checked) =>
                      setRowSpanGrouping((current) => {
                        if (checked) {
                          return current.includes('farmer')
                            ? current
                            : [...current, 'farmer'];
                        }
                        return current.filter((item) => item !== 'farmer');
                      })
                    }
                  />
                  Group Farmer rows
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={rowSpanGrouping.includes('variety')}
                    onCheckedChange={(checked) =>
                      setRowSpanGrouping((current) => {
                        if (checked) {
                          return current.includes('variety')
                            ? current
                            : [...current, 'variety'];
                        }
                        return current.filter((item) => item !== 'variety');
                      })
                    }
                  />
                  Group Variety rows
                </label>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default ContractFarmingReportTable;
