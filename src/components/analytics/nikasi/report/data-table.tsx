import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  flexRender,
  type Cell,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type ColumnResizeDirection,
  type ColumnResizeMode,
  type ExpandedState,
  type GroupingState,
  type Row,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  buildBagSizeColumnConfigFromPreferences,
  filterBagSizeColumnConfigWithData,
  mergeBagSizeColumnConfigWithApiSizes,
  sortBagSizeColumnConfigWithUngradedFirst,
} from '@/lib/bag-size-columns';
import type {
  NikasiGatePassReportColumn,
  NikasiGatePassReportDataRow,
} from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';
import { usePreferencesStore } from '@/stores/store';
import {
  buildNikasiReportColumns,
  defaultNikasiReportColumnVisibility,
  getNikasiColumnLabels,
  getNikasiDefaultColumnOrder,
  getNikasiNumericColumnIds,
  isNikasiVarietySplitColumn,
  shouldSuppressNikasiGroupedAggregation,
  NIKASI_DEFAULT_COLUMN_MAX_SIZE,
  NIKASI_DEFAULT_COLUMN_MIN_SIZE,
  NIKASI_DEFAULT_COLUMN_SIZE,
} from './columns';
import { ViewFiltersSheet } from './view-filters-sheet/index';
import {
  flattenNikasiReportRows,
  getNikasiBagSizeQuantity,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';
import {
  buildNikasiRowSpanMetaById,
  nikasiActiveFiltersTargetSplitColumns,
  normalizeNikasiFilteredDisplayRows,
} from './nikasi-report-filter-normalize';
import {
  globalNikasiReportFilterFn,
  type NikasiGlobalFilterValue,
} from './nikasi-advanced-filters';
import { sortNikasiDisplayRowsByGatePassBlocks } from './nikasi-report-sort';
import {
  computeNikasiReportTotals,
  getNikasiTotalsCellValue,
} from './nikasi-report-totals';
import type { NikasiReportExportContext } from './nikasi-excel-button';

const TABLE_SKELETON_COLUMNS = 8;
const TABLE_SKELETON_ROWS = 10;
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;
const TABLE_VIEWPORT_HEIGHT_PX = 560;
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');

type NikasiTableRow = Row<NikasiReportDisplayRow>;

function getColumnFlexStyle(size: number): CSSProperties {
  return {
    display: 'flex',
    width: size,
    minWidth: size,
    maxWidth: size,
    flex: `0 0 ${size}px`,
  };
}

function renderGroupedNikasiCell(
  row: NikasiTableRow,
  cell: Cell<NikasiReportDisplayRow, unknown>,
  numericColumnIds: Set<string>,
  bagSizeColumnIds: Set<string>,
  useFlexLayout = false
) {
  const columnId = cell.column.id;
  const isRightAligned =
    bagSizeColumnIds.has(columnId) || numericColumnIds.has(columnId);
  const isAggregated = cell.getIsAggregated();
  const suppressAggregation =
    isAggregated && shouldSuppressNikasiGroupedAggregation(columnId);

  let content: ReactNode;

  if (cell.getIsGrouped()) {
    content = (
      <button
        type="button"
        onClick={row.getToggleExpandedHandler()}
        className={`inline-flex items-center gap-1 text-left transition-colors duration-200 ${
          row.getCanExpand()
            ? 'hover:text-primary cursor-pointer'
            : 'cursor-default'
        }`}
      >
        <span className="text-xs">{row.getIsExpanded() ? '▼' : '▶'}</span>
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
        <span className="text-muted-foreground text-xs">
          ({row.subRows.length})
        </span>
      </button>
    );
  } else if (suppressAggregation) {
    content = <span className="text-muted-foreground/50">-</span>;
  } else if (isAggregated) {
    content = flexRender(
      cell.column.columnDef.aggregatedCell ?? cell.column.columnDef.cell,
      cell.getContext()
    );
  } else if (cell.getIsPlaceholder()) {
    content = null;
  } else {
    content = flexRender(cell.column.columnDef.cell, cell.getContext());
  }

  const columnSize = cell.column.getSize();

  return (
    <TableCell
      key={cell.id}
      style={
        useFlexLayout
          ? getColumnFlexStyle(columnSize)
          : {
              width: columnSize,
              minWidth: columnSize,
              maxWidth: columnSize,
            }
      }
      className={`font-custom border-border/40 border-r px-3 py-2.5 align-top text-sm wrap-break-word whitespace-normal last:border-r-0 ${
        isRightAligned ? 'text-right tabular-nums' : ''
      } ${useFlexLayout && isRightAligned ? 'justify-end' : ''}`}
    >
      {content}
    </TableCell>
  );
}

export type NikasiReportDataTableProps = {
  apiColumns: NikasiGatePassReportColumn[];
  sourceRows: NikasiGatePassReportDataRow[];
  isLoading: boolean;
  isViewFiltersOpen: boolean;
  onViewFiltersOpenChange: (open: boolean) => void;
  onExportContextChange?: (context: NikasiReportExportContext | null) => void;
};

const NikasiReportDataTable = ({
  apiColumns,
  sourceRows,
  isLoading,
  isViewFiltersOpen,
  onViewFiltersOpenChange,
  onExportContextChange,
}: NikasiReportDataTableProps) => {
  const preferences = usePreferencesStore((state) => state.preferences);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    defaultNikasiReportColumnVisibility
  );
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = useState<NikasiGlobalFilterValue>('');
  const [columnResizeMode, setColumnResizeMode] =
    useState<ColumnResizeMode>('onChange');
  const [columnResizeDirection, setColumnResizeDirection] =
    useState<ColumnResizeDirection>('ltr');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const hasInitializedColumnOrderRef = useRef(false);
  const hasInitializedBagVisibilityRef = useRef(false);

  const preferenceBagSizeColumnConfig = useMemo(
    () => buildBagSizeColumnConfigFromPreferences(preferences?.bagSizes),
    [preferences?.bagSizes]
  );

  const bagSizeColumnConfig = useMemo(() => {
    const apiSizes: string[] = [];

    for (const row of sourceRows) {
      for (const line of row.bagSizes ?? []) {
        if (line.size) apiSizes.push(String(line.size));
      }
    }

    return sortBagSizeColumnConfigWithUngradedFirst(
      mergeBagSizeColumnConfigWithApiSizes(
        preferenceBagSizeColumnConfig,
        apiSizes
      )
    );
  }, [preferenceBagSizeColumnConfig, sourceRows]);

  const displayRows = useMemo(
    () => flattenNikasiReportRows(sourceRows),
    [sourceRows]
  );

  const visibleBagSizeColumnConfig = useMemo(
    () =>
      filterBagSizeColumnConfigWithData(
        bagSizeColumnConfig,
        displayRows,
        getNikasiBagSizeQuantity
      ),
    [bagSizeColumnConfig, displayRows]
  );

  const bagSizeColumnIds = useMemo(
    () => new Set(visibleBagSizeColumnConfig.map((entry) => entry.id)),
    [visibleBagSizeColumnConfig]
  );

  const numericColumnIds = useMemo(
    () => getNikasiNumericColumnIds(bagSizeColumnIds),
    [bagSizeColumnIds]
  );

  const columns = useMemo(
    () => buildNikasiReportColumns(apiColumns, visibleBagSizeColumnConfig),
    [apiColumns, visibleBagSizeColumnConfig]
  );

  const defaultColumnOrder = useMemo(
    () =>
      getNikasiDefaultColumnOrder(
        apiColumns,
        visibleBagSizeColumnConfig.map((entry) => entry.id)
      ),
    [apiColumns, visibleBagSizeColumnConfig]
  );

  const columnLabelById = useMemo(
    () => getNikasiColumnLabels(apiColumns, visibleBagSizeColumnConfig),
    [apiColumns, visibleBagSizeColumnConfig]
  );

  const emptyBagSizeColumnIds = useMemo(() => {
    const visibleIds = new Set(
      visibleBagSizeColumnConfig.map((entry) => entry.id)
    );
    return new Set(
      bagSizeColumnConfig
        .map((entry) => entry.id)
        .filter((id) => !visibleIds.has(id))
    );
  }, [bagSizeColumnConfig, visibleBagSizeColumnConfig]);

  const effectiveColumnVisibility = useMemo(() => {
    const next = { ...columnVisibility };
    emptyBagSizeColumnIds.forEach((columnId) => {
      if (columnVisibility[columnId] !== true) {
        next[columnId] = false;
      }
    });
    return next;
  }, [columnVisibility, emptyBagSizeColumnIds]);

  useEffect(() => {
    if (hasInitializedColumnOrderRef.current || columns.length === 0) return;
    setColumnOrder(defaultColumnOrder);
    hasInitializedColumnOrderRef.current = true;
  }, [columns.length, defaultColumnOrder]);

  useEffect(() => {
    if (
      hasInitializedBagVisibilityRef.current ||
      displayRows.length === 0 ||
      emptyBagSizeColumnIds.size === 0
    ) {
      return;
    }

    setColumnVisibility((current) => {
      const next = { ...current };
      emptyBagSizeColumnIds.forEach((columnId) => {
        next[columnId] = false;
      });
      return next;
    });
    hasInitializedBagVisibilityRef.current = true;
  }, [displayRows.length, emptyBagSizeColumnIds]);

  useEffect(() => {
    if (grouping.length > 0) {
      setExpanded({});
    }
  }, [grouping]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: displayRows,
    columns,
    defaultColumn: {
      size: NIKASI_DEFAULT_COLUMN_SIZE,
      minSize: NIKASI_DEFAULT_COLUMN_MIN_SIZE,
      maxSize: NIKASI_DEFAULT_COLUMN_MAX_SIZE,
      enableHiding: true,
      enableGrouping: true,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility: effectiveColumnVisibility,
      columnOrder,
      grouping,
      expanded,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: globalNikasiReportFilterFn,
    columnResizeMode,
    columnResizeDirection,
    groupedColumnMode: false,
    manualSorting: grouping.length === 0,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row) => row.id,
  });

  const isGroupingActive = grouping.length > 0;

  const filteredTableRows = table.getFilteredRowModel().rows;
  const filteredDisplayRows = filteredTableRows.map((row) => row.original);

  const splitColumnFilteringActive = useMemo(
    () =>
      nikasiActiveFiltersTargetSplitColumns(
        columnFilters,
        globalFilter,
        bagSizeColumnIds
      ),
    [columnFilters, globalFilter, bagSizeColumnIds]
  );

  const spanAdjustedDisplayRows = useMemo(
    () =>
      normalizeNikasiFilteredDisplayRows(filteredDisplayRows, displayRows, {
        preserveGatePassBlocks: !splitColumnFilteringActive,
      }),
    [filteredDisplayRows, displayRows, splitColumnFilteringActive]
  );

  const spanMetaByRowId = useMemo(
    () => buildNikasiRowSpanMetaById(spanAdjustedDisplayRows),
    [spanAdjustedDisplayRows]
  );

  const totals = useMemo(
    () => computeNikasiReportTotals(spanAdjustedDisplayRows, bagSizeColumnIds),
    [spanAdjustedDisplayRows, bagSizeColumnIds]
  );

  const flatSortedTableRows = useMemo(() => {
    if (isGroupingActive) return [];

    const rowById = new Map(filteredTableRows.map((row) => [row.id, row]));
    const sortedDisplayRows = sortNikasiDisplayRowsByGatePassBlocks(
      spanAdjustedDisplayRows,
      sorting,
      bagSizeColumnIds
    );

    return sortedDisplayRows
      .map((adjustedRow) => {
        const tableRow = rowById.get(adjustedRow.id);
        if (!tableRow) return null;
        tableRow.original = adjustedRow;
        return tableRow;
      })
      .filter((row): row is (typeof filteredTableRows)[number] => Boolean(row));
  }, [
    spanAdjustedDisplayRows,
    filteredTableRows,
    isGroupingActive,
    sorting,
    bagSizeColumnIds,
  ]);

  const groupedTableRows = isGroupingActive
    ? table.getExpandedRowModel().rows
    : [];

  const rows = isGroupingActive ? groupedTableRows : flatSortedTableRows;
  const tableWidth = table.getTotalSize();
  const visibleColumnIds = table
    .getVisibleLeafColumns()
    .map((column) => column.id);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 42,
    getScrollElement: () => tableContainerRef.current,
    measureElement: isFirefoxBrowser
      ? undefined
      : (element) => element?.getBoundingClientRect().height,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  const getExportRows = useCallback((): NikasiTableRow[] => {
    if (isGroupingActive) {
      return table.getGroupedRowModel().rows;
    }
    return flatSortedTableRows;
  }, [flatSortedTableRows, isGroupingActive, table]);

  useEffect(() => {
    if (!onExportContextChange) return;

    if (isLoading || columns.length === 0) {
      onExportContextChange(null);
      return;
    }

    onExportContextChange({
      table,
      totals,
      bagSizeColumnIds,
      getExportRows,
      isGroupingActive,
      spanMetaByRowId,
    });
  }, [
    bagSizeColumnIds,
    columns.length,
    getExportRows,
    isGroupingActive,
    isLoading,
    onExportContextChange,
    spanMetaByRowId,
    table,
    totals,
  ]);

  if (!isLoading && columns.length === 0) {
    return (
      <p className="font-custom text-muted-foreground px-4 py-8 text-sm">
        No columns returned for this report.
      </p>
    );
  }

  return (
    <>
      <div
        ref={tableContainerRef}
        className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
        style={{
          direction: table.options.columnResizeDirection,
          height: `${TABLE_VIEWPORT_HEIGHT_PX}px`,
          position: 'relative',
        }}
      >
        {isLoading ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-8 w-44 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                (_, index) => (
                  <Skeleton
                    key={`nikasi-report-header-skeleton-${index}`}
                    className="h-8 w-full rounded-md"
                  />
                )
              )}
            </div>
            <div className="space-y-2">
              {Array.from({ length: TABLE_SKELETON_ROWS }).map(
                (_, rowIndex) => (
                  <div
                    key={`nikasi-report-row-skeleton-${rowIndex}`}
                    className="grid grid-cols-8 gap-2"
                  >
                    {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                      (_, columnIndex) => (
                        <Skeleton
                          key={`nikasi-report-cell-skeleton-${rowIndex}-${columnIndex}`}
                          className="h-7 w-full rounded-md"
                        />
                      )
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground flex h-24 items-center justify-center">
            No data found.
          </div>
        ) : (
          <table
            className="font-custom text-sm"
            style={
              isGroupingActive
                ? { display: 'grid', width: tableWidth, minWidth: tableWidth }
                : {
                    tableLayout: 'fixed',
                    width: tableWidth,
                    minWidth: tableWidth,
                  }
            }
          >
            <TableHeader
              className="bg-secondary border-border/60 text-secondary-foreground border-b backdrop-blur-sm"
              style={
                isGroupingActive
                  ? { display: 'grid', position: 'sticky', top: 0, zIndex: 10 }
                  : { position: 'sticky', top: 0, zIndex: 10 }
              }
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent"
                  style={
                    isGroupingActive
                      ? {
                          display: 'flex',
                          width: tableWidth,
                          minWidth: tableWidth,
                        }
                      : undefined
                  }
                >
                  {headerGroup.headers.map((header) => {
                    if (header.isPlaceholder) return null;

                    const isRightAligned = numericColumnIds.has(header.id);
                    const columnSize = header.getSize();

                    return (
                      <TableHead
                        key={header.id}
                        style={{
                          ...(isGroupingActive
                            ? getColumnFlexStyle(columnSize)
                            : {
                                width: columnSize,
                                minWidth: columnSize,
                                maxWidth: columnSize,
                              }),
                          position: 'relative',
                        }}
                        className={`font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] wrap-break-word whitespace-normal uppercase select-none last:border-r-0 ${
                          isRightAligned ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div
                          className={`group flex w-full min-w-0 cursor-pointer items-center gap-1 transition-colors duration-200 ${
                            isRightAligned
                              ? 'justify-end text-right'
                              : 'justify-between text-left'
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <span className="wrap-break-word whitespace-normal">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          <span className={isRightAligned ? 'ml-2' : ''}>
                            {{
                              asc: <ArrowUp className="ml-1 h-3.5 w-3.5" />,
                              desc: <ArrowDown className="ml-1 h-3.5 w-3.5" />,
                            }[header.column.getIsSorted() as string] ?? (
                              <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                        <div
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={(event) => event.stopPropagation()}
                          className="hover:bg-primary/25 absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent transition-colors"
                          style={{
                            transform:
                              table.options.columnResizeMode === 'onEnd' &&
                              header.column.getIsResizing()
                                ? `translateX(${
                                    (table.options.columnResizeDirection ===
                                    'rtl'
                                      ? -1
                                      : 1) *
                                    (table.getState().columnSizingInfo
                                      .deltaOffset ?? 0)
                                  }px)`
                                : '',
                          }}
                        />
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody
              style={
                isGroupingActive
                  ? {
                      display: 'grid',
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      position: 'relative',
                    }
                  : undefined
              }
            >
              {(isGroupingActive
                ? virtualRows.map((virtualRow) => rows[virtualRow.index]!)
                : rows
              ).map((row, rowIndex) => {
                if (isGroupingActive) {
                  const virtualRow = virtualRows[rowIndex];
                  return (
                    <TableRow
                      key={row.id}
                      data-index={virtualRow?.index}
                      ref={(node) => rowVirtualizer.measureElement(node)}
                      className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${
                        virtualRow && virtualRow.index % 2 === 0
                          ? 'bg-background'
                          : 'bg-muted/25'
                      }`}
                      style={
                        virtualRow
                          ? {
                              display: 'flex',
                              position: 'absolute',
                              transform: `translateY(${virtualRow.start}px)`,
                              width: tableWidth,
                              minWidth: tableWidth,
                            }
                          : undefined
                      }
                    >
                      {row
                        .getVisibleCells()
                        .map((cell) =>
                          renderGroupedNikasiCell(
                            row,
                            cell,
                            numericColumnIds,
                            bagSizeColumnIds,
                            true
                          )
                        )}
                    </TableRow>
                  );
                }

                const spanMeta = spanMetaByRowId.get(row.id);
                const varietyRowIndex =
                  spanMeta?.varietyRowIndex ?? row.original.varietyRowIndex;
                const varietyRowSpan =
                  spanMeta?.varietyRowSpan ?? row.original.varietyRowSpan;

                return (
                  <TableRow
                    key={row.id}
                    className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${
                      rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/25'
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const columnId = cell.column.id;
                      const isSplitColumn = isNikasiVarietySplitColumn(
                        columnId,
                        bagSizeColumnIds
                      );

                      if (!isSplitColumn && varietyRowIndex > 0) {
                        return null;
                      }

                      const rowSpan =
                        !isSplitColumn &&
                        varietyRowIndex === 0 &&
                        varietyRowSpan > 1
                          ? varietyRowSpan
                          : undefined;

                      return (
                        <TableCell
                          key={cell.id}
                          rowSpan={rowSpan}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                          }}
                          className={`font-custom border-border/40 border-r px-3 py-2.5 align-top text-sm wrap-break-word whitespace-normal last:border-r-0 ${
                            bagSizeColumnIds.has(columnId) ||
                            numericColumnIds.has(columnId)
                              ? 'text-right tabular-nums'
                              : ''
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
            {rows.length > 0 ? (
              <TableFooter
                className="bg-secondary border-border/70 text-secondary-foreground border-t backdrop-blur-sm"
                style={
                  isGroupingActive
                    ? {
                        display: 'grid',
                        position: 'sticky',
                        bottom: 0,
                        paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                        zIndex: 9,
                      }
                    : {
                        position: 'sticky',
                        bottom: 0,
                        paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                        zIndex: 9,
                      }
                }
              >
                <TableRow
                  className="hover:bg-transparent"
                  style={
                    isGroupingActive
                      ? {
                          display: 'flex',
                          width: tableWidth,
                          minWidth: tableWidth,
                        }
                      : undefined
                  }
                >
                  {visibleColumnIds.map((columnId, columnIndex) => {
                    const column = table.getColumn(columnId);
                    const columnSize = column?.getSize() ?? 0;
                    const isRightAligned = numericColumnIds.has(columnId);
                    const cellValue = getNikasiTotalsCellValue(
                      columnId,
                      totals,
                      bagSizeColumnIds
                    );

                    return (
                      <TableCell
                        key={`totals-${columnId}`}
                        style={
                          isGroupingActive
                            ? getColumnFlexStyle(columnSize)
                            : {
                                width: columnSize,
                                minWidth: columnSize,
                                maxWidth: columnSize,
                              }
                        }
                        className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold wrap-break-word whitespace-normal last:border-r-0 ${
                          isRightAligned ? 'text-right tabular-nums' : ''
                        } ${isGroupingActive && isRightAligned ? 'justify-end' : ''}`}
                      >
                        {columnIndex === 0 ? 'Total' : cellValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableFooter>
            ) : null}
          </table>
        )}
      </div>

      <ViewFiltersSheet
        open={isViewFiltersOpen}
        onOpenChange={onViewFiltersOpenChange}
        table={table}
        defaultColumnOrder={defaultColumnOrder}
        defaultColumnVisibility={defaultNikasiReportColumnVisibility}
        emptyBagSizeColumnIds={emptyBagSizeColumnIds}
        columnLabelById={columnLabelById}
        columnResizeMode={columnResizeMode}
        columnResizeDirection={columnResizeDirection}
        onColumnResizeModeChange={setColumnResizeMode}
        onColumnResizeDirectionChange={setColumnResizeDirection}
      />
    </>
  );
};

export default memo(NikasiReportDataTable);
