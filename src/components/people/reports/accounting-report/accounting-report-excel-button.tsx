import * as React from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button } from '@/components/ui/button';
import type { AccountingReportVarietySection } from './accounting-report-variety-sections';
import type { AccountingIncomingRow } from '@/components/people/reports/incoming-table';
import type { GradingBagTypeQtySummaryRow } from '@/components/people/reports/summary-table';
import type { FarmerSeedRow } from '@/components/people/reports/helpers/seed-prepare';
import type { FarmerStorageLinkInPassesPayload } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';

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
  /** In-table “Variety: …” band (matches UI muted group header). */
  varietyBandBg: 'FFE8EDEA',
  varietyBandFg: 'FF1F2937',
  borderColor: 'FFB8DEC9',
} as const;

const FONTS = {
  title: { name: 'Calibri', size: 20, bold: true },
  subtitle: { name: 'Calibri', size: 13, bold: false },
  date: { name: 'Calibri', size: 10, bold: false, italic: true },
  colHeader: { name: 'Calibri', size: 10, bold: true },
  body: { name: 'Calibri', size: 10, bold: false },
} as const;

// Smart number format: whole numbers show no decimal places; decimals show up
// to 2 places with trailing zeros stripped (e.g. 42 → "42", 3.5 → "3.5").
const SMART_NUMBER_FORMAT = '#,##0.##';

type AccountingReportExcelButtonProps = {
  coldStorageName: string;
  farmerDetails: FarmerStorageLinkInPassesPayload | null;
  varietySections: AccountingReportVarietySection[];
  reportPeriodLabel: string;
  rowStats: {
    incoming: number;
    grading: number;
    summary: number;
    seed: number;
  };
};

const INCOMING_EXCEL_HEADERS: string[] = [
  'Manual Incoming Gate Pass Number',
  'Incoming Date',
  'Store',
  'Truck Number',
  'Variety',
  'Bags',
  'Weight Slip Number',
  'Gross (Kg)',
  'Tare (Kg)',
  'Net (Kg)',
  'Bardana Weight (Kg)',
  'Actual (Kg)',
];

const SEED_EXCEL_HEADERS: string[] = [
  'Date',
  'Seed Size (mm)',
  'Total Bags given',
  'Bags/Acre',
  'Seed Rate/Bag (Rs)',
  'Total Seed Amount (Rs)',
];

function computeSummaryExcelHeaders(
  summaryRows: GradingBagTypeQtySummaryRow[]
): {
  summaryHeaders: string[];
  summarySizeLabels: string[];
} {
  const summarySizeLabels = [
    ...new Set(summaryRows.flatMap((row) => Object.keys(row.bagsBySize))),
  ];
  const summaryHeaders = [
    'Type',
    ...summarySizeLabels.map((label) => `${label} (mm)`),
    'Weight Per Bag (Kg)',
    'Weight Received (kg)',
    'Bardana Weight (kg)',
    'Actual Weight (kg)',
    'Rate per bag (₹)',
    'Amount Payable (₹)',
    '% of Graded Sizes',
  ];
  return { summaryHeaders, summarySizeLabels };
}

function buildIncomingRawRows(
  incomingRows: AccountingIncomingRow[]
): Array<Array<string | number>> {
  return coerceRows(
    incomingRows.map((row) => [
      row.manualIncomingGatePassNumber,
      row.incomingDate,
      row.store,
      row.truckNumber,
      row.variety,
      formatZeroAsDash(row.bags),
      row.weightSlipNumber,
      formatZeroAsDash(row.grossKg),
      formatZeroAsDash(row.tareKg),
      formatZeroAsDash(row.netKg),
      formatZeroAsDash(row.bardanaWeight),
      formatZeroAsDash(row.actualKg),
    ])
  );
}

function buildIncomingTotalsRow(
  incomingRows: AccountingIncomingRow[]
): Array<string | number> {
  return [
    'Total',
    '',
    '',
    '',
    '',
    formatZeroAsDash(
      incomingRows.reduce((s, r) => s + (Number(r.bags) || 0), 0)
    ),
    '',
    formatZeroAsDash(
      incomingRows.reduce((s, r) => s + (Number(r.grossKg) || 0), 0)
    ),
    formatZeroAsDash(
      incomingRows.reduce((s, r) => s + (Number(r.tareKg) || 0), 0)
    ),
    formatZeroAsDash(
      incomingRows.reduce((s, r) => s + (Number(r.netKg) || 0), 0)
    ),
    formatZeroAsDash(
      incomingRows.reduce((s, r) => s + (Number(r.bardanaWeight) || 0), 0)
    ),
    formatZeroAsDash(
      incomingRows.reduce((s, r) => s + (Number(r.actualKg) || 0), 0)
    ),
  ];
}

function buildSummaryRawRows(
  summaryRows: GradingBagTypeQtySummaryRow[],
  summarySizeLabels: string[]
): Array<Array<string | number>> {
  return coerceRows(
    summaryRows.map((row) => [
      row.typeLabel,
      ...summarySizeLabels.map((label) =>
        formatZeroAsDash(row.bagsBySize[label] ?? '')
      ),
      formatZeroAsDash(row.weightPerBagKg),
      formatZeroAsDash(row.weightReceivedKg),
      formatZeroAsDash(row.bardanaWeightKg),
      formatZeroAsDash(row.actualWeightKg),
      formatZeroAsDash(row.rate ?? ''),
      formatZeroAsDash(row.amountPayable ?? ''),
      formatZeroAsDash(row.gradedSizesPercent),
    ])
  );
}

function buildSummaryTotalsRow(
  summaryRows: GradingBagTypeQtySummaryRow[],
  summarySizeLabels: string[]
): Array<string | number> {
  const summaryTotalsRow: Array<string | number> = ['Total'];
  for (const label of summarySizeLabels) {
    summaryTotalsRow.push(
      formatZeroAsDash(
        summaryRows.reduce(
          (s, row) => s + (Number(row.bagsBySize[label]) || 0),
          0
        )
      )
    );
  }
  summaryTotalsRow.push(
    '',
    formatZeroAsDash(
      summaryRows.reduce((s, r) => s + (Number(r.weightReceivedKg) || 0), 0)
    ),
    formatZeroAsDash(
      summaryRows.reduce((s, r) => s + (Number(r.bardanaWeightKg) || 0), 0)
    ),
    formatZeroAsDash(
      summaryRows.reduce((s, r) => s + (Number(r.actualWeightKg) || 0), 0)
    ),
    '',
    formatZeroAsDash(
      summaryRows.reduce((s, r) => s + (Number(r.amountPayable) || 0), 0)
    ),
    formatZeroAsDash(
      summaryRows.reduce((s, r) => s + (Number(r.gradedSizesPercent) || 0), 0)
    )
  );
  return summaryTotalsRow;
}

function buildSeedRawRows(
  farmerSeedRows: FarmerSeedRow[]
): Array<Array<string | number>> {
  return coerceRows(
    farmerSeedRows.map((row) => [
      row.date,
      row.seedSize,
      formatZeroAsDash(row.totalBagsGiven),
      formatZeroAsDash(row.bagsPerAcre),
      formatZeroAsDash(row.seedRatePerBag),
      formatZeroAsDash(row.totalSeedAmount),
    ])
  );
}

function buildSeedTotalsRow(
  farmerSeedRows: FarmerSeedRow[]
): Array<string | number> {
  return [
    'Total',
    '',
    formatZeroAsDash(
      farmerSeedRows.reduce((s, r) => s + (Number(r.totalBagsGiven) || 0), 0)
    ),
    '',
    '',
    formatZeroAsDash(
      farmerSeedRows.reduce((s, r) => s + (Number(r.totalSeedAmount) || 0), 0)
    ),
  ];
}

function mergeHeaderRowForWidth(
  maxColumns: number,
  headerSets: string[][]
): string[] {
  return Array.from({ length: maxColumns }, (_, i) => {
    let best = '';
    for (const headers of headerSets) {
      const v = headers[i] ?? '';
      if (v.length > best.length) best = v;
    }
    return best;
  });
}

function applyFill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function applyBorder(cell: ExcelJS.Cell, color: string) {
  const c = { style: 'thin' as ExcelJS.BorderStyle, color: { argb: color } };
  cell.border = { top: c, bottom: c, left: c, right: c };
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

/**
 * Coerces a value to a number if it is a clean numeric string.
 * Handles integers, decimals, and negative values.
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

/**
 * Coerces all values in a data matrix to numbers where applicable.
 */
function coerceRows(
  rows: Array<Array<string | number>>
): Array<Array<string | number>> {
  return rows.map((row) => row.map(coerceToNumber));
}

function formatZeroAsDash(
  value: string | number | null | undefined
): string | number {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return value === 0 ? '-' : value;
  const trimmed = value.trim();
  if (trimmed === '') return '';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed) && parsed === 0) return '-';
  }
  return value;
}

function padRowToMaxColumns(
  row: Array<string | number>,
  maxColumns: number
): Array<string | number> {
  const padded = [...row];
  while (padded.length < maxColumns) padded.push('');
  return padded.slice(0, maxColumns);
}

/**
 * Estimates the minimum Excel column width (character units) needed to show
 * the header label and body data without truncation.
 * For headers, we use the longest *word* (since wrapText breaks at spaces).
 */
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

function buildReportHeader(
  ws: ExcelJS.Worksheet,
  colCount: number,
  coldStorageName: string,
  reportName: string,
  dateLabel: string,
  overviewLines: string[] = []
) {
  // Title
  const titleRow = ws.addRow([
    coldStorageName,
    ...Array(colCount - 1).fill(''),
  ]);
  ws.mergeCells(1, 1, 1, colCount);
  titleRow.height = 40;
  const titleCell = titleRow.getCell(1);
  titleCell.value = coldStorageName;
  titleCell.font = { ...FONTS.title, color: { argb: COLORS.titleFg } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left
  applyFill(titleCell, COLORS.titleBg);

  // Subtitle
  const subtitleRow = ws.addRow([reportName, ...Array(colCount - 1).fill('')]);
  ws.mergeCells(2, 1, 2, colCount);
  subtitleRow.height = 26;
  const subtitleCell = subtitleRow.getCell(1);
  subtitleCell.value = reportName;
  subtitleCell.font = { ...FONTS.subtitle, color: { argb: COLORS.subtitleFg } };
  subtitleCell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left
  applyFill(subtitleCell, COLORS.subtitleBg);

  // Date
  const dateRow = ws.addRow([
    `Generated on: ${dateLabel}`,
    ...Array(colCount - 1).fill(''),
  ]);
  ws.mergeCells(3, 1, 3, colCount);
  dateRow.height = 20;
  const dateCell = dateRow.getCell(1);
  dateCell.value = `Generated on: ${dateLabel}`;
  dateCell.font = { ...FONTS.date, color: { argb: COLORS.dateFg } };
  dateCell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left
  applyFill(dateCell, COLORS.dateBg);

  // Powered by
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
  poweredByCell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left

  // Overview lines (farmer details, period, counts)
  for (const line of overviewLines) {
    const row = ws.addRow([line, ...Array(colCount - 1).fill('')]);
    ws.mergeCells(row.number, 1, row.number, colCount);
    row.height = 20;
    const cell = row.getCell(1);
    cell.value = line;
    cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' }; // ← left
    applyBorder(cell, COLORS.borderColor);
  }

  ws.addRow([]);
}

function addColumnHeaderRow(ws: ExcelJS.Worksheet, headers: string[]) {
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
}

function addDataRowsStriped(
  ws: ExcelJS.Worksheet,
  rows: Array<Array<string | number>>,
  stripeOffset: number
) {
  rows.forEach((dataRow, idx) => {
    const exRow = ws.addRow(dataRow);
    exRow.height = 22;
    const bgArgb =
      (stripeOffset + idx) % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
    exRow.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      applyFill(cell, bgArgb);
      applyBorder(cell, COLORS.borderColor);
      cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };

      if (typeof dataRow[colIndex - 1] === 'number') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = SMART_NUMBER_FORMAT;
      }
    });
  });
}

function addVarietyBandRow(
  ws: ExcelJS.Worksheet,
  spanCols: number,
  varietyLabel: string
) {
  const label = `Variety: ${varietyLabel}`;
  const exRow = ws.addRow([label, ...Array(spanCols - 1).fill('')]);
  if (spanCols > 1) {
    ws.mergeCells(exRow.number, 1, exRow.number, spanCols);
  }
  exRow.height = 22;
  const cell = exRow.getCell(1);
  cell.value = label;
  cell.font = {
    ...FONTS.body,
    bold: true,
    color: { argb: COLORS.varietyBandFg },
  };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  applyFill(cell, COLORS.varietyBandBg);
  for (let col = 1; col <= spanCols; col += 1) {
    applyBorder(exRow.getCell(col), COLORS.borderColor);
  }
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

/**
 * Sets worksheet column widths based on actual header + data content so that
 * no column is unnecessarily wide or too narrow to show its data.
 */
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

export const AccountingReportExcelButton = ({
  coldStorageName,
  farmerDetails,
  varietySections,
  reportPeriodLabel,
  rowStats,
}: AccountingReportExcelButtonProps) => {
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);

  const handleGenerate = React.useCallback(async () => {
    if (isGeneratingExcel) return;

    try {
      setIsGeneratingExcel(true);

      const safeName = safeFilePart(coldStorageName, 'Cold Storage');
      const dateLabel = getDateLabel(new Date());
      const fileName = `${safeName} Accounting Report ${dateLabel}.xlsx`;

      const wb = new ExcelJS.Workbook();
      wb.creator = safeName;

      const allSummaryRows = varietySections.flatMap((s) => s.summaryRows);
      const { summaryHeaders, summarySizeLabels } =
        computeSummaryExcelHeaders(allSummaryRows);

      const maxColumns = Math.max(
        INCOMING_EXCEL_HEADERS.length,
        SEED_EXCEL_HEADERS.length,
        summaryHeaders.length,
        2
      );

      const reportSheet = wb.addWorksheet('Accounting Report');

      const allHeaders = mergeHeaderRowForWidth(maxColumns, [
        INCOMING_EXCEL_HEADERS,
        SEED_EXCEL_HEADERS,
        summaryHeaders,
      ]);

      const allBodyRowsForWidth: Array<Array<string | number>> = [];
      for (const section of varietySections) {
        allBodyRowsForWidth.push(
          padRowToMaxColumns(
            [
              `Variety: ${section.varietyLabel}`,
              ...Array(INCOMING_EXCEL_HEADERS.length - 1).fill(''),
            ],
            maxColumns
          )
        );
        for (const r of buildIncomingRawRows(section.incomingRows)) {
          allBodyRowsForWidth.push(padRowToMaxColumns(r, maxColumns));
        }
        allBodyRowsForWidth.push(
          padRowToMaxColumns(
            buildIncomingTotalsRow(section.incomingRows),
            maxColumns
          )
        );
      }
      for (const section of varietySections) {
        allBodyRowsForWidth.push(
          padRowToMaxColumns(
            [
              `Variety: ${section.varietyLabel}`,
              ...Array(summaryHeaders.length - 1).fill(''),
            ],
            maxColumns
          )
        );
        for (const r of buildSummaryRawRows(
          section.summaryRows,
          summarySizeLabels
        )) {
          allBodyRowsForWidth.push(padRowToMaxColumns(r, maxColumns));
        }
        allBodyRowsForWidth.push(
          padRowToMaxColumns(
            buildSummaryTotalsRow(section.summaryRows, summarySizeLabels),
            maxColumns
          )
        );
      }
      for (const section of varietySections) {
        allBodyRowsForWidth.push(
          padRowToMaxColumns(
            [
              `Variety: ${section.varietyLabel}`,
              ...Array(SEED_EXCEL_HEADERS.length - 1).fill(''),
            ],
            maxColumns
          )
        );
        for (const r of buildSeedRawRows(section.farmerSeedRows)) {
          allBodyRowsForWidth.push(padRowToMaxColumns(r, maxColumns));
        }
        allBodyRowsForWidth.push(
          padRowToMaxColumns(
            buildSeedTotalsRow(section.farmerSeedRows),
            maxColumns
          )
        );
      }

      applySmartColumnWidths(reportSheet, allHeaders, allBodyRowsForWidth);

      const overviewLines = [
        `Report Period: ${reportPeriodLabel}`,
        `Farmer Name: ${farmerDetails?.name ?? 'N/A'}`,
        `Account Number: ${farmerDetails?.accountNumber ?? 'N/A'}`,
        `Mobile Number: ${farmerDetails?.mobileNumber ?? 'N/A'}`,
        `Address: ${farmerDetails?.address ?? 'N/A'}`,
        `Incoming: ${rowStats.incoming} | Grading: ${rowStats.grading} | Summary lines: ${rowStats.summary} | Farmer seed rows: ${rowStats.seed}`,
      ];
      buildReportHeader(
        reportSheet,
        maxColumns,
        safeName,
        'Accounting Report',
        dateLabel,
        overviewLines
      );

      reportSheet.addRow([]);
      addSectionTitle(reportSheet, 'Incoming', maxColumns);
      addColumnHeaderRow(reportSheet, INCOMING_EXCEL_HEADERS);
      for (const section of varietySections) {
        addVarietyBandRow(
          reportSheet,
          INCOMING_EXCEL_HEADERS.length,
          section.varietyLabel
        );
        addDataRowsStriped(
          reportSheet,
          buildIncomingRawRows(section.incomingRows),
          0
        );
        addTotalsRow(reportSheet, buildIncomingTotalsRow(section.incomingRows));
      }

      reportSheet.addRow([]);
      addSectionTitle(reportSheet, 'Summary', maxColumns);
      addColumnHeaderRow(reportSheet, summaryHeaders);
      for (const section of varietySections) {
        addVarietyBandRow(
          reportSheet,
          summaryHeaders.length,
          section.varietyLabel
        );
        addDataRowsStriped(
          reportSheet,
          buildSummaryRawRows(section.summaryRows, summarySizeLabels),
          0
        );
        addTotalsRow(
          reportSheet,
          buildSummaryTotalsRow(section.summaryRows, summarySizeLabels)
        );
      }

      reportSheet.addRow([]);
      addSectionTitle(reportSheet, 'Farmer Seed', maxColumns);
      addColumnHeaderRow(reportSheet, SEED_EXCEL_HEADERS);
      for (const section of varietySections) {
        addVarietyBandRow(
          reportSheet,
          SEED_EXCEL_HEADERS.length,
          section.varietyLabel
        );
        addDataRowsStriped(
          reportSheet,
          buildSeedRawRows(section.farmerSeedRows),
          0
        );
        addTotalsRow(reportSheet, buildSeedTotalsRow(section.farmerSeedRows));
      }

      // ── Write & download ─────────────────────────────────────────────────────
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
  }, [
    coldStorageName,
    farmerDetails,
    isGeneratingExcel,
    reportPeriodLabel,
    rowStats,
    varietySections,
  ]);

  return (
    <Button
      variant="default"
      className="font-custom h-9 rounded-lg px-4 text-sm leading-none shadow-sm"
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
