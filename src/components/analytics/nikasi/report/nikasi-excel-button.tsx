import * as React from 'react';
import { flexRender, type Row, type Table } from '@tanstack/react-table';
import ExcelJS from 'exceljs';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  openExcelPreviewInNewTab,
  revokeExcelPreviewUrls,
  type ExcelPreviewUrls,
} from '@/lib/excel-preview-tab';
import {
  EXCEL_DATA_ROW_HEIGHT,
  applyExcelRowHeight,
  configureWorksheetForMicrosoftExcel,
  enforceExcelTableRowHeights,
} from '@/lib/excel-worksheet-compat';
import {
  formatNikasiReportCellValue,
  getNikasiNumericColumnIds,
  isNikasiVarietySplitColumn,
  shouldSuppressNikasiGroupedAggregation,
} from './columns';
import {
  getNikasiGatePassAverageWeight,
  getNikasiGatePassNetWeight,
  getNikasiGatePassTotalBags,
  type NikasiReportDisplayRow,
} from './nikasi-report-flatten';
import type { NikasiReportTotals } from './nikasi-report-totals';

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

export type NikasiReportExportContext = {
  table: Table<NikasiReportDisplayRow>;
  totals: NikasiReportTotals;
  bagSizeColumnIds: Set<string>;
  getExportRows: () => Row<NikasiReportDisplayRow>[];
  isGroupingActive: boolean;
  spanMetaByRowId: Map<
    string,
    { varietyRowIndex: number; varietyRowSpan: number }
  >;
};

type NikasiExcelButtonProps = {
  exportContext: NikasiReportExportContext | null;
  coldStorageName: string;
};

function coerceToNumber(value: string | number): string | number {
  if (typeof value === 'number') return value;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '-') return value;
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

function replaceZerosWithDash(
  rows: Array<Array<string | number>>
): Array<Array<string | number>> {
  return rows.map((row) => row.map((cell) => (cell === 0 ? '-' : cell)));
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
  table: Table<NikasiReportDisplayRow>,
  column: ReturnType<
    Table<NikasiReportDisplayRow>['getVisibleLeafColumns']
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

  const headerDefinition = column.columnDef.header;
  if (typeof headerDefinition === 'string') return headerDefinition;
  return column.id;
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

function normalizeExcelValue(
  value: unknown,
  columnId: string,
  row: NikasiReportDisplayRow,
  numericColumnIds: Set<string>
): string | number {
  if (row.bagSizeFields && columnId in row.bagSizeFields) {
    const quantity = row.bagSizeFields[columnId]?.quantity ?? 0;
    return quantity > 0 ? quantity : '-';
  }

  if (columnId === 'totalBagsIssued') {
    return getNikasiGatePassTotalBags(row);
  }

  if (columnId === 'netWeight') {
    const netWeight = getNikasiGatePassNetWeight(row);
    return netWeight > 0 ? netWeight : '-';
  }

  if (columnId === 'averageWeightPerBag') {
    const average = getNikasiGatePassAverageWeight(row);
    return average != null && average > 0 ? average : '-';
  }

  if (numericColumnIds.has(columnId)) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
    return '-';
  }

  return formatNikasiReportCellValue(value, columnId);
}

function buildNikasiTotalsRowValues(
  visibleColumns: ReturnType<
    Table<NikasiReportDisplayRow>['getVisibleLeafColumns']
  >,
  totals: NikasiReportTotals,
  bagSizeColumnIds: Set<string>
): Array<string | number> {
  return visibleColumns.map((col, idx) => {
    if (idx === 0) return 'Total';

    const id = col.id;
    if (bagSizeColumnIds.has(id)) {
      const value = totals.bagColumnTotals[id] ?? 0;
      return value === 0 ? '-' : value;
    }

    if (id === 'totalBagsIssued') return totals.totalBagsIssued;
    if (id === 'netWeight') return totals.netWeight;
    if (id === 'averageWeightPerBag') {
      return totals.averageWeightPerBag ?? '-';
    }

    return '';
  });
}

function addTotalsRow(
  ws: ExcelJS.Worksheet,
  values: Array<string | number>,
  columnIds: string[],
  numericColumnIds: Set<string>
) {
  const exRow = ws.addRow(values);
  applyExcelRowHeight(exRow, EXCEL_DATA_ROW_HEIGHT);
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
      rawVal === '-' && colId != null && numericColumnIds.has(colId);
    cell.alignment = {
      horizontal: isNumeric || isDashNumeric ? 'right' : 'left',
      vertical: 'middle',
    };
    if (isNumeric) {
      cell.numFmt = SMART_NUMBER_FORMAT;
    }
  });
}

function getExcelBodyRows(
  rows: Row<NikasiReportDisplayRow>[],
  visibleColumns: ReturnType<
    Table<NikasiReportDisplayRow>['getVisibleLeafColumns']
  >,
  bagSizeColumnIds: Set<string>,
  numericColumnIds: Set<string>,
  isGroupingActive: boolean,
  spanMetaByRowId: Map<
    string,
    { varietyRowIndex: number; varietyRowSpan: number }
  >
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
  const visitedRowIds = new Set<string>();

  const appendRows = (tableRows: Row<NikasiReportDisplayRow>[]) => {
    for (const row of tableRows) {
      if (visitedRowIds.has(row.id)) continue;
      visitedRowIds.add(row.id);

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
        const varietyRowIndex =
          spanMetaByRowId.get(row.id)?.varietyRowIndex ??
          row.original.varietyRowIndex;
        const hideRepeatedMergedCell =
          !isGroupingActive &&
          !isGroupedCell &&
          !isAggregatedCell &&
          !isPlaceholderCell &&
          !isNikasiVarietySplitColumn(columnId, bagSizeColumnIds) &&
          varietyRowIndex > 0;

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
          if (shouldSuppressNikasiGroupedAggregation(columnId)) {
            nextRow[columnIndex] = '-';
          } else {
            nextRow[columnIndex] = normalizeExcelValue(
              row.getValue(columnId),
              columnId,
              row.original,
              numericColumnIds
            );
            boldByColumn[columnIndex] = true;
          }
        } else if (isPlaceholderCell) {
          nextRow[columnIndex] = '';
        } else {
          nextRow[columnIndex] = normalizeExcelValue(
            row.getValue(columnId),
            columnId,
            row.original,
            numericColumnIds
          );
        }
      }

      bodyRows.push({
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
  return bodyRows;
}

export const NikasiExcelButton = ({
  exportContext,
  coldStorageName,
}: NikasiExcelButtonProps) => {
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);
  const exportContextRef = React.useRef(exportContext);
  const previewUrlsRef = React.useRef<ExcelPreviewUrls | null>(null);

  React.useEffect(() => {
    exportContextRef.current = exportContext;
  }, [exportContext]);

  React.useEffect(() => {
    return () => {
      revokeExcelPreviewUrls(previewUrlsRef.current);
      previewUrlsRef.current = null;
    };
  }, []);

  const generatingExcelRef = React.useRef(false);

  const handleGenerate = React.useCallback(async () => {
    if (generatingExcelRef.current) return;

    const ctx = exportContextRef.current;
    if (!ctx) {
      window.alert('Table is not ready. Please try again.');
      return;
    }

    try {
      generatingExcelRef.current = true;
      setIsGeneratingExcel(true);

      await openExcelPreviewInNewTab(previewUrlsRef, async () => {
        const {
          table,
          totals,
          bagSizeColumnIds,
          getExportRows,
          spanMetaByRowId,
        } = ctx;
        const visibleColumns = table.getVisibleLeafColumns();
        const numericColumnIds = getNikasiNumericColumnIds(bagSizeColumnIds);
        const exportColumnIds = visibleColumns.map((column) => column.id);
        const headerLabels = visibleColumns.map((column) =>
          getRenderedHeaderLabel(table, column)
        );
        const sourceRows = getExportRows();
        const bodyRows = getExcelBodyRows(
          sourceRows,
          visibleColumns,
          bagSizeColumnIds,
          numericColumnIds,
          ctx.isGroupingActive,
          spanMetaByRowId
        );
        const totalsRowValues = buildNikasiTotalsRowValues(
          visibleColumns,
          totals,
          bagSizeColumnIds
        );

        const styledBodyRows = bodyRows.map((row) => ({
          values: replaceZerosWithDash(coerceRows([row.values]))[0],
          boldByColumn: row.boldByColumn,
          isGroupedOrAggregatedRow: row.isGroupedOrAggregatedRow,
        }));

        const safeName = safeFilePart(coldStorageName, 'Cold Storage');
        const dateLabel = getExportDateLabel(new Date());
        const fileName = `${safeName} Nikasi Report ${dateLabel}.xlsx`;
        const columnCount = visibleColumns.length;
        const allRowsForWidth = [
          ...styledBodyRows.map((row) => row.values),
          totalsRowValues,
        ];

        const workbook = new ExcelJS.Workbook();
        workbook.creator = safeName;
        const worksheet = workbook.addWorksheet('Nikasi Report');
        configureWorksheetForMicrosoftExcel(worksheet);

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
          'Nikasi Report',
          ...Array(columnCount - 1).fill(''),
        ]);
        worksheet.mergeCells(2, 1, 2, columnCount);
        subtitleRow.height = 26;
        subtitleRow.getCell(1).value = 'Nikasi Report';
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
        applyExcelRowHeight(columnHeaderRow, EXCEL_DATA_ROW_HEIGHT);
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
          applyExcelRowHeight(excelRow, EXCEL_DATA_ROW_HEIGHT);

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
              raw === '-' && colId != null && numericColumnIds.has(colId);
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

        addTotalsRow(
          worksheet,
          totalsRowValues,
          exportColumnIds,
          numericColumnIds
        );
        enforceExcelTableRowHeights(worksheet, columnHeaderRow.number);

        const buffer = await workbook.xlsx.writeBuffer();
        return {
          buffer,
          fileName,
          preview: {
            title: safeName,
            subtitle: 'Nikasi Report',
            dateLabel,
            exportedRowCount: styledBodyRows.length,
            headers: headerLabels,
            rows: styledBodyRows,
            totals: totalsRowValues,
          },
        };
      });
    } catch {
      // openExcelPreviewInNewTab already alerted
    } finally {
      generatingExcelRef.current = false;
      setIsGeneratingExcel(false);
    }
  }, [coldStorageName]);

  return (
    <Button
      type="button"
      className="h-8 rounded-lg px-4 text-sm shadow-none"
      disabled={isGeneratingExcel || !exportContext}
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
