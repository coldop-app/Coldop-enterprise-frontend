import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { PassVoucherData } from '@/components/daybook/vouchers/types';
import type { GradingOrderDetailRow } from '@/components/daybook/vouchers/types';
import type { GradingOrderTotals } from '@/components/daybook/vouchers/grading-voucher-calculations';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import { useStore } from '@/stores/store';

/** Data passed from GradingVoucher for PDF rendering */
export interface GradingVoucherPdfProps {
  voucher: PassVoucherData;
  farmerName?: string;
  farmerAccount?: number;
  orderDetails: GradingOrderDetailRow[];
  totals: GradingOrderTotals;
  totalGradedWeightPercent?: number;
  wastageKg?: number;
  wastagePercentOfNetProduct?: number;
  hasDiscrepancy?: boolean;
  discrepancyValue?: number;
  percentSum?: number;
}

const PRIMARY = '#18a44b';
const PRIMARY_LIGHT = '#e8f5ee';
const MUTED = '#6f6f6f';
const DESTRUCTIVE = '#dc2626';
const DESTRUCTIVE_LIGHT = '#fef2f2';
const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  logo: {
    width: 50,
    height: 50,
  },
  letterhead: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  storageAddress: {
    fontSize: 9,
    color: MUTED,
    marginTop: 4,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY,
  },
  titleBlock: {
    flexDirection: 'column',
    gap: 4,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
    letterSpacing: 0.5,
  },
  gatePassNo: {
    fontSize: 12,
    fontWeight: 700,
    color: PRIMARY,
  },
  dateText: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  badge: {
    backgroundColor: HEADER_BG,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 600,
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    paddingTop: 10,
    marginBottom: 20,
  },
  detailsColumn: {
    flex: 1,
    paddingRight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#333',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 10,
    fontWeight: 400,
    color: '#333',
    flex: 1,
  },
  table: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: 'center',
    minHeight: 28,
  },
  tableRowHeader: {
    backgroundColor: HEADER_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowTotal: {
    backgroundColor: PRIMARY_LIGHT,
    borderTopWidth: 2,
    borderTopColor: PRIMARY,
    fontWeight: 700,
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 9,
  },
  tableCellRight: {
    textAlign: 'right',
  },
  colSize: { width: '18%' },
  colBagType: { width: '18%' },
  colQty: { width: '14%' },
  colInitial: { width: '14%' },
  colWeightPct: { width: '18%' },
  colWtBag: { width: '18%' },
  headerText: {
    fontSize: 8,
    fontWeight: 600,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalText: {
    fontSize: 10,
    fontWeight: 700,
    color: PRIMARY,
  },
  summaryBox: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  summaryBoxPrimary: {
    backgroundColor: PRIMARY_LIGHT,
    borderLeftColor: PRIMARY,
  },
  summaryBoxDestructive: {
    backgroundColor: DESTRUCTIVE_LIGHT,
    borderLeftColor: DESTRUCTIVE,
  },
  summaryLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 700,
  },
  summaryValuePrimary: {
    color: PRIMARY,
  },
  summaryValueDestructive: {
    color: DESTRUCTIVE,
  },
  summarySub: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  remarksBox: {
    backgroundColor: HEADER_BG,
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  remarksText: {
    fontSize: 10,
    color: '#333',
    lineHeight: 1.5,
  },
});

function TableRow({
  cells,
  isHeader,
  isTotal,
  colStyles,
}: {
  cells: string[];
  isHeader?: boolean;
  isTotal?: boolean;
  colStyles: Array<{ width?: string }>;
}) {
  return (
    <View
      style={[
        styles.tableRow,
        ...(isHeader ? [styles.tableRowHeader] : []),
        ...(isTotal ? [styles.tableRowTotal] : []),
      ]}
    >
      {cells.map((cell, i) => (
        <View
          key={i}
          style={[
            styles.tableCell,
            colStyles[i],
            ...(i > 1 ? [styles.tableCellRight] : []),
          ]}
        >
          <Text
            style={
              isHeader
                ? styles.headerText
                : isTotal
                  ? styles.totalText
                  : undefined
            }
          >
            {cell}
          </Text>
        </View>
      ))}
    </View>
  );
}

const COL_STYLES = [
  styles.colSize,
  styles.colBagType,
  styles.colQty,
  styles.colInitial,
  styles.colWeightPct,
  styles.colWtBag,
];

export function GradingVoucherPdf({
  voucher,
  farmerName,
  farmerAccount,
  orderDetails,
  totals,
  totalGradedWeightPercent,
  wastageKg,
  wastagePercentOfNetProduct,
  hasDiscrepancy,
  discrepancyValue,
  percentSum,
}: GradingVoucherPdfProps) {
  const coldStorage = useStore((s) => s.coldStorage);
  const gatePassNo = voucher.gatePassNo ?? '—';
  const dateStr = formatVoucherDate(voucher.date);
  const bags = orderDetails.reduce((s, o) => s + (o.currentQuantity ?? 0), 0);
  // Total graded weight = sum of (initial qty × weight per bag) — denominator so row % sum to 100%
  const totalGradedWeight =
    totals.totalGradedWeightGrossKg > 0 ? totals.totalGradedWeightGrossKg : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Image src="/coldop-logo.png" style={styles.logo} />
          </View>
          {coldStorage && (
            <View style={styles.letterhead}>
              <Text style={styles.storageName}>{coldStorage.name}</Text>
              {coldStorage.address ? (
                <Text style={styles.storageAddress}>{coldStorage.address}</Text>
              ) : null}
            </View>
          )}

          <View>
            <Text style={styles.gatePassNo}>GGP #{gatePassNo}</Text>
          </View>
        </View>

        {/* Details - two columns with Label: Value rows (image layout) */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailsColumn}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>A/c No.:</Text>
              <Text style={styles.detailValue}>#{farmerAccount ?? '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{farmerName ?? '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Variety:</Text>
              <Text style={styles.detailValue}>{voucher.variety ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.detailsColumn}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dated:</Text>
              <Text style={styles.detailValue}>{dateStr}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bags:</Text>
              <Text style={styles.detailValue}>{bags}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Graded By:</Text>
              <Text style={styles.detailValue}>
                {voucher.createdBy?.name ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Order details table */}
        <Text style={styles.sectionTitle}>Order Details</Text>
        <View style={styles.table}>
          <TableRow
            cells={[
              'Size',
              'Bag Type',
              'Qty',
              'Initial',
              'Weight %',
              'Wt/Bag (kg)',
            ]}
            isHeader
            colStyles={COL_STYLES}
          />
          {orderDetails.map((od, idx) => {
            const qty = od.initialQuantity ?? 0;
            const wt = od.weightPerBagKg ?? 0;
            const rowWeight = qty * wt;
            const weightPct =
              totalGradedWeight > 0 ? (rowWeight / totalGradedWeight) * 100 : 0;
            return (
              <TableRow
                key={`${od.size}-${od.bagType}-${idx}`}
                cells={[
                  od.size ?? '—',
                  od.bagType ?? '—',
                  (od.currentQuantity ?? 0).toLocaleString('en-IN'),
                  qty.toLocaleString('en-IN'),
                  `${weightPct.toLocaleString('en-IN', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}%`,
                  wt.toLocaleString('en-IN'),
                ]}
                colStyles={COL_STYLES}
              />
            );
          })}
          <TableRow
            cells={[
              'Total',
              '',
              totals.totalQty.toLocaleString('en-IN'),
              totals.totalInitial.toLocaleString('en-IN'),
              totalGradedWeight > 0
                ? `${(100).toLocaleString('en-IN', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}%`
                : '—',
              totals.totalGradedWeightGrossKg.toLocaleString('en-IN'),
            ]}
            isTotal
            colStyles={COL_STYLES}
          />
        </View>

        {/* Total graded weight */}
        <View style={[styles.summaryBox, styles.summaryBoxPrimary]}>
          <Text style={styles.summaryLabel}>Total Graded Weight</Text>
          <Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
            {totals.totalGradedWeightKg.toLocaleString('en-IN')} kg
          </Text>
          {totalGradedWeightPercent !== undefined && (
            <Text style={styles.summarySub}>
              {totalGradedWeightPercent.toLocaleString('en-IN', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              % of net
            </Text>
          )}
        </View>

        {/* Wastage */}
        {wastageKg !== undefined && (
          <View style={[styles.summaryBox, styles.summaryBoxDestructive]}>
            <Text style={styles.summaryLabel}>Wastage</Text>
            <Text style={[styles.summaryValue, styles.summaryValueDestructive]}>
              {wastageKg.toLocaleString('en-IN')} kg
            </Text>
            {wastagePercentOfNetProduct !== undefined && (
              <Text style={styles.summarySub}>
                {wastagePercentOfNetProduct.toLocaleString('en-IN', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                % of net
              </Text>
            )}
          </View>
        )}

        {/* Discrepancy */}
        {hasDiscrepancy &&
          discrepancyValue !== undefined &&
          percentSum != null && (
            <View style={[styles.summaryBox, styles.summaryBoxDestructive]}>
              <Text style={styles.summaryLabel}>Discrepancy</Text>
              <Text
                style={[styles.summaryValue, styles.summaryValueDestructive]}
              >
                Graded + Wastage ={' '}
                {percentSum.toLocaleString('en-IN', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                % (expected 100%). Discrepancy:{' '}
                {discrepancyValue >= 0 ? '+' : ''}
                {discrepancyValue.toLocaleString('en-IN', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </Text>
            </View>
          )}

        {/* Remarks */}
        {voucher.remarks != null && voucher.remarks !== '' && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Remarks</Text>
            <View style={styles.remarksBox}>
              <Text style={styles.remarksText}>{voucher.remarks}</Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}
