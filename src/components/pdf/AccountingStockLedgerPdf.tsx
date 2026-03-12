import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type { ColdStorage } from '@/types/cold-storage';

export interface AccountingStockLedgerPdfProps {
  farmerName: string;
  coldStorageDetails: ColdStorage | null;
  incomingGatePasses: unknown[];
  /** Report date for footer (e.g. date of generation). Defaults to current date. */
  reportDate?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    paddingBottom: 80,
    fontSize: 8,
    fontFamily: 'Helvetica',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 8,
    marginBottom: 12,
  },
  headerLogoWrap: {
    width: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  headerTextBlock: {
    flex: 1,
    textAlign: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 64,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  farmerName: {
    fontSize: 10,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 6,
    color: '#333',
  },
  jsonBlock: {
    fontSize: 6,
    fontFamily: 'Courier',
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footer: {
    position: 'absolute',
    bottom: 36,
    left: 36,
    right: 36,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  footerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  footerLogo: {
    width: 24,
    height: 24,
    marginBottom: 2,
  },
  poweredBy: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center',
  },
});

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const COLDOP_LOGO_URL =
  'https://res.cloudinary.com/dakh64xhy/image/upload/v1753172868/profile_pictures/lhdlzskpe2gj8dq8jvzl.png';

export function AccountingStockLedgerPdf({
  farmerName,
  coldStorageDetails,
  incomingGatePasses,
  reportDate = new Date().toLocaleDateString('en-IN'),
}: AccountingStockLedgerPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLogoWrap}>
            <Image
              src={coldStorageDetails?.imageUrl ?? '/coldop-logo.png'}
              style={styles.headerLogo}
            />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.reportTitle}>Farmer Report</Text>
            <Text style={styles.companyName}>
              {coldStorageDetails?.name ?? '—'}
            </Text>
            <Text style={styles.farmerName}>{farmerName}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={styles.sectionTitle}>Incoming Gate Passes</Text>
        <View style={styles.jsonBlock}>
          <Text wrap>{safeStringify(incomingGatePasses)}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={{ fontSize: 7 }}>
              Authorized Signature: ____________________
            </Text>
          </View>
          <View style={styles.footerCenter}>
            <View style={{ alignItems: 'center' }}>
              <Image src={COLDOP_LOGO_URL} style={styles.footerLogo} />
              <Text style={styles.poweredBy}>Powered by Coldop</Text>
            </View>
          </View>
          <View style={styles.footerRight}>
            <Text style={{ fontSize: 7 }}>Date: {reportDate}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
