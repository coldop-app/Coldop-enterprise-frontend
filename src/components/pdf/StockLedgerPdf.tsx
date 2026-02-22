/* eslint-disable react-refresh/only-export-components */
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import {
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
  GRADING_SIZES,
} from '@/components/forms/grading/constants';
import {
  computeIncomingLessBardana,
  computeIncomingActualWeight,
} from '@/components/pdf/incomingVoucherCalculations';
import {
  SIZE_HEADER_LABELS,
  computeWtReceivedAfterGrading,
  getTotalJuteAndLenoBags,
  computeLessBardanaAfterGrading,
  computeActualWtOfPotato,
  computeWeightShortage,
  computeWeightShortagePercent,
  computeAmountPayable,
} from '@/components/pdf/gradingVoucherCalculations';
import type {
  StockLedgerRow,
  StockLedgerPdfProps,
} from '@/components/pdf/stockLedgerTypes';
import GradingGatePassTablePdf from '@/components/pdf/grading-gate-pass-table-pdf';
import SummaryTablePdf from '@/components/pdf/sumary-table-pdf';
import { STOCK_LEDGER_COL_WIDTHS as COL_WIDTHS } from '@/components/pdf/stockLedgerColumnWidths';

export type { StockLedgerRow, StockLedgerPdfProps };
export {
  computeIncomingLessBardana,
  computeIncomingActualWeight,
} from '@/components/pdf/incomingVoucherCalculations';
export {
  SIZE_HEADER_LABELS,
  computeWtReceivedAfterGrading,
  getTotalJuteAndLenoBags,
  computeLessBardanaAfterGrading,
  computeActualWtOfPotato,
  computeWeightShortage,
  computeWeightShortagePercent,
  getBuyBackRate,
  computeAmountPayable,
} from '@/components/pdf/gradingVoucherCalculations';

const HEADER_BG = '#f9fafb';
const BORDER = '#e5e7eb';
/** Height of one data sub-row for TYPE + size columns (used for rowSpan 2 alignment). */
const ROW_HEIGHT = 12;

/** Total width of left block (Gp No through Post Gr.) for exact alignment. */
const LEFT_BLOCK_WIDTH =
  COL_WIDTHS.gpNo +
  COL_WIDTHS.manualIncomingVoucherNo +
  COL_WIDTHS.gradingGatePassNo +
  COL_WIDTHS.manualGradingGatePassNo +
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
});

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
      <View
        style={[
          styles.headerCell,
          { width: COL_WIDTHS.manualGradingGatePassNo },
        ]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>Manual GGP</Text>
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

export function formatWeight(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-IN');
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
    const lessBardana = computeIncomingLessBardana(row);
    totalLessBardanaKg += lessBardana;
    const actual = computeIncomingActualWeight(row);
    if (actual != null) {
      totalActualWeightKg += actual;
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

function TotalRow({ rows }: { rows: StockLedgerRow[] }) {
  const totals = computeTotals(rows);
  const boldCenter = [styles.cellCenter, styles.totalCellText];
  return (
    <View style={styles.totalRow}>
      <View style={[styles.totalCell, { width: COL_WIDTHS.gpNo }]}>
        <Text style={[styles.cellCenter, styles.totalCellText]}>Total</Text>
      </View>
      <View
        style={[
          styles.totalCell,
          { width: COL_WIDTHS.manualIncomingVoucherNo },
        ]}
      >
        <Text />
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.gradingGatePassNo }]}>
        <Text />
      </View>
      <View
        style={[
          styles.totalCell,
          { width: COL_WIDTHS.manualGradingGatePassNo },
        ]}
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

  const lessBardanaKg = computeIncomingLessBardana(row);
  const actualWeightKg = computeIncomingActualWeight(row);

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
    row.gradingGatePassNo != null && String(row.gradingGatePassNo).trim() !== ''
      ? String(row.gradingGatePassNo)
      : '—';
  const manualGgpStr =
    row.manualGradingGatePassNo != null &&
    String(row.manualGradingGatePassNo).trim() !== ''
      ? String(row.manualGradingGatePassNo)
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
      <View
        style={[styles.cell, { width: COL_WIDTHS.manualGradingGatePassNo }]}
      >
        <Text style={styles.cellCenter}>{manualGgpStr}</Text>
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
export function sortRowsByGatePassNo(rows: StockLedgerRow[]): StockLedgerRow[] {
  return [...rows].sort((a, b) => {
    const aNum = Number(a.incomingGatePassNo);
    const bNum = Number(b.incomingGatePassNo);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
    return String(a.incomingGatePassNo).localeCompare(
      String(b.incomingGatePassNo)
    );
  });
}

function hasGradingGatePassRows(rows: StockLedgerRow[]): boolean {
  return rows.some(
    (row) =>
      (row.gradingGatePassNo != null &&
        String(row.gradingGatePassNo).trim() !== '') ||
      (row.manualGradingGatePassNo != null &&
        String(row.manualGradingGatePassNo).trim() !== '')
  );
}

export function StockLedgerPdf({ farmerName, rows }: StockLedgerPdfProps) {
  const sortedRows = sortRowsByGatePassNo(rows);
  const showGradingTablePage = hasGradingGatePassRows(sortedRows);
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
        <SummaryTablePdf rows={sortedRows} />
      </Page>
      {showGradingTablePage && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <GradingGatePassTablePdf farmerName={farmerName} rows={sortedRows} />
        </Page>
      )}
    </Document>
  );
}
