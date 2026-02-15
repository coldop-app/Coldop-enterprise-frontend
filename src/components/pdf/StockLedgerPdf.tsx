import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import {
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
  GRADING_SIZES,
  BUY_BACK_COST,
} from '@/components/forms/grading/constants';
import type { GradingSize } from '@/components/forms/grading/constants';

/** Single row data for the stock ledger table */
export interface StockLedgerRow {
  serialNo: number;
  date: string | undefined;
  incomingGatePassNo: number | string;
  /** Manual incoming voucher number (displayed in table). */
  manualIncomingVoucherNo?: number | string;
  /** Grading gate pass number(s), e.g. from grading voucher (displayed in table). */
  gradingGatePassNo?: number | string;
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
}

export interface StockLedgerPdfProps {
  farmerName: string;
  rows: StockLedgerRow[];
}

const HEADER_BG = '#f9fafb';
const BORDER = '#e5e7eb';
/** Height of one data sub-row for TYPE + size columns (used for rowSpan 2 alignment). */
const ROW_HEIGHT = 12;

/** Column widths: minimal to fit content, center-aligned. */
const COL_WIDTHS = {
  gpNo: 22,
  manualIncomingVoucherNo: 22,
  gradingGatePassNo: 22,
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
  /** Width for each grading size column (Below 25, 25–30, etc.) */
  sizeColumn: 18,
  /** Wt Received After Grading (row span after size columns) */
  wtReceivedAfterGrading: 34,
  /** Less Bardana after grading (bifurcated: JUTE/LENO bag weight deduction) */
  lessBardanaAfterGrading: 28,
  /** Actual wt of Potato = Wt Rec. After Gr. - Less Bard. (JUTE + LENO wastage) */
  actualWtOfPotato: 34,
  /** Weight Shortage = Actual Weight (incoming) - Actual wt of Potato (grading) */
  weightShortage: 32,
  /** Shortage % = (Weight Shortage / Actual Weight incoming) × 100 */
  weightShortagePercent: 28,
  /** Amount Payable = sum over sizes of bags × (wt per bag − bag wt) × buy-back rate */
  amountPayable: 32,
} as const;

/** Total width of left block (Gp No through Post Gr.) for exact alignment. */
const LEFT_BLOCK_WIDTH =
  COL_WIDTHS.gpNo +
  COL_WIDTHS.manualIncomingVoucherNo +
  COL_WIDTHS.gradingGatePassNo +
  COL_WIDTHS.date +
  COL_WIDTHS.store +
  COL_WIDTHS.variety +
  COL_WIDTHS.truckNumber +
  COL_WIDTHS.bagsReceived +
  COL_WIDTHS.weightSlipNo +
  COL_WIDTHS.grossWeight +
  COL_WIDTHS.tareWeight +
  COL_WIDTHS.netWeight +
  COL_WIDTHS.lessBardana +
  COL_WIDTHS.actualWeight +
  COL_WIDTHS.postGradingBags;

/** Total width of middle block (Type + size columns only; bifurcation ends here). */
const MIDDLE_BLOCK_WIDTH =
  COL_WIDTHS.bagType + GRADING_SIZES.length * COL_WIDTHS.sizeColumn;

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontSize: 4,
    fontFamily: 'Helvetica',
  },
  titleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 7,
    fontWeight: 700,
    color: '#333',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
    flexShrink: 0,
  },
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  /** Wrapper for a logical data row: left block (rowSpan 2) + right block (TYPE + sizes, 2 sub-rows). */
  dataRowWrapper: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  /** Left block (No. through Post Gr.) that spans 2 sub-rows. */
  dataRowLeftBlock: {
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: ROW_HEIGHT * 2,
    width: LEFT_BLOCK_WIDTH,
    flexShrink: 0,
  },
  dataRowLeftBlockRow: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  /** Middle block (Type + size columns) - bifurcation; fixed width for alignment. */
  dataRowMiddleBlock: {
    width: MIDDLE_BLOCK_WIDTH,
    flexShrink: 0,
  },
  /** Block: Wt Received After Grading (row span 2, like left block). */
  dataRowWtReceivedBlock: {
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.wtReceivedAfterGrading,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Less Bardana after grading (2 sub-rows: JUTE row value, LENO row value). */
  dataRowLessBardanaBlock: {
    width: COL_WIDTHS.lessBardanaAfterGrading,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Actual wt of Potato (row span 2) = Wt Rec. After Gr. - Less Bard. after grading. */
  dataRowActualWtOfPotatoBlock: {
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.actualWtOfPotato,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Weight Shortage (row span 2) = Actual Weight (incoming) - Actual wt of Potato. */
  dataRowWeightShortageBlock: {
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.weightShortage,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Shortage % (row span 2) = (Weight Shortage / Actual Weight incoming) × 100. */
  dataRowWeightShortagePercentBlock: {
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.weightShortagePercent,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Amount Payable (row span 2) = sum over sizes of bags × (wt per bag − bag wt) × buy-back rate. */
  dataRowAmountPayableBlock: {
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.amountPayable,
    flexShrink: 0,
    borderLeftWidth: 1,
    borderColor: BORDER,
  },
  /** Single sub-row for TYPE + size columns (JUTE or LENO). */
  dataSubRow: {
    flexDirection: 'row',
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  dataSubRowLast: {
    borderBottomWidth: 0,
  },
  cell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  headerCell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    fontWeight: 700,
    fontSize: 3.5,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  cellCenter: {
    textAlign: 'center',
  },
  cellRight: {
    textAlign: 'right',
  },
  /** Wrapper for size cell content (quantity + weight line) to keep center-aligned block */
  sizeCellContent: {
    alignItems: 'center',
  },
  /** Second line in size cell: weight per bag in brackets */
  sizeCellSub: {
    fontSize: 3,
    color: '#6b7280',
  },
  totalRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f3f4f6',
    flexShrink: 0,
  },
  totalCell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalCellText: {
    fontWeight: 700,
  },
  /** Bag size analytics section below the table */
  analyticsSection: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 6,
    backgroundColor: '#fafafa',
  },
  analyticsTitle: {
    fontSize: 5,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  analyticsSubtitle: {
    fontSize: 3,
    color: '#6b7280',
    marginBottom: 4,
  },
  analyticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  analyticsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    gap: 2,
  },
  analyticsChipLabel: {
    fontSize: 3.5,
    color: '#374151',
  },
  analyticsChipValue: {
    fontSize: 3.5,
    fontWeight: 700,
    color: '#111',
  },
  /** Amount Payable calculations in detail section */
  amountPayableSection: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 6,
    backgroundColor: '#fafafa',
  },
  amountPayableFormula: {
    fontSize: 3,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 1.4,
  },
  amountPayableRowBlock: {
    marginBottom: 6,
  },
  amountPayableRowTitle: {
    fontSize: 3.5,
    fontWeight: 700,
    color: '#111',
    marginBottom: 2,
  },
  amountPayableLine: {
    fontSize: 3,
    color: '#4b5563',
    marginLeft: 6,
    marginBottom: 1,
    lineHeight: 1.35,
  },
  amountPayableRowTotal: {
    fontSize: 3.5,
    fontWeight: 700,
    color: '#111',
    marginLeft: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  amountPayableGrandTotal: {
    fontSize: 4,
    fontWeight: 700,
    color: '#111',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
});

/** Short labels for grading size columns to save space */
const SIZE_HEADER_LABELS: Record<string, string> = {
  'Below 25': 'B25',
  '25–30': '25-30',
  'Below 30': 'B30',
  '30–35': '30-35',
  '35–40': '35-40',
  '30–40': '30-40',
  '40–45': '40-45',
  '45–50': '45-50',
  '50–55': '50-55',
  'Above 50': 'A50',
  'Above 55': 'A55',
  Cut: 'Cut',
};

function TableHeader() {
  return (
    <View style={styles.headerRow}>
      <View style={[styles.headerCell, { width: COL_WIDTHS.gpNo }]}>
        <Text style={styles.cellCenter}>Gp No</Text>
      </View>
      <View
        style={[
          styles.headerCell,
          { width: COL_WIDTHS.manualIncomingVoucherNo },
        ]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>Manual No</Text>
      </View>
      <View
        style={[styles.headerCell, { width: COL_WIDTHS.gradingGatePassNo }]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>GGP No</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.date }]}>
        <Text style={styles.cellCenter}>Date</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.store }]}>
        <Text style={styles.cellCenter}>Store</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.variety }]}>
        <Text style={styles.cellCenter}>Variety</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.truckNumber }]}>
        <Text style={styles.cellCenter}>Truck</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.bagsReceived }]}>
        <Text style={styles.cellCenter}>Bags Rec.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.weightSlipNo }]}>
        <Text style={styles.cellCenter}>Slip No.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.grossWeight }]}>
        <Text style={styles.cellCenter}>Gross</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.tareWeight }]}>
        <Text style={styles.cellCenter}>Tare</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.netWeight }]}>
        <Text style={styles.cellCenter}>Net</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.lessBardana }]}>
        <Text style={styles.cellCenter}>Less Bard.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.actualWeight }]}>
        <Text style={styles.cellCenter}>Actual</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.postGradingBags }]}>
        <Text style={styles.cellCenter}>Post Gr.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.bagType }]}>
        <Text style={styles.cellCenter}>Type</Text>
      </View>
      {GRADING_SIZES.map((size) => (
        <View
          key={size}
          style={[styles.headerCell, { width: COL_WIDTHS.sizeColumn }]}
        >
          <Text style={styles.cellCenter}>
            {SIZE_HEADER_LABELS[size] ?? size}
          </Text>
        </View>
      ))}
      <View
        style={[
          styles.headerCell,
          { width: COL_WIDTHS.wtReceivedAfterGrading },
        ]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>
          Wt Rec. After Gr.
        </Text>
      </View>
      <View
        style={[
          styles.headerCell,
          { width: COL_WIDTHS.lessBardanaAfterGrading },
        ]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>Less Bard.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.actualWtOfPotato }]}>
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>
          Actual wt of Potato
        </Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.weightShortage }]}>
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>
          Weight Shortage
        </Text>
      </View>
      <View
        style={[styles.headerCell, { width: COL_WIDTHS.weightShortagePercent }]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>Shortage %</Text>
      </View>
      <View
        style={[
          styles.headerCell,
          styles.headerCellLast,
          { width: COL_WIDTHS.amountPayable },
        ]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>Amount Payable</Text>
      </View>
    </View>
  );
}

function formatWeight(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-IN');
}

/** Round up to the next multiple of 10 */
function roundUpToMultipleOf10(value: number): number {
  return Math.ceil(value / 10) * 10;
}

/** Sum of (bags × weightPerBagKg) for the row (wt received after grading). */
function computeWtReceivedAfterGrading(row: StockLedgerRow): number {
  const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
  if (hasSplit) {
    let sum = 0;
    for (const size of GRADING_SIZES) {
      const juteBags = row.sizeBagsJute?.[size] ?? 0;
      const juteWt = row.sizeWeightPerBagJute?.[size] ?? 0;
      const lenoBags = row.sizeBagsLeno?.[size] ?? 0;
      const lenoWt = row.sizeWeightPerBagLeno?.[size] ?? 0;
      sum += juteBags * juteWt + lenoBags * lenoWt;
    }
    return sum;
  }
  let sum = 0;
  for (const size of GRADING_SIZES) {
    const bags = row.sizeBags?.[size] ?? 0;
    const wt = row.sizeWeightPerBag?.[size] ?? 0;
    sum += bags * wt;
  }
  return sum;
}

/** Total JUTE bags and LENO bags for the row (for less bardana after grading). */
function getTotalJuteAndLenoBags(row: StockLedgerRow): {
  totalJute: number;
  totalLeno: number;
} {
  const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
  if (hasSplit) {
    let totalJute = 0;
    let totalLeno = 0;
    for (const size of GRADING_SIZES) {
      totalJute += row.sizeBagsJute?.[size] ?? 0;
      totalLeno += row.sizeBagsLeno?.[size] ?? 0;
    }
    return { totalJute, totalLeno };
  }
  let totalBags = 0;
  for (const size of GRADING_SIZES) {
    totalBags += row.sizeBags?.[size] ?? 0;
  }
  const isLeno = row.bagType?.toUpperCase() === 'LENO';
  return isLeno
    ? { totalJute: 0, totalLeno: totalBags }
    : { totalJute: totalBags, totalLeno: 0 };
}

/** Less bardana after grading: (JUTE bags × JUTE_BAG_WEIGHT) + (LENO bags × LENO_BAG_WEIGHT). */
function computeLessBardanaAfterGrading(row: StockLedgerRow): number {
  const { totalJute, totalLeno } = getTotalJuteAndLenoBags(row);
  return totalJute * JUTE_BAG_WEIGHT + totalLeno * LENO_BAG_WEIGHT;
}

/** Actual wt of Potato = weight received after grading - (wastage from LENO + wastage from JUTE), rounded to nearest 10. */
function computeActualWtOfPotato(row: StockLedgerRow): number {
  const wtReceived = computeWtReceivedAfterGrading(row);
  const lessBardana = computeLessBardanaAfterGrading(row);
  const value = wtReceived - lessBardana;
  return Math.round(value / 10) * 10;
}

/** Actual Weight from incoming gate pass (Net - Less Bardana, rounded up to multiple of 10). */
function computeIncomingActualWeight(row: StockLedgerRow): number | undefined {
  const lessBardana = row.bagsReceived * JUTE_BAG_WEIGHT;
  if (row.netWeightKg == null || Number.isNaN(row.netWeightKg)) {
    return undefined;
  }
  return roundUpToMultipleOf10(row.netWeightKg - lessBardana);
}

/** Weight Shortage = Actual Weight (incoming) - Actual wt of Potato (grading). */
function computeWeightShortage(row: StockLedgerRow): number | undefined {
  const incoming = computeIncomingActualWeight(row);
  if (incoming == null) return undefined;
  return incoming - computeActualWtOfPotato(row);
}

/** Shortage % = (Weight Shortage / Actual Weight incoming) × 100. */
function computeWeightShortagePercent(row: StockLedgerRow): number | undefined {
  const incoming = computeIncomingActualWeight(row);
  const shortage = computeWeightShortage(row);
  if (
    incoming == null ||
    shortage == null ||
    Number.isNaN(shortage) ||
    incoming <= 0
  ) {
    return undefined;
  }
  return (shortage / incoming) * 100;
}

/** Buy-back rate (₹/kg) for a variety and size; 0 if variety not in BUY_BACK_COST or size not found. */
function getBuyBackRate(variety: string | undefined, size: string): number {
  if (!variety?.trim()) return 0;
  const config = BUY_BACK_COST.find(
    (c) => c.variety.toLowerCase() === variety.trim().toLowerCase()
  );
  if (!config) return 0;
  const rate = config.sizeRates[size as GradingSize];
  return rate != null && !Number.isNaN(rate) ? rate : 0;
}

/**
 * Amount Payable = for each bag size: no. of bags × (weight per bag in − wt of bag by type) × buy-back cost (variety, size).
 * Summed over all sizes, with JUTE/LENO split when available.
 */
function computeAmountPayable(row: StockLedgerRow): number {
  const variety = row.variety?.trim();
  const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
  let sum = 0;
  if (hasSplit) {
    for (const size of GRADING_SIZES) {
      const rate = getBuyBackRate(variety, size);
      const juteBags = row.sizeBagsJute?.[size] ?? 0;
      const juteWt = row.sizeWeightPerBagJute?.[size];
      if (juteBags > 0 && juteWt != null && !Number.isNaN(juteWt)) {
        const netWtPerBag = juteWt - JUTE_BAG_WEIGHT;
        if (netWtPerBag > 0) sum += juteBags * netWtPerBag * rate;
      }
      const lenoBags = row.sizeBagsLeno?.[size] ?? 0;
      const lenoWt = row.sizeWeightPerBagLeno?.[size];
      if (lenoBags > 0 && lenoWt != null && !Number.isNaN(lenoWt)) {
        const netWtPerBag = lenoWt - LENO_BAG_WEIGHT;
        if (netWtPerBag > 0) sum += lenoBags * netWtPerBag * rate;
      }
    }
    return sum;
  }
  const isLeno = row.bagType?.toUpperCase() === 'LENO';
  const bagWt = isLeno ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
  for (const size of GRADING_SIZES) {
    const bags = row.sizeBags?.[size] ?? 0;
    const wt = row.sizeWeightPerBag?.[size];
    if (bags > 0 && wt != null && !Number.isNaN(wt)) {
      const netWtPerBag = wt - bagWt;
      if (netWtPerBag > 0) {
        const rate = getBuyBackRate(variety, size);
        sum += bags * netWtPerBag * rate;
      }
    }
  }
  return sum;
}

/** Single line in the amount payable breakdown (one size + bag type). */
export interface AmountPayableBreakdownLine {
  size: string;
  sizeLabel: string;
  bagType: string;
  bags: number;
  wtPerBagKg: number;
  bagWtKg: number;
  netWtPerBagKg: number;
  ratePerKg: number;
  amount: number;
}

/** Per-row breakdown for amount payable (for detailed calculation section). */
export interface AmountPayableRowBreakdown {
  rowLabel: string;
  variety: string;
  total: number;
  lines: AmountPayableBreakdownLine[];
}

/**
 * Returns the detailed breakdown for amount payable for a single row,
 * so it can be rendered in the "Amount Payable — Calculations in detail" section.
 */
function getAmountPayableBreakdown(row: StockLedgerRow): AmountPayableRowBreakdown | null {
  const variety = row.variety?.trim() ?? '';
  const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
  const lines: AmountPayableBreakdownLine[] = [];

  if (hasSplit) {
    for (const size of GRADING_SIZES) {
      const rate = getBuyBackRate(variety, size);
      const juteBags = row.sizeBagsJute?.[size] ?? 0;
      const juteWt = row.sizeWeightPerBagJute?.[size];
      if (juteBags > 0 && juteWt != null && !Number.isNaN(juteWt)) {
        const netWtPerBag = juteWt - JUTE_BAG_WEIGHT;
        if (netWtPerBag > 0) {
          lines.push({
            size,
            sizeLabel: SIZE_HEADER_LABELS[size] ?? size,
            bagType: 'JUTE',
            bags: juteBags,
            wtPerBagKg: juteWt,
            bagWtKg: JUTE_BAG_WEIGHT,
            netWtPerBagKg: netWtPerBag,
            ratePerKg: rate,
            amount: juteBags * netWtPerBag * rate,
          });
        }
      }
      const lenoBags = row.sizeBagsLeno?.[size] ?? 0;
      const lenoWt = row.sizeWeightPerBagLeno?.[size];
      if (lenoBags > 0 && lenoWt != null && !Number.isNaN(lenoWt)) {
        const netWtPerBag = lenoWt - LENO_BAG_WEIGHT;
        if (netWtPerBag > 0) {
          lines.push({
            size,
            sizeLabel: SIZE_HEADER_LABELS[size] ?? size,
            bagType: 'LENO',
            bags: lenoBags,
            wtPerBagKg: lenoWt,
            bagWtKg: LENO_BAG_WEIGHT,
            netWtPerBagKg: netWtPerBag,
            ratePerKg: rate,
            amount: lenoBags * netWtPerBag * rate,
          });
        }
      }
    }
  } else {
    const isLeno = row.bagType?.toUpperCase() === 'LENO';
    const bagWt = isLeno ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
    const bagType = isLeno ? 'LENO' : 'JUTE';
    for (const size of GRADING_SIZES) {
      const bags = row.sizeBags?.[size] ?? 0;
      const wt = row.sizeWeightPerBag?.[size];
      if (bags > 0 && wt != null && !Number.isNaN(wt)) {
        const netWtPerBag = wt - bagWt;
        if (netWtPerBag > 0) {
          const rate = getBuyBackRate(variety, size);
          lines.push({
            size,
            sizeLabel: SIZE_HEADER_LABELS[size] ?? size,
            bagType,
            bags,
            wtPerBagKg: wt,
            bagWtKg: bagWt,
            netWtPerBagKg: netWtPerBag,
            ratePerKg: rate,
            amount: bags * netWtPerBag * rate,
          });
        }
      }
    }
  }

  if (lines.length === 0) return null;
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const rowLabel = `GP No ${row.incomingGatePassNo}`;
  return { rowLabel, variety, total, lines };
}

function computeTotals(rows: StockLedgerRow[]) {
  let totalBagsReceived = 0;
  let totalGrossKg = 0;
  let totalTareKg = 0;
  let totalNetKg = 0;
  let totalLessBardanaKg = 0;
  let totalActualWeightKg = 0;
  for (const row of rows) {
    totalBagsReceived += row.bagsReceived;
    totalGrossKg += row.grossWeightKg ?? 0;
    totalTareKg += row.tareWeightKg ?? 0;
    totalNetKg += row.netWeightKg ?? 0;
    const lessBardana = row.bagsReceived * JUTE_BAG_WEIGHT;
    totalLessBardanaKg += lessBardana;
    if (row.netWeightKg != null && !Number.isNaN(row.netWeightKg)) {
      totalActualWeightKg += roundUpToMultipleOf10(
        row.netWeightKg - lessBardana
      );
    }
  }
  let totalPostGradingBags = 0;
  for (const row of rows) {
    totalPostGradingBags += row.postGradingBags ?? 0;
  }
  const totalSizeBags: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    totalSizeBags[size] = rows.reduce((sum, row) => {
      const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
      if (hasSplit) {
        return (
          sum +
          (row.sizeBagsJute?.[size] ?? 0) +
          (row.sizeBagsLeno?.[size] ?? 0)
        );
      }
      return sum + (row.sizeBags?.[size] ?? 0);
    }, 0);
  }
  let totalWtReceivedAfterGrading = 0;
  for (const row of rows) {
    totalWtReceivedAfterGrading += computeWtReceivedAfterGrading(row);
  }
  let totalLessBardanaAfterGrading = 0;
  for (const row of rows) {
    totalLessBardanaAfterGrading += computeLessBardanaAfterGrading(row);
  }
  let totalActualWtOfPotato = 0;
  for (const row of rows) {
    totalActualWtOfPotato += computeActualWtOfPotato(row);
  }
  let totalWeightShortage = 0;
  for (const row of rows) {
    const shortage = computeWeightShortage(row);
    if (shortage != null && !Number.isNaN(shortage)) {
      totalWeightShortage += shortage;
    }
  }
  const totalWeightShortagePercent =
    totalActualWeightKg > 0
      ? (totalWeightShortage / totalActualWeightKg) * 100
      : undefined;
  let totalAmountPayable = 0;
  for (const row of rows) {
    totalAmountPayable += computeAmountPayable(row);
  }
  return {
    totalBagsReceived,
    totalGrossKg,
    totalTareKg,
    totalNetKg,
    totalLessBardanaKg,
    totalActualWeightKg,
    totalPostGradingBags,
    totalSizeBags,
    totalWtReceivedAfterGrading,
    totalLessBardanaAfterGrading,
    totalActualWtOfPotato,
    totalWeightShortage,
    totalWeightShortagePercent,
    totalAmountPayable,
  };
}

/**
 * For each bag size: sum over all rows of quantity × (gross weight per bag − tare weight of bag type).
 * Result is the net potato weight (kg) attributable to that size.
 */
function computeBagSizeNetWeights(
  rows: StockLedgerRow[]
): Record<string, number> {
  const bySize: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    bySize[size] = 0;
  }
  for (const row of rows) {
    const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
    if (hasSplit) {
      for (const size of GRADING_SIZES) {
        const juteBags = row.sizeBagsJute?.[size] ?? 0;
        const juteWt = row.sizeWeightPerBagJute?.[size];
        const lenoBags = row.sizeBagsLeno?.[size] ?? 0;
        const lenoWt = row.sizeWeightPerBagLeno?.[size];
        if (juteBags > 0 && juteWt != null && !Number.isNaN(juteWt)) {
          bySize[size] += juteBags * (juteWt - JUTE_BAG_WEIGHT);
        }
        if (lenoBags > 0 && lenoWt != null && !Number.isNaN(lenoWt)) {
          bySize[size] += lenoBags * (lenoWt - LENO_BAG_WEIGHT);
        }
      }
    } else {
      const bagWt =
        row.bagType?.toUpperCase() === 'LENO'
          ? LENO_BAG_WEIGHT
          : JUTE_BAG_WEIGHT;
      for (const size of GRADING_SIZES) {
        const bags = row.sizeBags?.[size] ?? 0;
        const wt = row.sizeWeightPerBag?.[size];
        if (bags > 0 && wt != null && !Number.isNaN(wt)) {
          bySize[size] += bags * (wt - bagWt);
        }
      }
    }
  }
  return bySize;
}

/**
 * Bag size share of actual potato weight: (net weight for size / total actual wt of potato) × 100.
 * Returns entries only for sizes with a positive share.
 */
function computeBagSizePercentages(rows: StockLedgerRow[]): {
  totalActualWtOfPotato: number;
  percentages: {
    size: string;
    label: string;
    netKg: number;
    percent: number;
  }[];
} {
  const totals = computeTotals(rows);
  const totalActualWtOfPotato = totals.totalActualWtOfPotato;
  const netBySize = computeBagSizeNetWeights(rows);
  const percentages: {
    size: string;
    label: string;
    netKg: number;
    percent: number;
  }[] = [];
  if (totalActualWtOfPotato <= 0) {
    return { totalActualWtOfPotato: 0, percentages };
  }
  for (const size of GRADING_SIZES) {
    const netKg = netBySize[size] ?? 0;
    if (netKg <= 0) continue;
    const percent = (netKg / totalActualWtOfPotato) * 100;
    percentages.push({
      size,
      label: SIZE_HEADER_LABELS[size] ?? size,
      netKg,
      percent,
    });
  }
  return { totalActualWtOfPotato, percentages };
}

function BagSizeAnalytics({ rows }: { rows: StockLedgerRow[] }) {
  const { totalActualWtOfPotato, percentages } =
    computeBagSizePercentages(rows);
  if (percentages.length === 0) return null;
  return (
    <View style={styles.analyticsSection}>
      <Text style={styles.analyticsTitle}>
        Bag size mix (% of actual potato weight)
      </Text>
      <Text style={styles.analyticsSubtitle}>
        For each size: Σ (bags × (weight per bag − bag tare)) ÷ total actual wt
        of potato × 100. Total actual wt of potato:{' '}
        {totalActualWtOfPotato.toLocaleString('en-IN')} kg.
      </Text>
      <View style={styles.analyticsRow}>
        {percentages.map(({ size, label, percent }) => (
          <View key={size} style={styles.analyticsChip}>
            <Text style={styles.analyticsChipLabel}>{label}</Text>
            <Text style={styles.analyticsChipValue}>{percent.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AmountPayableDetail({ rows }: { rows: StockLedgerRow[] }) {
  const breakdowns = rows
    .map((row) => getAmountPayableBreakdown(row))
    .filter((b): b is AmountPayableRowBreakdown => b != null && b.total > 0);
  if (breakdowns.length === 0) return null;

  const grandTotal = breakdowns.reduce((s, b) => s + b.total, 0);

  return (
    <View style={styles.amountPayableSection}>
      <Text style={styles.analyticsTitle}>
        Amount Payable — Calculations in detail
      </Text>
      <Text style={styles.amountPayableFormula}>
        For each size and bag type: Amount = bags x (weight per bag - bag tare
        in kg) x buy-back rate (Rs/kg). JUTE bag tare = {JUTE_BAG_WEIGHT} kg,
        LENO bag tare = {LENO_BAG_WEIGHT} kg. Rates are per variety and size
        (buy-back config).
      </Text>
      {breakdowns.map((b, idx) => (
        <View key={idx} style={styles.amountPayableRowBlock}>
          <Text style={styles.amountPayableRowTitle}>
            {b.rowLabel}
            {b.variety ? ` (Variety: ${b.variety})` : ''}
          </Text>
          {b.lines.map((line, lineIdx) => (
            <Text key={lineIdx} style={styles.amountPayableLine}>
              {line.sizeLabel}, {line.bagType}: {line.bags} bags x (
              {line.wtPerBagKg} - {line.bagWtKg}) kg x Rs{' '}
              {line.ratePerKg.toFixed(2)}/kg = Rs{' '}
              {line.amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          ))}
          <Text style={styles.amountPayableRowTotal}>
            Row total: Rs{' '}
            {b.total.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      ))}
      <Text style={styles.amountPayableGrandTotal}>
        Total Amount Payable: Rs{' '}
        {grandTotal.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>
    </View>
  );
}

function TotalRow({ rows }: { rows: StockLedgerRow[] }) {
  const totals = computeTotals(rows);
  const boldCenter = [styles.cellCenter, styles.totalCellText];
  return (
    <View style={styles.totalRow}>
      <View style={[styles.totalCell, { width: COL_WIDTHS.gpNo }]}>
        <Text style={[styles.cellCenter, styles.totalCellText]}>Total</Text>
      </View>
      <View
        style={[styles.totalCell, { width: COL_WIDTHS.manualIncomingVoucherNo }]}
      >
        <Text />
      </View>
      <View
        style={[styles.totalCell, { width: COL_WIDTHS.gradingGatePassNo }]}
      >
        <Text />
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.date }]}>
        <Text />
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.store }]}>
        <Text />
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.variety }]}>
        <Text />
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.truckNumber }]}>
        <Text />
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.bagsReceived }]}>
        <Text style={boldCenter}>
          {totals.totalBagsReceived.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.weightSlipNo }]}>
        <Text />
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.grossWeight }]}>
        <Text style={boldCenter}>
          {totals.totalGrossKg.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.tareWeight }]}>
        <Text style={boldCenter}>
          {totals.totalTareKg.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.netWeight }]}>
        <Text style={boldCenter}>
          {totals.totalNetKg.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.lessBardana }]}>
        <Text style={boldCenter}>
          {totals.totalLessBardanaKg.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.actualWeight }]}>
        <Text style={boldCenter}>
          {totals.totalActualWeightKg.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.postGradingBags }]}>
        <Text style={boldCenter}>
          {totals.totalPostGradingBags.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.bagType }]}>
        <Text />
      </View>
      {GRADING_SIZES.map((size) => (
        <View
          key={size}
          style={[styles.totalCell, { width: COL_WIDTHS.sizeColumn }]}
        >
          <Text style={boldCenter}>
            {totals.totalSizeBags[size] > 0
              ? totals.totalSizeBags[size].toLocaleString('en-IN')
              : ''}
          </Text>
        </View>
      ))}
      <View
        style={[styles.totalCell, { width: COL_WIDTHS.wtReceivedAfterGrading }]}
      >
        <Text style={boldCenter}>
          {totals.totalWtReceivedAfterGrading > 0
            ? totals.totalWtReceivedAfterGrading.toLocaleString('en-IN')
            : ''}
        </Text>
      </View>
      <View
        style={[
          styles.totalCell,
          { width: COL_WIDTHS.lessBardanaAfterGrading },
        ]}
      >
        <Text style={boldCenter}>
          {totals.totalLessBardanaAfterGrading > 0
            ? totals.totalLessBardanaAfterGrading.toLocaleString('en-IN')
            : ''}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.actualWtOfPotato }]}>
        <Text style={boldCenter}>
          {totals.totalActualWtOfPotato > 0
            ? totals.totalActualWtOfPotato.toLocaleString('en-IN')
            : ''}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.weightShortage }]}>
        <Text style={boldCenter}>
          {totals.totalWeightShortage !== 0
            ? totals.totalWeightShortage.toLocaleString('en-IN')
            : ''}
        </Text>
      </View>
      <View
        style={[styles.totalCell, { width: COL_WIDTHS.weightShortagePercent }]}
      >
        <Text style={boldCenter}>
          {totals.totalWeightShortagePercent != null &&
          !Number.isNaN(totals.totalWeightShortagePercent)
            ? `${totals.totalWeightShortagePercent.toFixed(1)}%`
            : ''}
        </Text>
      </View>
      <View
        style={[
          styles.totalCell,
          styles.cellLast,
          { width: COL_WIDTHS.amountPayable },
        ]}
      >
        <Text style={boldCenter}>
          {totals.totalAmountPayable > 0
            ? totals.totalAmountPayable.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ''}
        </Text>
      </View>
    </View>
  );
}

/** Resolve JUTE size bags: explicit sizeBagsJute or legacy bagType + sizeBags. */
function getSizeBagsJute(
  row: StockLedgerRow
): Record<string, number> | undefined {
  if (row.sizeBagsJute != null && Object.keys(row.sizeBagsJute).length > 0)
    return row.sizeBagsJute;
  if (row.bagType === 'JUTE' && row.sizeBags) return row.sizeBags;
  return undefined;
}

/** Resolve LENO size bags: explicit sizeBagsLeno or legacy bagType + sizeBags. */
function getSizeBagsLeno(
  row: StockLedgerRow
): Record<string, number> | undefined {
  if (row.sizeBagsLeno != null && Object.keys(row.sizeBagsLeno).length > 0)
    return row.sizeBagsLeno;
  if (row.bagType === 'LENO' && row.sizeBags) return row.sizeBags;
  return undefined;
}

function DataRow({ row }: { row: StockLedgerRow }) {
  const dateStr = formatVoucherDate(row.date);
  const truckStr =
    row.truckNumber != null && String(row.truckNumber).trim() !== ''
      ? String(row.truckNumber)
      : '—';
  const slipStr =
    row.weightSlipNumber != null && String(row.weightSlipNumber).trim() !== ''
      ? row.weightSlipNumber
      : '—';

  const lessBardanaKg = row.bagsReceived * JUTE_BAG_WEIGHT;
  const actualWeightKg =
    row.netWeightKg != null && !Number.isNaN(row.netWeightKg)
      ? roundUpToMultipleOf10(row.netWeightKg - lessBardanaKg)
      : undefined;

  const sizeBagsJute = getSizeBagsJute(row);
  const sizeBagsLeno = getSizeBagsLeno(row);
  const hasPostGrading =
    row.postGradingBags != null || sizeBagsJute != null || sizeBagsLeno != null;

  const manualNoStr =
    row.manualIncomingVoucherNo != null &&
    String(row.manualIncomingVoucherNo).trim() !== ''
      ? String(row.manualIncomingVoucherNo)
      : '—';
  const ggpNoStr =
    row.gradingGatePassNo != null &&
    String(row.gradingGatePassNo).trim() !== ''
      ? String(row.gradingGatePassNo)
      : '—';
  const varietyStr =
    row.variety != null && String(row.variety).trim() !== ''
      ? String(row.variety).trim()
      : '—';

  const leftCells = (
    <>
      <View style={[styles.cell, { width: COL_WIDTHS.gpNo }]}>
        <Text style={styles.cellCenter}>{row.incomingGatePassNo}</Text>
      </View>
      <View
        style={[styles.cell, { width: COL_WIDTHS.manualIncomingVoucherNo }]}
      >
        <Text style={styles.cellCenter}>{manualNoStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.gradingGatePassNo }]}>
        <Text style={styles.cellCenter}>{ggpNoStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.date }]}>
        <Text style={styles.cellCenter}>{dateStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.store }]}>
        <Text style={styles.cellCenter}>{row.store}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.variety }]}>
        <Text style={styles.cellCenter}>{varietyStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.truckNumber }]}>
        <Text style={styles.cellCenter}>{truckStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.bagsReceived }]}>
        <Text style={styles.cellCenter}>
          {row.bagsReceived.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.weightSlipNo }]}>
        <Text style={styles.cellCenter}>{slipStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.grossWeight }]}>
        <Text style={styles.cellCenter}>{formatWeight(row.grossWeightKg)}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.tareWeight }]}>
        <Text style={styles.cellCenter}>{formatWeight(row.tareWeightKg)}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.netWeight }]}>
        <Text style={styles.cellCenter}>{formatWeight(row.netWeightKg)}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.lessBardana }]}>
        <Text style={styles.cellCenter}>
          {lessBardanaKg.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.actualWeight }]}>
        <Text style={styles.cellCenter}>{formatWeight(actualWeightKg)}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.postGradingBags }]}>
        <Text style={styles.cellCenter}>
          {row.postGradingBags != null
            ? row.postGradingBags.toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
    </>
  );

  const typeAndSizeCells = (
    bagType: 'JUTE' | 'LENO',
    sizeBags: Record<string, number> | undefined,
    sizeWeightPerBag: Record<string, number> | undefined
  ) => (
    <>
      <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
        <Text style={styles.cellCenter}>{bagType}</Text>
      </View>
      {GRADING_SIZES.map((size) => {
        const value = sizeBags?.[size];
        const weightKg = sizeWeightPerBag?.[size];
        const showQty = value != null && value > 0;
        return (
          <View
            key={size}
            style={[styles.cell, { width: COL_WIDTHS.sizeColumn }]}
          >
            <View style={[styles.cellCenter, styles.sizeCellContent]}>
              {showQty && (
                <>
                  <Text style={styles.cellCenter}>
                    {value.toLocaleString('en-IN')}
                  </Text>
                  {weightKg != null &&
                    !Number.isNaN(weightKg) &&
                    weightKg > 0 && (
                      <Text style={[styles.cellCenter, styles.sizeCellSub]}>
                        ({weightKg})
                      </Text>
                    )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </>
  );

  const wtReceivedAfterGrading = computeWtReceivedAfterGrading(row);
  const { totalJute, totalLeno } = getTotalJuteAndLenoBags(row);
  const lessBardanaJute = totalJute * JUTE_BAG_WEIGHT;
  const lessBardanaLeno = totalLeno * LENO_BAG_WEIGHT;
  const actualWtOfPotato = computeActualWtOfPotato(row);
  const weightShortage = computeWeightShortage(row);
  const weightShortagePercent = computeWeightShortagePercent(row);
  const amountPayable = computeAmountPayable(row);

  if (hasPostGrading) {
    return (
      <View style={styles.dataRowWrapper}>
        <View style={styles.dataRowLeftBlock}>
          <View style={styles.dataRowLeftBlockRow}>{leftCells}</View>
        </View>
        <View style={styles.dataRowMiddleBlock}>
          <View style={styles.dataSubRow}>
            {typeAndSizeCells('JUTE', sizeBagsJute, row.sizeWeightPerBagJute)}
          </View>
          <View style={[styles.dataSubRow, styles.dataSubRowLast]}>
            {typeAndSizeCells('LENO', sizeBagsLeno, row.sizeWeightPerBagLeno)}
          </View>
        </View>
        <View style={styles.dataRowWtReceivedBlock}>
          <View
            style={[
              styles.cell,
              {
                width: COL_WIDTHS.wtReceivedAfterGrading,
                borderLeftWidth: 0,
                borderRightWidth: 0,
              },
            ]}
          >
            <Text style={styles.cellCenter}>
              {wtReceivedAfterGrading > 0
                ? wtReceivedAfterGrading.toLocaleString('en-IN')
                : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.dataRowLessBardanaBlock}>
          <View style={[styles.dataSubRow, { borderLeftWidth: 0 }]}>
            <View
              style={[
                styles.cell,
                {
                  width: COL_WIDTHS.lessBardanaAfterGrading,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                },
              ]}
            >
              <Text style={styles.cellCenter}>
                {lessBardanaJute > 0
                  ? lessBardanaJute.toLocaleString('en-IN')
                  : '—'}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.dataSubRow,
              styles.dataSubRowLast,
              { borderLeftWidth: 0 },
            ]}
          >
            <View
              style={[
                styles.cell,
                {
                  width: COL_WIDTHS.lessBardanaAfterGrading,
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                },
              ]}
            >
              <Text style={styles.cellCenter}>
                {lessBardanaLeno > 0
                  ? lessBardanaLeno.toLocaleString('en-IN')
                  : '—'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.dataRowActualWtOfPotatoBlock}>
          <View
            style={[
              styles.cell,
              {
                width: COL_WIDTHS.actualWtOfPotato,
                borderLeftWidth: 0,
                borderRightWidth: 0,
              },
            ]}
          >
            <Text style={styles.cellCenter}>
              {actualWtOfPotato > 0
                ? actualWtOfPotato.toLocaleString('en-IN')
                : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.dataRowWeightShortageBlock}>
          <View
            style={[
              styles.cell,
              {
                width: COL_WIDTHS.weightShortage,
                borderLeftWidth: 0,
                borderRightWidth: 0,
              },
            ]}
          >
            <Text style={styles.cellCenter}>
              {weightShortage != null && !Number.isNaN(weightShortage)
                ? weightShortage.toLocaleString('en-IN')
                : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.dataRowWeightShortagePercentBlock}>
          <View
            style={[
              styles.cell,
              {
                width: COL_WIDTHS.weightShortagePercent,
                borderLeftWidth: 0,
                borderRightWidth: 0,
              },
            ]}
          >
            <Text style={styles.cellCenter}>
              {weightShortagePercent != null &&
              !Number.isNaN(weightShortagePercent)
                ? `${weightShortagePercent.toFixed(1)}%`
                : '—'}
            </Text>
          </View>
        </View>
        <View style={styles.dataRowAmountPayableBlock}>
          <View
            style={[
              styles.cell,
              {
                width: COL_WIDTHS.amountPayable,
                borderLeftWidth: 0,
                borderRightWidth: 0,
              },
            ]}
          >
            <Text style={styles.cellCenter}>
              {amountPayable > 0
                ? amountPayable.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '—'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.dataRow}>
      {leftCells}
      <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
        <Text style={styles.cellCenter}>{row.bagType ?? '—'}</Text>
      </View>
      {GRADING_SIZES.map((size) => {
        const value = row.sizeBags?.[size];
        const weightKg = row.sizeWeightPerBag?.[size];
        const showQty = value != null && value > 0;
        return (
          <View
            key={size}
            style={[styles.cell, { width: COL_WIDTHS.sizeColumn }]}
          >
            <View style={[styles.cellCenter, styles.sizeCellContent]}>
              {showQty && (
                <>
                  <Text style={styles.cellCenter}>
                    {value.toLocaleString('en-IN')}
                  </Text>
                  {weightKg != null &&
                    !Number.isNaN(weightKg) &&
                    weightKg > 0 && (
                      <Text style={[styles.cellCenter, styles.sizeCellSub]}>
                        ({weightKg})
                      </Text>
                    )}
                </>
              )}
            </View>
          </View>
        );
      })}
      <View style={[styles.cell, { width: COL_WIDTHS.wtReceivedAfterGrading }]}>
        <Text style={styles.cellCenter}>
          {wtReceivedAfterGrading > 0
            ? wtReceivedAfterGrading.toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View
        style={[styles.cell, { width: COL_WIDTHS.lessBardanaAfterGrading }]}
      >
        <Text style={styles.cellCenter}>
          {lessBardanaJute + lessBardanaLeno > 0
            ? (lessBardanaJute + lessBardanaLeno).toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.actualWtOfPotato }]}>
        <Text style={styles.cellCenter}>
          {actualWtOfPotato > 0
            ? actualWtOfPotato.toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.weightShortage }]}>
        <Text style={styles.cellCenter}>
          {weightShortage != null && !Number.isNaN(weightShortage)
            ? weightShortage.toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.weightShortagePercent }]}>
        <Text style={styles.cellCenter}>
          {weightShortagePercent != null && !Number.isNaN(weightShortagePercent)
            ? `${weightShortagePercent.toFixed(1)}%`
            : '—'}
        </Text>
      </View>
      <View
        style={[
          styles.cell,
          styles.cellLast,
          { width: COL_WIDTHS.amountPayable },
        ]}
      >
        <Text style={styles.cellCenter}>
          {amountPayable > 0
            ? amountPayable.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : '—'}
        </Text>
      </View>
    </View>
  );
}

/** Sort rows by Gate Pass No. ascending (numeric when possible). */
function sortRowsByGatePassNo(rows: StockLedgerRow[]): StockLedgerRow[] {
  return [...rows].sort((a, b) => {
    const aNum = Number(a.incomingGatePassNo);
    const bNum = Number(b.incomingGatePassNo);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a.incomingGatePassNo).localeCompare(
      String(b.incomingGatePassNo)
    );
  });
}

export function StockLedgerPdf({ farmerName, rows }: StockLedgerPdfProps) {
  const sortedRows = sortRowsByGatePassNo(rows);
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{farmerName}</Text>
        </View>
        <TableHeader />
        {sortedRows.map((row, index) => (
          <DataRow key={`${row.incomingGatePassNo}-${index}`} row={row} />
        ))}
        <TotalRow rows={sortedRows} />
        <BagSizeAnalytics rows={sortedRows} />
        <AmountPayableDetail rows={sortedRows} />
      </Page>
    </Document>
  );
}
