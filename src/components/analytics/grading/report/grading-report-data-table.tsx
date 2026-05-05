import * as React from 'react';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { GradingReportTableRow } from './columns';
import {
  GRADING_SECTION_START_BORDER_CLASSES,
  gradingMergedTdRowSpan,
  gradingRightAlignedColumnIds,
  isGradingReportGradingSectionStartColumn,
  isGradingSplitSpanColumn,
  shouldSuppressGradingAggregatedCell,
} from './columns';

const TABLE_SKELETON_COLUMNS = 13;
const TABLE_SKELETON_ROWS = 10;
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');

type GradingReportDataTableProps = {
  table: Table<GradingReportTableRow>;
  rows: Row<GradingReportTableRow>[];
  visibleColumnIds: string[];
  numericColumnIds: Set<string>;
  hasVisibleNumericTotals: boolean;
  totalsByColumn: Map<string, number>;
  formatTotal: (value: number, precision?: number) => string;
  isLoading: boolean;
};

export function GradingReportDataTable({
  table,
  rows,
  visibleColumnIds,
  numericColumnIds,
  hasVisibleNumericTotals,
  totalsByColumn,
  formatTotal,
  isLoading,
}: GradingReportDataTableProps) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const isGroupedView = table.getState().grouping.length > 0;
  // eslint-disable-next-line react-hooks/incompatible-library
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

  return (
    <div
      ref={tableContainerRef}
      className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
      style={{
        direction: table.options.columnResizeDirection,
        height: '560px',
        position: 'relative',
      }}
    >
      {isLoading ? (
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-10 gap-2">
            {Array.from({ length: TABLE_SKELETON_COLUMNS }).map((_, index) => (
              <Skeleton
                key={`grading-report-header-skeleton-${index}`}
                className="h-8 w-full rounded-md"
              />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, rowIndex) => (
              <div
                key={`grading-report-row-skeleton-${rowIndex}`}
                className="grid grid-cols-10 gap-2"
              >
                {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                  (_, columnIndex) => (
                    <Skeleton
                      key={`grading-report-cell-skeleton-${rowIndex}-${columnIndex}`}
                      className="h-7 w-full rounded-md"
                    />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-muted-foreground flex h-24 items-center justify-center">
          No records found.
        </div>
      ) : (
        <table
          className="font-custom w-max min-w-full text-sm"
          style={{ width: table.getTotalSize() }}
        >
          <TableHeader className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder) return null;

                  const canSort = header.column.getCanSort();
                  const isRightAligned = gradingRightAlignedColumnIds.has(
                    header.column.id
                  );

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        width: header.getSize(),
                        minWidth: header.getSize(),
                        position: 'relative',
                      }}
                      className={cn(
                        'font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0',
                        isGradingReportGradingSectionStartColumn(
                          header.column
                        ) && GRADING_SECTION_START_BORDER_CLASSES
                      )}
                    >
                      {canSort ? (
                        <div
                          role="button"
                          tabIndex={0}
                          className={cn(
                            'group focus-visible:ring-primary flex w-full min-w-0 cursor-pointer items-center gap-1 rounded transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                            isRightAligned ? 'justify-end' : 'justify-between'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') {
                              return;
                            }
                            event.preventDefault();
                            header.column.getToggleSortingHandler()?.(event);
                          }}
                        >
                          <span className="truncate">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </span>
                          <span className={isRightAligned ? 'ml-2' : ''}>
                            {{
                              asc: (
                                <ArrowUp className="ml-1 h-3.5 w-3.5 shrink-0" />
                              ),
                              desc: (
                                <ArrowDown className="ml-1 h-3.5 w-3.5 shrink-0" />
                              ),
                            }[header.column.getIsSorted() as string] ?? (
                              <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'flex w-full min-w-0 items-center gap-1',
                            isRightAligned && 'justify-end'
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </div>
                      )}
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
                                  (table.options.columnResizeDirection === 'rtl'
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
              isGroupedView
                ? {
                    display: 'grid',
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    position: 'relative',
                  }
                : undefined
            }
          >
            {(isGroupedView
              ? virtualRows.map((virtualRow) => rows[virtualRow.index]!)
              : rows
            ).map((row, rowIndex) => {
              if (isGroupedView) {
                const virtualRow = virtualRows[rowIndex];
                return (
                  <TableRow
                    key={row.id}
                    data-index={virtualRow?.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className={cn(
                      'border-border/50 hover:bg-accent/40 border-b transition-colors',
                      row.index % 2 === 0 ? 'bg-background' : 'bg-muted/25'
                    )}
                    style={
                      virtualRow
                        ? {
                            position: 'absolute',
                            transform: `translateY(${virtualRow.start}px)`,
                            width: '100%',
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isRightAligned = gradingRightAlignedColumnIds.has(
                        cell.column.id
                      );
                      const isGroupedCell = cell.getIsGrouped();
                      const isAggregatedCell = cell.getIsAggregated();
                      const isPlaceholderCell = cell.getIsPlaceholder();

                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                          }}
                          className={cn(
                            'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap',
                            isGradingReportGradingSectionStartColumn(
                              cell.column
                            ) && GRADING_SECTION_START_BORDER_CLASSES,
                            isRightAligned && 'text-right'
                          )}
                        >
                          {isGroupedCell ? (
                            <button
                              type="button"
                              onClick={row.getToggleExpandedHandler()}
                              className={cn(
                                'font-custom focus-visible:ring-primary inline-flex items-center gap-1 rounded text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                row.getCanExpand()
                                  ? 'hover:text-primary cursor-pointer'
                                  : 'cursor-default'
                              )}
                            >
                              <span className="text-xs">
                                {row.getIsExpanded() ? '▼' : '▶'}
                              </span>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                              <span className="text-muted-foreground text-xs">
                                ({row.subRows.length})
                              </span>
                            </button>
                          ) : isAggregatedCell ? (
                            shouldSuppressGradingAggregatedCell(
                              cell.column.id
                            ) ? (
                              <span className="text-muted-foreground/50 font-custom">
                                -
                              </span>
                            ) : (
                              flexRender(
                                cell.column.columnDef.aggregatedCell ??
                                  cell.column.columnDef.cell,
                                cell.getContext()
                              )
                            )
                          ) : isPlaceholderCell ? null : (
                            flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              }

              const expanded = row.original;
              const cellsToRender = row.getVisibleCells().filter((cell) => {
                if (isGradingSplitSpanColumn(cell.column)) return true;
                return expanded.isFirstOfMergedBlock;
              });

              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    'border-border/50 hover:bg-accent/40 border-b transition-colors',
                    expanded.parentRowIndex % 2 === 0
                      ? 'bg-background'
                      : 'bg-muted/25'
                  )}
                >
                  {cellsToRender.map((cell, cellIndexInRow) => {
                    const isRightAligned = gradingRightAlignedColumnIds.has(
                      cell.column.id
                    );
                    const rowSpan = gradingMergedTdRowSpan(
                      expanded,
                      cell.column
                    );
                    const isLastBodyCellInWideRow =
                      expanded.isFirstOfMergedBlock &&
                      cellIndexInRow === cellsToRender.length - 1;

                    return (
                      <TableCell
                        key={cell.id}
                        rowSpan={rowSpan}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                        }}
                        className={cn(
                          'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap',
                          isGradingReportGradingSectionStartColumn(
                            cell.column
                          ) && GRADING_SECTION_START_BORDER_CLASSES,
                          isLastBodyCellInWideRow && 'border-r-0',
                          isRightAligned && 'text-right'
                        )}
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
          {rows.length > 0 && hasVisibleNumericTotals ? (
            <TableFooter
              className="bg-secondary border-border/70 text-secondary-foreground border-t backdrop-blur-sm"
              style={{
                position: 'sticky',
                bottom: 0,
                paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                zIndex: 9,
              }}
            >
              <TableRow className="hover:bg-transparent">
                {visibleColumnIds.map((columnId, columnIndex) => {
                  const value = totalsByColumn.get(columnId);
                  const displayValue =
                    value == null
                      ? ''
                      : columnId === 'wastagePercent'
                        ? `${formatTotal(value, 2)}%`
                        : formatTotal(value, 0);
                  const isRightAligned = numericColumnIds.has(columnId);
                  return (
                    <TableCell
                      key={`totals-${columnId}`}
                      style={{
                        width: table.getColumn(columnId)?.getSize(),
                        minWidth: table.getColumn(columnId)?.getSize(),
                      }}
                      className={cn(
                        'font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold last:border-r-0',
                        isRightAligned && 'text-right tabular-nums'
                      )}
                    >
                      {columnIndex === 0 ? 'Total' : displayValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          ) : null}
        </table>
      )}
    </div>
  );
}
