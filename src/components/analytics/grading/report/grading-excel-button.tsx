import * as React from 'react';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GradingReportTableRow } from './columns';
import {
  GRADING_BAG_SIZE_COLUMN_ID_TO_CANON,
  GRADING_BAG_SIZE_COLUMN_ORDER,
  getGradingBagSizeColumnId,
} from './column-meta';

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
  borderColor: 'FFB8DEC9',
} as const;

const FONTS = {
  title: { name: 'Calibri', size: 20, bold: true },
  subtitle: { name: 'Calibri', size: 13, bold: false },
  date: { name: 'Calibri', size: 10, bold: false, italic: true },
  colHeader: { name: 'Calibri', size: 10, bold: true },
  body: { name: 'Calibri', size: 10, bold: false },
} as const;

type GradingExcelButtonProps = {
  table: Table<GradingReportTableRow>;
  coldStorageName: string;
};

const EXCEL_HEADER_LABEL_OVERRIDES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    GRADING_BAG_SIZE_COLUMN_ORDER.map((sizeLabel) => [
      getGradingBagSizeColumnId(sizeLabel),
      sizeLabel === 'Cut' ? 'Cut' : `${sizeLabel} (mm)`,
    ])
  ),
};

function getColumnHeaderLabel(
  column: ReturnType<
    Table<GradingReportTableRow>['getVisibleLeafColumns']
  >[number]
): string {
  const override = EXCEL_HEADER_LABEL_OVERRIDES[column.id];
  if (override) return override;

  const bagSizeCanonLabel = GRADING_BAG_SIZE_COLUMN_ID_TO_CANON.get(column.id);
  if (bagSizeCanonLabel) {
    return bagSizeCanonLabel === 'Cut' ? 'Cut' : `${bagSizeCanonLabel} (mm)`;
  }

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
  const override = EXCEL_HEADER_LABEL_OVERRIDES[column.id];
  if (override) return override;

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
  >
): Array<Array<string | number>> {
  const columnIndexById = new Map(
    visibleColumns.map((column, i) => [column.id, i])
  );
  const bodyRows: Array<Array<string | number>> = [];

  const appendRows = (tableRows: Row<GradingReportTableRow>[]) => {
    for (const row of tableRows) {
      const nextRow: Array<string | number> = Array(visibleColumns.length).fill(
        ''
      );

      for (const cell of row.getVisibleCells()) {
        const columnId = cell.column.id;
        const columnIndex = columnIndexById.get(columnId);
        if (columnIndex == null) continue;

        if (cell.getIsGrouped()) {
          const groupedValue = row.getValue(columnId);
          nextRow[columnIndex] =
            `${String(groupedValue ?? '')} (${row.subRows.length})`;
        } else if (cell.getIsAggregated()) {
          nextRow[columnIndex] = normalizeExcelValue(
            row.getValue(columnId),
            columnId
          );
        } else if (cell.getIsPlaceholder()) {
          nextRow[columnIndex] = '';
        } else {
          nextRow[columnIndex] = normalizeExcelValue(
            row.getValue(columnId),
            columnId
          );
        }
      }

      bodyRows.push(nextRow);
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

  const handleGenerate = React.useCallback(async () => {
    if (isGeneratingExcel) return;

    try {
      setIsGeneratingExcel(true);

      const visibleColumns = table.getVisibleLeafColumns();
      const columnCount = visibleColumns.length;
      const headerLabels = visibleColumns.map((column) =>
        getRenderedHeaderLabel(table, column)
      );
      const sourceRows =
        table.getState().grouping.length > 0
          ? table.getGroupedRowModel().rows
          : table.getRowModel().rows;
      const bodyRows = getExcelBodyRows(sourceRows, visibleColumns);

      const safeName =
        coldStorageName
          .trim()
          .replace(/[\\/:*?"<>|]/g, '')
          .replace(/\s+/g, ' ') || 'Cold Storage';

      const dateLabel = getExportDateLabel(new Date());
      const fileName = `${safeName} Grading Report ${dateLabel}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = safeName;
      const worksheet = workbook.addWorksheet('Grading Report');

      worksheet.columns = visibleColumns.map((column, i) => ({
        key: String(i),
        width: Math.max(14, Math.round(column.getSize() / 7.5)),
      }));

      const titleRow = worksheet.addRow([
        safeName,
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(1, 1, 1, columnCount);
      titleRow.height = 36;
      titleRow.getCell(1).value = safeName;
      titleRow.getCell(1).font = {
        ...FONTS.title,
        color: { argb: COLORS.titleFg },
      };
      applyFill(titleRow.getCell(1), COLORS.titleBg);
      titleRow.getCell(1).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      const subtitleRow = worksheet.addRow([
        'Grading Report',
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(2, 1, 2, columnCount);
      subtitleRow.height = 22;
      subtitleRow.getCell(1).value = 'Grading Report';
      subtitleRow.getCell(1).font = {
        ...FONTS.subtitle,
        color: { argb: COLORS.subtitleFg },
      };
      applyFill(subtitleRow.getCell(1), COLORS.subtitleBg);
      subtitleRow.getCell(1).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      const dateRow = worksheet.addRow([
        `Generated on: ${dateLabel}`,
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(3, 1, 3, columnCount);
      dateRow.height = 18;
      const dateCell = dateRow.getCell(1);
      dateCell.value = `Generated on: ${dateLabel}`;
      dateCell.font = { ...FONTS.date, color: { argb: COLORS.dateFg } };
      applyFill(dateCell, COLORS.dateBg);
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

      const poweredByRow = worksheet.addRow([
        'Powered by Coldop',
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(4, 1, 4, columnCount);
      poweredByRow.height = 16;
      const poweredByCell = poweredByRow.getCell(1);
      poweredByCell.value = 'Powered by Coldop';
      poweredByCell.font = {
        name: 'Calibri',
        size: 9,
        italic: true,
        color: { argb: 'FF9CA3AF' },
      };
      poweredByCell.alignment = { horizontal: 'center', vertical: 'middle' };

      worksheet.addRow([]);

      const columnHeaderRow = worksheet.addRow(headerLabels);
      columnHeaderRow.height = 24;
      columnHeaderRow.eachCell((cell) => {
        applyFill(cell, COLORS.headerBg);
        applyBorder(cell, COLORS.borderColor);
        cell.font = { ...FONTS.colHeader, color: { argb: COLORS.headerFg } };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      });

      bodyRows.forEach((dataRow, rowIndex) => {
        const excelRow = worksheet.addRow(dataRow);
        const background = rowIndex % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
        excelRow.height = 18;

        excelRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          applyFill(cell, background);
          applyBorder(cell, COLORS.borderColor);
          cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
          cell.alignment = { vertical: 'middle' };

          if (typeof dataRow[columnNumber - 1] === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0.##';
          }
        });
      });

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
      setIsGeneratingExcel(false);
    }
  }, [coldStorageName, isGeneratingExcel, table]);

  return (
    <Button
      type="button"
      variant="default"
      className="h-8 rounded-lg px-4 text-sm leading-none"
      disabled={isGeneratingExcel}
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
