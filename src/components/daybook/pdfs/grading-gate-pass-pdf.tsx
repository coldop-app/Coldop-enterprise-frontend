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
  amber: '#B45309',
  amberBg: '#FFFBEB',
};

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 42,
    paddingHorizontal: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    backgroundColor: '#FFFFFF',
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
  docType: {
    fontSize: 7,
    color: C.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  generatedAt: {
    fontSize: 7,
    color: C.muted,
  },
  headerMeta: {
    alignItems: 'flex-end',
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
  summaryGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  summaryCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: C.rule,
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  summaryCardWarn: {
    borderColor: '#FDE68A',
    backgroundColor: C.amberBg,
  },
  summaryLabel: {
    fontSize: 6.5,
    color: C.muted,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 11,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
  },
  summarySub: {
    fontSize: 7,
    color: C.muted,
    marginTop: 2,
  },
  summaryWarnValue: {
    color: C.amber,
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
  rowAlt: {
    backgroundColor: '#FCFDFC',
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
  igpNo: '11%',
  location: '17%',
  bags: '10%',
  gross: '12%',
  tare: '12%',
  net: '12%',
  bardana: '12%',
  netProduct: '14%',
  size: '18%',
  bagType: '12%',
  qty: '8%',
  wtBag: '12%',
  bagWt: '12%',
  deduction: '13%',
  gradedNet: '13%',
  weightPct: '12%',
} as const;

type IncomingRow = {
  _id: string;
  gatePassNo?: number;
  manualGatePassNumber?: number;
  location?: string;
  bagsReceived?: number;
  weightSlip?: { grossWeightKg?: number; tareWeightKg?: number };
  baseNetKg: number;
  bardanaKg: number;
  netProductKg: number;
};

type GradingRow = {
  size: string;
  bagType: string;
  initialQuantity: number;
  weightPerBagKg: number;
  bagWt: number;
  deductionKg: number;
  netKg: number;
  weightPct: number;
};

export interface GradingGatePassPdfData {
  gatePassNo: number;
  manualGatePassNumber?: number | null;
  date: string;
  variety: string;
  grader: string;
  remarks: string;
  farmerName: string;
  accountNumber: string;
  createdBy: string;
  isCancelled: boolean;
  incoming: {
    rows: IncomingRow[];
    totals: {
      totalBags: number;
      totalGrossKg: number;
      totalTareKg: number;
      totalBaseNetKg: number;
      totalBardanaKg: number;
      totalNetProductKg: number;
    };
  };
  grading: {
    rows: GradingRow[];
    totals: {
      totalInitial: number;
      totalDeductionKg: number;
      totalNetKg: number;
      wastageKg: number;
      totalGradedPct: number;
      wastagePct: number;
    };
  };
}

export interface GradingGatePassPdfProps {
  coldStorageName: string;
  generatedAt: string;
  data: GradingGatePassPdfData;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(
    value
  );
}

export default function GradingGatePassPdf({
  coldStorageName,
  generatedAt,
  data,
}: GradingGatePassPdfProps) {
  return (
    <Document
      title={`Grading Gate Pass #${data.gatePassNo}`}
      author="Bhatti Agri-tech"
      subject="Grading Gate Pass"
      keywords="grading gate pass, daybook, cold storage"
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
          <View style={s.headerMeta}>
            <Text style={s.docType}>Grading Gate Pass</Text>
          </View>
        </View>

        <View style={s.band}>
          <View>
            <Text style={s.bandTitle}>Grading Gate Pass</Text>
            <Text style={s.bandDate}>{formatDateTime(data.date)}</Text>
          </View>
          <View style={s.bandRight}>
            <Text style={s.bandLabel}>GGP No.</Text>
            <Text style={s.bandNo}>#{data.gatePassNo}</Text>
          </View>
        </View>

        <View style={s.chipRow}>
          <View style={s.chip}>
            <Text style={s.chipText}>Farmer: {data.farmerName || '--'}</Text>
          </View>
          <View style={s.chip}>
            <Text style={s.chipText}>Account: {data.accountNumber}</Text>
          </View>
          <View style={[s.chip, s.chipPrimary]}>
            <Text style={[s.chipText, s.chipTextPrimary]}>
              Variety: {data.variety || '--'}
            </Text>
          </View>
          <View style={s.chip}>
            <Text style={s.chipText}>Grader: {data.grader || '--'}</Text>
          </View>
          {data.manualGatePassNumber != null ? (
            <View style={s.chip}>
              <Text style={s.chipText}>
                Manual #{data.manualGatePassNumber}
              </Text>
            </View>
          ) : null}
          {data.isCancelled ? (
            <View style={[s.chip, s.chipAmber]}>
              <Text style={[s.chipText, s.chipTextAmber]}>Cancelled</Text>
            </View>
          ) : null}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Performance Summary</Text>
          <View style={s.summaryGrid}>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Incoming Net Product</Text>
              <Text style={s.summaryValue}>
                {formatNumber(data.incoming.totals.totalNetProductKg)} kg
              </Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Total Graded Net</Text>
              <Text style={s.summaryValue}>
                {formatNumber(data.grading.totals.totalNetKg)} kg
              </Text>
              <Text style={s.summarySub}>
                {formatNumber(data.grading.totals.totalGradedPct)}% of net
              </Text>
            </View>
            <View style={[s.summaryCard, s.summaryCardWarn]}>
              <Text style={s.summaryLabel}>Grading Wastage</Text>
              <Text style={[s.summaryValue, s.summaryWarnValue]}>
                {formatNumber(data.grading.totals.wastageKg)} kg
              </Text>
              <Text style={s.summarySub}>
                {formatNumber(data.grading.totals.wastagePct)}% of net
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Source Incoming Gate Passes</Text>
          <View style={s.tableWrap}>
            <View style={s.tr}>
              <Text style={[s.th, { width: w.igpNo }]}>IGP</Text>
              <Text style={[s.th, { width: w.location }]}>Location</Text>
              <Text style={[s.th, { width: w.bags, textAlign: 'right' }]}>
                Bags
              </Text>
              <Text style={[s.th, { width: w.gross, textAlign: 'right' }]}>
                Gross
              </Text>
              <Text style={[s.th, { width: w.tare, textAlign: 'right' }]}>
                Tare
              </Text>
              <Text style={[s.th, { width: w.net, textAlign: 'right' }]}>
                Net
              </Text>
              <Text style={[s.th, { width: w.bardana, textAlign: 'right' }]}>
                Bardana
              </Text>
              <Text style={[s.th, { width: w.netProduct, textAlign: 'right' }]}>
                Net Product
              </Text>
            </View>

            {data.incoming.rows.map((row, idx) => {
              const rowStyles = idx % 2 ? [s.tr, s.rowAlt] : [s.tr];
              return (
                <View key={row._id} style={rowStyles}>
                  <Text style={[s.td, s.tdStrong, { width: w.igpNo }]}>
                    #{row.gatePassNo ?? '--'}
                  </Text>
                  <Text style={[s.td, { width: w.location }]}>
                    {row.location ?? '--'}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.bags }]}>
                    {formatNumber(row.bagsReceived ?? 0)}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.gross }]}>
                    {formatNumber(row.weightSlip?.grossWeightKg ?? 0)}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.tare }]}>
                    {formatNumber(row.weightSlip?.tareWeightKg ?? 0)}
                  </Text>
                  <Text style={[s.td, s.tdRight, s.tdStrong, { width: w.net }]}>
                    {formatNumber(row.baseNetKg)}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.bardana }]}>
                    {formatNumber(row.bardanaKg)}
                  </Text>
                  <Text
                    style={[
                      s.td,
                      s.tdRight,
                      s.tdStrong,
                      { width: w.netProduct, color: C.primary },
                    ]}
                  >
                    {formatNumber(row.netProductKg)}
                  </Text>
                </View>
              );
            })}

            <View style={[s.tr, s.trLast]}>
              <Text
                style={[
                  s.td,
                  s.tdStrong,
                  {
                    width: `${Number.parseFloat(w.igpNo) + Number.parseFloat(w.location)}%`,
                  },
                ]}
              >
                Totals
              </Text>
              <Text style={[s.td, s.tdRight, s.tdStrong, { width: w.bags }]}>
                {formatNumber(data.incoming.totals.totalBags)}
              </Text>
              <Text style={[s.td, s.tdRight, s.tdStrong, { width: w.gross }]}>
                {formatNumber(data.incoming.totals.totalGrossKg)}
              </Text>
              <Text style={[s.td, s.tdRight, s.tdStrong, { width: w.tare }]}>
                {formatNumber(data.incoming.totals.totalTareKg)}
              </Text>
              <Text style={[s.td, s.tdRight, s.tdStrong, { width: w.net }]}>
                {formatNumber(data.incoming.totals.totalBaseNetKg)}
              </Text>
              <Text style={[s.td, s.tdRight, s.tdStrong, { width: w.bardana }]}>
                {formatNumber(data.incoming.totals.totalBardanaKg)}
              </Text>
              <Text
                style={[
                  s.td,
                  s.tdRight,
                  s.tdStrong,
                  { width: w.netProduct, color: C.primary },
                ]}
              >
                {formatNumber(data.incoming.totals.totalNetProductKg)}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Graded Output Details</Text>
          <View style={s.tableWrap}>
            <View style={s.tr}>
              <Text style={[s.th, { width: w.size }]}>Size</Text>
              <Text style={[s.th, { width: w.bagType }]}>Bag Type</Text>
              <Text style={[s.th, { width: w.qty, textAlign: 'right' }]}>
                Qty
              </Text>
              <Text style={[s.th, { width: w.wtBag, textAlign: 'right' }]}>
                Wt/Bag
              </Text>
              <Text style={[s.th, { width: w.bagWt, textAlign: 'right' }]}>
                Bag Wt
              </Text>
              <Text style={[s.th, { width: w.deduction, textAlign: 'right' }]}>
                Deduction
              </Text>
              <Text style={[s.th, { width: w.gradedNet, textAlign: 'right' }]}>
                Net
              </Text>
              <Text style={[s.th, { width: w.weightPct, textAlign: 'right' }]}>
                Weight %
              </Text>
            </View>
            {data.grading.rows.map((row, idx) => {
              const rowStyles = idx % 2 ? [s.tr, s.rowAlt] : [s.tr];
              return (
                <View key={`${row.size}-${idx}`} style={rowStyles}>
                  <Text style={[s.td, s.tdStrong, { width: w.size }]}>
                    {row.size}
                  </Text>
                  <Text style={[s.td, { width: w.bagType }]}>
                    {row.bagType}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.qty }]}>
                    {formatNumber(row.initialQuantity)}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.wtBag }]}>
                    {formatNumber(row.weightPerBagKg)}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.bagWt }]}>
                    {formatNumber(row.bagWt)}
                  </Text>
                  <Text style={[s.td, s.tdRight, { width: w.deduction }]}>
                    {formatNumber(row.deductionKg)}
                  </Text>
                  <Text
                    style={[
                      s.td,
                      s.tdRight,
                      s.tdStrong,
                      { width: w.gradedNet },
                    ]}
                  >
                    {formatNumber(row.netKg)}
                  </Text>
                  <Text
                    style={[
                      s.td,
                      s.tdRight,
                      s.tdStrong,
                      { width: w.weightPct, color: C.primary },
                    ]}
                  >
                    {formatNumber(row.weightPct)}%
                  </Text>
                </View>
              );
            })}
            <View style={[s.tr, s.trLast]}>
              <Text
                style={[
                  s.td,
                  s.tdStrong,
                  {
                    width: `${Number.parseFloat(w.size) + Number.parseFloat(w.bagType)}%`,
                  },
                ]}
              >
                Totals
              </Text>
              <Text style={[s.td, s.tdRight, s.tdStrong, { width: w.qty }]}>
                {formatNumber(data.grading.totals.totalInitial)}
              </Text>
              <Text style={[s.td, { width: w.wtBag }]} />
              <Text style={[s.td, { width: w.bagWt }]} />
              <Text
                style={[s.td, s.tdRight, s.tdStrong, { width: w.deduction }]}
              >
                {formatNumber(data.grading.totals.totalDeductionKg)}
              </Text>
              <Text
                style={[s.td, s.tdRight, s.tdStrong, { width: w.gradedNet }]}
              >
                {formatNumber(data.grading.totals.totalNetKg)}
              </Text>
              <Text
                style={[
                  s.td,
                  s.tdRight,
                  s.tdStrong,
                  { width: w.weightPct, color: C.primary },
                ]}
              >
                {formatNumber(data.grading.totals.totalGradedPct)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Remarks</Text>
          <View style={s.tableWrap}>
            <View style={s.trLast}>
              <Text style={[s.td, { paddingVertical: 8 }]}>
                {data.remarks || '--'}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Created by {data.createdBy}</Text>
          <Text style={s.footerText}>Powered by Coldop</Text>
        </View>
      </Page>
    </Document>
  );
}
