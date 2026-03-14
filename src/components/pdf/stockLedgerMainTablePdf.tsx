/* eslint-disable react-refresh/only-export-components */
import { Text, View, StyleSheet } from '@react-pdf/renderer';
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
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import { STOCK_LEDGER_COL_WIDTHS as COL_WIDTHS } from '@/components/pdf/stockLedgerColumnWidths';

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
  COL_WIDTHS.gradingGatePassDate +
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

/** Base width of middle block (Type + size columns). Computed dynamically from sizesWithQuantities. */
function getMiddleBlockWidth(sizesWithQuantities: string[]): number {
  return (
    COL_WIDTHS.bagType + sizesWithQuantities.length * COL_WIDTHS.sizeColumn
  );
}

/** Sizes that have at least one bag across all rows (order preserved from GRADING_SIZES). */
function getSizesWithQuantities(rows: StockLedgerRow[]): string[] {
  return GRADING_SIZES.filter((size) =>
    rows.some((row) => {
      const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
      if (hasSplit) {
        return (
          (row.sizeBagsJute?.[size] ?? 0) + (row.sizeBagsLeno?.[size] ?? 0) > 0
        );
      }
      return (row.sizeBags?.[size] ?? 0) > 0;
    })
  );
}

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
  /** Middle block (Type + size columns) - bifurcation; width set inline from sizesWithQuantities. */
  dataRowMiddleBlock: {
    flexShrink: 0,
  },
  /** Block: Wt Received After Grading (row span 2). Top-aligned. No left border (last size column draws it). Own right border so content aligns with column edge. */
  dataRowWtReceivedBlock: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.wtReceivedAfterGrading,
    flexShrink: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Less Bardana after grading (2 sub-rows). No left border. Own right border for content alignment. */
  dataRowLessBardanaBlock: {
    width: COL_WIDTHS.lessBardanaAfterGrading,
    flexShrink: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Actual wt of Potato (row span 2). No left border. Own right border for content alignment. */
  dataRowActualWtOfPotatoBlock: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.actualWtOfPotato,
    flexShrink: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Weight Shortage (row span 2). No left border. Own right border for content alignment. */
  dataRowWeightShortageBlock: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.weightShortage,
    flexShrink: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Shortage % (row span 2). No left border. Own right border for content alignment. */
  dataRowWeightShortagePercentBlock: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.weightShortagePercent,
    flexShrink: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  /** Block: Amount Payable (row span 2). No left border. Own right border for content alignment (same as other grading columns). */
  dataRowAmountPayableBlock: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minHeight: ROW_HEIGHT * 2,
    width: COL_WIDTHS.amountPayable,
    flexShrink: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1,
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
  /** Right border of Actual (incoming) column: subtle black line before Post Gr. / grading section */
  cellDividerAfterIncoming: {
    borderRightColor: '#000000',
  },
  cellCenter: {
    textAlign: 'center',
  },
  /** Center text within full column width so data aligns with centered headers */
  cellTextFullWidthCenter: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  cellRight: {
    textAlign: 'right',
  },
  /** Wrapper for size cell content (quantity + weight line) to keep center-aligned block */
  sizeCellContent: {
    alignItems: 'center',
    alignSelf: 'stretch',
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

function TableHeader({
  sizesWithQuantities,
  includeAmountPayable = true,
}: {
  sizesWithQuantities: string[];
  includeAmountPayable?: boolean;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={[styles.headerCell, { width: COL_WIDTHS.gpNo }]}>
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>
          System Incoming GP No
        </Text>
      </View>
      <View
        style={[
          styles.headerCell,
          { width: COL_WIDTHS.manualIncomingVoucherNo },
        ]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>Incoming GP No</Text>
      </View>
      <View
        style={[styles.headerCell, { width: COL_WIDTHS.gradingGatePassNo }]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>
          System Grading GP NO
        </Text>
      </View>
      <View
        style={[
          styles.headerCell,
          { width: COL_WIDTHS.manualGradingGatePassNo },
        ]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>Grading Gp No</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.date }]}>
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>
          Incoming gate pass date
        </Text>
      </View>
      <View
        style={[styles.headerCell, { width: COL_WIDTHS.gradingGatePassDate }]}
      >
        <Text style={[styles.cellCenter, { fontSize: 3 }]}>
          Grading gate pass date
        </Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.store }]}>
        <Text style={styles.cellCenter}>Store</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.variety }]}>
        <Text style={styles.cellCenter}>Variety</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.truckNumber }]}>
        <Text style={styles.cellCenter}>Truck Number</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.bagsReceived }]}>
        <Text style={styles.cellCenter}>Bags Received</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.weightSlipNo }]}>
        <Text style={styles.cellCenter}>Weight Slip No.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.grossWeight }]}>
        <Text style={styles.cellCenter}>Gross Weight</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.tareWeight }]}>
        <Text style={styles.cellCenter}>Tare Weight</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.netWeight }]}>
        <Text style={styles.cellCenter}>Net Weight</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.lessBardana }]}>
        <Text style={styles.cellCenter}>Less Bard Weight @0.700 g</Text>
      </View>
      <View
        style={[
          styles.headerCell,
          styles.cellDividerAfterIncoming,
          { width: COL_WIDTHS.actualWeight },
        ]}
      >
        <Text style={styles.cellCenter}>Actual Weight of Potato</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.postGradingBags }]}>
        <Text style={styles.cellCenter}>Number of Bags Post Grading</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.bagType }]}>
        <Text style={styles.cellTextFullWidthCenter}>Type</Text>
      </View>
      {sizesWithQuantities.map((size) => (
        <View
          key={size}
          style={[styles.headerCell, { width: COL_WIDTHS.sizeColumn }]}
        >
          <Text style={styles.cellTextFullWidthCenter}>
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
        <Text style={[styles.cellTextFullWidthCenter, { fontSize: 3 }]}>
          Weight Received After Grading
        </Text>
      </View>
      <View
        style={[
          styles.headerCell,
          { width: COL_WIDTHS.lessBardanaAfterGrading },
        ]}
      >
        <Text style={[styles.cellTextFullWidthCenter, { fontSize: 3 }]}>
          Less Bard Weight
        </Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.actualWtOfPotato }]}>
        <Text style={[styles.cellTextFullWidthCenter, { fontSize: 3 }]}>
          Actual wt of Graded Potato
        </Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.weightShortage }]}>
        <Text style={[styles.cellTextFullWidthCenter, { fontSize: 3 }]}>
          Weight Shortage
        </Text>
      </View>
      <View
        style={[styles.headerCell, { width: COL_WIDTHS.weightShortagePercent }]}
      >
        <Text style={[styles.cellTextFullWidthCenter, { fontSize: 3 }]}>
          Shortage %
        </Text>
      </View>
      {includeAmountPayable && (
        <View
          style={[
            styles.headerCell,
            styles.headerCellLast,
            { width: COL_WIDTHS.amountPayable },
          ]}
        >
          <Text style={[styles.cellTextFullWidthCenter, { fontSize: 3 }]}>
            Amount Payable
          </Text>
        </View>
      )}
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

function TotalRow({
  rows,
  sizesWithQuantities,
  includeAmountPayable = true,
}: {
  rows: StockLedgerRow[];
  sizesWithQuantities: string[];
  includeAmountPayable?: boolean;
}) {
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
      <View
        style={[styles.totalCell, { width: COL_WIDTHS.gradingGatePassDate }]}
      >
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
      <View
        style={[
          styles.totalCell,
          styles.cellDividerAfterIncoming,
          { width: COL_WIDTHS.actualWeight },
        ]}
      >
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
      {sizesWithQuantities.map((size) => (
        <View
          key={size}
          style={[styles.totalCell, { width: COL_WIDTHS.sizeColumn }]}
        >
          <Text style={[styles.cellTextFullWidthCenter, styles.totalCellText]}>
            {totals.totalSizeBags[size] > 0
              ? totals.totalSizeBags[size].toLocaleString('en-IN')
              : ''}
          </Text>
        </View>
      ))}
      <View
        style={[styles.totalCell, { width: COL_WIDTHS.wtReceivedAfterGrading }]}
      >
        <Text style={[styles.cellTextFullWidthCenter, styles.totalCellText]}>
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
        <Text style={[styles.cellTextFullWidthCenter, styles.totalCellText]}>
          {totals.totalLessBardanaAfterGrading > 0
            ? totals.totalLessBardanaAfterGrading.toLocaleString('en-IN')
            : ''}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.actualWtOfPotato }]}>
        <Text style={[styles.cellTextFullWidthCenter, styles.totalCellText]}>
          {totals.totalActualWtOfPotato > 0
            ? totals.totalActualWtOfPotato.toLocaleString('en-IN')
            : ''}
        </Text>
      </View>
      <View style={[styles.totalCell, { width: COL_WIDTHS.weightShortage }]}>
        <Text style={[styles.cellTextFullWidthCenter, styles.totalCellText]}>
          {totals.totalWeightShortage !== 0
            ? totals.totalWeightShortage.toLocaleString('en-IN')
            : ''}
        </Text>
      </View>
      <View
        style={[styles.totalCell, { width: COL_WIDTHS.weightShortagePercent }]}
      >
        <Text style={[styles.cellTextFullWidthCenter, styles.totalCellText]}>
          {totals.totalWeightShortagePercent != null &&
          !Number.isNaN(totals.totalWeightShortagePercent)
            ? `${totals.totalWeightShortagePercent.toFixed(1)}%`
            : ''}
        </Text>
      </View>
      {includeAmountPayable && (
        <View
          style={[
            styles.totalCell,
            styles.cellLast,
            { width: COL_WIDTHS.amountPayable },
          ]}
        >
          <Text style={[styles.cellTextFullWidthCenter, styles.totalCellText]}>
            {totals.totalAmountPayable > 0
              ? totals.totalAmountPayable.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : ''}
          </Text>
        </View>
      )}
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

function DataRow({
  row,
  sizesWithQuantities,
  middleBlockWidth,
  includeAmountPayable = true,
}: {
  row: StockLedgerRow;
  sizesWithQuantities: string[];
  middleBlockWidth: number;
  includeAmountPayable?: boolean;
}) {
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
      <View style={[styles.cell, { width: COL_WIDTHS.gradingGatePassDate }]}>
        <Text style={styles.cellCenter}>
          {row.gradingGatePassDate != null &&
          String(row.gradingGatePassDate).trim() !== ''
            ? formatVoucherDate(row.gradingGatePassDate)
            : '—'}
        </Text>
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
      <View
        style={[
          styles.cell,
          styles.cellDividerAfterIncoming,
          { width: COL_WIDTHS.actualWeight },
        ]}
      >
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
        <Text style={styles.cellTextFullWidthCenter}>{bagType}</Text>
      </View>
      {sizesWithQuantities.map((size) => {
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
                  <Text style={styles.cellTextFullWidthCenter}>
                    {value.toLocaleString('en-IN')}
                  </Text>
                  {weightKg != null &&
                    !Number.isNaN(weightKg) &&
                    weightKg > 0 && (
                      <Text
                        style={[
                          styles.cellTextFullWidthCenter,
                          styles.sizeCellSub,
                        ]}
                      >
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
        <View style={[styles.dataRowMiddleBlock, { width: middleBlockWidth }]}>
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
            <Text style={styles.cellTextFullWidthCenter}>
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
              <Text style={styles.cellTextFullWidthCenter}>
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
              <Text style={styles.cellTextFullWidthCenter}>
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
            <Text style={styles.cellTextFullWidthCenter}>
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
            <Text style={styles.cellTextFullWidthCenter}>
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
            <Text style={styles.cellTextFullWidthCenter}>
              {weightShortagePercent != null &&
              !Number.isNaN(weightShortagePercent)
                ? `${weightShortagePercent.toFixed(1)}%`
                : '—'}
            </Text>
          </View>
        </View>
        {includeAmountPayable && (
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
              <Text style={styles.cellTextFullWidthCenter}>
                {amountPayable > 0
                  ? amountPayable.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '—'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.dataRow}>
      {leftCells}
      <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
        <Text style={styles.cellTextFullWidthCenter}>{row.bagType ?? '—'}</Text>
      </View>
      {sizesWithQuantities.map((size) => {
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
                  <Text style={styles.cellTextFullWidthCenter}>
                    {value.toLocaleString('en-IN')}
                  </Text>
                  {weightKg != null &&
                    !Number.isNaN(weightKg) &&
                    weightKg > 0 && (
                      <Text
                        style={[
                          styles.cellTextFullWidthCenter,
                          styles.sizeCellSub,
                        ]}
                      >
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
        <Text style={styles.cellTextFullWidthCenter}>
          {wtReceivedAfterGrading > 0
            ? wtReceivedAfterGrading.toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View
        style={[styles.cell, { width: COL_WIDTHS.lessBardanaAfterGrading }]}
      >
        <Text style={styles.cellTextFullWidthCenter}>
          {lessBardanaJute + lessBardanaLeno > 0
            ? (lessBardanaJute + lessBardanaLeno).toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.actualWtOfPotato }]}>
        <Text style={styles.cellTextFullWidthCenter}>
          {actualWtOfPotato > 0
            ? actualWtOfPotato.toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.weightShortage }]}>
        <Text style={styles.cellTextFullWidthCenter}>
          {weightShortage != null && !Number.isNaN(weightShortage)
            ? weightShortage.toLocaleString('en-IN')
            : '—'}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.weightShortagePercent }]}>
        <Text style={styles.cellTextFullWidthCenter}>
          {weightShortagePercent != null && !Number.isNaN(weightShortagePercent)
            ? `${weightShortagePercent.toFixed(1)}%`
            : '—'}
        </Text>
      </View>
      {includeAmountPayable && (
        <View
          style={[
            styles.cell,
            styles.cellLast,
            { width: COL_WIDTHS.amountPayable },
          ]}
        >
          <Text style={styles.cellTextFullWidthCenter}>
            {amountPayable > 0
              ? amountPayable.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : '—'}
          </Text>
        </View>
      )}
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

/** Main table only (title + header + data rows + total). Used by StockLedgerPdf and Grading Gate Pass Report PDF. */
export function StockLedgerMainTableOnly({
  title,
  rows,
  includeAmountPayable = true,
}: {
  title: string;
  rows: StockLedgerRow[];
  includeAmountPayable?: boolean;
}) {
  const sortedRows = sortRowsByGatePassNo(rows);
  const sizesWithQuantities = getSizesWithQuantities(sortedRows);
  const middleBlockWidth = getMiddleBlockWidth(sizesWithQuantities);
  return (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.titleText}>{title}</Text>
      </View>
      <TableHeader
        sizesWithQuantities={sizesWithQuantities}
        includeAmountPayable={includeAmountPayable}
      />
      {sortedRows.map((row, index) => (
        <DataRow
          key={`${row.incomingGatePassNo}-${index}`}
          row={row}
          sizesWithQuantities={sizesWithQuantities}
          middleBlockWidth={middleBlockWidth}
          includeAmountPayable={includeAmountPayable}
        />
      ))}
      <TotalRow
        rows={sortedRows}
        sizesWithQuantities={sizesWithQuantities}
        includeAmountPayable={includeAmountPayable}
      />
    </>
  );
}

/** Page style for main table (landscape A4). Export for use in Grading Gate Pass Report PDF. */
export const stockLedgerPageStyle = {
  padding: 12,
  fontSize: 4,
  fontFamily: 'Helvetica',
};
