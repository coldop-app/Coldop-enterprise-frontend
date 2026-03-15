import * as XLSX from 'xlsx';
import type {
  FarmerReportPdfSnapshot,
  FarmerReportPdfRow,
} from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import { FARMER_REPORT_PDF_COLUMN_LABELS } from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import {
  buildGradingGatePassSheetData,
  buildSummarySheetData,
} from '@/utils/stockLedgerExcel';

/** Incoming column ids (table 1): same as AccountingStockLedgerPdf. */
const INCOMING_COLUMN_IDS = [
  'systemIncomingNo',
  'manualIncomingNo',
  'incomingDate',
  'store',
  'truckNumber',
  'variety',
  'bagsReceived',
  'totalBagsReceived',
  'weightSlipNo',
  'grossWeightKg',
  'totalGrossKg',
  'tareWeightKg',
  'totalTareKg',
  'netWeightKg',
  'totalNetKg',
  'lessBardanaKg',
  'totalLessBardanaKg',
  'actualWeightKg',
] as const;

function formatCellValue(value: string | number | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}

/** Build incoming section rows from snapshot (first row per pass + variety headers). */
function buildIncomingSectionRows(
  snapshot: FarmerReportPdfSnapshot
): (string | number)[][] {
  const { rows, visibleColumnIds } = snapshot;
  const incomingColumnIds = visibleColumnIds.filter((id) =>
    (INCOMING_COLUMN_IDS as readonly string[]).includes(id)
  );
  if (incomingColumnIds.length === 0) return [];

  const result: (string | number)[][] = [];
  const headerRow = incomingColumnIds.map(
    (id) => FARMER_REPORT_PDF_COLUMN_LABELS[id] ?? id
  );
  result.push(headerRow);

  const dataRows = rows.filter(
    (row) =>
      row.type === 'variety' ||
      (row.type === 'data' && (row.passRowIndex ?? 0) === 0)
  );
  for (const row of dataRows) {
    if (row.type === 'variety') {
      result.push([`Variety: ${row.variety ?? '—'}`]);
      continue;
    }
    const r = row as FarmerReportPdfRow & { type: 'data' };
    const cells = incomingColumnIds.map((id) => formatCellValue(r.cells[id]));
    result.push(cells);
  }
  return result;
}

/**
 * Generate and download a single-sheet Excel for the Accounting Report (same data as AccountingStockLedgerPdf).
 * All three tables (Incoming Details, Grading Gate Pass, Summary) are on the same sheet.
 */
export function downloadAccountingReportExcel(
  snapshot: FarmerReportPdfSnapshot,
  stockLedgerRows: StockLedgerRow[]
): void {
  const {
    companyName = '',
    farmerName = '',
    dateRangeLabel = '',
    reportTitle = 'Accounting Report',
  } = snapshot;

  const sheetRows: (string | number)[][] = [];

  // Header
  sheetRows.push([companyName]);
  sheetRows.push([reportTitle]);
  sheetRows.push([farmerName]);
  sheetRows.push([dateRangeLabel]);
  sheetRows.push([]);

  // 1. Incoming Details
  sheetRows.push(['1. Incoming Details']);
  const incomingRows = buildIncomingSectionRows(snapshot);
  if (incomingRows.length > 0) {
    for (const row of incomingRows) {
      sheetRows.push(row);
    }
  } else {
    sheetRows.push(['No incoming data.']);
  }
  sheetRows.push([]);

  // 2. Grading Gate Pass
  sheetRows.push(['2. Grading Gate Pass']);
  const ggpData = buildGradingGatePassSheetData(
    farmerName ?? '',
    stockLedgerRows
  );
  if (ggpData != null && ggpData.length > 2) {
    for (let i = 2; i < ggpData.length; i++) {
      sheetRows.push(ggpData[i]!);
    }
  } else {
    sheetRows.push(['No grading gate pass data.']);
  }
  sheetRows.push([]);

  // 3. Summary
  sheetRows.push(['3. Summary']);
  const summaryData = buildSummarySheetData(stockLedgerRows);
  if (summaryData.length > 2) {
    for (let i = 2; i < summaryData.length; i++) {
      sheetRows.push(summaryData[i]!);
    }
  } else {
    sheetRows.push(['No summary data.']);
  }

  const maxCols = sheetRows.reduce((max, row) => Math.max(max, row.length), 0);
  const colWidth = 22; // character width per column for readability
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  if (maxCols > 0) {
    ws['!cols'] = Array.from({ length: maxCols }, () => ({ wch: colWidth }));
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Accounting Report');

  const safeName = (farmerName ?? 'AccountingReport')
    .replace(/[/\\?*[\]:]/g, '-')
    .slice(0, 31);
  const filename = `${safeName}_Accounting_Report.xlsx`;
  XLSX.writeFile(wb, filename);
}
