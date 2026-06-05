import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
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
import { useGetNikasiGatePassReport } from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';
import { usePreferencesStore } from '@/stores/store';
import {
  buildNikasiReportColumns,
  getNikasiNumericColumnIds,
  isNikasiVarietySplitColumn,
  NIKASI_DEFAULT_COLUMN_MAX_SIZE,
  NIKASI_DEFAULT_COLUMN_MIN_SIZE,
  NIKASI_DEFAULT_COLUMN_SIZE,
} from './columns';
import {
  flattenNikasiReportRows,
  getNikasiBagSizeQuantity,
} from './nikasi-report-flatten';
import { sortNikasiDisplayRowsByGatePassBlocks } from './nikasi-report-sort';
import {
  computeNikasiReportTotals,
  getNikasiTotalsCellValue,
} from './nikasi-report-totals';

const DEFAULT_PAGE_SIZE = 100;

const NikasiReportDataTable = () => {
  const preferences = usePreferencesStore((state) => state.preferences);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data, isLoading, isError, error } = useGetNikasiGatePassReport(
    {},
    { enabled: true }
  );

  const sourceRows = useMemo(() => data?.data ?? [], [data?.data]);

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
    () =>
      buildNikasiReportColumns(data?.columns ?? [], visibleBagSizeColumnConfig),
    [data?.columns, visibleBagSizeColumnConfig]
  );

  const totals = useMemo(
    () => computeNikasiReportTotals(sourceRows, displayRows, bagSizeColumnIds),
    [sourceRows, displayRows, bagSizeColumnIds]
  );

  const sortedDisplayRows = useMemo(
    () =>
      sortNikasiDisplayRowsByGatePassBlocks(
        displayRows,
        sorting,
        bagSizeColumnIds
      ),
    [displayRows, sorting, bagSizeColumnIds]
  );

  const table = useReactTable({
    data: sortedDisplayRows,
    columns,
    defaultColumn: {
      size: NIKASI_DEFAULT_COLUMN_SIZE,
      minSize: NIKASI_DEFAULT_COLUMN_MIN_SIZE,
      maxSize: NIKASI_DEFAULT_COLUMN_MAX_SIZE,
    },
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  const tableWidth = table.getTotalSize();

  const paginatedRows = table.getRowModel().rows;
  const totalEntries = table.getPrePaginationRowModel().rows.length;
  const currentPageSize = table.getState().pagination.pageSize;
  const currentPageIndex = table.getState().pagination.pageIndex;
  const currentPageStartEntry =
    totalEntries === 0 ? 0 : currentPageIndex * currentPageSize + 1;
  const currentPageEndEntry = Math.min(
    (currentPageIndex + 1) * currentPageSize,
    totalEntries
  );

  if (isLoading) {
    return (
      <p className="font-custom text-muted-foreground px-4 py-8 text-sm">
        Loading report...
      </p>
    );
  }

  if (isError) {
    return (
      <p className="font-custom rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error
          ? error.message
          : 'Failed to load nikasi gate pass report'}
      </p>
    );
  }

  if (columns.length === 0) {
    return (
      <p className="font-custom text-muted-foreground px-4 py-8 text-sm">
        No columns returned for this report.
      </p>
    );
  }

  return (
    <section className="px-4 pt-6 pb-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-[75rem]">
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
                    colSpan={columns.length}
                    className="font-custom text-muted-foreground h-24 text-center text-sm"
                  >
                    No data found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, index) => {
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
                  table.setPageSize(Number(event.target.value))
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
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default memo(NikasiReportDataTable);
