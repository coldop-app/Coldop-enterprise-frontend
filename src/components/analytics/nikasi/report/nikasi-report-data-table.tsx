import * as React from 'react';
import { type Row, type Table, flexRender } from '@tanstack/react-table';
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
import {
  NIKASI_GATE_PASS_ROWSPAN_COLUMN_IDS,
  type NikasiReportRow,
} from './columns';

const TABLE_SKELETON_COLUMNS = 8;
const TABLE_SKELETON_ROWS = 10;
const TABLE_SCROLLBAR_CLEARANCE_PX = 14;

export type NikasiReportTotals = {
  bagsReceived: number;
  netWeightKg: number;
  netPrecision: number;
  averageWeightPerBag: number | null;
  averagePrecision: number;
  bagColumnTotals: Record<string, number>;
};

type NikasiReportDataTableProps = {
  table: Table<NikasiReportRow>;
  rows: Row<NikasiReportRow>[];
  visibleColumnIds: string[];
  numericColumnIds: Set<string>;
  hasVisibleNumericTotals: boolean;
  totalsByColumn: NikasiReportTotals;
  formatTotal: (value: number, precision?: number) => string;
  isLoading: boolean;
  isGroupingActive: boolean;
};

export function NikasiReportDataTable({
  table,
  rows,
  visibleColumnIds,
  numericColumnIds,
  hasVisibleNumericTotals,
  totalsByColumn,
  formatTotal,
  isLoading,
  isGroupingActive,
}: NikasiReportDataTableProps) {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

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
                key={`nikasi-report-header-skeleton-${index}`}
                className="h-8 w-full rounded-md"
              />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, rowIndex) => (
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
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-muted-foreground flex h-24 items-center justify-center">
          No records found.
        </div>
      ) : (
        <table
          className="font-custom w-full min-w-max border-collapse text-sm"
          style={{ tableLayout: 'fixed', width: table.getTotalSize() }}
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>
          <TableHeader className="bg-secondary border-border/60 text-secondary-foreground sticky top-0 z-10 border-b backdrop-blur-sm [&_tr]:border-b-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  if (header.isPlaceholder) return null;
                  const isRightAligned = numericColumnIds.has(header.id);
                  return (
                    <TableHead
                      key={header.id}
                      className="font-custom border-border/50 text-foreground/75 relative h-10 border-r px-3 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase select-none last:border-r-0"
                    >
                      <div
                        className={`group flex w-full min-w-0 cursor-pointer items-center gap-1 transition-colors ${
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
          <TableBody>
            {rows.map((row) => {
              const { varietyRowIndex, varietyRowSpan } = row.original;
              return (
                <TableRow
                  key={row.id}
                  className={`border-border/50 hover:bg-accent/40 border-b transition-colors ${
                    row.index % 2 === 0 ? 'bg-background' : 'bg-muted/25'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    if (
                      !isGroupingActive &&
                      NIKASI_GATE_PASS_ROWSPAN_COLUMN_IDS.has(colId) &&
                      varietyRowIndex > 0
                    ) {
                      return null;
                    }

                    const isGroupedCell = cell.getIsGrouped();
                    const isAggregatedCell = cell.getIsAggregated();
                    const isPlaceholderCell = cell.getIsPlaceholder();
                    const isRightAligned = numericColumnIds.has(colId);
                    const shouldSuppressAggregation =
                      isAggregatedCell &&
                      (colId === 'gatePassNo' ||
                        colId === 'manualGatePassNumber');

                    const rowSpan =
                      !isGroupingActive &&
                      NIKASI_GATE_PASS_ROWSPAN_COLUMN_IDS.has(colId) &&
                      varietyRowIndex === 0
                        ? varietyRowSpan
                        : undefined;

                    return (
                      <TableCell
                        key={cell.id}
                        rowSpan={rowSpan}
                        className={`font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5 align-middle wrap-break-word whitespace-normal last:border-r-0 ${
                          isRightAligned ? 'text-right tabular-nums' : ''
                        }`}
                      >
                        {isGroupedCell ? (
                          <button
                            type="button"
                            onClick={row.getToggleExpandedHandler()}
                            className={`inline-flex items-center gap-1 text-left transition-colors ${
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
          {rows.length > 0 && hasVisibleNumericTotals ? (
            <TableFooter
              className="bg-secondary border-border/70 text-secondary-foreground border-t backdrop-blur-sm [&>tr]:border-t-0"
              style={{
                position: 'sticky',
                bottom: 0,
                paddingBottom: TABLE_SCROLLBAR_CLEARANCE_PX,
                zIndex: 9,
              }}
            >
              <TableRow className="hover:bg-transparent">
                {visibleColumnIds.map((columnId, columnIndex) => {
                  let cellValue = '';
                  if (columnId === 'bagsReceived') {
                    cellValue = formatTotal(totalsByColumn.bagsReceived, 0);
                  } else if (columnId === 'netWeightKg') {
                    cellValue = formatTotal(
                      totalsByColumn.netWeightKg,
                      totalsByColumn.netPrecision
                    );
                  } else if (columnId === 'averageWeightPerBag') {
                    cellValue =
                      totalsByColumn.averageWeightPerBag != null
                        ? formatTotal(
                            totalsByColumn.averageWeightPerBag,
                            totalsByColumn.averagePrecision
                          )
                        : '';
                  } else if (
                    Object.prototype.hasOwnProperty.call(
                      totalsByColumn.bagColumnTotals,
                      columnId
                    )
                  ) {
                    const v = totalsByColumn.bagColumnTotals[columnId] ?? 0;
                    cellValue = v === 0 ? '' : formatTotal(v, 0);
                  }
                  const isRightAligned = numericColumnIds.has(columnId);

                  return (
                    <TableCell
                      key={`totals-${columnId}`}
                      className={`font-custom border-border/50 text-foreground h-10 border-r px-3 py-2.5 text-sm font-semibold last:border-r-0 ${
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
        </table>
      )}
    </div>
  );
}
