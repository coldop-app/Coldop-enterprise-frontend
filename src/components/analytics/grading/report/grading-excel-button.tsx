import * as React from 'react';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  isGradingSplitSpanColumn,
  type GradingReportTableRow,
} from './columns';
import {
  GRADING_BAG_SIZE_COLUMN_ID_TO_CANON,
  GRADING_BAG_SIZE_COLUMN_ORDER,
  getGradingBagSizeColumnId,
  gradingBagSizeColumnHeaderText,
} from './column-meta';
import { gradingColumnLabels } from './view-filters-sheet/constants';

const COLORS = {
  titleBg: 'FFFFFFFF',
  titleFg: 'FF1A4731',
  subtitleBg: 'FFFFFFFF',
  subtitleFg: 'FF1F2937',
  dateBg: 'FFFFFFFF',
  dateFg: 'FF6B7280',
  headerBg: 'FF2D7A50',
  headerFg: 'FFFFFFFF',
  rowEven: 'FFEFF8F3',
  rowOdd: 'FFFFFFFF',
  totalRowBg: 'FFDCEFE4',
  totalRowFg: 'FF1A4731',
  borderColor: 'FFB8DEC9',
} as const;

const FONTS = {
  title: { name: 'Calibri', size: 20, bold: true },
  subtitle: { name: 'Calibri', size: 13, bold: false },
  date: { name: 'Calibri', size: 10, bold: false, italic: true },
  colHeader: { name: 'Calibri', size: 10, bold: true },
  body: { name: 'Calibri', size: 10, bold: false },
} as const;

const SMART_NUMBER_FORMAT = '#,##0.##';

/**
 * Coerces a value to a number if it is a clean numeric string.
 * Returns the original value for anything else (dates, text, empty strings).
 */
function coerceToNumber(value: string | number): string | number {
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  if (trimmed === '') return value;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return value;
}

function coerceRows(
  rows: Array<Array<string | number>>
): Array<Array<string | number>> {
  return rows.map((row) => row.map(coerceToNumber));
}

function estimateColWidth(
  headerLabel: string,
  bodyRows: Array<Array<string | number>>,
  colIndex: number
): number {
  const longestHeaderWord = headerLabel
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 0);

  let maxDataChars = 0;
  for (const row of bodyRows) {
    const cell = row[colIndex];
    if (cell !== '' && cell != null) {
      const str =
        typeof cell === 'number' ? cell.toLocaleString('en-IN') : String(cell);
      maxDataChars = Math.max(maxDataChars, str.length);
    }
  }

  const computed = Math.max(longestHeaderWord, maxDataChars) + 2;
  return Math.min(40, Math.max(10, computed));
}

function applySmartColumnWidths(
  ws: ExcelJS.Worksheet,
  headers: string[],
  allBodyRows: Array<Array<string | number>>
) {
  ws.columns = headers.map((header, i) => ({
    key: `c${i}`,
    width: estimateColWidth(header, allBodyRows, i),
  }));
}

function safeFilePart(value: string, fallback: string): string {
  const safe = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ');
  return safe || fallback;
}

const GRADING_SUM_COLUMN_IDS = new Set<string>([
  'incomingBagsReceived',
  'incomingGrossKg',
  'incomingTareKg',
  'incomingNetKg',
  'incomingBardanaWeightKg',
  'incomingNetWeightWithoutBardana',
  'gradedBags',
  'gradingBardanaWeightKg',
  'netWeightAfterGradingWithoutBardana',
  ...GRADING_BAG_SIZE_COLUMN_ORDER.map((label) =>
    getGradingBagSizeColumnId(label)
  ),
]);

const GRADING_DEDUP_SUM_COLUMN_IDS = new Set<string>([
  'gradedBags',
  'gradingBardanaWeightKg',
  'netWeightAfterGradingWithoutBardana',
  'wastagePercent',
  ...GRADING_BAG_SIZE_COLUMN_ORDER.map((label) =>
    getGradingBagSizeColumnId(label)
  ),
]);

/** Columns where Excel shows numbers (and '-' for zero) — used to right-align dash placeholder. */
const EXCEL_NUMERIC_DISPLAY_COLUMN_IDS = new Set<string>([
  ...GRADING_SUM_COLUMN_IDS,
  'wastagePercent',
  'gatePassNo',
]);

function collectLeafRows(
  rows: Row<GradingReportTableRow>[]
): Row<GradingReportTableRow>[] {
  const out: Row<GradingReportTableRow>[] = [];
  for (const row of rows) {
    if (row.subRows.length > 0) {
      out.push(...collectLeafRows(row.subRows));
    } else {
      out.push(row);
    }
  }
  return out;
}

function bagSizeColumnHasAnyNonZero(
  columnId: string,
  leafRows: Row<GradingReportTableRow>[]
): boolean {
  for (const row of leafRows) {
    if (toSumNumber(row.getValue(columnId)) !== 0) return true;
  }
  return false;
}

/** Column accessors often expose Indian-formatted weight strings; strip grouping commas before parsing. */
function toSumNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '' || t === '-') return 0;
    const n = Number(t.replace(/,/g, ''));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function collectGradingLeafColumnSums(
  rows: Row<GradingReportTableRow>[],
  sums: Record<string, number>
): void {
  const seenGatePassIdsByColumn = new Map<string, Set<string>>();
  collectGradingLeafColumnSumsInternal(rows, sums, seenGatePassIdsByColumn);
}

function collectGradingLeafColumnSumsInternal(
  rows: Row<GradingReportTableRow>[],
  sums: Record<string, number>,
  seenGatePassIdsByColumn: Map<string, Set<string>>
): void {
  for (const row of rows) {
    if (row.subRows.length > 0) {
      collectGradingLeafColumnSumsInternal(
        row.subRows,
        sums,
        seenGatePassIdsByColumn
      );
      continue;
    }
    for (const id of GRADING_SUM_COLUMN_IDS) {
      if (GRADING_DEDUP_SUM_COLUMN_IDS.has(id)) {
        const gatePassId = row.original.gradingGatePass?._id;
        if (gatePassId) {
          const seenGatePassIds =
            seenGatePassIdsByColumn.get(id) ?? new Set<string>();
          if (seenGatePassIds.has(gatePassId)) continue;
          seenGatePassIds.add(gatePassId);
          seenGatePassIdsByColumn.set(id, seenGatePassIds);
        }
      }
      sums[id] = (sums[id] ?? 0) + toSumNumber(row.getValue(id));
    }
  }
}

function buildGradingTotalsRowValues(
  visibleColumns: ReturnType<
    Table<GradingReportTableRow>['getVisibleLeafColumns']
  >,
  sums: Record<string, number>
): Array<string | number> {
  return visibleColumns.map((col, idx) => {
    if (idx === 0) return 'Total';
    const id = col.id;
    if (GRADING_SUM_COLUMN_IDS.has(id)) {
      const s = sums[id] ?? 0;
      return s === 0 ? '-' : s;
    }
    return '';
  });
}

function addTotalsRow(
  ws: ExcelJS.Worksheet,
  values: Array<string | number>,
  columnIds: string[]
) {
  const exRow = ws.addRow(values);
  exRow.height = 24;
  exRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const rawVal = values[colNumber - 1];
    const colId = columnIds[colNumber - 1];
    applyFill(cell, COLORS.totalRowBg);
    applyBorder(cell, COLORS.borderColor);
    cell.font = {
      ...FONTS.body,
      bold: true,
      color: { argb: COLORS.totalRowFg },
    };
    const isNumeric = typeof rawVal === 'number';
    const isDashNumeric =
      rawVal === '-' &&
      colId != null &&
      EXCEL_NUMERIC_DISPLAY_COLUMN_IDS.has(colId);
    cell.alignment = {
      horizontal: isNumeric || isDashNumeric ? 'right' : 'left',
      vertical: 'middle',
    };
    if (isNumeric) {
      cell.numFmt = SMART_NUMBER_FORMAT;
    }
  });
}

function replaceZerosWithDash(
  rows: Array<Array<string | number>>
): Array<Array<string | number>> {
  return rows.map((row) => row.map((cell) => (cell === 0 ? '-' : cell)));
}

type GradingExcelButtonProps = {
  table: Table<GradingReportTableRow>;
  coldStorageName: string;
};

function getColumnHeaderLabel(
  column: ReturnType<
    Table<GradingReportTableRow>['getVisibleLeafColumns']
  >[number]
): string {
  const bagSizeCanonLabel = GRADING_BAG_SIZE_COLUMN_ID_TO_CANON.get(column.id);
  if (bagSizeCanonLabel) {
    return gradingBagSizeColumnHeaderText(bagSizeCanonLabel);
  }

  const mappedLabel = gradingColumnLabels[column.id];
  if (mappedLabel) return mappedLabel;

  const headerDefinition = column.columnDef.header;
  if (typeof headerDefinition === 'string') return headerDefinition;
  if (typeof column.columnDef.meta === 'string') return column.columnDef.meta;
  return column.id;
}

function extractTextFromNode(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join('').trim();
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromNode(node.props.children);
  }
  return '';
}

function getRenderedHeaderLabel(
  table: Table<GradingReportTableRow>,
  column: ReturnType<
    Table<GradingReportTableRow>['getVisibleLeafColumns']
  >[number]
): string {
  for (const headerGroup of table.getHeaderGroups()) {
    const header = headerGroup.headers.find(
      (h) => h.column.id === column.id && !h.isPlaceholder
    );
    if (header) {
      const rendered = flexRender(
        header.column.columnDef.header,
        header.getContext()
      );
      const text = extractTextFromNode(rendered).trim();
      if (text.length > 0) return text;
    }
  }

  const mapped = gradingColumnLabels[column.id];
  if (mapped) return mapped;

  return getColumnHeaderLabel(column);
}

function getDayOrdinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function getExportDateLabel(date: Date): string {
  const day = getDayOrdinal(date.getDate());
  const month = date.toLocaleString('en-IN', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function normalizeExcelValue(
  value: unknown,
  columnId: string
): string | number {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (columnId.startsWith('bagSize__') && typeof value === 'object') {
    const withTotal = value as { totalQuantity?: unknown };
    if (typeof withTotal.totalQuantity === 'number')
      return withTotal.totalQuantity;
  }

  return String(value);
}

function getExcelBodyRows(
  rows: Row<GradingReportTableRow>[],
  visibleColumns: ReturnType<
    Table<GradingReportTableRow>['getVisibleLeafColumns']
  >,
  hideGroupedAggregations: boolean,
  suppressRepeatedMergedCells: boolean
): Array<{
  values: Array<string | number>;
  boldByColumn: boolean[];
  isGroupedOrAggregatedRow: boolean;
}> {
  const columnIndexById = new Map(
    visibleColumns.map((column, i) => [column.id, i])
  );
  const bodyRows: Array<{
    values: Array<string | number>;
    boldByColumn: boolean[];
    isGroupedOrAggregatedRow: boolean;
  }> = [];

  const appendRows = (tableRows: Row<GradingReportTableRow>[]) => {
    for (const row of tableRows) {
      const nextRow: Array<string | number> = Array(visibleColumns.length).fill(
        ''
      );
      const boldByColumn: boolean[] = Array(visibleColumns.length).fill(false);
      let hasGroupedOrAggregatedCell = false;

      for (const cell of row.getVisibleCells()) {
        const columnId = cell.column.id;
        const columnIndex = columnIndexById.get(columnId);
        if (columnIndex == null) continue;
        const isGroupedCell = cell.getIsGrouped();
        const isAggregatedCell = cell.getIsAggregated();
        const isPlaceholderCell = cell.getIsPlaceholder();
        const hideRepeatedMergedCell =
          suppressRepeatedMergedCells &&
          !isGroupedCell &&
          !isAggregatedCell &&
          !isPlaceholderCell &&
          !isGradingSplitSpanColumn(cell.column) &&
          !row.original.isFirstOfMergedBlock;

        if (hideRepeatedMergedCell) {
          nextRow[columnIndex] = '';
        } else if (isGroupedCell) {
          hasGroupedOrAggregatedCell = true;
          const groupedValue = row.getValue(columnId);
          nextRow[columnIndex] =
            `${String(groupedValue ?? '')} (${row.subRows.length})`;
          boldByColumn[columnIndex] = true;
        } else if (isAggregatedCell) {
          hasGroupedOrAggregatedCell = true;
          nextRow[columnIndex] = hideGroupedAggregations
            ? ''
            : normalizeExcelValue(row.getValue(columnId), columnId);
          if (!hideGroupedAggregations) {
            boldByColumn[columnIndex] = true;
          }
        } else if (isPlaceholderCell) {
          nextRow[columnIndex] = '';
        } else {
          nextRow[columnIndex] = normalizeExcelValue(
            row.getValue(columnId),
            columnId
          );
        }
      }

      bodyRows.push({
        values: nextRow,
        boldByColumn,
        isGroupedOrAggregatedRow:
          row.getIsGrouped() || hasGroupedOrAggregatedCell,
      });
      if (row.getIsGrouped() && row.subRows.length > 0) appendRows(row.subRows);
    }
  };

  appendRows(rows);
  return bodyRows;
}

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function applyBorder(cell: ExcelJS.Cell, color: string) {
  const border = {
    style: 'thin' as ExcelJS.BorderStyle,
    color: { argb: color },
  };
  cell.border = { top: border, bottom: border, left: border, right: border };
}

export const GradingExcelButton = ({
  table,
  coldStorageName,
}: GradingExcelButtonProps) => {
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);
  const tableRef = React.useRef(table);
  React.useEffect(() => {
    tableRef.current = table;
  }, [table]);
  const generatingExcelRef = React.useRef(false);

  const handleGenerate = React.useCallback(async () => {
    if (generatingExcelRef.current) return;
    const t = tableRef.current;
    if (!t) {
      window.alert('Table is not ready. Please try again.');
      return;
    }

    try {
      generatingExcelRef.current = true;
      setIsGeneratingExcel(true);

      const visibleColumns = t.getVisibleLeafColumns();
      const isGroupedExport = t.getState().grouping.length > 0;
      const sourceRows = isGroupedExport
        ? t.getPrePaginationRowModel().rows
        : t.getRowModel().rows;
      // Keep grouped aggregates visible in export, matching table behavior.
      const hideGroupedAggregations = false;
      // Match digital table behavior for merged grading gate pass cells.
      const suppressRepeatedMergedCells = true;

      const leafRows = collectLeafRows(sourceRows);
      const exportColumns = visibleColumns.filter((col) => {
        if (!col.id.startsWith('bagSize__')) return true;
        return bagSizeColumnHasAnyNonZero(col.id, leafRows);
      });

      const columnCount = exportColumns.length;
      const exportColumnIds = exportColumns.map((c) => c.id);
      const headerLabels = exportColumns.map((column) =>
        getRenderedHeaderLabel(t, column)
      );
      const bodyRows = getExcelBodyRows(
        sourceRows,
        exportColumns,
        hideGroupedAggregations,
        suppressRepeatedMergedCells
      );

      const sums: Record<string, number> = {};
      collectGradingLeafColumnSums(sourceRows, sums);
      const totalsRowValues = buildGradingTotalsRowValues(exportColumns, sums);

      const safeName = safeFilePart(coldStorageName, 'Cold Storage');

      const dateLabel = getExportDateLabel(new Date());
      const fileName = `${safeName} Grading Report ${dateLabel}.xlsx`;

      const styledBodyRows = bodyRows.map((row) => ({
        values: replaceZerosWithDash(coerceRows([row.values]))[0],
        boldByColumn: row.boldByColumn,
        isGroupedOrAggregatedRow: row.isGroupedOrAggregatedRow,
      }));
      const allRowsForWidth = [
        ...styledBodyRows.map((row) => row.values),
        totalsRowValues,
      ];

      const workbook = new ExcelJS.Workbook();
      workbook.creator = safeName;
      const worksheet = workbook.addWorksheet('Grading Report');

      applySmartColumnWidths(worksheet, headerLabels, allRowsForWidth);

      const titleRow = worksheet.addRow([
        safeName,
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(1, 1, 1, columnCount);
      titleRow.height = 40;
      titleRow.getCell(1).value = safeName;
      titleRow.getCell(1).font = {
        ...FONTS.title,
        color: { argb: COLORS.titleFg },
      };
      applyFill(titleRow.getCell(1), COLORS.titleBg);
      titleRow.getCell(1).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };

      const subtitleRow = worksheet.addRow([
        'Grading Report',
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(2, 1, 2, columnCount);
      subtitleRow.height = 26;
      subtitleRow.getCell(1).value = 'Grading Report';
      subtitleRow.getCell(1).font = {
        ...FONTS.subtitle,
        color: { argb: COLORS.subtitleFg },
      };
      applyFill(subtitleRow.getCell(1), COLORS.subtitleBg);
      subtitleRow.getCell(1).alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };

      const dateRow = worksheet.addRow([
        `Generated on: ${dateLabel}`,
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(3, 1, 3, columnCount);
      dateRow.height = 20;
      const dateCell = dateRow.getCell(1);
      dateCell.value = `Generated on: ${dateLabel}`;
      dateCell.font = { ...FONTS.date, color: { argb: COLORS.dateFg } };
      applyFill(dateCell, COLORS.dateBg);
      dateCell.alignment = { horizontal: 'left', vertical: 'middle' };

      const poweredByRow = worksheet.addRow([
        'Powered by Coldop',
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(4, 1, 4, columnCount);
      poweredByRow.height = 18;
      const poweredByCell = poweredByRow.getCell(1);
      poweredByCell.value = 'Powered by Coldop';
      poweredByCell.font = {
        name: 'Calibri',
        size: 9,
        italic: true,
        color: { argb: 'FF9CA3AF' },
      };
      poweredByCell.alignment = { horizontal: 'left', vertical: 'middle' };

      worksheet.addRow([]);

      const columnHeaderRow = worksheet.addRow(headerLabels);
      columnHeaderRow.height = 36;
      columnHeaderRow.eachCell((cell) => {
        applyFill(cell, COLORS.headerBg);
        applyBorder(cell, COLORS.borderColor);
        cell.font = { ...FONTS.colHeader, color: { argb: COLORS.headerFg } };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          wrapText: true,
        };
      });

      styledBodyRows.forEach((dataRow) => {
        const excelRow = worksheet.addRow(dataRow.values);
        const background = dataRow.isGroupedOrAggregatedRow
          ? COLORS.rowEven
          : COLORS.rowOdd;
        excelRow.height = 22;

        excelRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          applyFill(cell, background);
          applyBorder(cell, COLORS.borderColor);
          cell.font = {
            ...FONTS.body,
            bold: dataRow.boldByColumn[columnNumber - 1] === true,
            color: { argb: 'FF1F2937' },
          };
          const raw = dataRow.values[columnNumber - 1];
          const colId = exportColumnIds[columnNumber - 1];
          const isNumber = typeof raw === 'number';
          const isDashNumeric =
            raw === '-' &&
            colId != null &&
            EXCEL_NUMERIC_DISPLAY_COLUMN_IDS.has(colId);
          if (isNumber) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = SMART_NUMBER_FORMAT;
          } else if (isDashNumeric) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      addTotalsRow(worksheet, totalsRowValues, exportColumnIds);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      window.alert(`Failed to generate Excel: ${message}`);
    } finally {
      generatingExcelRef.current = false;
      setIsGeneratingExcel(false);
    }
  }, [coldStorageName]);

  return (
    <Button
      type="button"
      variant="default"
      className="font-custom h-9 rounded-lg px-4 text-sm leading-none shadow-sm"
      disabled={isGeneratingExcel || !table}
      onClick={handleGenerate}
    >
      {isGeneratingExcel ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-3.5 w-3.5" />
      )}
      {isGeneratingExcel ? 'Generating...' : 'Excel'}
    </Button>
  );
};
