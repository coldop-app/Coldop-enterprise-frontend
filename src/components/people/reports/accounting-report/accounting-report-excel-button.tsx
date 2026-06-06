import * as React from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button } from '@/components/ui/button';
import type { AccountingReportVarietySection } from './accounting-report-variety-sections';
import type { AccountingIncomingRow } from '@/components/people/reports/incoming-table';
import {
  bags50KgFromActualWeight,
  type GradingBagTypeQtySummaryRow,
} from '@/components/people/reports/helpers/summary-prepare';
import type { FarmerSeedRow } from '@/components/people/reports/helpers/seed-prepare';
import type { FarmerStorageLinkInPassesPayload } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import type { AccountingGradingRow } from '@/components/people/reports/grading-table';
import {
  ACCOUNTING_GRADING_BAG_SIZE_ORDER,
  computeGradingTableTotals,
  extraGradingSizeLabelsFromRows,
  gradingTotalsAverageWeightPerBagKg,
  sizeLabelsWithAnyQuantity,
  totalBagsForAccountingGradingRow,
} from '@/components/people/reports/helpers/grading-prepare';

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
  reportTitle?: string;
  rowStats: {
    incoming: number;
    grading: number;
    summary: number;
    seed: number;
  };
  /** When false, omits the Grading section (farmer report). Defaults to true. */
  includeGradingTable?: boolean;
  /** When true, adds No. of bags (50kg) to summary (accounting report). Defaults to true. */
  showFiftyKgBagCount?: boolean;
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
  summaryRows: GradingBagTypeQtySummaryRow[],
  showFiftyKgBagCount: boolean
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
    ...(showFiftyKgBagCount ? ['No. of bags (50kg)'] : []),
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
  summarySizeLabels: string[],
  showFiftyKgBagCount: boolean
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
      ...(showFiftyKgBagCount
        ? [formatZeroAsDash(bags50KgFromActualWeight(row.actualWeightKg))]
        : []),
      formatZeroAsDash(row.rate ?? ''),
      formatZeroAsDash(row.amountPayable ?? ''),
      formatZeroAsDash(row.gradedSizesPercent),
    ])
  );
}

function buildSummaryTotalsRow(
  summaryRows: GradingBagTypeQtySummaryRow[],
  summarySizeLabels: string[],
  showFiftyKgBagCount: boolean
): Array<string | number> {
  const totalActualWeightKg = summaryRows.reduce(
    (s, r) => s + (Number(r.actualWeightKg) || 0),
    0
  );
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
    formatZeroAsDash(totalActualWeightKg),
    ...(showFiftyKgBagCount
      ? [formatZeroAsDash(bags50KgFromActualWeight(totalActualWeightKg))]
      : []),
    '',
    formatZeroAsDash(
      summaryRows.reduce((s, r) => s + (Number(r.amountPayable) || 0), 0)
    ),
    formatZeroAsDash(
      summaryRows.some((r) => (Number(r.actualWeightKg) || 0) > 0)
        ? 100
        : summaryRows.reduce(
            (s, r) => s + (Number(r.gradedSizesPercent) || 0),
            0
          )
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

function computeGradingExcelMetadata(allGradingRows: AccountingGradingRow[]): {
  gradingHeaders: string[];
  gradingSizeLabels: string[];
  sizeLabelsOrdered: readonly string[];
} {
  const extras = extraGradingSizeLabelsFromRows(allGradingRows);
  const sizeLabelsOrdered = [...ACCOUNTING_GRADING_BAG_SIZE_ORDER, ...extras];
  const totals = computeGradingTableTotals(allGradingRows, sizeLabelsOrdered);
  const gradingSizeLabels = sizeLabelsWithAnyQuantity(
    sizeLabelsOrdered,
    totals
  );
  const gradingHeaders = [
    'Incoming Manual Gate Pass Number',
    'Grading Manual Gate Pass Number',
    'Variety',
    'Grading Date',
    ...gradingSizeLabels.flatMap((label) => [
      `${label} (mm)`,
      'Weight (Kg)',
      'Bag Type',
    ]),
    'Total bags',
  ];
  return { gradingHeaders, gradingSizeLabels, sizeLabelsOrdered };
}

function buildGradingRawRows(
  gradingRows: AccountingGradingRow[],
  gradingSizeLabels: readonly string[],
  sizeLabelsOrdered: readonly string[]
): Array<Array<string | number>> {
  return coerceRows(
    gradingRows.map((row) => {
      const base: Array<string | number> = [
        row.isContinuation ? '' : row.incomingManualGatePassNumber,
        row.isContinuation ? '' : row.gradingManualGatePassNumber,
        row.isContinuation ? '' : row.variety,
        row.isContinuation ? '' : row.gradingDate,
      ];
      const sizeCells = gradingSizeLabels.flatMap((label) => {
        const cell = row.sizes[label];
        if (cell === undefined) {
          return ['', '', ''];
        }
        const bags = Number(cell.bags) || 0;
        const weightPerBag = Number(cell.weightPerBagKg);
        return [
          formatZeroAsDash(bags),
          !Number.isFinite(weightPerBag) || weightPerBag === 0
            ? ''
            : formatZeroAsDash(weightPerBag),
          cell.bagType ?? '',
        ];
      });
      const totalBags = totalBagsForAccountingGradingRow(
        row,
        sizeLabelsOrdered
      );
      return [...base, ...sizeCells, formatZeroAsDash(totalBags)];
    })
  );
}

function buildGradingTotalsRow(
  gradingRows: AccountingGradingRow[],
  gradingSizeLabels: readonly string[],
  sizeLabelsOrdered: readonly string[]
): Array<string | number> {
  const totals = computeGradingTableTotals(gradingRows, sizeLabelsOrdered);
  const row: Array<string | number> = ['Total', '', '', ''];
  for (const label of gradingSizeLabels) {
    row.push(formatZeroAsDash(totals.bySize[label]?.bags ?? 0));
    row.push(
      formatZeroAsDash(gradingTotalsAverageWeightPerBagKg(totals, label))
    );
    row.push('');
  }
  row.push(formatZeroAsDash(totals.totalBags));
  return row;
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
  reportTitle = 'Accounting Report',
  rowStats,
  includeGradingTable = true,
  showFiftyKgBagCount = true,
}: AccountingReportExcelButtonProps) => {
  const [isGeneratingExcel, setIsGeneratingExcel] = React.useState(false);

  const handleGenerate = React.useCallback(async () => {
    if (isGeneratingExcel) return;

    try {
      setIsGeneratingExcel(true);

      const safeName = safeFilePart(coldStorageName, 'Cold Storage');
      const dateLabel = getDateLabel(new Date());
      const fileName = `${safeName} ${reportTitle} ${dateLabel}.xlsx`;

      const wb = new ExcelJS.Workbook();
      wb.creator = safeName;

      const allSummaryRows = varietySections.flatMap((s) => s.summaryRows);
      const { summaryHeaders, summarySizeLabels } = computeSummaryExcelHeaders(
        allSummaryRows,
        showFiftyKgBagCount
      );

      const allGradingRows = varietySections.flatMap((s) => s.gradingRows);
      const gradingExcelMeta = includeGradingTable
        ? computeGradingExcelMetadata(allGradingRows)
        : null;

      const maxColumns = Math.max(
        INCOMING_EXCEL_HEADERS.length,
        SEED_EXCEL_HEADERS.length,
        summaryHeaders.length,
        gradingExcelMeta?.gradingHeaders.length ?? 0,
        2
      );

      const reportSheet = wb.addWorksheet(reportTitle);

      const headerSetsForWidth = [
        INCOMING_EXCEL_HEADERS,
        SEED_EXCEL_HEADERS,
        summaryHeaders,
      ];
      if (gradingExcelMeta) {
        headerSetsForWidth.push(gradingExcelMeta.gradingHeaders);
      }
      const allHeaders = mergeHeaderRowForWidth(maxColumns, headerSetsForWidth);

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
      if (gradingExcelMeta) {
        const { gradingHeaders, gradingSizeLabels, sizeLabelsOrdered } =
          gradingExcelMeta;
        for (const section of varietySections) {
          allBodyRowsForWidth.push(
            padRowToMaxColumns(
              [
                `Variety: ${section.varietyLabel}`,
                ...Array(gradingHeaders.length - 1).fill(''),
              ],
              maxColumns
            )
          );
          for (const r of buildGradingRawRows(
            section.gradingRows,
            gradingSizeLabels,
            sizeLabelsOrdered
          )) {
            allBodyRowsForWidth.push(padRowToMaxColumns(r, maxColumns));
          }
          allBodyRowsForWidth.push(
            padRowToMaxColumns(
              buildGradingTotalsRow(
                section.gradingRows,
                gradingSizeLabels,
                sizeLabelsOrdered
              ),
              maxColumns
            )
          );
        }
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
          summarySizeLabels,
          showFiftyKgBagCount
        )) {
          allBodyRowsForWidth.push(padRowToMaxColumns(r, maxColumns));
        }
        allBodyRowsForWidth.push(
          padRowToMaxColumns(
            buildSummaryTotalsRow(
              section.summaryRows,
              summarySizeLabels,
              showFiftyKgBagCount
            ),
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
        reportTitle,
        dateLabel,
        overviewLines
      );

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

      if (gradingExcelMeta) {
        const { gradingHeaders, gradingSizeLabels, sizeLabelsOrdered } =
          gradingExcelMeta;
        reportSheet.addRow([]);
        addSectionTitle(reportSheet, 'Grading', maxColumns);
        addColumnHeaderRow(reportSheet, gradingHeaders);
        for (const section of varietySections) {
          addVarietyBandRow(
            reportSheet,
            gradingHeaders.length,
            section.varietyLabel
          );
          addDataRowsStriped(
            reportSheet,
            buildGradingRawRows(
              section.gradingRows,
              gradingSizeLabels,
              sizeLabelsOrdered
            ),
            0
          );
          addTotalsRow(
            reportSheet,
            buildGradingTotalsRow(
              section.gradingRows,
              gradingSizeLabels,
              sizeLabelsOrdered
            )
          );
        }
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
          buildSummaryRawRows(
            section.summaryRows,
            summarySizeLabels,
            showFiftyKgBagCount
          ),
          0
        );
        addTotalsRow(
          reportSheet,
          buildSummaryTotalsRow(
            section.summaryRows,
            summarySizeLabels,
            showFiftyKgBagCount
          )
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
    includeGradingTable,
    showFiftyKgBagCount,
    reportTitle,
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
