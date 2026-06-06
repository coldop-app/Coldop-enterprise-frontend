import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Table,
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
  recomputeNikasiVarietyRowSpans,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';
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

const DEFAULT_PAGE_SIZE = 100;

type NikasiTableRow = Row<NikasiReportDisplayRow>;

function renderGroupedNikasiCell(
  row: NikasiTableRow,
  cell: Cell<NikasiReportDisplayRow, unknown>,
  numericColumnIds: Set<string>,
  bagSizeColumnIds: Set<string>
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

  return (
    <TableCell
      key={cell.id}
      style={{
        width: cell.column.getSize(),
        minWidth: cell.column.getSize(),
        maxWidth: cell.column.getSize(),
      }}
      className={`font-custom border-border/40 border-r px-3 py-2.5 align-top text-sm wrap-break-word whitespace-normal last:border-r-0 ${
        isRightAligned ? 'text-right tabular-nums' : ''
      }`}
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
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
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
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [columnFilters, globalFilter, sourceRows]);

  useEffect(() => {
    if (grouping.length > 0) {
      setExpanded({});
    }
    setPagination((current) => ({ ...current, pageIndex: 0 }));
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

  const spanAdjustedDisplayRows = useMemo(
    () => recomputeNikasiVarietyRowSpans(filteredDisplayRows),
    [filteredDisplayRows]
  );

  const filteredSourceRows = useMemo(() => {
    const gatePassIds = new Set(
      filteredDisplayRows.map((row) => row.gatePassId)
    );
    return sourceRows.filter((row) => gatePassIds.has(row.id));
  }, [filteredDisplayRows, sourceRows]);

  const totals = useMemo(
    () =>
      computeNikasiReportTotals(
        filteredSourceRows,
        filteredDisplayRows,
        bagSizeColumnIds
      ),
    [filteredSourceRows, filteredDisplayRows, bagSizeColumnIds]
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

  const rowsForPagination = isGroupingActive
    ? groupedTableRows
    : flatSortedTableRows;

  const tableWidth = table.getTotalSize();

  const totalEntries = rowsForPagination.length;
  const paginatedRows = useMemo(() => {
    const { pageIndex, pageSize } = pagination;
    const start = pageIndex * pageSize;
    return rowsForPagination.slice(start, start + pageSize);
  }, [pagination, rowsForPagination]);

  const currentPageSize = pagination.pageSize;
  const currentPageIndex = pagination.pageIndex;
  const currentPageStartEntry =
    totalEntries === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const currentPageEndEntry = Math.min(
    (currentPageIndex + 1) * currentPageSize,
    totalEntries
  );

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
    });
  }, [
    bagSizeColumnIds,
    columns.length,
    getExportRows,
    isGroupingActive,
    isLoading,
    onExportContextChange,
    table,
    totals,
  ]);

  if (isLoading) {
    return (
      <p className="font-custom text-muted-foreground px-4 py-8 text-sm">
        Loading report...
      </p>
    );
  }

  if (!isLoading && columns.length === 0) {
    return (
      <p className="font-custom text-muted-foreground px-4 py-8 text-sm">
        No columns returned for this report.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="border-primary/15 bg-card/95 ring-primary/5 overflow-x-auto rounded-2xl border shadow-sm ring-1">
          <Table
            className="font-custom border-collapse text-sm"
            style={{ tableLayout: 'fixed', width: tableWidth }}
          >
            <colgroup>
              {table.getVisibleLeafColumns().map((column) => (
                <col key={column.id} style={{ width: column.getSize() }} />
              ))}
            </colgroup>
            <TableHeader className="bg-secondary border-border/60 border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    if (header.isPlaceholder) return null;

                    const isRightAligned = numericColumnIds.has(header.id);

                    return (
                      <TableHead
                        key={header.id}
                        style={{
                          width: header.getSize(),
                          minWidth: header.getSize(),
                          maxWidth: header.getSize(),
                        }}
                        className={`font-custom border-border/50 text-foreground/75 h-auto min-h-10 border-r px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] wrap-break-word whitespace-normal uppercase select-none last:border-r-0 ${
                          isRightAligned ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div
                          className={`group flex w-full min-w-0 cursor-pointer items-start gap-1 transition-colors duration-200 ${
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
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length || 1}
                    className="font-custom text-muted-foreground h-24 text-center text-sm"
                  >
                    No data found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, index) => {
                  if (isGroupingActive) {
                    return (
                      <TableRow
                        key={row.id}
                        className={
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                        }
                      >
                        {row
                          .getVisibleCells()
                          .map((cell) =>
                            renderGroupedNikasiCell(
                              row,
                              cell,
                              numericColumnIds,
                              bagSizeColumnIds
                            )
                          )}
                      </TableRow>
                    );
                  }

                  const { varietyRowIndex, varietyRowSpan } = row.original;

                  return (
                    <TableRow
                      key={row.id}
                      className={
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                      }
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
                })
              )}
            </TableBody>
            {totalEntries > 0 ? (
              <TableFooter className="bg-secondary border-border/70 border-t [&>tr]:border-t-0">
                <TableRow className="hover:bg-transparent">
                  {table.getVisibleLeafColumns().map((column, columnIndex) => {
                    const columnId = column.id;
                    const isRightAligned = numericColumnIds.has(columnId);
                    const cellValue = getNikasiTotalsCellValue(
                      columnId,
                      totals,
                      bagSizeColumnIds
                    );

                    return (
                      <TableCell
                        key={`totals-${columnId}`}
                        style={{
                          width: column.getSize(),
                          minWidth: column.getSize(),
                          maxWidth: column.getSize(),
                        }}
                        className={`font-custom border-border/50 text-foreground h-auto min-h-10 border-r px-3 py-2.5 text-sm font-semibold wrap-break-word whitespace-normal last:border-r-0 ${
                          isRightAligned ? 'text-right tabular-nums' : ''
                        }`}
                      >
                        {columnIndex === 0 ? 'Total' : cellValue}
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>

        {totalEntries > 0 ? (
          <div className="border-border/50 bg-background/70 mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="nikasi-report-page-size"
                className="font-custom text-muted-foreground text-sm"
              >
                Rows per page
              </label>
              <select
                id="nikasi-report-page-size"
                value={currentPageSize}
                onChange={(event) =>
                  setPagination((current) => ({
                    ...current,
                    pageSize: Number(event.target.value),
                    pageIndex: 0,
                  }))
                }
                className="font-custom border-input bg-background text-foreground h-8 rounded-md border px-2 text-sm"
              >
                {[50, 100, 200].map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-custom text-muted-foreground text-sm">
                Showing{' '}
                <span className="text-foreground font-semibold">
                  {currentPageStartEntry}-{currentPageEndEntry}
                </span>{' '}
                of{' '}
                <span className="text-foreground font-semibold">
                  {totalEntries}
                </span>{' '}
                entries
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() =>
                  setPagination((current) => ({ ...current, pageIndex: 0 }))
                }
                disabled={currentPageIndex === 0}
              >
                {'<<'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    pageIndex: Math.max(0, current.pageIndex - 1),
                  }))
                }
                disabled={currentPageIndex === 0}
              >
                {'<'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    pageIndex: current.pageIndex + 1,
                  }))
                }
                disabled={
                  (currentPageIndex + 1) * currentPageSize >= totalEntries
                }
              >
                {'>'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() =>
                  setPagination((current) => ({
                    ...current,
                    pageIndex: Math.max(
                      0,
                      Math.ceil(totalEntries / currentPageSize) - 1
                    ),
                  }))
                }
                disabled={
                  (currentPageIndex + 1) * currentPageSize >= totalEntries
                }
              >
                {'>>'}
              </Button>
            </div>
          </div>
        ) : null}
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
