import * as React from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Button } from '@/components/ui/button';
import type { AccountingIncomingRow } from '../incoming-table';
import type { AccountingGradingRow } from '../grading-table';
import type { GradingBagTypeQtySummaryRow } from '../summary-table';
import type { FarmerSeedRow } from '../helpers/seed-prepare';
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
  borderColor: 'FFB8DEC9',
} as const;

const FONTS = {
  title: { name: 'Calibri', size: 20, bold: true },
  subtitle: { name: 'Calibri', size: 13, bold: false },
  date: { name: 'Calibri', size: 10, bold: false, italic: true },
  colHeader: { name: 'Calibri', size: 10, bold: true },
  body: { name: 'Calibri', size: 10, bold: false },
} as const;

type AccountingReportExcelButtonProps = {
  coldStorageName: string;
  farmerDetails: FarmerStorageLinkInPassesPayload | null;
  incomingRows: AccountingIncomingRow[];
  gradingRows: AccountingGradingRow[];
  summaryRows: GradingBagTypeQtySummaryRow[];
  farmerSeedRows: FarmerSeedRow[];
  reportPeriodLabel: string;
};

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
  titleRow.height = 36;
  const titleCell = titleRow.getCell(1);
  titleCell.value = coldStorageName;
  titleCell.font = { ...FONTS.title, color: { argb: COLORS.titleFg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  applyFill(titleCell, COLORS.titleBg);

  const subtitleRow = ws.addRow([reportName, ...Array(colCount - 1).fill('')]);
  ws.mergeCells(2, 1, 2, colCount);
  subtitleRow.height = 22;
  const subtitleCell = subtitleRow.getCell(1);
  subtitleCell.value = reportName;
  subtitleCell.font = { ...FONTS.subtitle, color: { argb: COLORS.subtitleFg } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  applyFill(subtitleCell, COLORS.subtitleBg);

  const dateRow = ws.addRow([
    `Generated on: ${dateLabel}`,
    ...Array(colCount - 1).fill(''),
  ]);
  ws.mergeCells(3, 1, 3, colCount);
  dateRow.height = 18;
  const dateCell = dateRow.getCell(1);
  dateCell.value = `Generated on: ${dateLabel}`;
  dateCell.font = { ...FONTS.date, color: { argb: COLORS.dateFg } };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  applyFill(dateCell, COLORS.dateBg);

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

  for (const line of overviewLines) {
    const row = ws.addRow([line, ...Array(colCount - 1).fill('')]);
    ws.mergeCells(row.number, 1, row.number, colCount);
    row.height = 18;
    const cell = row.getCell(1);
    cell.value = line;
    cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyBorder(cell, COLORS.borderColor);
  }

  ws.addRow([]);
}

function addStyledTable(
  ws: ExcelJS.Worksheet,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const headerRow = ws.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    applyFill(cell, COLORS.headerBg);
    applyBorder(cell, COLORS.borderColor);
    cell.font = { ...FONTS.colHeader, color: { argb: COLORS.headerFg } };
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
  });

  rows.forEach((dataRow, idx) => {
    const exRow = ws.addRow(dataRow);
    exRow.height = 18;
    const bgArgb = idx % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
    exRow.eachCell({ includeEmpty: true }, (cell, colIndex) => {
      applyFill(cell, bgArgb);
      applyBorder(cell, COLORS.borderColor);
      cell.font = { ...FONTS.body, color: { argb: 'FF1F2937' } };
      cell.alignment = { vertical: 'middle' };
      if (typeof dataRow[colIndex - 1] === 'number') {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.##';
      }
    });
  });
}

function addSectionTitle(
  ws: ExcelJS.Worksheet,
  title: string,
  colCount: number
) {
  const titleRow = ws.addRow([title, ...Array(colCount - 1).fill('')]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);
  titleRow.height = 20;

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

export const AccountingReportExcelButton = ({
  coldStorageName,
  farmerDetails,
  incomingRows,
  gradingRows,
  summaryRows,
  farmerSeedRows,
  reportPeriodLabel,
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

      const incomingHeaders = [
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
      const gradingSizeLabels = [
        ...new Set(
          gradingRows.flatMap((row) =>
            Object.entries(row.sizes)
              .filter(([, value]) => value !== undefined)
              .map(([label]) => label)
          )
        ),
      ];
      const gradingHeaders = [
        'Incoming Manual Gate Pass Number',
        'Grading Manual Gate Pass Number',
        'Variety',
        'Grading Date',
        ...gradingSizeLabels.flatMap((label) => [
          `${label} Bags`,
          `${label} Weight (Kg)`,
          `${label} Bag Type`,
        ]),
      ];
      const summarySizeLabels = [
        ...new Set(summaryRows.flatMap((row) => Object.keys(row.bagsBySize))),
      ];
      const summaryHeaders = [
        'Type',
        ...summarySizeLabels.map((label) => `${label} Bags`),
        'Weight Per Bag (Kg)',
        'Weight Received (Kg)',
        'Bardana Weight (Kg)',
        'Actual Weight (Kg)',
        'Rate per bag (Rs)',
        'Amount Payable (Rs)',
        '% of Graded Sizes',
      ];
      const seedHeaders = [
        'Date',
        'Seed Size',
        'Total Bags given',
        'Bags/Acre',
        'Seed Rate/Bag (Rs)',
        'Total Seed Amount (Rs)',
      ];
      const maxColumns = Math.max(
        2,
        incomingHeaders.length,
        gradingHeaders.length,
        summaryHeaders.length,
        seedHeaders.length
      );

      const reportSheet = wb.addWorksheet('Accounting Report');
      reportSheet.columns = Array.from({ length: maxColumns }, (_, index) => ({
        key: `c${index}`,
        width: index < 2 ? 28 : 18,
      }));

      const overviewLines = [
        `Report Period: ${reportPeriodLabel}`,
        `Farmer Name: ${farmerDetails?.name ?? 'N/A'}`,
        `Account Number: ${farmerDetails?.accountNumber ?? 'N/A'}`,
        `Mobile Number: ${farmerDetails?.mobileNumber ?? 'N/A'}`,
        `Address: ${farmerDetails?.address ?? 'N/A'}`,
        `Incoming Rows: ${incomingRows.length} | Grading Rows: ${gradingRows.length} | Summary Rows: ${summaryRows.length} | Farmer Seed Rows: ${farmerSeedRows.length}`,
      ];
      buildReportHeader(
        reportSheet,
        maxColumns,
        safeName,
        'Accounting Report',
        dateLabel,
        overviewLines
      );

      addSectionTitle(reportSheet, 'Incoming', maxColumns);
      addStyledTable(
        reportSheet,
        incomingHeaders,
        incomingRows.map((row) => [
          row.manualIncomingGatePassNumber,
          row.incomingDate,
          row.store,
          row.truckNumber,
          row.variety,
          row.bags,
          row.weightSlipNumber,
          row.grossKg,
          row.tareKg,
          row.netKg,
          row.bardanaWeight,
          row.actualKg,
        ])
      );

      reportSheet.addRow([]);
      addSectionTitle(reportSheet, 'Grading', maxColumns);
      addStyledTable(
        reportSheet,
        gradingHeaders,
        gradingRows.map((row) => [
          row.isContinuation ? '' : row.incomingManualGatePassNumber,
          row.isContinuation ? '' : row.gradingManualGatePassNumber,
          row.isContinuation ? '' : row.variety,
          row.isContinuation ? '' : row.gradingDate,
          ...gradingSizeLabels.flatMap((label) => {
            const size = row.sizes[label];
            return [
              size?.bags ?? '',
              size?.weightKg ?? '',
              size?.bagType ?? '',
            ];
          }),
        ])
      );

      reportSheet.addRow([]);
      addSectionTitle(reportSheet, 'Summary', maxColumns);
      addStyledTable(
        reportSheet,
        summaryHeaders,
        summaryRows.map((row) => [
          row.typeLabel,
          ...summarySizeLabels.map((label) => row.bagsBySize[label] ?? ''),
          row.weightPerBagKg,
          row.weightReceivedKg,
          row.bardanaWeightKg,
          row.actualWeightKg,
          row.rate ?? '',
          row.amountPayable ?? '',
          row.gradedSizesPercent,
        ])
      );

      reportSheet.addRow([]);
      addSectionTitle(reportSheet, 'Farmer Seed', maxColumns);
      addStyledTable(
        reportSheet,
        seedHeaders,
        farmerSeedRows.map((row) => [
          row.date,
          row.seedSize,
          row.totalBagsGiven,
          row.bagsPerAcre,
          row.seedRatePerBag,
          row.totalSeedAmount,
        ])
      );

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
    farmerSeedRows,
    gradingRows,
    incomingRows,
    isGeneratingExcel,
    reportPeriodLabel,
    summaryRows,
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
