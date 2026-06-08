import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A',
  primaryLight: '#ECFDF5',
  primaryBorder: '#BBF7D0',
  rule: '#E2E8F0',
  muted: '#64748B',
  text: '#334155',
  dark: '#1E293B',
  surface: '#F8FAFC',
  white: '#FFFFFF',
  amber: '#B45309',
  amberBg: '#FFFBEB',
  cancelled: '#94A3B8',
} as const;

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 42,
    paddingHorizontal: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: 'contain',
  },
  storageName: {
    fontSize: 11,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  generatedAt: {
    fontSize: 7,
    color: C.muted,
  },
  docType: {
    fontSize: 7,
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  band: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: C.primaryBorder,
    backgroundColor: C.primaryLight,
    borderRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  bandCancelled: {
    borderColor: C.rule,
    backgroundColor: C.surface,
  },
  bandTitle: {
    fontSize: 12,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
  },
  bandDate: {
    fontSize: 7,
    color: C.muted,
    marginTop: 3,
  },
  bandRight: {
    alignItems: 'flex-end',
  },
  bandLabel: {
    fontSize: 6.5,
    color: C.primary,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  bandLabelCancelled: {
    color: C.muted,
  },
  bandNo: {
    fontSize: 18,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 0.5,
    borderColor: C.rule,
    backgroundColor: C.surface,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  chipPrimary: {
    borderColor: C.primaryBorder,
    backgroundColor: C.primaryLight,
  },
  chipAmber: {
    borderColor: '#FDE68A',
    backgroundColor: C.amberBg,
  },
  chipText: {
    fontSize: 6.5,
    color: C.dark,
    fontFamily: 'Helvetica-Bold',
  },
  chipTextPrimary: {
    color: C.primary,
  },
  chipTextAmber: {
    color: C.amber,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 7,
    color: C.primary,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 6,
  },
  metricCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 4,
    padding: 8,
    backgroundColor: C.white,
  },
  metricLabel: {
    fontSize: 6.5,
    color: C.muted,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 11,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
  },
  tableWrap: {
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  trLast: {
    borderBottomWidth: 0,
  },
  rowAlt: {
    backgroundColor: '#FCFDFC',
  },
  th: {
    backgroundColor: C.surface,
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 6.2,
    color: C.muted,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  td: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 7.5,
    color: C.text,
  },
  tdStrong: {
    fontFamily: 'Helvetica-Bold',
    color: C.dark,
  },
  tdRight: {
    textAlign: 'right',
  },
  remarksCard: {
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 4,
    padding: 10,
    backgroundColor: C.surface,
    minHeight: 32,
  },
  remarksText: {
    fontSize: 8,
    color: C.text,
    lineHeight: 1.4,
  },
  footer: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
    paddingTop: 7,
  },
  footerText: {
    fontSize: 6.5,
    color: C.muted,
  },
});

const w = {
  name: '28%',
  qty: '15%',
  rate: '17%',
  acres: '17%',
  amount: '23%',
} as const;

export interface SeedGatePassPdfRow {
  name: string;
  quantity: number;
  rate: number;
  acres: number;
  amount: number;
}

export interface SeedGatePassPdfData {
  gatePassNo: string;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  farmerName: string;
  accountNumber: string;
  farmerAddress: string;
  remarks: string;
  totalBags: number;
  totalAcres: number;
  totalAmount: number;
  isCancelled: boolean;
  rows: SeedGatePassPdfRow[];
}

export interface SeedGatePassPdfProps {
  coldStorageName: string;
  generatedAt: string;
  data: SeedGatePassPdfData;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '--';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export default function SeedGatePassPdf({
  coldStorageName,
  generatedAt,
  data,
}: SeedGatePassPdfProps) {
  return (
    <Document
      title={`Seed Voucher FSP #${data.gatePassNo}`}
      author="Bhatti Agri-tech"
      subject="Farmer Seed Voucher"
      keywords="seed gate pass, farmer seed, voucher, daybook"
      creator="Coldop"
      producer="Coldop"
      language="en-IN"
      pageLayout="singlePage"
    >
      <Page size="A4" style={s.page} wrap>
        <View style={s.header} fixed>
          <View style={s.headerBrand}>
            <Image
              src="https://res.cloudinary.com/dakh64xhy/image/upload/v1759410800/Bhatti-Agritech_gwqywg.jpg"
              style={s.logo}
            />
            <View>
              <Text style={s.storageName}>{coldStorageName}</Text>
              <Text style={s.generatedAt}>Generated {generatedAt}</Text>
            </View>
          </View>
          <Text style={s.docType}>Farmer Seed Voucher</Text>
        </View>

        <View style={[s.band, ...(data.isCancelled ? [s.bandCancelled] : [])]}>
          <View>
            <Text style={s.bandTitle}>Farmer Seed Voucher</Text>
            <Text style={s.bandDate}>{formatDateTime(data.date)}</Text>
          </View>
          <View style={s.bandRight}>
            <Text
              style={[
                s.bandLabel,
                ...(data.isCancelled ? [s.bandLabelCancelled] : []),
              ]}
            >
              FSP No.
            </Text>
            <Text style={s.bandNo}>#{data.gatePassNo || '--'}</Text>
          </View>
        </View>

        <View style={s.chipRow}>
          <View style={s.chip}>
            <Text style={s.chipText}>Farmer: {data.farmerName || '--'}</Text>
          </View>
          <View style={s.chip}>
            <Text style={s.chipText}>Account: {data.accountNumber}</Text>
          </View>
          {data.farmerAddress ? (
            <View style={s.chip}>
              <Text style={s.chipText}>Address: {data.farmerAddress}</Text>
            </View>
          ) : null}
          <View style={[s.chip, s.chipPrimary]}>
            <Text style={[s.chipText, s.chipTextPrimary]}>
              Variety: {data.variety || '--'}
            </Text>
          </View>
          <View style={s.chip}>
            <Text style={s.chipText}>Stage: {data.generation || '--'}</Text>
          </View>
          {data.invoiceNumber ? (
            <View style={s.chip}>
              <Text style={s.chipText}>Invoice #{data.invoiceNumber}</Text>
            </View>
          ) : null}
          {data.isCancelled ? (
            <View style={[s.chip, s.chipAmber]}>
              <Text style={[s.chipText, s.chipTextAmber]}>Cancelled</Text>
            </View>
          ) : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Summary</Text>
          <View style={s.metricRow}>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Total Bags</Text>
              <Text style={s.metricValue}>
                {formatNumber(data.totalBags)} bags
              </Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Total Acres</Text>
              <Text style={s.metricValue}>
                {formatNumber(data.totalAcres)} ac
              </Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Total Amount</Text>
              <Text style={s.metricValue}>
                ₹{formatNumber(data.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Itemized Seed Details</Text>
          <View style={s.tableWrap}>
            <View style={s.tr}>
              <Text style={[s.th, { width: w.name }]}>Bag Size</Text>
              <Text style={[s.th, { width: w.qty, textAlign: 'right' }]}>
                Qty
              </Text>
              <Text style={[s.th, { width: w.rate, textAlign: 'right' }]}>
                Rate (₹)
              </Text>
              <Text style={[s.th, { width: w.acres, textAlign: 'right' }]}>
                Acres
              </Text>
              <Text style={[s.th, { width: w.amount, textAlign: 'right' }]}>
                Amount (₹)
              </Text>
            </View>
            {data.rows.map((row, idx) => (
              <View
                key={`${row.name}-${idx}`}
                style={[s.tr, ...(idx % 2 ? [s.rowAlt] : [])]}
              >
                <Text style={[s.td, s.tdStrong, { width: w.name }]}>
                  {row.name}
                </Text>
                <Text style={[s.td, s.tdRight, { width: w.qty }]}>
                  {formatNumber(row.quantity)}
                </Text>
                <Text style={[s.td, s.tdRight, { width: w.rate }]}>
                  {formatNumber(row.rate)}
                </Text>
                <Text style={[s.td, s.tdRight, { width: w.acres }]}>
                  {formatNumber(row.acres)}
                </Text>
                <Text style={[s.td, s.tdRight, { width: w.amount }]}>
                  {formatNumber(row.amount)}
                </Text>
              </View>
            ))}
            <View style={[s.tr, s.trLast]}>
              <Text style={[s.td, s.tdStrong, { width: w.name }]}>Totals</Text>
              <Text
                style={[
                  s.td,
                  s.tdRight,
                  s.tdStrong,
                  { width: w.qty, color: C.primary },
                ]}
              >
                {formatNumber(data.totalBags)}
              </Text>
              <Text style={[s.td, { width: w.rate }]}>—</Text>
              <Text
                style={[
                  s.td,
                  s.tdRight,
                  s.tdStrong,
                  { width: w.acres, color: C.primary },
                ]}
              >
                {formatNumber(data.totalAcres)}
              </Text>
              <Text
                style={[
                  s.td,
                  s.tdRight,
                  s.tdStrong,
                  { width: w.amount, color: C.primary },
                ]}
              >
                {formatNumber(data.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Remarks</Text>
          <View style={s.remarksCard}>
            <Text style={s.remarksText}>{data.remarks || '--'}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Document Ref: FSP #{data.gatePassNo || '--'}
          </Text>
          <Text style={s.footerText}>Powered by Coldop</Text>
        </View>
      </Page>
    </Document>
  );
}
