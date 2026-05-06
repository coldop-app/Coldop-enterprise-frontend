import * as React from 'react';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isNumericSortColumnId } from './columns';
import type { FlattenedRow } from './types';

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

type ContractFarmingExcelButtonProps = {
  table: Table<FlattenedRow>;
  coldStorageName: string;
};

function safeFilePart(value: string, fallback: string): string {
  const safe = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ');
  return safe || fallback;
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
  table: Table<FlattenedRow>,
  column: ReturnType<Table<FlattenedRow>['getVisibleLeafColumns']>[number]
): string {
  const flatHeader = table
    .getFlatHeaders()
    .find(
      (header) =>
        header.column.id === column.id && header.subHeaders.length === 0
    );

  if (flatHeader && !flatHeader.isPlaceholder) {
    const rendered = flexRender(
      flatHeader.column.columnDef.header,
      flatHeader.getContext()
    );
    const text = extractTextFromNode(rendered);
    if (text) return text;
  }

  const headerDefinition = column.columnDef.header;
  if (typeof headerDefinition === 'string') return headerDefinition;
  if (typeof column.columnDef.meta === 'string') return column.columnDef.meta;
  return column.id;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, '').replace(/[₹%]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildTotalsRow(
  visibleColumnIds: string[],
  rows: Row<FlattenedRow>[]
): Array<string | number> {
  const totals = visibleColumnIds.map((columnId, index) => {
    if (index === 0) return 'Total';
    if (!isNumericSortColumnId(columnId)) return '';

    let sum = 0;
    for (const row of rows) {
      const value = toNumber(row.getValue(columnId));
      if (value != null) sum += value;
    }
    return sum;
  });
  return totals;
}

function getExcelBodyRows(
  rows: Row<FlattenedRow>[],
  visibleColumnIds: string[]
): Array<{
  values: Array<string | number>;
  boldByColumn: boolean[];
  isGroupedOrAggregatedRow: boolean;
}> {
  const out: Array<{
    values: Array<string | number>;
    boldByColumn: boolean[];
    isGroupedOrAggregatedRow: boolean;
  }> = [];
  const columnIndexById = new Map(
    visibleColumnIds.map((columnId, index) => [columnId, index])
  );

  const appendRows = (tableRows: Row<FlattenedRow>[]) => {
    for (const row of tableRows) {
      const nextRow: Array<string | number> = Array(
        visibleColumnIds.length
      ).fill('');
      const boldByColumn: boolean[] = Array(visibleColumnIds.length).fill(
        false
      );
      let hasGroupedOrAggregatedCell = false;

      for (const cell of row.getVisibleCells()) {
        const columnId = cell.column.id;
        const columnIndex = columnIndexById.get(columnId);
        if (columnIndex == null) continue;

        if (cell.getIsGrouped()) {
          hasGroupedOrAggregatedCell = true;
          const groupedValue = row.getValue(columnId);
          const label = groupedValue == null ? '' : String(groupedValue);
          nextRow[columnIndex] =
            `${'  '.repeat(row.depth)}${label} (${row.subRows.length})`;
          boldByColumn[columnIndex] = true;
        } else if (cell.getIsAggregated()) {
          hasGroupedOrAggregatedCell = true;
          const aggregatedValue = row.getValue(columnId);
          if (aggregatedValue == null) {
            nextRow[columnIndex] = '';
          } else if (typeof aggregatedValue === 'number') {
            nextRow[columnIndex] = aggregatedValue;
          } else if (typeof aggregatedValue === 'boolean') {
            nextRow[columnIndex] = aggregatedValue ? 'Yes' : 'No';
          } else {
            nextRow[columnIndex] = String(aggregatedValue);
          }
          boldByColumn[columnIndex] = true;
        } else if (cell.getIsPlaceholder()) {
          nextRow[columnIndex] = '';
        } else {
          const rawValue = row.getValue(columnId);
          if (rawValue == null) {
            nextRow[columnIndex] = '';
          } else if (typeof rawValue === 'number') {
            nextRow[columnIndex] = rawValue;
          } else if (typeof rawValue === 'boolean') {
            nextRow[columnIndex] = rawValue ? 'Yes' : 'No';
          } else {
            nextRow[columnIndex] = String(rawValue);
          }
        }
      }

      out.push({
        values: nextRow,
        boldByColumn,
        isGroupedOrAggregatedRow:
          row.getIsGrouped() || hasGroupedOrAggregatedCell,
      });

      if (row.getIsGrouped() && row.subRows.length > 0) {
        appendRows(row.subRows);
      }
    }
  };

  appendRows(rows);
  return out;
}

function estimateColumnWidth(
  headerLabel: string,
  bodyRows: Array<Array<string | number>>,
  columnIndex: number
): number {
  const longestHeaderWord = headerLabel
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 0);

  let maxDataChars = 0;
  for (const row of bodyRows) {
    const cell = row[columnIndex];
    if (cell !== '' && cell != null) {
      const str =
        typeof cell === 'number' ? cell.toLocaleString('en-IN') : String(cell);
      maxDataChars = Math.max(maxDataChars, str.length);
    }
  }

  const computed = Math.max(longestHeaderWord, maxDataChars) + 2;
  return Math.min(42, Math.max(10, computed));
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

function addTotalsRow(
  worksheet: ExcelJS.Worksheet,
  totalsRowValues: Array<string | number>,
  visibleColumnIds: string[]
) {
  const row = worksheet.addRow(totalsRowValues);
  row.height = 24;
  row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const value = totalsRowValues[columnNumber - 1];
    const columnId = visibleColumnIds[columnNumber - 1];
    applyFill(cell, COLORS.totalRowBg);
    applyBorder(cell, COLORS.borderColor);
    cell.font = {
      ...FONTS.body,
      bold: true,
      color: { argb: COLORS.totalRowFg },
    };
    const isNumeric =
      typeof value === 'number' && isNumericSortColumnId(columnId);
    cell.alignment = {
      horizontal: isNumeric ? 'right' : 'left',
      vertical: 'middle',
    };
    if (isNumeric) cell.numFmt = SMART_NUMBER_FORMAT;
  });
}

export const ContractFarmingExcelButton = ({
  table,
  coldStorageName,
}: ContractFarmingExcelButtonProps) => {
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);
  const tableRef = React.useRef(table);
  const generatingExcelRef = React.useRef(false);

  React.useEffect(() => {
    tableRef.current = table;
  }, [table]);

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
      const visibleColumnIds = visibleColumns.map((column) => column.id);
      const columnCount = visibleColumns.length;
      const headerLabels = visibleColumns.map((column) =>
        getRenderedHeaderLabel(t, column)
      );
      const sourceRows =
        t.getState().grouping.length > 0
          ? t.getPrePaginationRowModel().rows
          : t.getFilteredRowModel().rows;
      const bodyRows = getExcelBodyRows(sourceRows, visibleColumnIds);

      const totalsRowValues = buildTotalsRow(visibleColumnIds, sourceRows);
      const allRowsForWidth = [
        ...bodyRows.map((row) => row.values),
        totalsRowValues,
      ];

      const safeName = safeFilePart(coldStorageName, 'Cold Storage');
      const dateLabel = getExportDateLabel(new Date());
      const fileName = `${safeName} Contract Farming Report ${dateLabel}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = safeName;
      const worksheet = workbook.addWorksheet('Contract Farming Report');

      worksheet.columns = headerLabels.map((header, index) => ({
        key: `c${index}`,
        width: estimateColumnWidth(header, allRowsForWidth, index),
      }));

      const titleRow = worksheet.addRow([
        safeName,
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(1, 1, 1, columnCount);
      titleRow.height = 40;
      const titleCell = titleRow.getCell(1);
      titleCell.value = safeName;
      titleCell.font = { ...FONTS.title, color: { argb: COLORS.titleFg } };
      titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
      applyFill(titleCell, COLORS.titleBg);

      const subtitleRow = worksheet.addRow([
        'Contract Farming Report',
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(2, 1, 2, columnCount);
      subtitleRow.height = 26;
      const subtitleCell = subtitleRow.getCell(1);
      subtitleCell.value = 'Contract Farming Report';
      subtitleCell.font = {
        ...FONTS.subtitle,
        color: { argb: COLORS.subtitleFg },
      };
      subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
      applyFill(subtitleCell, COLORS.subtitleBg);

      const dateRow = worksheet.addRow([
        `Generated on: ${dateLabel}`,
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(3, 1, 3, columnCount);
      dateRow.height = 20;
      const dateCell = dateRow.getCell(1);
      dateCell.value = `Generated on: ${dateLabel}`;
      dateCell.font = { ...FONTS.date, color: { argb: COLORS.dateFg } };
      dateCell.alignment = { horizontal: 'left', vertical: 'middle' };
      applyFill(dateCell, COLORS.dateBg);

      const poweredByRow = worksheet.addRow([
        'Powered by Coldop',
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(4, 1, 4, columnCount);
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

      const headerRow = worksheet.addRow(headerLabels);
      headerRow.height = 36;
      headerRow.eachCell((cell) => {
        applyFill(cell, COLORS.headerBg);
        applyBorder(cell, COLORS.borderColor);
        cell.font = { ...FONTS.colHeader, color: { argb: COLORS.headerFg } };
        cell.alignment = {
          horizontal: 'left',
          vertical: 'middle',
          wrapText: true,
        };
      });

      bodyRows.forEach((bodyRow) => {
        const excelRow = worksheet.addRow(bodyRow.values);
        excelRow.height = 22;
        const bgArgb = bodyRow.isGroupedOrAggregatedRow
          ? COLORS.rowEven
          : COLORS.rowOdd;
        excelRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          const value = bodyRow.values[columnNumber - 1];
          const columnId = visibleColumnIds[columnNumber - 1];
          applyFill(cell, bgArgb);
          applyBorder(cell, COLORS.borderColor);
          cell.font = {
            ...FONTS.body,
            bold: bodyRow.boldByColumn[columnNumber - 1] === true,
            color: { argb: 'FF1F2937' },
          };

          const isNumeric =
            typeof value === 'number' && isNumericSortColumnId(columnId);
          cell.alignment = {
            horizontal: isNumeric ? 'right' : 'left',
            vertical: 'middle',
          };
          if (isNumeric) cell.numFmt = SMART_NUMBER_FORMAT;
        });
      });

      addTotalsRow(worksheet, totalsRowValues, visibleColumnIds);

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
