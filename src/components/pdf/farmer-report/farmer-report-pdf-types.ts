/** A single row in the farmer report PDF: either a variety group header or a data row. */
export type FarmerReportPdfRow =
  | { type: 'variety'; variety: string }
  | { type: 'data'; cells: Record<string, string | number> };

/** Snapshot of the farmer grading table state for PDF (filters, grouping, visible columns, rows). */
export interface FarmerReportPdfSnapshot {
  companyName?: string;
  farmerName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  /** Column ids in display order (only visible columns). */
  visibleColumnIds: string[];
  /** Whether table is grouped by variety (variety header rows are present). */
  groupByVariety: boolean;
  rows: FarmerReportPdfRow[];
}

/** Short column labels for PDF (compact to reduce wrapping and save space). */
export const FARMER_REPORT_PDF_COLUMN_LABELS: Record<string, string> = {
  systemIncomingNo: 'Sys in no.',
  manualIncomingNo: 'Man in no.',
  incomingDate: 'In date',
  store: 'Store',
  truckNumber: 'Truck',
  variety: 'Variety',
  bagsReceived: 'Bags',
  totalBagsReceived: 'Tot bags',
  weightSlipNo: 'Slip no.',
  grossWeightKg: 'Gross (kg)',
  totalGrossKg: 'Tot gross',
  tareWeightKg: 'Tare (kg)',
  totalTareKg: 'Tot tare',
  netWeightKg: 'Net (kg)',
  totalNetKg: 'Tot net',
  lessBardanaKg: 'Less bardana',
  totalLessBardanaKg: 'Tot bardana',
  actualWeightKg: 'Actual (kg)',
  gradingGatePassNo: 'Grading GP',
  gradingManualNo: 'Grading man',
  gradingDate: 'G date',
  postGradingBags: 'Post bags',
  type: 'Type',
  weightReceivedAfterGrading: 'Wt after grad',
  lessBardanaForGrading: 'Less bard grad',
  actualWeightOfPotato: 'Actual potato',
  wastage: 'Wastage',
  amountPayable: 'Amount Payable',
  wastagePercent: 'Wastage %',
  B30: 'B30',
  '30-40': '30-40',
  '35-40': '35-40',
  '40-45': '40-45',
  '45-50': '45-50',
  '50-55': '50-55',
  A50: 'A50',
  A55: 'A55',
  CUT: 'CUT',
};
