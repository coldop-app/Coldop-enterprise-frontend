import * as React from 'react';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FarmerSeedReportRow } from './columns';

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

const FARMER_SEED_SUM_COLUMN_IDS = new Set<string>([
  'totalAcres',
  'bag35to40',
  'bag40to45',
  'bag40to50',
  'bag45to50',
  'bag50to55',
  'totalBags',
  'totalAmount',
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

function collectFarmerSeedLeafColumnSums(
  rows: Row<FarmerSeedReportRow>[],
  sums: Record<string, number>
): void {
  for (const row of rows) {
    if (row.subRows.length > 0) {
      collectFarmerSeedLeafColumnSums(row.subRows, sums);
      continue;
    }
    for (const id of FARMER_SEED_SUM_COLUMN_IDS) {
      sums[id] =
        (sums[id] ?? 0) +
        toSumNumber(row.getValue(id as keyof FarmerSeedReportRow));
    }
  }
}

function buildFarmerSeedTotalsRowValues(
  visibleColumns: ReturnType<
    Table<FarmerSeedReportRow>['getVisibleLeafColumns']
  >,
  sums: Record<string, number>
): Array<string | number> {
  return visibleColumns.map((col, idx) => {
    if (idx === 0) return 'Total';
    const id = col.id;
    if (FARMER_SEED_SUM_COLUMN_IDS.has(id)) return sums[id] ?? 0;
    return '';
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

type FarmerSeedExcelButtonProps = {
  table: Table<FarmerSeedReportRow>;
  coldStorageName: string;
};

const EXCEL_HEADER_LABEL_OVERRIDES: Partial<
  Record<keyof FarmerSeedReportRow, string>
> = {
  farmerName: 'Farmer',
  totalAcres: 'Acres Planted',
  gatePassNo: 'Gate Pass No',
  invoiceNumber: 'Invoice Number',
  date: 'Date',
  variety: 'Variety',
  generation: 'Stage',
  bag35to40: '35-40 (MM)',
  bag40to45: '40-45 (MM)',
  bag40to50: '40-50 (MM)',
  bag45to50: '45-50 (MM)',
  bag50to55: '50-55 (MM)',
  totalBags: 'Total Bags',
  averageRate: 'Rate per Bag',
  totalAmount: 'Total Rate',
  remarks: 'Remarks',
};

function getColumnHeaderLabel(
  column: ReturnType<
    Table<FarmerSeedReportRow>['getVisibleLeafColumns']
  >[number]
): string {
  const override =
    EXCEL_HEADER_LABEL_OVERRIDES[column.id as keyof FarmerSeedReportRow];
  if (override) return override;

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
  table: Table<FarmerSeedReportRow>,
  column: ReturnType<
    Table<FarmerSeedReportRow>['getVisibleLeafColumns']
  >[number]
): string {
  const override =
    EXCEL_HEADER_LABEL_OVERRIDES[column.id as keyof FarmerSeedReportRow];
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

/**
 * Coerces a value to a number if it looks like one (string of digits, optional
 * leading/trailing whitespace, optional decimal point). Returns the original
 * value unchanged for anything that isn't cleanly numeric.
 */
function coerceToNumber(value: string | number): string | number {
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  if (trimmed === '') return value;
  // Match integers and decimals, including negative values
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return value;
}

function getExcelBodyRows(
  rows: Row<FarmerSeedReportRow>[],
  visibleColumns: ReturnType<
    Table<FarmerSeedReportRow>['getVisibleLeafColumns']
  >
): Array<{
  values: Array<string | number>;
  boldByColumn: boolean[];
}> {
  const columnIndexById = new Map(
    visibleColumns.map((column, i) => [column.id, i])
  );
  const bodyRows: Array<{
    values: Array<string | number>;
    boldByColumn: boolean[];
  }> = [];

  const appendRows = (tableRows: Row<FarmerSeedReportRow>[]) => {
    for (const row of tableRows) {
      const nextRow: Array<string | number> = Array(visibleColumns.length).fill(
        ''
      );
      const boldByColumn: boolean[] = Array(visibleColumns.length).fill(false);

      for (const cell of row.getVisibleCells()) {
        const columnId = cell.column.id;
        const columnIndex = columnIndexById.get(columnId);
        if (columnIndex == null) continue;

        if (cell.getIsGrouped()) {
          const value = row.getValue(columnId);
          nextRow[columnIndex] =
            `${'  '.repeat(row.depth)}${String(value ?? '')} (${row.subRows.length})`;
          boldByColumn[columnIndex] = true;
        } else if (cell.getIsAggregated()) {
          const raw = (row.getValue(columnId) ?? '') as string | number;
          nextRow[columnIndex] = coerceToNumber(
            typeof raw === 'number' ? raw : String(raw)
          );
          boldByColumn[columnIndex] = true;
        } else if (cell.getIsPlaceholder()) {
          nextRow[columnIndex] = '';
        } else {
          const value = row.getValue(columnId);
          if (value == null) {
            nextRow[columnIndex] = '';
          } else {
            nextRow[columnIndex] = coerceToNumber(
              typeof value === 'number' ? value : String(value)
            );
          }
        }
      }

      bodyRows.push({ values: nextRow, boldByColumn });
      if (row.getIsGrouped() && row.subRows.length > 0) appendRows(row.subRows);
    }
  };

  appendRows(rows);
  return bodyRows;
}

/**
 * Returns the smart number format:
 *   - Whole numbers → no decimal places  (e.g. 42)
 *   - Decimals      → up to 2 places, trailing zeros stripped  (e.g. 3.5, 12.75)
 * ExcelJS doesn't support conditional number formats natively so we use a
 * conditional format string: [integer part check via two sections].
 * The trick: Excel format `#,##0.##` already drops trailing zeros — and shows
 * nothing after the decimal when the value is whole. This is exactly what we want.
 */

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

/**
 * Estimates the minimum column width (in Excel character units) needed to
 * display the header label and body data without truncation.
 * Excel's character unit ≈ 7px at default font size.
 */
function estimateColumnWidth(
  headerLabel: string,
  bodyRows: Array<Array<string | number>>,
  columnIndex: number
): number {
  // For wrapped headers we care about the longest *word* in the header,
  // not the full label, since wrapping will break at spaces.
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

  // Add a small padding buffer; minimum 10, maximum 40 characters wide
  const computed = Math.max(longestHeaderWord, maxDataChars) + 2;
  return Math.min(40, Math.max(10, computed));
}

export const FarmerSeedExcelButton = ({
  table,
  coldStorageName,
}: FarmerSeedExcelButtonProps) => {
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
      const columnCount = visibleColumns.length;
      const headerLabels = visibleColumns.map((column) =>
        getRenderedHeaderLabel(t, column)
      );
      const sourceRows =
        t.getState().grouping.length > 0
          ? t.getPrePaginationRowModel().rows
          : t.getRowModel().rows;
      const bodyRows = getExcelBodyRows(sourceRows, visibleColumns);

      const sums: Record<string, number> = {};
      collectFarmerSeedLeafColumnSums(sourceRows, sums);
      const totalsRowValues = buildFarmerSeedTotalsRowValues(
        visibleColumns,
        sums
      );

      const safeName =
        coldStorageName
          .trim()
          .replace(/[\\/:*?"<>|]/g, '')
          .replace(/\s+/g, ' ') || 'Cold Storage';

      const dateLabel = getExportDateLabel(new Date());
      const fileName = `${safeName} Farmer Seed Report ${dateLabel}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = safeName;
      const worksheet = workbook.addWorksheet('Farmer Seed Report');

      // ── Column widths ────────────────────────────────────────────────────────
      // Calculate smart widths based on header text and data content
      worksheet.columns = visibleColumns.map((_, i) => ({
        key: String(i),
        width: estimateColumnWidth(
          headerLabels[i],
          [...bodyRows.map((row) => row.values), totalsRowValues],
          i
        ),
      }));

      // ── Title row ────────────────────────────────────────────────────────────
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
        horizontal: 'left', // ← left-aligned
        vertical: 'middle',
      };

      // ── Subtitle row ─────────────────────────────────────────────────────────
      const subtitleRow = worksheet.addRow([
        'Farmer Seed Report',
        ...Array(columnCount - 1).fill(''),
      ]);
      worksheet.mergeCells(2, 1, 2, columnCount);
      subtitleRow.height = 26;
      subtitleRow.getCell(1).value = 'Farmer Seed Report';
      subtitleRow.getCell(1).font = {
        ...FONTS.subtitle,
        color: { argb: COLORS.subtitleFg },
      };
      applyFill(subtitleRow.getCell(1), COLORS.subtitleBg);
      subtitleRow.getCell(1).alignment = {
        horizontal: 'left', // ← left-aligned
        vertical: 'middle',
      };

      // ── Date row ─────────────────────────────────────────────────────────────
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
      dateCell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left

      // ── Powered-by row ───────────────────────────────────────────────────────
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
      poweredByCell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left

      // ── Spacer ───────────────────────────────────────────────────────────────
      worksheet.addRow([]);

      // ── Column header row ────────────────────────────────────────────────────
      const columnHeaderRow = worksheet.addRow(headerLabels);
      columnHeaderRow.height = 36; // taller to accommodate wrapped text
      columnHeaderRow.eachCell((cell) => {
        applyFill(cell, COLORS.headerBg);
        applyBorder(cell, COLORS.borderColor);
        cell.font = { ...FONTS.colHeader, color: { argb: COLORS.headerFg } };
        cell.alignment = {
          horizontal: 'left', // ← left-aligned headers
          vertical: 'middle',
          wrapText: true, // wrap long header labels
        };
      });

      // ── Body rows ────────────────────────────────────────────────────────────
      bodyRows.forEach((dataRow, rowIndex) => {
        const excelRow = worksheet.addRow(dataRow.values);
        const background = rowIndex % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
        excelRow.height = 22; // taller body rows

        excelRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
          applyFill(cell, background);
          applyBorder(cell, COLORS.borderColor);
          cell.font = {
            ...FONTS.body,
            bold: dataRow.boldByColumn[columnNumber - 1] === true,
            color: { argb: 'FF1F2937' },
          };
          cell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left

          const cellValue = dataRow.values[columnNumber - 1];
          if (typeof cellValue === 'number') {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            // Smart format: whole numbers show no decimal; decimals show up to 2 places
            cell.numFmt = SMART_NUMBER_FORMAT;
          }
        });
      });

      addTotalsRow(worksheet, totalsRowValues);

      // ── Write & download ─────────────────────────────────────────────────────
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
      variant="default"
      className="h-8 rounded-lg px-4 text-sm leading-none"
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
