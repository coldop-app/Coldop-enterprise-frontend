import * as React from 'react';
import { FileText, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
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
  isFirstFarmerRow: boolean;
  isFirstVarietyRow: boolean;
  isFarmerBlockStart: boolean;
  isVarietyBlockStart: boolean;
  farmerRowSpan: number;
  varietyRowSpan: number;
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

type ColumnConfig = {
  id: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
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
    const varietyRowCounts = farmerVarieties.map((variety) => {
      const sizes = variety.seed?.sizes ?? [];
      return Math.max(sizes.length, 1);
    });
    const farmerTotalRows = varietyRowCounts.reduce(
      (acc, count) => acc + count,
      0
    );

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
      const varietyRowSpan = normalizedSizes.length;

      normalizedSizes.forEach((size, sizeIndex) => {
        const isFirstFarmerRow = varietyIndex === 0 && sizeIndex === 0;
        const isFirstVarietyRow = sizeIndex === 0;

        rows.push({
          rowId: `${farmer.id}-${variety.name}-${sizeIndex}-${farmerIndex}-${varietyIndex}`,
          isFirstFarmerRow,
          isFirstVarietyRow,
          isFarmerBlockStart: isFirstFarmerRow,
          isVarietyBlockStart: !isFirstFarmerRow && isFirstVarietyRow,
          farmerRowSpan: farmerTotalRows,
          varietyRowSpan,
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

const ContractFarmingReportTable = () => {
  const [search, setSearch] = React.useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = React.useState(false);
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

  const filteredRows = React.useMemo<FlattenedRow[]>(() => {
    const query = search.trim().toLowerCase();
    if (!query) return flattenedRows;

    return flattenedRows.filter(
      (row) =>
        row.farmerName.toLowerCase().includes(query) ||
        row.farmerAddress.toLowerCase().includes(query) ||
        row.farmerMobile.toLowerCase().includes(query) ||
        row.varietyName.toLowerCase().includes(query) ||
        row.generation.toLowerCase().includes(query) ||
        row.sizeName.toLowerCase().includes(query) ||
        String(row.farmerAccount).includes(query)
    );
  }, [flattenedRows, search]);

  const baseColumns = React.useMemo<ColumnConfig[]>(
    () => [
      {
        id: 'farmer',
        label: 'Farmer',
        width: 240,
        minWidth: 180,
        maxWidth: 550,
      },
      {
        id: 'address',
        label: 'Address',
        width: 230,
        minWidth: 160,
        maxWidth: 550,
      },
      {
        id: 'variety',
        label: 'Variety',
        width: 150,
        minWidth: 120,
        maxWidth: 260,
      },
      {
        id: 'generation',
        label: 'Gen',
        width: 110,
        minWidth: 90,
        maxWidth: 180,
      },
      { id: 'size', label: 'Size', width: 120, minWidth: 90, maxWidth: 220 },
      {
        id: 'qty',
        label: 'Qty (bags)',
        width: 120,
        minWidth: 100,
        maxWidth: 220,
      },
      { id: 'acres', label: 'Acres', width: 120, minWidth: 100, maxWidth: 220 },
      {
        id: 'amount',
        label: 'Seed amt (₹)',
        width: 145,
        minWidth: 120,
        maxWidth: 260,
      },
      { id: 'bbBags', label: 'Bags', width: 120, minWidth: 100, maxWidth: 220 },
      {
        id: 'bbNetWeight',
        label: 'Net wt (kg)',
        width: 140,
        minWidth: 120,
        maxWidth: 260,
      },
    ],
    []
  );

  const gradeColumns = React.useMemo<ColumnConfig[]>(
    () =>
      gradeHeaders.map((grade) => ({
        id: `grade_bags_${grade}`,
        label: `${grade} (Bags)`,
        width: 130,
        minWidth: 110,
        maxWidth: 260,
      })),
    [gradeHeaders]
  );

  const allColumns = React.useMemo(
    () => [...baseColumns, ...gradeColumns],
    [baseColumns, gradeColumns]
  );

  const [columnOrderState, setColumnOrderState] = React.useState<string[]>(() =>
    allColumns.map((column) => column.id)
  );
  const [columnVisibilityState, setColumnVisibilityState] = React.useState<
    Record<string, boolean>
  >(
    () =>
      Object.fromEntries(
        allColumns.map((column) => [column.id, true])
      ) as Record<string, boolean>
  );
  const [columnWidthsState, setColumnWidthsState] = React.useState<
    Record<string, number>
  >(
    () =>
      Object.fromEntries(
        allColumns.map((column) => [column.id, column.width])
      ) as Record<string, number>
  );
  const [resizeState, setResizeState] = React.useState<{
    columnId: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const columnConfigMap = React.useMemo(
    () => new Map(allColumns.map((column) => [column.id, column])),
    [allColumns]
  );

  const defaultColumnIds = React.useMemo(
    () => allColumns.map((column) => column.id),
    [allColumns]
  );

  const columnOrder = React.useMemo(() => {
    const preserved = columnOrderState.filter((columnId) =>
      defaultColumnIds.includes(columnId)
    );
    const missing = defaultColumnIds.filter(
      (columnId) => !preserved.includes(columnId)
    );
    return [...preserved, ...missing];
  }, [columnOrderState, defaultColumnIds]);

  const columnVisibility = React.useMemo(() => {
    const next = { ...columnVisibilityState };
    for (const column of allColumns) {
      if (next[column.id] === undefined) {
        next[column.id] = true;
      }
    }
    return next;
  }, [allColumns, columnVisibilityState]);

  const columnWidths = React.useMemo(() => {
    const next = { ...columnWidthsState };
    for (const column of allColumns) {
      if (next[column.id] === undefined) {
        next[column.id] = column.width;
      }
    }
    return next;
  }, [allColumns, columnWidthsState]);

  React.useEffect(() => {
    if (!resizeState) return;

    const handleMove = (event: MouseEvent) => {
      const config = columnConfigMap.get(resizeState.columnId);
      if (!config) return;

      const delta = event.clientX - resizeState.startX;
      const nextWidth = Math.min(
        config.maxWidth,
        Math.max(config.minWidth, resizeState.startWidth + delta)
      );
      setColumnWidthsState((current) => ({
        ...current,
        [resizeState.columnId]: nextWidth,
      }));
    };

    const handleUp = () => setResizeState(null);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizeState, columnConfigMap]);

  const orderedVisibleColumns = React.useMemo(
    () =>
      columnOrder.filter(
        (columnId) =>
          columnVisibility[columnId] && columnConfigMap.has(columnId)
      ),
    [columnOrder, columnVisibility, columnConfigMap]
  );

  const visibleBaseIds = React.useMemo(
    () =>
      new Set(
        orderedVisibleColumns.filter(
          (columnId) => !columnId.startsWith('grade_bags_')
        )
      ),
    [orderedVisibleColumns]
  );
  const visibleGradeIds = React.useMemo(
    () =>
      orderedVisibleColumns.filter((columnId) =>
        columnId.startsWith('grade_bags_')
      ),
    [orderedVisibleColumns]
  );
  const visibleGradeHeaders = React.useMemo(
    () =>
      visibleGradeIds.map((columnId) => ({
        columnId,
        grade: columnId.replace('grade_bags_', ''),
      })),
    [visibleGradeIds]
  );

  const totalColumns = Math.max(orderedVisibleColumns.length, 1);

  const getWidth = (columnId: string) => {
    const config = columnConfigMap.get(columnId);
    return columnWidths[columnId] ?? config?.width ?? 120;
  };

  const headerCellClass =
    'font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase';
  const bodyCellClass =
    'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5';

  const handleResizeStart = (
    columnId: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setResizeState({
      columnId,
      startX: event.clientX,
      startWidth: getWidth(columnId),
    });
  };

  const resetColumns = () => {
    setColumnOrderState(allColumns.map((column) => column.id));
    setColumnVisibilityState(
      Object.fromEntries(
        allColumns.map((column) => [column.id, true])
      ) as Record<string, boolean>
    );
    setColumnWidthsState(
      Object.fromEntries(
        allColumns.map((column) => [column.id, column.width])
      ) as Record<string, number>
    );
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
                  {baseColumns
                    .filter(
                      (column) =>
                        !['bbBags', 'bbNetWeight'].includes(column.id) &&
                        visibleBaseIds.has(column.id)
                    )
                    .map((column) => (
                      <th
                        key={column.id}
                        rowSpan={2}
                        className={`${headerCellClass} relative`}
                        style={{
                          width: getWidth(column.id),
                          minWidth: getWidth(column.id),
                        }}
                      >
                        {column.label}
                        <div
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                          onMouseDown={(event) =>
                            handleResizeStart(column.id, event)
                          }
                        />
                      </th>
                    ))}
                  {visibleBaseIds.has('bbBags') ||
                  visibleBaseIds.has('bbNetWeight') ? (
                    <th
                      colSpan={
                        Number(visibleBaseIds.has('bbBags')) +
                        Number(visibleBaseIds.has('bbNetWeight'))
                      }
                      className={`${headerCellClass} bg-green-50`}
                    >
                      Buy back
                    </th>
                  ) : null}
                  <th
                    colSpan={Math.max(visibleGradeHeaders.length, 1)}
                    className={headerCellClass}
                  >
                    Grading
                  </th>
                </tr>
                <tr>
                  {visibleBaseIds.has('bbBags') ? (
                    <th
                      className={`${headerCellClass} relative bg-green-50`}
                      style={{
                        width: getWidth('bbBags'),
                        minWidth: getWidth('bbBags'),
                      }}
                    >
                      Bags
                      <div
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                        onMouseDown={(event) =>
                          handleResizeStart('bbBags', event)
                        }
                      />
                    </th>
                  ) : null}
                  {visibleBaseIds.has('bbNetWeight') ? (
                    <th
                      className={`${headerCellClass} relative bg-green-50`}
                      style={{
                        width: getWidth('bbNetWeight'),
                        minWidth: getWidth('bbNetWeight'),
                      }}
                    >
                      Net wt (kg)
                      <div
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                        onMouseDown={(event) =>
                          handleResizeStart('bbNetWeight', event)
                        }
                      />
                    </th>
                  ) : null}
                  {visibleGradeHeaders.length > 0 ? (
                    visibleGradeHeaders.map(({ columnId, grade }) => (
                      <th
                        key={columnId}
                        className={`${headerCellClass} relative`}
                        style={{
                          width: getWidth(columnId),
                          minWidth: getWidth(columnId),
                        }}
                      >
                        {grade}
                        <br />
                        <span className="text-muted-foreground text-[10px] font-normal">
                          Bags
                        </span>
                        <div
                          className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize"
                          onMouseDown={(event) =>
                            handleResizeStart(columnId, event)
                          }
                        />
                      </th>
                    ))
                  ) : (
                    <th className={headerCellClass}>No grades</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => {
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
                        {row.isFirstFarmerRow && (
                          <>
                            {visibleBaseIds.has('farmer') ? (
                              <td
                                rowSpan={row.farmerRowSpan}
                                className={`${bodyCellClass} max-w-56 align-top`}
                                style={{
                                  width: getWidth('farmer'),
                                  minWidth: getWidth('farmer'),
                                }}
                              >
                                <div className="font-medium">
                                  {row.farmerName}
                                  <span className="text-muted-foreground ml-1 text-sm font-normal">
                                    (#{row.farmerAccount})
                                  </span>
                                </div>
                              </td>
                            ) : null}
                            {visibleBaseIds.has('address') ? (
                              <td
                                rowSpan={row.farmerRowSpan}
                                className={`${bodyCellClass} align-top`}
                                style={{
                                  width: getWidth('address'),
                                  minWidth: getWidth('address'),
                                }}
                              >
                                {row.farmerAddress}
                              </td>
                            ) : null}
                          </>
                        )}

                        {row.isFirstVarietyRow &&
                          visibleBaseIds.has('variety') && (
                            <td
                              rowSpan={row.varietyRowSpan}
                              className={`${bodyCellClass} align-top`}
                              style={{
                                width: getWidth('variety'),
                                minWidth: getWidth('variety'),
                              }}
                            >
                              <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {row.varietyName}
                              </span>
                            </td>
                          )}

                        {visibleBaseIds.has('generation') ? (
                          <td
                            className={bodyCellClass}
                            style={{
                              width: getWidth('generation'),
                              minWidth: getWidth('generation'),
                            }}
                          >
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                              {row.generation}
                            </span>
                          </td>
                        ) : null}
                        {visibleBaseIds.has('size') ? (
                          <td
                            className={bodyCellClass}
                            style={{
                              width: getWidth('size'),
                              minWidth: getWidth('size'),
                            }}
                          >
                            {row.sizeName}
                          </td>
                        ) : null}
                        {visibleBaseIds.has('qty') ? (
                          <td
                            className={`${bodyCellClass} text-right tabular-nums`}
                            style={{
                              width: getWidth('qty'),
                              minWidth: getWidth('qty'),
                            }}
                          >
                            {formatNumber(row.sizeQuantity, 0)}
                          </td>
                        ) : null}
                        {visibleBaseIds.has('acres') ? (
                          <td
                            className={`${bodyCellClass} text-right tabular-nums`}
                            style={{
                              width: getWidth('acres'),
                              minWidth: getWidth('acres'),
                            }}
                          >
                            {formatNumber(row.sizeAcres)}
                          </td>
                        ) : null}
                        {visibleBaseIds.has('amount') ? (
                          <td
                            className={`${bodyCellClass} text-right tabular-nums`}
                            style={{
                              width: getWidth('amount'),
                              minWidth: getWidth('amount'),
                            }}
                          >
                            {row.sizeAmount > 0
                              ? `₹${formatNumber(row.sizeAmount)}`
                              : '-'}
                          </td>
                        ) : null}

                        {row.isFirstVarietyRow && (
                          <>
                            {visibleBaseIds.has('bbBags') ? (
                              <td
                                rowSpan={row.varietyRowSpan}
                                className="font-custom border-border/40 border-r bg-green-50 px-3 py-2.5 text-right align-top tabular-nums"
                                style={{
                                  width: getWidth('bbBags'),
                                  minWidth: getWidth('bbBags'),
                                }}
                              >
                                {formatNumber(row.buyBackBags, 0)}
                              </td>
                            ) : (
                              <></>
                            )}
                            {visibleBaseIds.has('bbNetWeight') ? (
                              <td
                                rowSpan={row.varietyRowSpan}
                                className="font-custom border-border/40 border-r bg-green-50 px-3 py-2.5 text-right align-top tabular-nums"
                                style={{
                                  width: getWidth('bbNetWeight'),
                                  minWidth: getWidth('bbNetWeight'),
                                }}
                              >
                                {formatNumber(row.buyBackNetWeightKg)}
                              </td>
                            ) : (
                              <></>
                            )}
                            {visibleGradeHeaders.length > 0 ? (
                              visibleGradeHeaders.map(({ columnId, grade }) => {
                                const gradeEntry = row.gradeData[grade];
                                return (
                                  <td
                                    key={`${row.rowId}-${columnId}`}
                                    rowSpan={row.varietyRowSpan}
                                    className={`${bodyCellClass} text-right align-top tabular-nums`}
                                    style={{
                                      width: getWidth(columnId),
                                      minWidth: getWidth(columnId),
                                    }}
                                  >
                                    {gradeEntry
                                      ? formatNumber(gradeEntry.bags, 0)
                                      : '-'}
                                  </td>
                                );
                              })
                            ) : visibleBaseIds.has('bbBags') ||
                              visibleBaseIds.has('bbNetWeight') ? null : (
                              <td
                                rowSpan={row.varietyRowSpan}
                                className={`${bodyCellClass} text-center align-top`}
                              >
                                -
                              </td>
                            )}
                          </>
                        )}
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
                onClick={() =>
                  setColumnVisibilityState(
                    Object.fromEntries(
                      allColumns.map((column) => [column.id, true])
                    ) as Record<string, boolean>
                  )
                }
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
                const config = columnConfigMap.get(columnId);
                if (!config) return null;

                return (
                  <div
                    key={columnId}
                    className="bg-background flex items-center gap-3 rounded-md border p-2"
                  >
                    <Checkbox
                      checked={Boolean(columnVisibility[columnId])}
                      onCheckedChange={(checked) =>
                        setColumnVisibilityState((current) => ({
                          ...current,
                          [columnId]: checked === true,
                        }))
                      }
                    />
                    <div className="flex-1">
                      <p className="font-custom text-sm font-medium">
                        {config.label}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Width: {Math.round(getWidth(columnId))}px
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default ContractFarmingReportTable;
