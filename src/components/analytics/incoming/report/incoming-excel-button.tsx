import * as React from 'react';
import type { Row, Table } from '@tanstack/react-table';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button } from '@/components/ui/button';
import type { IncomingReportRow } from './columns';

// ─── Color palette: clean header block + green-accented table ────────────────
const COLORS = {
  titleBg: 'FFFFFFFF',
  titleFg: 'FF1A4731', // deep forest green
  subtitleBg: 'FFFFFFFF',
  subtitleFg: 'FF1F2937', // near-black
  dateBg: 'FFFFFFFF',
  dateFg: 'FF6B7280', // muted grey
  headerBg: 'FF2D7A50', // mid green
  headerFg: 'FFFFFFFF',
  rowEven: 'FFEFF8F3', // very light mint
  rowOdd: 'FFFFFFFF',
  borderColor: 'FFB8DEC9', // soft sage
  divider: 'FF2D7A50', // green divider under date row
} as const;

// ─── Font definitions ─────────────────────────────────────────────────────────
const FONTS = {
  title: { name: 'Calibri', size: 20, bold: true },
  subtitle: { name: 'Calibri', size: 13, bold: false },
  date: { name: 'Calibri', size: 10, bold: false, italic: true },
  colHeader: { name: 'Calibri', size: 10, bold: true },
  body: { name: 'Calibri', size: 10, bold: false },
} as const;

type IncomingExcelButtonProps = {
  table: Table<IncomingReportRow>;
  coldStorageName: string;
};

function getColumnHeaderLabel(
  column: ReturnType<Table<IncomingReportRow>['getVisibleLeafColumns']>[number]
): string {
  const headerDefinition = column.columnDef.header;
  if (typeof headerDefinition === 'string') return headerDefinition;
  if (typeof column.columnDef.meta === 'string') return column.columnDef.meta;
  return column.id;
}

function getDayOrdinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function getIncomingReportExportDateLabel(date: Date): string {
  const day = getDayOrdinal(date.getDate());
  const month = date.toLocaleString('en-IN', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function getExcelBodyRows(
  rows: Row<IncomingReportRow>[],
  visibleColumns: ReturnType<Table<IncomingReportRow>['getVisibleLeafColumns']>
): Array<Array<string | number>> {
  const columnIndexById = new Map(visibleColumns.map((col, i) => [col.id, i]));
  const bodyRows: Array<Array<string | number>> = [];

  const appendRows = (tableRows: Row<IncomingReportRow>[]) => {
    for (const row of tableRows) {
      const nextRow: Array<string | number> = Array(visibleColumns.length).fill(
        ''
      );

      for (const cell of row.getVisibleCells()) {
        const colId = cell.column.id;
        const colIdx = columnIndexById.get(colId);
        if (colIdx == null) continue;

        const isGrouped = cell.getIsGrouped();
        const isAggregated = cell.getIsAggregated();
        const isPlaceholder = cell.getIsPlaceholder();
        const suppressAgg =
          isAggregated &&
          (colId === 'gatePassNo' || colId === 'manualGatePassNumber');

        if (isGrouped) {
          const v = row.getValue(colId);
          nextRow[colIdx] =
            `${'  '.repeat(row.depth)}${String(v ?? '')} (${row.subRows.length})`;
        } else if (isAggregated) {
          nextRow[colIdx] = suppressAgg
            ? '-'
            : ((row.getValue(colId) ?? '') as string | number);
        } else if (isPlaceholder) {
          nextRow[colIdx] = '';
        } else {
          const v = row.getValue(colId);
          nextRow[colIdx] = v == null ? '' : (v as string | number);
        }
      }

      bodyRows.push(nextRow);
      if (row.getIsGrouped() && row.subRows.length > 0) appendRows(row.subRows);
    }
  };

  appendRows(rows);
  return bodyRows;
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function applyBorder(cell: ExcelJS.Cell, color: string) {
  const c = { style: 'thin' as ExcelJS.BorderStyle, color: { argb: color } };
  cell.border = { top: c, bottom: c, left: c, right: c };
}

// ─── Main component ───────────────────────────────────────────────────────────

export const IncomingExcelButton = ({
  table,
  coldStorageName,
}: IncomingExcelButtonProps) => {
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);

  const handleGenerate = React.useCallback(async () => {
    if (isGeneratingExcel) return;
    try {
      setIsGeneratingExcel(true);

      const visibleColumns = table.getVisibleLeafColumns();
      const colCount = visibleColumns.length;
      const headerLabels = visibleColumns.map(getColumnHeaderLabel);

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
      const dateLabel = getIncomingReportExportDateLabel(new Date());
      const fileName = `${safeName} Incoming Report ${dateLabel}.xlsx`;

      // ── Build workbook ──────────────────────────────────────────────────────
      const wb = new ExcelJS.Workbook();
      wb.creator = safeName;
      const ws = wb.addWorksheet('Incoming Report');

      // ── Column widths ───────────────────────────────────────────────────────
      ws.columns = visibleColumns.map((col, i) => ({
        key: String(i),
        width: Math.max(14, Math.round(col.getSize() / 7.5)),
      }));

      // ── Row 1: Cold storage name ────────────────────────────────────────────
      const titleRow = ws.addRow([safeName, ...Array(colCount - 1).fill('')]);
      ws.mergeCells(1, 1, 1, colCount);
      titleRow.height = 36;
      titleRow.getCell(1).value = safeName;
      titleRow.getCell(1).font = {
        ...FONTS.title,
        color: { argb: COLORS.titleFg },
      };
      titleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.titleBg },
      };
      titleRow.getCell(1).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      // ── Row 2: Report label ─────────────────────────────────────────────────
      const subtitleRow = ws.addRow([
        'Incoming Report',
        ...Array(colCount - 1).fill(''),
      ]);
      ws.mergeCells(2, 1, 2, colCount);
      subtitleRow.height = 22;
      subtitleRow.getCell(1).value = 'Incoming Report';
      subtitleRow.getCell(1).font = {
        ...FONTS.subtitle,
        color: { argb: COLORS.subtitleFg },
      };
      subtitleRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.subtitleBg },
      };
      subtitleRow.getCell(1).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };

      // ── Row 3: Generated date ───────────────────────────────────────────────
      const dateRow = ws.addRow([
        `Generated on: ${dateLabel}`,
        ...Array(colCount - 1).fill(''),
      ]);
      ws.mergeCells(3, 1, 3, colCount);
      dateRow.height = 18;
      const dateCell = dateRow.getCell(1);
      dateCell.value = `Generated on: ${dateLabel}`;
      dateCell.font = { ...FONTS.date, color: { argb: COLORS.dateFg } };
      dateCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.dateBg },
      };
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' };

      // ── Row 4: Powered by ───────────────────────────────────────────────────
      const poweredByRow = ws.addRow([
        'Powered by Coldop',
        ...Array(colCount - 1).fill(''),
      ]);
      ws.mergeCells(4, 1, 4, colCount);
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

      // ── Row 5: Spacer ───────────────────────────────────────────────────────
      ws.addRow([]);

      // ── Row 6: Column headers ───────────────────────────────────────────────
      const colHeaderRow = ws.addRow(headerLabels);
      colHeaderRow.height = 24;
      colHeaderRow.eachCell((cell) => {
        applyFill(cell, COLORS.headerBg);
        applyBorder(cell, COLORS.borderColor);
        cell.font = { ...FONTS.colHeader, color: { argb: COLORS.headerFg } };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
      });

      // ── Data rows with zebra striping ───────────────────────────────────────
      bodyRows.forEach((dataRow, idx) => {
        const exRow = ws.addRow(dataRow);
        const bgArgb = idx % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
        exRow.height = 18;
        exRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          applyFill(cell, bgArgb);
          applyBorder(cell, COLORS.borderColor);
          cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
          cell.alignment = { vertical: 'middle' };

          if (typeof dataRow[colNumber - 1] === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0.##';
          }
        });
      });

      // ── Download ────────────────────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
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
