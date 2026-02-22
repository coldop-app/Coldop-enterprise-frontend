/**
 * Column widths for the stock ledger main table and summary table.
 * Shared so both tables stay vertically aligned.
 */
export const STOCK_LEDGER_COL_WIDTHS = {
  gpNo: 22,
  manualIncomingVoucherNo: 22,
  gradingGatePassNo: 22,
  manualGradingGatePassNo: 22,
  date: 30,
  store: 38,
  variety: 32,
  truckNumber: 48,
  bagsReceived: 26,
  weightSlipNo: 26,
  grossWeight: 28,
  tareWeight: 28,
  netWeight: 28,
  lessBardana: 26,
  actualWeight: 28,
  postGradingBags: 24,
  bagType: 22,
  sizeColumn: 18,
  wtReceivedAfterGrading: 34,
  lessBardanaAfterGrading: 28,
  actualWtOfPotato: 34,
  weightShortage: 32,
  weightShortagePercent: 28,
  amountPayable: 32,
} as const;

/** Left columns (Gp No through Post Gr.) in display order for summary header row */
export const STOCK_LEDGER_LEFT_HEADERS: { label: string; width: number }[] = [
  { label: 'GP NO', width: STOCK_LEDGER_COL_WIDTHS.gpNo },
  { label: 'MANUAL NO', width: STOCK_LEDGER_COL_WIDTHS.manualIncomingVoucherNo },
  { label: 'GGP NO', width: STOCK_LEDGER_COL_WIDTHS.gradingGatePassNo },
  { label: 'MANUAL GGP', width: STOCK_LEDGER_COL_WIDTHS.manualGradingGatePassNo },
  { label: 'DATE', width: STOCK_LEDGER_COL_WIDTHS.date },
  { label: 'STORE', width: STOCK_LEDGER_COL_WIDTHS.store },
  { label: 'VARIETY', width: STOCK_LEDGER_COL_WIDTHS.variety },
  { label: 'TRUCK', width: STOCK_LEDGER_COL_WIDTHS.truckNumber },
  { label: 'BAGS REC.', width: STOCK_LEDGER_COL_WIDTHS.bagsReceived },
  { label: 'SLIP NO.', width: STOCK_LEDGER_COL_WIDTHS.weightSlipNo },
  { label: 'GROSS', width: STOCK_LEDGER_COL_WIDTHS.grossWeight },
  { label: 'TARE', width: STOCK_LEDGER_COL_WIDTHS.tareWeight },
  { label: 'NET', width: STOCK_LEDGER_COL_WIDTHS.netWeight },
  { label: 'LESS BARD.', width: STOCK_LEDGER_COL_WIDTHS.lessBardana },
  { label: 'ACTUAL', width: STOCK_LEDGER_COL_WIDTHS.actualWeight },
  { label: 'POST GR.', width: STOCK_LEDGER_COL_WIDTHS.postGradingBags },
];
