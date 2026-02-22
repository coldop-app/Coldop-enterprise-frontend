import { Fragment } from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import { GRADING_SIZES } from '@/components/forms/grading/constants';
import { SIZE_HEADER_LABELS } from '@/components/pdf/gradingVoucherCalculations';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';

/** Column widths: base columns + per-size (Qty with size name as header, Wt in Kg, Bag Type) + Total. */
const COL_WIDTHS = {
  incomingGatePassNo: 22,
  manualIncomingVoucherNo: 22,
  gradingGatePassNo: 22,
  manualGradingGatePassNo: 22,
  farmerName: 48,
  variety: 32,
  date: 30,
  /** Single column: header = size name (e.g. 35-40), cell = quantity */
  sizeQty: 22,
  wtInKg: 18,
  bagType: 16,
  total: 20,
} as const;

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 6,
    backgroundColor: '#fafafa',
  },
  title: {
    fontSize: 7,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
    flexShrink: 0,
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
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
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
  cellCenter: {
    textAlign: 'center',
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
  totalCellText: {
    fontWeight: 700,
  },
});

function formatGgpValue(value: number | string | undefined): string {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}

/** Get weight (kg) and bag type for a size on a row. Prefers JUTE then LENO then unified. */
function getSizeWtAndType(
  row: StockLedgerRow,
  size: string
): { wt: string; type: string } {
  const juteWt = row.sizeWeightPerBagJute?.[size];
  const lenoWt = row.sizeWeightPerBagLeno?.[size];
  const unifiedWt = row.sizeWeightPerBag?.[size];
  const hasJute =
    juteWt != null &&
    !Number.isNaN(juteWt) &&
    (row.sizeBagsJute?.[size] ?? 0) > 0;
  const hasLeno =
    lenoWt != null &&
    !Number.isNaN(lenoWt) &&
    (row.sizeBagsLeno?.[size] ?? 0) > 0;
  if (hasJute)
    return {
      wt: juteWt > 0 ? String(juteWt) : '—',
      type: 'JUTE',
    };
  if (hasLeno)
    return {
      wt: lenoWt > 0 ? String(lenoWt) : '—',
      type: 'LENO',
    };
  if (
    unifiedWt != null &&
    !Number.isNaN(unifiedWt) &&
    (row.sizeBags?.[size] ?? 0) > 0
  )
    return {
      wt: unifiedWt > 0 ? String(unifiedWt) : '—',
      type: row.bagType ?? '—',
    };
  return { wt: '—', type: '—' };
}

/** Get bag quantity for a size on a row (JUTE + LENO or unified). */
function getSizeQty(row: StockLedgerRow, size: string): number {
  const jute = row.sizeBagsJute?.[size] ?? 0;
  const leno = row.sizeBagsLeno?.[size] ?? 0;
  if (jute > 0 || leno > 0) return jute + leno;
  return row.sizeBags?.[size] ?? 0;
}

/** Sum of all size quantities for a row. */
function getRowTotal(row: StockLedgerRow): number {
  return GRADING_SIZES.reduce((sum, size) => sum + getSizeQty(row, size), 0);
}

/** Sizes that have at least one row with quantity > 0 (so we only show columns for these). */
function getSizesWithQuantities(rows: StockLedgerRow[]): string[] {
  return GRADING_SIZES.filter((size) =>
    rows.some((row) => getSizeQty(row, size) > 0)
  );
}

export interface GradingGatePassTablePdfProps {
  farmerName: string;
  rows: StockLedgerRow[];
}

function GradingGatePassTablePdf({
  farmerName,
  rows,
}: GradingGatePassTablePdfProps) {
  const rowsWithGgp = rows.filter(
    (row) =>
      (row.gradingGatePassNo != null &&
        String(row.gradingGatePassNo).trim() !== '') ||
      (row.manualGradingGatePassNo != null &&
        String(row.manualGradingGatePassNo).trim() !== '')
  );

  if (rowsWithGgp.length === 0) return null;

  const sizesWithQty = getSizesWithQuantities(rowsWithGgp);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Grading Gate Pass Table</Text>
      <View style={styles.headerRow}>
        <View
          style={[styles.headerCell, { width: COL_WIDTHS.incomingGatePassNo }]}
        >
          <Text style={styles.cellCenter}>Incoming GP</Text>
        </View>
        <View
          style={[
            styles.headerCell,
            { width: COL_WIDTHS.manualIncomingVoucherNo },
          ]}
        >
          <Text style={styles.cellCenter}>Manual GP</Text>
        </View>
        <View
          style={[styles.headerCell, { width: COL_WIDTHS.gradingGatePassNo }]}
        >
          <Text style={styles.cellCenter}>GGP No</Text>
        </View>
        <View
          style={[
            styles.headerCell,
            { width: COL_WIDTHS.manualGradingGatePassNo },
          ]}
        >
          <Text style={styles.cellCenter}>Manual GGP</Text>
        </View>
        <View style={[styles.headerCell, { width: COL_WIDTHS.farmerName }]}>
          <Text style={styles.cellCenter}>Farmer Name</Text>
        </View>
        <View style={[styles.headerCell, { width: COL_WIDTHS.variety }]}>
          <Text style={styles.cellCenter}>Variety</Text>
        </View>
        <View style={[styles.headerCell, { width: COL_WIDTHS.date }]}>
          <Text style={styles.cellCenter}>Date</Text>
        </View>
        {sizesWithQty.map((size) => {
          const sizeLabel = SIZE_HEADER_LABELS[size] ?? size;
          return (
            <Fragment key={size}>
              <View style={[styles.headerCell, { width: COL_WIDTHS.sizeQty }]}>
                <Text style={styles.cellCenter}>{sizeLabel}</Text>
              </View>
              <View style={[styles.headerCell, { width: COL_WIDTHS.wtInKg }]}>
                <Text style={styles.cellCenter}>Wt in Kg</Text>
              </View>
              <View style={[styles.headerCell, { width: COL_WIDTHS.bagType }]}>
                <Text style={styles.cellCenter}>Bag Type</Text>
              </View>
            </Fragment>
          );
        })}
        <View
          style={[
            styles.headerCell,
            styles.headerCellLast,
            { width: COL_WIDTHS.total },
          ]}
        >
          <Text style={styles.cellCenter}>Total</Text>
        </View>
      </View>
      {rowsWithGgp.map((row, index) => {
        const rowTotal = getRowTotal(row);
        return (
          <View
            key={`ggp-${row.incomingGatePassNo}-${index}`}
            style={styles.dataRow}
          >
            <View
              style={[styles.cell, { width: COL_WIDTHS.incomingGatePassNo }]}
            >
              <Text style={styles.cellCenter}>
                {formatGgpValue(row.incomingGatePassNo)}
              </Text>
            </View>
            <View
              style={[
                styles.cell,
                { width: COL_WIDTHS.manualIncomingVoucherNo },
              ]}
            >
              <Text style={styles.cellCenter}>
                {formatGgpValue(row.manualIncomingVoucherNo)}
              </Text>
            </View>
            <View
              style={[styles.cell, { width: COL_WIDTHS.gradingGatePassNo }]}
            >
              <Text style={styles.cellCenter}>
                {formatGgpValue(row.gradingGatePassNo)}
              </Text>
            </View>
            <View
              style={[
                styles.cell,
                { width: COL_WIDTHS.manualGradingGatePassNo },
              ]}
            >
              <Text style={styles.cellCenter}>
                {formatGgpValue(row.manualGradingGatePassNo)}
              </Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.farmerName }]}>
              <Text style={styles.cellCenter}>{farmerName}</Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.variety }]}>
              <Text style={styles.cellCenter}>
                {row.variety != null && String(row.variety).trim() !== ''
                  ? String(row.variety).trim()
                  : '—'}
              </Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.date }]}>
              <Text style={styles.cellCenter}>
                {row.date != null && String(row.date).trim() !== ''
                  ? formatVoucherDate(row.date)
                  : '—'}
              </Text>
            </View>
            {sizesWithQty.map((size) => {
              const { wt, type } = getSizeWtAndType(row, size);
              const qty = getSizeQty(row, size);
              return (
                <Fragment key={size}>
                  <View style={[styles.cell, { width: COL_WIDTHS.sizeQty }]}>
                    <Text style={styles.cellCenter}>
                      {qty > 0 ? qty.toLocaleString('en-IN') : '—'}
                    </Text>
                  </View>
                  <View style={[styles.cell, { width: COL_WIDTHS.wtInKg }]}>
                    <Text style={styles.cellCenter}>{wt}</Text>
                  </View>
                  <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
                    <Text style={styles.cellCenter}>{type}</Text>
                  </View>
                </Fragment>
              );
            })}
            <View
              style={[
                styles.cell,
                styles.cellLast,
                { width: COL_WIDTHS.total },
              ]}
            >
              <Text style={styles.cellCenter}>
                {rowTotal > 0 ? rowTotal.toLocaleString('en-IN') : '—'}
              </Text>
            </View>
          </View>
        );
      })}
      <TotalRow rows={rowsWithGgp} sizesWithQty={sizesWithQty} />
    </View>
  );
}

function TotalRow({
  rows,
  sizesWithQty,
}: {
  rows: StockLedgerRow[];
  sizesWithQty: string[];
}) {
  const totalsBySize: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    totalsBySize[size] = rows.reduce(
      (sum, row) => sum + getSizeQty(row, size),
      0
    );
  }
  const grandTotal = rows.reduce((sum, row) => sum + getRowTotal(row), 0);
  const boldCenter = [styles.cellCenter, styles.totalCellText];
  return (
    <View style={styles.totalRow}>
      <View style={[styles.cell, { width: COL_WIDTHS.incomingGatePassNo }]}>
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View
        style={[styles.cell, { width: COL_WIDTHS.manualIncomingVoucherNo }]}
      >
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.gradingGatePassNo }]}>
        <Text style={boldCenter}>Total</Text>
      </View>
      <View
        style={[styles.cell, { width: COL_WIDTHS.manualGradingGatePassNo }]}
      >
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.farmerName }]}>
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.variety }]}>
        <Text style={styles.cellCenter}>—</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.date }]}>
        <Text style={styles.cellCenter}>—</Text>
      </View>
      {sizesWithQty.map((size) => {
        const totalQty = totalsBySize[size] ?? 0;
        return (
          <Fragment key={size}>
            <View style={[styles.cell, { width: COL_WIDTHS.sizeQty }]}>
              <Text style={boldCenter}>
                {totalQty > 0 ? totalQty.toLocaleString('en-IN') : '—'}
              </Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.wtInKg }]}>
              <Text style={styles.cellCenter}>—</Text>
            </View>
            <View style={[styles.cell, { width: COL_WIDTHS.bagType }]}>
              <Text style={styles.cellCenter}>—</Text>
            </View>
          </Fragment>
        );
      })}
      <View style={[styles.cell, styles.cellLast, { width: COL_WIDTHS.total }]}>
        <Text style={boldCenter}>
          {grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : '—'}
        </Text>
      </View>
    </View>
  );
}

export default GradingGatePassTablePdf;
