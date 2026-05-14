import * as React from 'react';
import ExcelJS from 'exceljs';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sizeLabelsWithAnyQuantity } from '@/components/people/reports/helpers/grading-prepare';
import type {
  DispatchLedgerNikasiGatePass,
  DispatchLedgerNikasiGatePassesLedger,
} from '@/types/dispatch-ledger';
import {
  allocatedNetKgForVariety,
  bagsForVarietyOnPass,
  buildDispatchVarietySizeLabelsOrdered,
  computeDispatchVarietyTotals,
  EMPTY_BAG_LINES_KEY,
  formatDisplayDate,
  gatePassesForDispatchVariety,
  sizeQuantitiesForPassAndVariety,
  varietySectionTitle,
} from './dispatch-ledger-report-helpers';

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

function padRow(
  row: Array<string | number>,
  len: number
): Array<string | number> {
  const out = [...row];
  while (out.length < len) out.push('');
  return out;
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

function addStyledTable(
  ws: ExcelJS.Worksheet,
  headers: string[],
  rows: Array<{ values: Array<string | number> }>
) {
  const headerRow = ws.addRow(headers);
  headerRow.height = 36;
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    applyFill(cell, COLORS.headerBg);
    applyBorder(cell, COLORS.borderColor);
    cell.font = { ...FONTS.colHeader, color: { argb: COLORS.headerFg } };
    cell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
      wrapText: true,
    };
  });

  rows.forEach((dataRow, idx) => {
    const exRow = ws.addRow(dataRow.values);
    exRow.height = 22;
    const bgArgb = idx % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
    exRow.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      applyFill(cell, bgArgb);
      applyBorder(cell, COLORS.borderColor);
      cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
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

function estimateColWidth(
  headerLabel: string,
  allRows: Array<Array<string | number>>,
  colIndex: number
): number {
  const longestHeaderWord = headerLabel
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 0);

  let maxDataChars = 0;
  for (const row of allRows) {
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

export type DispatchLedgerReportExcelButtonProps = {
  coldStorageName: string;
  ledger: DispatchLedgerNikasiGatePassesLedger | null;
  sortedPasses: DispatchLedgerNikasiGatePass[];
  dispatchVarietyKeys: string[];
  totalsNetKg: number;
  totalBagsSummary: number;
  reportPeriodLabel: string;
  reportGeneratedOn: string;
  disabled?: boolean;
};

export function DispatchLedgerReportExcelButton({
  coldStorageName,
  ledger,
  sortedPasses,
  dispatchVarietyKeys,
  totalsNetKg,
  totalBagsSummary,
  reportPeriodLabel,
  reportGeneratedOn,
  disabled = false,
}: DispatchLedgerReportExcelButtonProps) {
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);
  const generatingExcelRef = React.useRef(false);

  const handleGenerate = React.useCallback(async () => {
    if (generatingExcelRef.current || sortedPasses.length === 0) return;
    try {
      generatingExcelRef.current = true;
      setIsGeneratingExcel(true);

      type Block = {
        title: string;
        headers: string[];
        bodyRows: Array<Array<string | number>>;
        totalsRow: Array<string | number>;
      };

      const blocks: Block[] = [];

      for (const varietyKey of dispatchVarietyKeys) {
        const passes = gatePassesForDispatchVariety(sortedPasses, varietyKey);
        const sizeLabelsOrdered = buildDispatchVarietySizeLabelsOrdered(
          passes,
          varietyKey
        );
        const varietyTotals = computeDispatchVarietyTotals(
          passes,
          varietyKey,
          sizeLabelsOrdered
        );
        const visibleSizeLabels =
          varietyKey === EMPTY_BAG_LINES_KEY
            ? []
            : sizeLabelsWithAnyQuantity(sizeLabelsOrdered, varietyTotals);

        const headers = [
          'Manual #',
          'Date',
          'To',
          'Truck',
          ...visibleSizeLabels.map((label) => `${label} (mm)`),
          'Net (kg)',
          'Avg / bag',
          'Remarks',
        ];

        const bodyRows: Array<Array<string | number>> = passes.map((gp) => {
          const sizeQty =
            varietyKey === EMPTY_BAG_LINES_KEY
              ? {}
              : sizeQuantitiesForPassAndVariety(gp, varietyKey);
          const rowBags = bagsForVarietyOnPass(gp, varietyKey);
          const rowNet = allocatedNetKgForVariety(gp, varietyKey);
          const rowAvg =
            varietyKey === EMPTY_BAG_LINES_KEY
              ? gp.averageWeightPerBag
              : rowBags > 0
                ? rowNet / rowBags
                : Number.NaN;

          const row: Array<string | number> = [
            gp.manualGatePassNumber ?? '',
            formatDisplayDate(new Date(gp.date)),
            gp.to ?? '',
            gp.truckNumber ?? '',
            ...visibleSizeLabels.map((label) => {
              const n = sizeQty[label] ?? 0;
              return n === 0 ? '' : n;
            }),
            rowNet,
            Number.isFinite(rowAvg) ? rowAvg : '',
            gp.remarks?.trim() ?? '',
          ];
          return row;
        });

        const footerAvgKgPerBag =
          varietyKey === EMPTY_BAG_LINES_KEY
            ? Number.NaN
            : varietyTotals.totalBags > 0
              ? varietyTotals.totalKg / varietyTotals.totalBags
              : Number.NaN;

        const totalsRow: Array<string | number> = [
          `Totals (${passes.length} passes)`,
          '',
          '',
          '',
          ...visibleSizeLabels.map((label) => {
            const n = varietyTotals.bySize[label]?.bags ?? 0;
            return n === 0 ? '' : n;
          }),
          varietyTotals.totalKg,
          Number.isFinite(footerAvgKgPerBag) ? footerAvgKgPerBag : '',
          varietyKey === EMPTY_BAG_LINES_KEY
            ? ''
            : `Total bags (this variety): ${varietyTotals.totalBags}`,
        ];

        blocks.push({
          title: varietySectionTitle(varietyKey),
          headers,
          bodyRows,
          totalsRow,
        });
      }

      const globalMaxCol = Math.max(8, ...blocks.map((b) => b.headers.length));

      const paddedBlocks = blocks.map((b) => ({
        ...b,
        headers: padRow(b.headers, globalMaxCol),
        bodyRows: b.bodyRows.map((r) => padRow(r, globalMaxCol)),
        totalsRow: padRow(b.totalsRow, globalMaxCol),
      }));

      const allRowsForWidths: Array<Array<string | number>> = [];
      for (const b of paddedBlocks) {
        allRowsForWidths.push(b.headers, ...b.bodyRows, b.totalsRow);
      }

      const safeStorage = safeFilePart(coldStorageName, 'Cold Storage');
      const ledgerPart = ledger?.name
        ? safeFilePart(ledger.name, 'Ledger')
        : 'Dispatch Ledger';
      const dateLabel = getDateLabel(new Date());
      const fileName = `${safeStorage} ${ledgerPart} Report ${dateLabel}.xlsx`;

      const wb = new ExcelJS.Workbook();
      wb.creator = safeStorage;
      const ws = wb.addWorksheet('Dispatch Ledger');

      applySmartColumnWidths(
        ws,
        paddedBlocks[0]?.headers ?? Array(globalMaxCol).fill(''),
        allRowsForWidths
      );

      const overviewLines = [
        `Report period: ${reportPeriodLabel}`,
        `Generated (UI): ${reportGeneratedOn}`,
        ledger ? `Ledger: ${ledger.name}` : 'Ledger: —',
        `Overall net (kg): ${totalsNetKg}`,
        `Total bags (summary): ${totalBagsSummary}`,
      ];

      buildReportHeader(
        ws,
        globalMaxCol,
        safeStorage,
        'Dispatch ledger (nikasi) report',
        dateLabel,
        overviewLines
      );

      for (const b of paddedBlocks) {
        ws.addRow([]);
        addSectionTitle(ws, b.title, globalMaxCol);
        addStyledTable(
          ws,
          b.headers,
          b.bodyRows.map((values) => ({ values }))
        );
        addTotalsRow(ws, b.totalsRow);
      }

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
  }, [
    coldStorageName,
    dispatchVarietyKeys,
    ledger,
    reportGeneratedOn,
    reportPeriodLabel,
    sortedPasses,
    totalBagsSummary,
    totalsNetKg,
  ]);

  const canExport = sortedPasses.length > 0 && !disabled;

  return (
    <Button
      type="button"
      variant="default"
      weight="bold"
      className="font-custom focus-visible:ring-primary h-9 shrink-0 rounded-lg px-4 text-sm shadow-sm transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      disabled={isGeneratingExcel || !canExport}
      onClick={handleGenerate}
    >
      {isGeneratingExcel ? (
        <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
      )}
      {isGeneratingExcel ? 'Generating…' : 'Report'}
    </Button>
  );
}
