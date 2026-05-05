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
import { BAG_SIZE_COLUMN_IDS, type IncomingReportRow } from './columns';

const TABLE_SKELETON_COLUMNS = 8;
const TABLE_SKELETON_ROWS = 10;
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;
const isFirefoxBrowser =
  typeof window !== 'undefined' &&
  window.navigator.userAgent.includes('Firefox');

type StorageReportDataTableProps = {
  table: Table<IncomingReportRow>;
  rows: Row<IncomingReportRow>[];
  visibleColumnIds: string[];
  numericColumnIds: Set<string>;
  hasVisibleNumericTotals: boolean;
  totalsByColumn: Record<string, number> & { totalBags: number };
  isLoading: boolean;
};

export function StorageReportDataTable({
  table,
  rows,
  visibleColumnIds,
  numericColumnIds,
  hasVisibleNumericTotals,
  totalsByColumn,
  isLoading,
}: StorageReportDataTableProps) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
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
          <div className="grid grid-cols-8 gap-2">
            {Array.from({ length: TABLE_SKELETON_COLUMNS }).map((_, index) => (
              <Skeleton
                key={`storage-report-header-skeleton-${index}`}
                className="h-8 w-full rounded-md"
              />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, rowIndex) => (
              <div
                key={`storage-report-row-skeleton-${rowIndex}`}
                className="grid grid-cols-8 gap-2"
              >
                {Array.from({ length: TABLE_SKELETON_COLUMNS }).map(
                  (_, columnIndex) => (
                    <Skeleton
                      key={`storage-report-cell-skeleton-${rowIndex}-${columnIndex}`}
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
          style={{ display: 'grid', width: table.getTotalSize() }}
          className="font-custom text-sm"
        >
          <TableHeader
            className="bg-secondary border-border/60 text-secondary-foreground border-b backdrop-blur-sm"
            style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 10 }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                style={{ display: 'flex', width: '100%' }}
                className="hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder) return null;
                  const isRightAligned = numericColumnIds.has(header.id);
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        display: 'flex',
                        width: header.getSize(),
                        position: 'relative',
                      }}
                      className="font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0"
                    >
                      <div
                        className={`group flex w-full min-w-0 cursor-pointer items-center gap-1 transition-colors ${isRightAligned ? 'justify-end' : 'justify-between'}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="truncate">
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
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            style={{
              display: 'grid',
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index] as Row<IncomingReportRow>;
              return (
                <TableRow
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={(node) => rowVirtualizer.measureElement(node)}
                  className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${virtualRow.index % 2 === 0 ? 'bg-background' : 'bg-muted/25'}`}
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%',
                  }}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isAggregatedCell = cell.getIsAggregated();
                    const shouldSuppressAggregation =
                      isAggregatedCell &&
                      (cell.column.id === 'gatePassNo' ||
                        cell.column.id === 'manualGatePassNumber');
                    return (
                      <TableCell
                        key={cell.id}
                        style={{
                          display: 'flex',
                          width: cell.column.getSize(),
                        }}
                        className="font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle whitespace-nowrap last:border-r-0"
                      >
                        {cell.getIsGrouped() ? (
                          <button
                            type="button"
                            onClick={row.getToggleExpandedHandler()}
                            className={`inline-flex items-center gap-1 text-left transition-colors ${row.getCanExpand() ? 'hover:text-primary cursor-pointer' : 'cursor-default'}`}
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
                          shouldSuppressAggregation ? (
                            <span className="text-muted-foreground/50">-</span>
                          ) : (
                            flexRender(
                              cell.column.columnDef.aggregatedCell ??
                                cell.column.columnDef.cell,
                              cell.getContext()
                            )
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
            })}
          </TableBody>
          {rows.length > 0 && hasVisibleNumericTotals ? (
            <TableFooter
              className="bg-secondary border-border/70 text-secondary-foreground border-t backdrop-blur-sm"
              style={{
                display: 'grid',
                position: 'sticky',
                bottom: 0,
                paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                zIndex: 9,
              }}
            >
              <TableRow
                style={{ display: 'flex', width: '100%' }}
                className="hover:bg-transparent"
              >
                {visibleColumnIds.map((columnId, columnIndex) => {
                  const cellValue = BAG_SIZE_COLUMN_IDS.includes(
                    columnId as (typeof BAG_SIZE_COLUMN_IDS)[number]
                  )
                    ? totalsByColumn[columnId] || ''
                    : columnId === 'totalBags'
                      ? totalsByColumn.totalBags || ''
                      : '';
                  const isRightAligned = numericColumnIds.has(columnId);
                  return (
                    <TableCell
                      key={`totals-${columnId}`}
                      style={{
                        display: 'flex',
                        width: table.getColumn(columnId)?.getSize(),
                      }}
                      className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold last:border-r-0 ${isRightAligned ? 'justify-end tabular-nums' : ''}`}
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
  );
}
