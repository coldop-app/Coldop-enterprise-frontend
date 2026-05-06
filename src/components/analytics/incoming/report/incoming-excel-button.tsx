import * as React from 'react';
import type { Row, Table } from '@tanstack/react-table';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button } from '@/components/ui/button';
import type { IncomingReportRow } from './columns';

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

/** Must match quantity / weight columns on `IncomingReportRow` (not gate pass ids). */
const INCOMING_SUM_COLUMN_IDS = new Set([
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
]);

function toSumNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '' || t === '-') return 0;
    const n = Number(t);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function collectIncomingLeafColumnSums(
  rows: Row<IncomingReportRow>[],
  sums: Record<string, number>
): void {
  for (const row of rows) {
    if (row.subRows.length > 0) {
      collectIncomingLeafColumnSums(row.subRows, sums);
      continue;
    }
    for (const id of INCOMING_SUM_COLUMN_IDS) {
      sums[id] = (sums[id] ?? 0) + toSumNumber(row.getValue(id));
    }
  }
}

function buildIncomingTotalsRowValues(
  visibleColumns: ReturnType<Table<IncomingReportRow>['getVisibleLeafColumns']>,
  sums: Record<string, number>
): Array<string | number> {
  return visibleColumns.map((col, idx) => {
    if (idx === 0) return 'Total';
    if (INCOMING_SUM_COLUMN_IDS.has(col.id)) return sums[col.id] ?? 0;
    return '';
  });
}

type IncomingExcelButtonProps = {
  table: Table<IncomingReportRow>;
  coldStorageName: string;
};

const INCOMING_COLUMN_HEADER_LABELS: Partial<
  Record<keyof IncomingReportRow, string>
> = {
  gatePassNo: 'Gate Pass No',
  manualGatePassNumber: 'Manual Gate Pass No',
  date: 'Date',
  farmerName: 'Farmer',
  farmerAddress: 'Address',
  farmerMobileNumber: 'Mobile Number',
  createdByName: 'Created By',
  variety: 'Variety',
  location: 'Location',
  truckNumber: 'Truck No.',
  bagsReceived: 'Bags',
  grossWeightKg: 'Gross (kg)',
  tareWeightKg: 'Tare (kg)',
  netWeightKg: 'Net (kg)',
  status: 'Status',
  remarks: 'Remarks',
};

function getColumnHeaderLabel(
  column: ReturnType<Table<IncomingReportRow>['getVisibleLeafColumns']>[number]
): string {
  const mappedLabel =
    INCOMING_COLUMN_HEADER_LABELS[
      column.id as keyof typeof INCOMING_COLUMN_HEADER_LABELS
    ];
  if (mappedLabel) return mappedLabel;

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

function getDateLabel(date: Date): string {
  const day = getDayOrdinal(date.getDate());
  const month = date.toLocaleString('en-IN', { month: 'long' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function safeFilePart(value: string, fallback: string): string {
  const safe = value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ');
  return safe || fallback;
}

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

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function applyBorder(cell: ExcelJS.Cell, color: string) {
  const c = { style: 'thin' as ExcelJS.BorderStyle, color: { argb: color } };
  cell.border = { top: c, bottom: c, left: c, right: c };
}

function buildReportHeader(
  ws: ExcelJS.Worksheet,
  colCount: number,
  coldStorageName: string,
  reportName: string,
  dateLabel: string,
  overviewLines: string[] = []
) {
  const titleRow = ws.addRow([
    coldStorageName,
    ...Array(colCount - 1).fill(''),
  ]);
  ws.mergeCells(1, 1, 1, colCount);
  titleRow.height = 40;
  const titleCell = titleRow.getCell(1);
  titleCell.value = coldStorageName;
  titleCell.font = { ...FONTS.title, color: { argb: COLORS.titleFg } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  applyFill(titleCell, COLORS.titleBg);

  const subtitleRow = ws.addRow([reportName, ...Array(colCount - 1).fill('')]);
  ws.mergeCells(2, 1, 2, colCount);
  subtitleRow.height = 26;
  const subtitleCell = subtitleRow.getCell(1);
  subtitleCell.value = reportName;
  subtitleCell.font = { ...FONTS.subtitle, color: { argb: COLORS.subtitleFg } };
  subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  applyFill(subtitleCell, COLORS.subtitleBg);

  const dateRow = ws.addRow([
    `Generated on: ${dateLabel}`,
    ...Array(colCount - 1).fill(''),
  ]);
  ws.mergeCells(3, 1, 3, colCount);
  dateRow.height = 20;
  const dateCell = dateRow.getCell(1);
  dateCell.value = `Generated on: ${dateLabel}`;
  dateCell.font = { ...FONTS.date, color: { argb: COLORS.dateFg } };
  dateCell.alignment = { horizontal: 'left', vertical: 'middle' };
  applyFill(dateCell, COLORS.dateBg);

  const poweredByRow = ws.addRow([
    'Powered by Coldop',
    ...Array(colCount - 1).fill(''),
  ]);
  ws.mergeCells(4, 1, 4, colCount);
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

  for (const line of overviewLines) {
    const row = ws.addRow([line, ...Array(colCount - 1).fill('')]);
    ws.mergeCells(row.number, 1, row.number, colCount);
    row.height = 20;
    const cell = row.getCell(1);
    cell.value = line;
    cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorder(cell, COLORS.borderColor);
  }

  ws.addRow([]);
}

function addStyledTable(
  ws: ExcelJS.Worksheet,
  headers: string[],
  rows: Array<{
    values: Array<string | number>;
    boldByColumn: boolean[];
    isGroupedOrAggregatedRow: boolean;
  }>
) {
  const headerRow = ws.addRow(headers);
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

  rows.forEach((dataRow) => {
    const exRow = ws.addRow(dataRow.values);
    exRow.height = 22;
    const bgArgb = dataRow.isGroupedOrAggregatedRow
      ? COLORS.rowEven
      : COLORS.rowOdd;
    exRow.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      applyFill(cell, bgArgb);
      applyBorder(cell, COLORS.borderColor);
      cell.font = {
        ...FONTS.body,
        bold: dataRow.boldByColumn[colIndex - 1] === true,
        color: { argb: 'FF1F2937' },
      };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };

      if (typeof dataRow.values[colIndex - 1] === 'number') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = SMART_NUMBER_FORMAT;
      }
    });
  });
}

function addTotalsRow(ws: ExcelJS.Worksheet, values: Array<string | number>) {
  const exRow = ws.addRow(values);
  exRow.height = 24;
  exRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const rawVal = values[colNumber - 1];
    applyFill(cell, COLORS.totalRowBg);
    applyBorder(cell, COLORS.borderColor);
    cell.font = {
      ...FONTS.body,
      bold: true,
      color: { argb: COLORS.totalRowFg },
    };
    const isNumeric = typeof rawVal === 'number';
    cell.alignment = {
      horizontal: isNumeric ? 'right' : 'left',
      vertical: 'middle',
    };
    if (isNumeric) {
      cell.numFmt = SMART_NUMBER_FORMAT;
    }
  });
}

function addSectionTitle(
  ws: ExcelJS.Worksheet,
  title: string,
  colCount: number
) {
  const titleRow = ws.addRow([title, ...Array(colCount - 1).fill('')]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);
  titleRow.height = 22;

  const titleCell = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = {
    ...FONTS.subtitle,
    bold: true,
    color: { argb: COLORS.subtitleFg },
  };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  applyFill(titleCell, COLORS.subtitleBg);

  for (let col = 1; col <= colCount; col += 1) {
    applyBorder(titleRow.getCell(col), COLORS.borderColor);
  }
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

function getExcelBodyRows(
  rows: Row<IncomingReportRow>[],
  visibleColumns: ReturnType<Table<IncomingReportRow>['getVisibleLeafColumns']>
): Array<{
  values: Array<string | number>;
  boldByColumn: boolean[];
  isGroupedOrAggregatedRow: boolean;
}> {
  const columnIndexById = new Map(visibleColumns.map((col, i) => [col.id, i]));
  const bodyRows: Array<{
    values: Array<string | number>;
    boldByColumn: boolean[];
    isGroupedOrAggregatedRow: boolean;
  }> = [];

  const appendRows = (tableRows: Row<IncomingReportRow>[]) => {
    for (const row of tableRows) {
      const nextRow: Array<string | number> = Array(visibleColumns.length).fill(
        ''
      );
      const boldByColumn: boolean[] = Array(visibleColumns.length).fill(false);
      let hasGroupedOrAggregatedCell = false;

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
          hasGroupedOrAggregatedCell = true;
          const v = row.getValue(colId);
          nextRow[colIdx] =
            `${'  '.repeat(row.depth)}${String(v ?? '')} (${row.subRows.length})`;
          boldByColumn[colIdx] = true;
        } else if (isAggregated) {
          hasGroupedOrAggregatedCell = true;
          nextRow[colIdx] = suppressAgg
            ? '-'
            : ((row.getValue(colId) ?? '') as string | number);
          boldByColumn[colIdx] = true;
        } else if (isPlaceholder) {
          nextRow[colIdx] = '';
        } else {
          const v = row.getValue(colId);
          nextRow[colIdx] = v == null ? '' : (v as string | number);
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

export const IncomingExcelButton = ({
  table,
  coldStorageName,
}: IncomingExcelButtonProps) => {
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
      const colCount = Math.max(2, visibleColumns.length);
      const headerLabels = visibleColumns.map(getColumnHeaderLabel);

      const sourceRows =
        t.getState().grouping.length > 0
          ? t.getPrePaginationRowModel().rows
          : t.getRowModel().rows;
      const bodyRows = getExcelBodyRows(sourceRows, visibleColumns);
      const styledBodyRows = bodyRows.map((row) => ({
        values: coerceRows([row.values])[0],
        boldByColumn: row.boldByColumn,
        isGroupedOrAggregatedRow: row.isGroupedOrAggregatedRow,
      }));
      const rawBodyRows = styledBodyRows.map((row) => row.values);

      const sums: Record<string, number> = {};
      collectIncomingLeafColumnSums(sourceRows, sums);
      const totalsRowValues = buildIncomingTotalsRowValues(
        visibleColumns,
        sums
      );

      const safeName = safeFilePart(coldStorageName, 'Cold Storage');
      const dateLabel = getDateLabel(new Date());
      const fileName = `${safeName} Incoming Report ${dateLabel}.xlsx`;

      const wb = new ExcelJS.Workbook();
      wb.creator = safeName;
      const ws = wb.addWorksheet('Incoming Report');

      applySmartColumnWidths(ws, headerLabels, [
        ...rawBodyRows,
        totalsRowValues,
      ]);

      const overviewLines = [`Exported rows: ${rawBodyRows.length}`];
      buildReportHeader(
        ws,
        colCount,
        safeName,
        'Incoming Report',
        dateLabel,
        overviewLines
      );

      addSectionTitle(ws, 'Incoming', colCount);
      addStyledTable(ws, headerLabels, styledBodyRows);
      addTotalsRow(ws, totalsRowValues);

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
      generatingExcelRef.current = false;
      setIsGeneratingExcel(false);
    }
  }, [coldStorageName]);

  return (
    <Button
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
