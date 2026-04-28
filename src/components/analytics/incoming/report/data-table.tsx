import * as React from 'react';
import {
  flexRender,
  type Header,
  type Row,
  type Table,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar as CalendarIcon,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table as ShadTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IncomingReportViewAndFiltersSheet } from './incoming-digital-report-filters-sheet';
import type {
  GlobalFilterValue,
  IncomingRecord,
} from './incoming-digital-report-shared';

const RIGHT_ALIGNED_COLUMN_IDS = new Set([
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
]);

type IncomingReportDataTableProps = {
  table: Table<IncomingRecord>;
  globalFilter: GlobalFilterValue;
  setGlobalFilter: (value: GlobalFilterValue) => void;
  defaultColumnOrder: string[];
  columnResizeMode: 'onChange' | 'onEnd';
  columnResizeDirection: 'ltr' | 'rtl';
  onColumnResizeModeChange: (mode: 'onChange' | 'onEnd') => void;
  onColumnResizeDirectionChange: (direction: 'ltr' | 'rtl') => void;
  totalRowsCount: number;
};

export function IncomingReportDataTable({
  table,
  globalFilter,
  setGlobalFilter,
  defaultColumnOrder,
  columnResizeMode,
  columnResizeDirection,
  onColumnResizeModeChange,
  onColumnResizeDirectionChange,
  totalRowsCount,
}: IncomingReportDataTableProps) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const isFirefox =
    typeof window !== 'undefined' &&
    window.navigator.userAgent.includes('Firefox');

  const rows = table.getRowModel().rows;
  const visibleColumnIds = table
    .getVisibleLeafColumns()
    .map((column) => column.id);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 48,
    getScrollElement: () => tableContainerRef.current,
    measureElement: isFirefox
      ? undefined
      : (element) => element?.getBoundingClientRect().height,
    overscan: 8,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const headerGroups = table.getHeaderGroups();

  const renderHeaderCell = React.useCallback(
    (header: Header<IncomingRecord, unknown>) => {
      const isRightAligned = RIGHT_ALIGNED_COLUMN_IDS.has(header.id);
      return (
        <TableHead
          key={header.id}
          style={{
            display: 'flex',
            width: header.getSize(),
            position: 'relative',
          }}
          className={`border-muted/40 text-muted-foreground/70 h-11 overflow-hidden border-b px-4 py-3.5 text-[10px] font-bold tracking-widest uppercase select-none ${
            isRightAligned ? 'text-right' : 'text-left'
          }`}
        >
          {header.isPlaceholder ? null : (
            <div
              className={`group flex w-full min-w-0 cursor-pointer items-center ${
                isRightAligned ? 'justify-end' : 'justify-between'
              }`}
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
                  asc: <ArrowUp className="text-foreground ml-1 h-3.5 w-3.5" />,
                  desc: (
                    <ArrowDown className="text-foreground ml-1 h-3.5 w-3.5" />
                  ),
                }[header.column.getIsSorted() as string] ?? (
                  <ArrowUpDown className="text-muted-foreground/50 ml-1 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </span>
            </div>
          )}
          <div
            onDoubleClick={() => header.column.resetSize()}
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            onClick={(event) => event.stopPropagation()}
            className={`absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none ${
              header.column.getIsResizing()
                ? 'bg-primary/60'
                : 'hover:bg-border bg-transparent'
            }`}
          />
        </TableHead>
      );
    },
    []
  );

  return (
    <Card className="mx-auto w-full max-w-7xl overflow-hidden">
      <div className="border-muted/30 bg-muted/10 flex flex-wrap items-center justify-between gap-4 overflow-x-auto border-b p-3 sm:p-4 lg:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5" />
            <Input
              placeholder="Search truck or variety..."
              value={typeof globalFilter === 'string' ? globalFilter : ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="bg-background h-8 w-[170px] pl-8 text-xs shadow-none sm:w-[200px]"
            />
          </div>

          <div className="border-input bg-background flex items-center gap-1 rounded-md border px-3 py-1 shadow-none">
            <CalendarIcon className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-muted-foreground text-xs">
              Apr 25 - Apr 27, 2026
            </span>
          </div>

          <select
            value={
              table.getColumn('status')?.getFilterValue()
                ? String(
                    (
                      table.getColumn('status')?.getFilterValue() as string[]
                    )[0] ?? 'all'
                  )
                : 'all'
            }
            onChange={(event) =>
              table
                .getColumn('status')
                ?.setFilterValue(
                  event.target.value === 'all'
                    ? undefined
                    : [event.target.value]
                )
            }
            className="border-input bg-background h-8 w-[130px] rounded-md border px-2 text-xs shadow-none sm:w-[140px]"
          >
            <option value="all">All Statuses</option>
            <option value="NOT_GRADED">Not Graded</option>
            <option value="GRADED">Graded</option>
          </select>

          <IncomingReportViewAndFiltersSheet
            table={table}
            defaultOrder={defaultColumnOrder}
            columnResizeMode={columnResizeMode}
            columnResizeDirection={columnResizeDirection}
            onColumnResizeModeChange={onColumnResizeModeChange}
            onColumnResizeDirectionChange={onColumnResizeDirectionChange}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 text-xs"
          onClick={() => {
            table.resetColumnFilters();
            table.setGlobalFilter('');
            table.setGrouping([]);
          }}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Clear Filters
        </Button>
      </div>

      <div
        ref={tableContainerRef}
        className="w-full max-w-full overflow-x-auto overflow-y-auto"
        style={{
          direction: table.options.columnResizeDirection,
          height: '560px',
          position: 'relative',
        }}
      >
        {rows.length === 0 ? (
          <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
            No records found.
          </div>
        ) : (
          <ShadTable
            style={{ display: 'grid', width: table.getTotalSize() }}
            className="min-w-full border-collapse text-sm"
          >
            <TableHeader
              className="bg-background"
              style={{
                display: 'grid',
                position: 'sticky',
                top: 0,
                zIndex: 10,
              }}
            >
              {headerGroups.map((headerGroup) => {
                const headerById = new Map(
                  headerGroup.headers.map(
                    (header) => [header.id, header] as const
                  )
                );
                return (
                  <TableRow
                    key={headerGroup.id}
                    className="border-0 hover:bg-transparent"
                    style={{ display: 'flex', width: '100%' }}
                  >
                    {visibleColumnIds.map((columnId) => {
                      const header = headerById.get(columnId);
                      if (!header) return null;
                      return renderHeaderCell(header);
                    })}
                  </TableRow>
                );
              })}
            </TableHeader>
            <TableBody
              style={{
                display: 'grid',
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }}
            >
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index] as Row<IncomingRecord>;
                const visibleCells = row.getVisibleCells();
                const visibleCellByColumnId = new Map(
                  visibleCells.map((cell) => [cell.column.id, cell] as const)
                );
                return (
                  <TableRow
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={(node) => rowVirtualizer.measureElement(node)}
                    className="group hover:bg-muted/20 border-0 transition-colors"
                    style={{
                      display: 'flex',
                      position: 'absolute',
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                      backgroundColor:
                        virtualRow.index % 2 === 0
                          ? 'hsl(var(--background))'
                          : 'hsl(var(--muted) / 0.25)',
                    }}
                  >
                    {visibleColumnIds.map((columnId) => {
                      const cell = visibleCellByColumnId.get(columnId);
                      if (!cell) return null;
                      const isGroupedCell = cell.getIsGrouped();
                      const isAggregatedCell = cell.getIsAggregated();
                      const isPlaceholderCell = cell.getIsPlaceholder();
                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            display: 'flex',
                            width: cell.column.getSize(),
                          }}
                          className={`border-muted/20 min-w-0 overflow-hidden border-b px-4 py-3 align-middle whitespace-nowrap ${
                            RIGHT_ALIGNED_COLUMN_IDS.has(cell.column.id)
                              ? 'justify-end text-right'
                              : ''
                          } ${
                            isGroupedCell
                              ? 'bg-primary/10'
                              : isAggregatedCell
                                ? 'bg-accent/50'
                                : isPlaceholderCell
                                  ? 'bg-muted/50'
                                  : ''
                          }`}
                        >
                          {isGroupedCell ? (
                            <button
                              type="button"
                              onClick={row.getToggleExpandedHandler()}
                              className={`inline-flex items-center gap-1 text-left ${
                                row.getCanExpand()
                                  ? 'cursor-pointer'
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
                          ) : isAggregatedCell ? (
                            flexRender(
                              cell.column.columnDef.aggregatedCell ??
                                cell.column.columnDef.cell,
                              cell.getContext()
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
              })}
            </TableBody>
          </ShadTable>
        )}
      </div>

      <div className="border-muted/30 text-muted-foreground bg-background flex items-center justify-between border-t px-3 py-3 text-xs sm:px-4 lg:px-6">
        <p>
          Showing 1 to {rows.length} of {totalRowsCount} entries
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 shadow-none"
            disabled
          >
            {'<'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 shadow-none"
            disabled
          >
            {'>'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
