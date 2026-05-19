import * as React from 'react';
import { type Row, type Table, flexRender } from '@tanstack/react-table';
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
import type { FlattenedRow } from './types';
import {
  isContractFarmingFamilySpanColumn,
  isContractFarmingSplitSpanColumn,
} from './columns';

const TABLE_SKELETON_COLUMNS = 8;
const TABLE_SKELETON_ROWS = 10;
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');

type ContractFarmingReportDataTableProps = {
  table: Table<FlattenedRow>;
  rows: Row<FlattenedRow>[];
  visibleColumnIds: string[];
  hasVisibleNumericTotals: boolean;
  totalsByColumn: Record<string, number>;
  perAcreByColumn: Record<string, number>;
  showPerAcreRow: boolean;
  formatTotal: (columnId: string, value: number) => string;
  isLoading: boolean;
};

export function ContractFarmingReportDataTable({
  table,
  rows,
  visibleColumnIds,
  hasVisibleNumericTotals,
  totalsByColumn,
  perAcreByColumn,
  showPerAcreRow,
  formatTotal,
  isLoading,
}: ContractFarmingReportDataTableProps) {
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
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: TABLE_SKELETON_COLUMNS }).map((_, index) => (
              <Skeleton
                key={`contract-farming-header-skeleton-${index}`}
                className="h-8 w-full rounded-md"
              />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, rowIndex) => (
              <div
                key={`contract-farming-row-skeleton-${rowIndex}`}
                className="grid grid-cols-8 gap-2"
              >
                {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                  (_, columnIndex) => (
                    <Skeleton
                      key={`contract-farming-cell-skeleton-${rowIndex}-${columnIndex}`}
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
          style={
            isGroupedView
              ? { display: 'grid', width: table.getTotalSize() }
              : { width: table.getTotalSize(), tableLayout: 'fixed' }
          }
          className="font-custom text-sm"
        >
          <TableHeader
            className="bg-secondary border-border/60 text-secondary-foreground border-b backdrop-blur-sm"
            style={
              isGroupedView
                ? {
                    display: 'grid',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                  }
                : { position: 'sticky', top: 0, zIndex: 10 }
            }
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                style={
                  isGroupedView ? { display: 'flex', width: '100%' } : undefined
                }
                className="hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder) return null;
                  const isRightAligned =
                    (
                      header.column.columnDef.meta as
                        | { isNumeric?: boolean }
                        | undefined
                    )?.isNumeric ?? false;
                  return (
                    <TableHead
                      key={header.id}
                      style={
                        isGroupedView
                          ? {
                              display: 'flex',
                              width: header.getSize(),
                              position: 'relative',
                            }
                          : {
                              width: header.getSize(),
                              minWidth: header.getSize(),
                              position: 'relative',
                            }
                      }
                      className="font-custom border-border/50 text-foreground/75 min-h-11 border-r px-3 py-2 text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0"
                    >
                      <div
                        className={`group flex w-full min-w-0 cursor-pointer items-center gap-1 transition-colors ${
                          isRightAligned ? 'justify-end' : 'justify-between'
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span
                          className={`min-w-0 leading-tight ${
                            isRightAligned
                              ? 'text-right wrap-break-word whitespace-normal'
                              : 'text-left wrap-break-word whitespace-normal'
                          }`}
                        >
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
                            <ArrowUpDown className="text-muted-foreground ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
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
                const isMultiSizeBlock = row.original.mergedRowSpan > 1;
                const multiSizeRowClass = row.original.isFirstOfMergedBlock
                  ? 'bg-primary/[0.055] hover:bg-primary/[0.085]'
                  : 'bg-primary/[0.035] hover:bg-primary/[0.065]';
                return (
                  <TableRow
                    key={row.id}
                    data-index={virtualRow?.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className={cn(
                      'border-border/50 border-b transition-colors',
                      row.getIsGrouped()
                        ? 'bg-primary/5 hover:bg-primary/10'
                        : isMultiSizeBlock
                          ? multiSizeRowClass
                          : virtualRow.index % 2 === 0
                            ? 'bg-background hover:bg-accent/40'
                            : 'bg-muted/25 hover:bg-accent/40'
                    )}
                    style={
                      virtualRow
                        ? {
                            display: 'flex',
                            position: 'absolute',
                            transform: `translateY(${virtualRow.start}px)`,
                            width: '100%',
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const hideRepeatedMergedCell =
                        !cell.getIsGrouped() &&
                        !cell.getIsAggregated() &&
                        !cell.getIsPlaceholder() &&
                        !isContractFarmingSplitSpanColumn(cell.column.id) &&
                        !row.original.isFirstOfMergedBlock;
                      const isRemarksCell = cell.column.id === 'remarks';
                      const isLongTextCell =
                        cell.column.id === 'farmer' ||
                        cell.column.id === 'address';
                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            display: 'flex',
                            width: cell.column.getSize(),
                            minWidth:
                              isRemarksCell || isLongTextCell ? 0 : undefined,
                          }}
                          className={`font-custom border-border/40 text-foreground/85 overflow-hidden border-r px-3 py-2.5 align-middle last:border-r-0 ${
                            isRemarksCell || isLongTextCell
                              ? 'wrap-break-word whitespace-normal'
                              : 'whitespace-nowrap'
                          }`}
                        >
                          {hideRepeatedMergedCell ? null : cell.getIsGrouped() ? (
                            <button
                              type="button"
                              onClick={row.getToggleExpandedHandler()}
                              className={`${
                                isRemarksCell || isLongTextCell
                                  ? 'flex w-full min-w-0 flex-wrap items-start gap-1 whitespace-normal'
                                  : 'inline-flex items-center gap-1 whitespace-nowrap'
                              } text-left transition-colors ${
                                row.getCanExpand()
                                  ? 'hover:text-primary cursor-pointer'
                                  : 'cursor-default'
                              }`}
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
                          ) : cell.getIsAggregated() ? (
                            flexRender(
                              cell.column.columnDef.aggregatedCell ??
                                cell.column.columnDef.cell,
                              cell.getContext()
                            )
                          ) : cell.getIsPlaceholder() ? null : (
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
                const columnId = cell.column.id;
                if (isContractFarmingSplitSpanColumn(columnId)) return true;
                if (isContractFarmingFamilySpanColumn(columnId)) {
                  return expanded.isFirstOfFamilyBlock !== false;
                }
                return expanded.isFirstOfMergedBlock;
              });

              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    'border-border/50 hover:bg-accent/40 border-b transition-colors',
                    expanded.varietyRowKey
                      ? expanded.sizeRowIndex % 2 === 0
                        ? 'bg-background'
                        : 'bg-muted/25'
                      : 'bg-background'
                  )}
                >
                  {cellsToRender.map((cell) => {
                    const columnId = cell.column.id;
                    let rowSpan: number | undefined;
                    if (isContractFarmingFamilySpanColumn(columnId)) {
                      const span = expanded.familyMergedRowSpan ?? 1;
                      if (expanded.isFirstOfFamilyBlock !== false && span > 1) {
                        rowSpan = span;
                      }
                    } else if (
                      !isContractFarmingSplitSpanColumn(columnId) &&
                      expanded.isFirstOfMergedBlock &&
                      expanded.mergedRowSpan > 1
                    ) {
                      rowSpan = expanded.mergedRowSpan;
                    }
                    const isRemarksCell = cell.column.id === 'remarks';
                    const isLongTextCell =
                      cell.column.id === 'farmer' ||
                      cell.column.id === 'address';
                    return (
                      <TableCell
                        key={cell.id}
                        rowSpan={rowSpan}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                        }}
                        className={`font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle last:border-r-0 ${
                          isRemarksCell || isLongTextCell
                            ? 'wrap-break-word whitespace-normal'
                            : 'whitespace-nowrap'
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
          {rows.length > 0 && hasVisibleNumericTotals ? (
            <TableFooter
              className="bg-secondary border-border/70 text-secondary-foreground border-t backdrop-blur-sm"
              style={
                isGroupedView
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
                style={
                  isGroupedView ? { display: 'flex', width: '100%' } : undefined
                }
                className="hover:bg-transparent"
              >
                {visibleColumnIds.map((columnId, columnIndex) => {
                  const totalValue = totalsByColumn[columnId];
                  const hasTotal = Number.isFinite(totalValue);
                  const isNumeric = hasTotal;
                  return (
                    <TableCell
                      key={`totals-${columnId}`}
                      style={{
                        display: isGroupedView ? 'flex' : undefined,
                        width: table.getColumn(columnId)?.getSize(),
                        minWidth: table.getColumn(columnId)?.getSize(),
                      }}
                      className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold last:border-r-0 ${
                        isNumeric ? 'justify-end tabular-nums' : ''
                      }`}
                    >
                      {columnIndex === 0
                        ? 'Total'
                        : hasTotal
                          ? formatTotal(columnId, totalValue)
                          : ''}
                    </TableCell>
                  );
                })}
              </TableRow>
              {showPerAcreRow ? (
                <TableRow
                  style={
                    isGroupedView
                      ? { display: 'flex', width: '100%' }
                      : undefined
                  }
                  className="hover:bg-transparent"
                >
                  {visibleColumnIds.map((columnId, columnIndex) => {
                    const perAcreValue = perAcreByColumn[columnId];
                    const hasPerAcre = Number.isFinite(perAcreValue);
                    const isNumeric = hasPerAcre;
                    return (
                      <TableCell
                        key={`per-acre-${columnId}`}
                        style={{
                          display: isGroupedView ? 'flex' : undefined,
                          width: table.getColumn(columnId)?.getSize(),
                          minWidth: table.getColumn(columnId)?.getSize(),
                        }}
                        className={`font-custom text-muted-foreground border-border/50 h-10 border-r px-3 py-2.5 text-sm font-medium last:border-r-0 ${
                          isNumeric ? 'justify-end tabular-nums' : ''
                        }`}
                      >
                        {columnIndex === 0
                          ? 'Per acre'
                          : hasPerAcre
                            ? formatTotal(columnId, perAcreValue)
                            : ''}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ) : null}
            </TableFooter>
          ) : null}
        </table>
      )}
    </div>
  );
}
