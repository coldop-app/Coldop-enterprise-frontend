import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { IncomingVoucherData } from '@/components/daybook/vouchers/types';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import { useStore } from '@/stores/store';

/** Data passed from IncomingVoucher for PDF rendering */
export interface IncomingVoucherPdfProps {
  voucher: IncomingVoucherData;
  farmerName?: string;
  farmerAccount?: number;
}

const PRIMARY = '#18a44b';
const PRIMARY_LIGHT = '#e8f5ee';
const MUTED = '#6f6f6f';
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
  manualGatePassLine: {
    fontSize: 10,
    fontWeight: 600,
    color: PRIMARY,
    marginTop: 4,
  },
  dateText: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
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
    color: PRIMARY,
  },
  weightSlipBox: {
    backgroundColor: HEADER_BG,
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  weightSlipRow: {
    flexDirection: 'row',
    marginBottom: 6,
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

export function IncomingVoucherPdf({
  voucher,
  farmerName,
  farmerAccount,
}: IncomingVoucherPdfProps) {
  const coldStorage = useStore((s) => s.coldStorage);
  const gatePassNo = voucher.gatePassNo ?? '—';
  const dateStr = formatVoucherDate(voucher.date);
  const bags = voucher.bagsReceived ?? 0;
  const status = (voucher.status ?? '—').toString().replace(/_/g, ' ');
  const manualNo = voucher.manualGatePassNumber;
  const netWeight =
    (voucher.weightSlip?.grossWeightKg ?? 0) -
    (voucher.weightSlip?.tareWeightKg ?? 0);

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
            <Text style={styles.gatePassNo}>IGP #{gatePassNo}</Text>
            {manualNo != null && (
              <Text style={styles.manualGatePassLine}>Manual #{manualNo}</Text>
            )}
          </View>
        </View>

        {/* Details - two columns */}
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
              <Text style={styles.detailLabel}>Truck:</Text>
              <Text style={styles.detailValue}>
                {voucher.truckNumber ?? '—'}
              </Text>
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
              <Text style={styles.detailValue}>
                {bags.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{status}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created By:</Text>
              <Text style={styles.detailValue}>
                {voucher.createdBy?.name ?? '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Bags received summary */}
        <View style={[styles.summaryBox, styles.summaryBoxPrimary]}>
          <Text style={styles.summaryLabel}>Bags Received</Text>
          <Text style={styles.summaryValue}>
            {bags.toLocaleString('en-IN')} bags
          </Text>
          {(voucher.gradingSummary?.totalGradedBags ?? 0) > 0 && (
            <Text style={[styles.detailValue, { marginTop: 4, fontSize: 9 }]}>
              Graded bags:{' '}
              {(voucher.gradingSummary?.totalGradedBags ?? 0).toLocaleString(
                'en-IN'
              )}
            </Text>
          )}
        </View>

        {/* Weight slip */}
        {voucher.weightSlip != null && (
          <>
            <Text style={styles.sectionTitle}>Weight Slip</Text>
            <View style={styles.weightSlipBox}>
              <View style={styles.weightSlipRow}>
                <Text style={styles.detailLabel}>Slip No:</Text>
                <Text style={styles.detailValue}>
                  {voucher.weightSlip.slipNumber ?? '—'}
                </Text>
              </View>
              <View style={styles.weightSlipRow}>
                <Text style={styles.detailLabel}>Gross (kg):</Text>
                <Text style={styles.detailValue}>
                  {(voucher.weightSlip.grossWeightKg ?? 0).toLocaleString(
                    'en-IN'
                  )}
                </Text>
              </View>
              <View style={styles.weightSlipRow}>
                <Text style={styles.detailLabel}>Tare (kg):</Text>
                <Text style={styles.detailValue}>
                  {(voucher.weightSlip.tareWeightKg ?? 0).toLocaleString(
                    'en-IN'
                  )}
                </Text>
              </View>
              <View style={styles.weightSlipRow}>
                <Text style={styles.detailLabel}>Net (kg):</Text>
                <Text style={[styles.detailValue, { fontWeight: 700 }]}>
                  {netWeight.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </>
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
