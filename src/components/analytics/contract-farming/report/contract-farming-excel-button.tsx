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
import { usePreferencesStore } from '@/stores/store';
import {
  isContractFarmingFamilySpanColumn,
  isContractFarmingSplitSpanColumn,
  isNumericSortColumnId,
} from './columns';
import {
  buildContractFarmingExcelFooterRows,
  computeContractFarmingFooterTotals,
} from './contract-farming-report-footer-totals';
import { formatFamilyAccountNumber } from './contract-farming-family-grouping';
import {
  buildDisplaySpanMetadataByRowId,
  collectLeafRowsInExportOrder,
} from './contract-farming-display-span-metadata';
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

/** Match on-screen Farmer column: stacked names + (#account) when Group Families is on. */
function formatFarmerColumnExcelValue(row: FlattenedRow): string {
  const familyMembers = row.familyMembers ?? [];
  const hasFamilyMembers = (row.familyKey ?? 0) > 0 && familyMembers.length > 0;
  if (hasFamilyMembers) {
    return familyMembers
      .map(
        (m) =>
          `${m.farmerName} (#${formatFamilyAccountNumber(m.accountNumber)})`
      )
      .join('\n');
  }
  return `${row.farmerName} (#${formatFamilyAccountNumber(row.accountNumber)})`;
}

function getExcelBodyRows(
  rows: Row<FlattenedRow>[],
  visibleColumnIds: string[],
  suppressRepeatedMergedCells: boolean
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
  const visitedRowIds = new Set<string>();
  const columnIndexById = new Map(
    visibleColumnIds.map((columnId, index) => [columnId, index])
  );
  const leafRows = collectLeafRowsInExportOrder(rows);
  const displaySpanMetadataByRowId = buildDisplaySpanMetadataByRowId(leafRows);

  const appendRows = (tableRows: Row<FlattenedRow>[]) => {
    for (const row of tableRows) {
      if (visitedRowIds.has(row.id)) continue;
      visitedRowIds.add(row.id);

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
          const displaySpan = displaySpanMetadataByRowId.get(row.id);
          const isFirstOfFamilyBlock =
            displaySpan?.isFirstOfFamilyBlock ?? true;
          const isFirstOfMergedBlock =
            displaySpan?.isFirstOfMergedBlock ?? true;
          const hideRepeatedFamilyCell =
            suppressRepeatedMergedCells &&
            isContractFarmingFamilySpanColumn(columnId) &&
            !isFirstOfFamilyBlock;
          const hideRepeatedVarietyCell =
            suppressRepeatedMergedCells &&
            !isContractFarmingSplitSpanColumn(columnId) &&
            !isContractFarmingFamilySpanColumn(columnId) &&
            !isFirstOfMergedBlock;
          const hideRepeatedMergedCell =
            hideRepeatedFamilyCell || hideRepeatedVarietyCell;
          if (hideRepeatedMergedCell) {
            nextRow[columnIndex] = '';
            continue;
          }
          if (columnId === 'farmer') {
            nextRow[columnIndex] = formatFarmerColumnExcelValue(row.original);
            continue;
          }
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
  visibleColumnIds: string[],
  options?: { bold?: boolean }
) {
  const bold = options?.bold !== false;
  const row = worksheet.addRow(totalsRowValues);
  applyExcelRowHeight(row, EXCEL_DATA_ROW_HEIGHT);
  row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const value = totalsRowValues[columnNumber - 1];
    const columnId = visibleColumnIds[columnNumber - 1];
    applyFill(cell, COLORS.totalRowBg);
    applyBorder(cell, COLORS.borderColor);
    cell.font = {
      ...FONTS.body,
      bold,
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
  const previewUrlsRef = React.useRef<ExcelPreviewUrls | null>(null);
  const generatingExcelRef = React.useRef(false);

  React.useEffect(() => {
    tableRef.current = table;
  }, [table]);

  React.useEffect(() => {
    return () => {
      revokeExcelPreviewUrls(previewUrlsRef.current);
      previewUrlsRef.current = null;
    };
  }, []);

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

      await openExcelPreviewInNewTab(previewUrlsRef, async () => {
        const visibleColumns = t.getVisibleLeafColumns();
        const visibleColumnIds = visibleColumns.map((column) => column.id);
        const columnCount = visibleColumns.length;
        const headerLabels = visibleColumns.map((column) =>
          getRenderedHeaderLabel(t, column)
        );
        // Match on-screen row order: filtered → sorted → grouped → expanded
        // (same as `table.getRowModel().rows` in the report table). Using
        // `getFilteredRowModel()` alone omits sorting and can disagree with the UI.
        const sourceRows = t.getRowModel().rows;
        const suppressRepeatedMergedCells = true;
        const bodyRows = getExcelBodyRows(
          sourceRows,
          visibleColumnIds,
          suppressRepeatedMergedCells
        );

        const preferences = usePreferencesStore.getState().preferences;
        const footer = computeContractFarmingFooterTotals(
          t.getFilteredRowModel().rows,
          preferences,
          visibleColumnIds
        );
        const { totalsRow: totalsRowValues, perAcreRow: perAcreRowValues } =
          buildContractFarmingExcelFooterRows(visibleColumnIds, footer);
        const allRowsForWidth = [
          ...bodyRows.map((row) => row.values),
          totalsRowValues,
          ...(perAcreRowValues ? [perAcreRowValues] : []),
        ];

        const safeName = safeFilePart(coldStorageName, 'Cold Storage');
        const dateLabel = getExportDateLabel(new Date());
        const fileName = `${safeName} Contract Farming Report ${dateLabel}.xlsx`;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = safeName;
        const worksheet = workbook.addWorksheet('Contract Farming Report');
        configureWorksheetForMicrosoftExcel(worksheet);

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
        applyExcelRowHeight(headerRow, EXCEL_DATA_ROW_HEIGHT);
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
          applyExcelRowHeight(excelRow, EXCEL_DATA_ROW_HEIGHT);
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
            const isMultilineFarmer =
              columnId === 'farmer' &&
              typeof value === 'string' &&
              value.includes('\n');
            cell.alignment = {
              horizontal: isNumeric ? 'right' : 'left',
              vertical: isMultilineFarmer ? 'top' : 'middle',
              wrapText: isMultilineFarmer || columnId === 'farmer',
            };
            if (isNumeric) cell.numFmt = SMART_NUMBER_FORMAT;
          });
        });

        addTotalsRow(worksheet, totalsRowValues, visibleColumnIds);
        if (perAcreRowValues) {
          addTotalsRow(worksheet, perAcreRowValues, visibleColumnIds, {
            bold: false,
          });
        }
        enforceExcelTableRowHeights(worksheet, headerRow.number);

        const buffer = await workbook.xlsx.writeBuffer();
        const footerRows = [
          totalsRowValues,
          ...(perAcreRowValues ? [perAcreRowValues] : []),
        ];
        return {
          buffer,
          fileName,
          preview: {
            title: safeName,
            subtitle: 'Contract Farming Report',
            dateLabel,
            exportedRowCount: bodyRows.length,
            headers: headerLabels,
            rows: bodyRows,
            footerRows,
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
