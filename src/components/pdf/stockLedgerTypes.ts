/** Single row data for the stock ledger table */
export interface StockLedgerRow {
  serialNo: number;
  date: string | undefined;
  incomingGatePassNo: number | string;
  /** Manual incoming voucher number (displayed in table). */
  manualIncomingVoucherNo?: number | string;
  /** Grading gate pass number(s), e.g. from grading voucher (displayed in table). */
  gradingGatePassNo?: number | string;
  /** Manual gate pass number(s) from grading voucher(s) (displayed in table). */
  manualGradingGatePassNo?: number | string;
  /** Grading gate pass date (displayed in table when available). */
  gradingGatePassDate?: string;
  store: string;
  truckNumber: string | number | undefined;
  bagsReceived: number;
  weightSlipNumber?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  /** Sum of bags across all sizes from grading voucher(s) for this incoming */
  postGradingBags?: number;
  /** Bag type from grading (JUTE or LENO). Used when sizeBagsJute/sizeBagsLeno not provided. */
  bagType?: string;
  /** Per-size bag counts from grading voucher(s). Key = size label from GRADING_SIZES. Fallback when sizeBagsJute/sizeBagsLeno not provided. */
  sizeBags?: Record<string, number>;
  /** Per-size bag counts for JUTE bags (used for TYPE column bifurcation). */
  sizeBagsJute?: Record<string, number>;
  /** Per-size bag counts for LENO bags (used for TYPE column bifurcation). */
  sizeBagsLeno?: Record<string, number>;
  /** Per-size weight per bag (kg) for JUTE. Shown in brackets below quantity. */
  sizeWeightPerBagJute?: Record<string, number>;
  /** Per-size weight per bag (kg) for LENO. Shown in brackets below quantity. */
  sizeWeightPerBagLeno?: Record<string, number>;
  /** Per-size weight per bag (kg) when sizeBags used without JUTE/LENO split. */
  sizeWeightPerBag?: Record<string, number>;
  /** Potato variety for buy-back rate (e.g. from grading pass). Used for Amount Payable and displayed in table. */
  variety?: string;
  /**
   * When one grading gate pass is linked to multiple incoming gate passes, rows are emitted
   * consecutively with the same `gradingPassGroupSize` and increasing `gradingPassRowIndex`.
   * Grading size breakdown appears only on row index 0. Used by grading PDF / Excel grouping.
   */
  gradingPassGroupSize?: number;
  gradingPassRowIndex?: number;
}

/** Consecutive ledger rows that belong to the same grading pass (row-span in PDF). */
export function groupStockLedgerRowsByGradingPass(
  rows: StockLedgerRow[]
): StockLedgerRow[][] {
  const groups: StockLedgerRow[][] = [];
  let i = 0;
  while (i < rows.length) {
    const n = rows[i]?.gradingPassGroupSize ?? 1;
    groups.push(rows.slice(i, i + n));
    i += n;
  }
  return groups;
}

export interface StockLedgerPdfProps {
  farmerName: string;
  rows: StockLedgerRow[];
}
