import * as React from 'react';
import {
  type Column,
  type Header,
  type Row,
  type Table,
  flexRender,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AVG_QUINTAL_PER_ACRE_COLUMN_ID,
  BUY_BACK_AMOUNT_COLUMN_ID,
  isNumericSortColumnId,
  OUTPUT_PERCENTAGE_COLUMN_ID,
  TOTAL_GRADED_BAGS_COLUMN_ID,
  TOTAL_GRADED_NET_WEIGHT_COLUMN_ID,
  TRAILING_TWO_ROW_HEADER_COLUMN_IDS,
  VARIETY_LEVEL_COLUMN_PREFIX,
  VARIETY_LEVEL_PERCENT_COLUMN_PREFIX,
  WASTAGE_KG_COLUMN_ID,
} from './columns';
import type { FlattenedRow } from './types';
import {
  formatContractFarmingGradeColumnLabel,
  isContractFarmingCutGrade,
} from './view-filters-sheet/constants';

const CF_HEADER_CELL_CLASS =
  'font-custom border-border/50 text-foreground/75 h-10 border-r px-3 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase';
const CF_BODY_CELL_CLASS =
  'font-custom border-border/40 text-foreground/85 border-r px-3 py-2.5';

type ContractFarmingReportDataTableProps = {
  table: Table<FlattenedRow>;
  rows: Row<FlattenedRow>[];
  visibleColumnById: Map<string, Column<FlattenedRow, unknown>>;
  visibleColumnIds: string[];
  visibleLeadingNonBuyBackBaseColumnIds: string[];
  visibleBuyBackColumnIds: string[];
  visibleGradeColumnIds: string[];
  hasNoGradesPlaceholder: boolean;
  hasVisibleBuyBack: boolean;
  leafHeaderByColumnId: Map<string, Header<FlattenedRow, unknown>>;
  footerCells: Record<string, string> | null;
  totalColumns: number;
  isLoading: boolean;
  isClubFamiliesMode: boolean;
  clubFamilyBaseSet: Set<number>;
  columnResizeMode: 'onChange' | 'onEnd';
  columnResizeDirection: 'ltr' | 'rtl';
};

export function ContractFarmingReportDataTable({
  table,
  rows,
  visibleColumnById,
  visibleColumnIds,
  visibleLeadingNonBuyBackBaseColumnIds,
  visibleBuyBackColumnIds,
  visibleGradeColumnIds,
  hasNoGradesPlaceholder,
  hasVisibleBuyBack,
  leafHeaderByColumnId,
  footerCells,
  totalColumns,
  isLoading,
  isClubFamiliesMode,
  clubFamilyBaseSet,
  columnResizeMode,
  columnResizeDirection,
}: ContractFarmingReportDataTableProps) {
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

  const getColumnLabel = React.useCallback(
    (columnId: string) => {
      const header = table.getColumn(columnId)?.columnDef.header;
      if (typeof header === 'string') return header;
      if (columnId.startsWith(VARIETY_LEVEL_COLUMN_PREFIX)) {
        if (columnId === TOTAL_GRADED_BAGS_COLUMN_ID) {
          return 'Total Bags After Grading';
        }
        if (columnId === TOTAL_GRADED_NET_WEIGHT_COLUMN_ID) {
          return 'Net Weight After Grading';
        }
        if (columnId === AVG_QUINTAL_PER_ACRE_COLUMN_ID) {
          return 'Average Quintal Per Acre';
        }
        if (columnId === WASTAGE_KG_COLUMN_ID) {
          return 'Wastage (kg)';
        }
        if (columnId === OUTPUT_PERCENTAGE_COLUMN_ID) {
          return 'Output Percentage';
        }
        if (columnId === BUY_BACK_AMOUNT_COLUMN_ID) {
          return 'Buy Back Amount';
        }
        const grade = columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');
        return formatContractFarmingGradeColumnLabel(grade);
      }
      if (columnId.startsWith(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX)) {
        const grade = columnId.replace(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX, '');
        return `${formatContractFarmingGradeColumnLabel(grade)} %`;
      }
      return columnId;
    },
    [table]
  );

  const renderGradeHeaderContent = React.useCallback((columnId: string) => {
    if (columnId === TOTAL_GRADED_BAGS_COLUMN_ID) {
      return 'Total Bags After Grading';
    }
    if (columnId === TOTAL_GRADED_NET_WEIGHT_COLUMN_ID) {
      return 'Net Weight After Grading';
    }
    if (columnId === AVG_QUINTAL_PER_ACRE_COLUMN_ID) {
      return 'Average Quintal Per Acre';
    }
    if (columnId === WASTAGE_KG_COLUMN_ID) {
      return 'Wastage (kg)';
    }
    if (columnId === OUTPUT_PERCENTAGE_COLUMN_ID) {
      return (
        <span className="block leading-tight">
          Output Percentage
          <br />
          <span className="text-muted-foreground text-[10px] font-normal tracking-normal normal-case">
            (%)
          </span>
        </span>
      );
    }
    if (columnId === BUY_BACK_AMOUNT_COLUMN_ID) {
      return 'Buy Back Amount';
    }

    const isPercentColumn = columnId.startsWith(
      VARIETY_LEVEL_PERCENT_COLUMN_PREFIX
    );
    const grade = isPercentColumn
      ? columnId.replace(VARIETY_LEVEL_PERCENT_COLUMN_PREFIX, '')
      : columnId.replace(VARIETY_LEVEL_COLUMN_PREFIX, '');

    if (isContractFarmingCutGrade(grade)) {
      return <span className="block leading-tight">Cut</span>;
    }

    return (
      <span className="block leading-tight">
        {grade}
        <br />
        <span className="text-muted-foreground text-[10px] font-normal tracking-normal normal-case">
          {isPercentColumn ? '(%)' : '(MM)'}
        </span>
      </span>
    );
  }, []);

  const renderLeafResizeHandle = React.useCallback(
    (columnId: string) => {
      const column =
        visibleColumnById.get(columnId) ?? table.getColumn(columnId);
      const header = leafHeaderByColumnId.get(columnId);
      if (!column || !header) return null;
      return (
        <div
          onDoubleClick={(event) => {
            event.preventDefault();
            column.resetSize();
          }}
          onMouseDown={(event) => {
            header.getResizeHandler()(event);
          }}
          onTouchStart={(event) => {
            header.getResizeHandler()(event);
          }}
          role="presentation"
          onClick={(event) => event.stopPropagation()}
          className="hover:bg-primary/25 absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none bg-transparent transition-colors select-none"
          style={{
            transform:
              columnResizeMode === 'onEnd' && column.getIsResizing()
                ? `translateX(${
                    (columnResizeDirection === 'rtl' ? -1 : 1) *
                    (table.getState().columnSizingInfo.deltaOffset ?? 0)
                  }px)`
                : '',
          }}
        />
      );
    },
    [
      columnResizeDirection,
      columnResizeMode,
      leafHeaderByColumnId,
      table,
      visibleColumnById,
    ]
  );

  const renderLeafHeaderCell = React.useCallback(
    (columnId: string, label: React.ReactNode) => {
      const column = visibleColumnById.get(columnId);
      if (!column) return null;
      return (
        <th
          key={columnId}
          className={`${CF_HEADER_CELL_CLASS} relative`}
          style={{
            width: column.getSize(),
            minWidth: column.getSize(),
          }}
        >
          {renderLeafSortHeader(columnId, label)}
          {renderLeafResizeHandle(columnId)}
        </th>
      );
    },
    [renderLeafResizeHandle, renderLeafSortHeader, visibleColumnById]
  );

  return (
    <div
      className="subtle-scrollbar border-primary/15 bg-card/95 ring-primary/5 relative overflow-x-auto overflow-y-auto rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.06)] ring-1"
      style={{
        direction: columnResizeDirection,
        position: 'relative',
      }}
    >
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
              {visibleLeadingNonBuyBackBaseColumnIds.map((columnId) => {
                const column = visibleColumnById.get(columnId);
                if (!column) return null;
                return (
                  <th
                    key={columnId}
                    rowSpan={2}
                    className={`${CF_HEADER_CELL_CLASS} relative`}
                    style={{
                      width: column.getSize(),
                      minWidth: column.getSize(),
                    }}
                  >
                    {renderLeafSortHeader(columnId, getColumnLabel(columnId))}
                    {renderLeafResizeHandle(columnId)}
                  </th>
                );
              })}
              {hasVisibleBuyBack ? (
                <th
                  colSpan={visibleBuyBackColumnIds.length}
                  className={CF_HEADER_CELL_CLASS}
                >
                  Buy back
                </th>
              ) : null}
              <th
                colSpan={
                  visibleGradeColumnIds.length +
                  (hasNoGradesPlaceholder ? 1 : 0)
                }
                className={CF_HEADER_CELL_CLASS}
              >
                Grading
              </th>
              {TRAILING_TWO_ROW_HEADER_COLUMN_IDS.map((columnId) => {
                const col = visibleColumnById.get(columnId);
                if (!col) return null;
                const width = col.getSize();
                return (
                  <th
                    key={columnId}
                    rowSpan={2}
                    className={`${CF_HEADER_CELL_CLASS} relative`}
                    style={{
                      width,
                      minWidth: width,
                    }}
                  >
                    {renderLeafSortHeader(columnId, getColumnLabel(columnId))}
                    {renderLeafResizeHandle(columnId)}
                  </th>
                );
              })}
            </tr>
            <tr>
              {visibleBuyBackColumnIds.map((columnId) => {
                return renderLeafHeaderCell(columnId, getColumnLabel(columnId));
              })}
              {visibleGradeColumnIds.map((columnId) => {
                return renderLeafHeaderCell(
                  columnId,
                  renderGradeHeaderContent(columnId)
                );
              })}
              {hasNoGradesPlaceholder ? (
                <th className={CF_HEADER_CELL_CLASS}>No grades</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => {
                const isGroupedRow = row.getIsGrouped();
                const firstSubRowAccount =
                  row.subRows[0]?.original?.accountNumber;
                const isClubbedFamilyGroupRow =
                  isClubFamiliesMode &&
                  row.depth === 0 &&
                  typeof firstSubRowAccount === 'number' &&
                  clubFamilyBaseSet.has(Math.trunc(firstSubRowAccount));
                const stripingClass =
                  rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/25';
                const groupedDepthTint = isClubbedFamilyGroupRow
                  ? 'bg-yellow-100/70 hover:bg-yellow-100'
                  : row.depth <= 0
                    ? 'bg-primary/[0.09] hover:bg-primary/[0.13]'
                    : row.depth === 1
                      ? 'bg-primary/[0.05] hover:bg-primary/[0.09]'
                      : 'bg-muted/50 hover:bg-muted/60';
                return (
                  <tr
                    key={row.id}
                    className={`border-border/40 border-t ${
                      isGroupedRow
                        ? `border-t-primary/30 border-l-primary/55 border-l-[3px] border-solid ${groupedDepthTint}`
                        : `hover:bg-accent/40 border-l border-dashed border-l-transparent ${stripingClass}`
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const columnId = cell.column.id;
                      const isGroupedCell = cell.getIsGrouped();
                      const isAggregatedCell = cell.getIsAggregated();
                      const isPlaceholderCell = cell.getIsPlaceholder();
                      const shouldSuppressAggregation =
                        isAggregatedCell && columnId === 'noGrades';
                      const alignRight = isNumericSortColumnId(columnId);
                      const width = cell.column.getSize();
                      return (
                        <td
                          key={cell.id}
                          style={{ width, minWidth: width }}
                          className={`${CF_BODY_CELL_CLASS} ${
                            alignRight ? 'text-right tabular-nums' : ''
                          } ${
                            columnId === 'farmer' && !isGroupedRow
                              ? 'max-w-56'
                              : ''
                          } ${columnId === 'noGrades' ? 'text-center' : ''}`}
                        >
                          {isGroupedCell ? (
                            <button
                              type="button"
                              onClick={row.getToggleExpandedHandler()}
                              className={`font-custom focus-visible:ring-primary inline-flex items-center gap-1 rounded text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
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
                              <span className="text-muted-foreground/50 font-custom text-sm">
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
                        </td>
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
            {footerCells ? (
              <tr className="bg-muted/45 border-border/70 border-t-2">
                {visibleColumnIds.map((columnId) => {
                  const column = visibleColumnById.get(columnId);
                  if (!column) return null;
                  const width = column.getSize();
                  const text = footerCells[columnId] ?? '';
                  const alignRight = isNumericSortColumnId(columnId);
                  return (
                    <td
                      key={`cf-footer-${columnId}`}
                      className={`${CF_BODY_CELL_CLASS} text-foreground font-custom font-semibold ${
                        alignRight ? 'text-right tabular-nums' : ''
                      } ${
                        columnId === 'noGrades' ? 'text-center font-medium' : ''
                      }`}
                      style={{ width, minWidth: width }}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </div>
  );
}
