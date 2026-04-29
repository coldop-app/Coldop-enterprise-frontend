import { StyleSheet, Text, View } from '@react-pdf/renderer';

const C = {
  navy: '#0F2D1F',
  accent: '#34B46A',
  rule: '#CBD5E1',
  muted: '#64748B',
};

const s = StyleSheet.create({
  runHeader: {
    position: 'absolute',
    top: 18,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  runOrg: {
    fontSize: 9,
    color: C.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  runPeriod: {
    fontSize: 9,
    color: C.muted,
    textTransform: 'uppercase',
  },
  pageNum: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: C.muted,
  },
  coverBlock: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 24,
  },
  coverLabel: {
    fontSize: 10,
    color: C.accent,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: 'Oswald',
    color: C.navy,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  coverOrg: {
    fontSize: 14,
    color: C.muted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  coverPeriod: {
    fontSize: 11,
    marginTop: 4,
  },
  coverMeta: {
    fontSize: 10,
    color: C.muted,
    marginTop: 3,
  },
  coverRule: {
    width: 60,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
    marginVertical: 14,
  },
  hr: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
});

export function ReportRunHeader() {
  return (
    <View style={s.runHeader} fixed>
      <Text style={s.runOrg}>Bhatti Agritech Pvt Ltd</Text>
      <Text style={s.runPeriod}>Powered By Coldop</Text>
    </View>
  );
}

export function ReportPageNumber() {
  return (
    <Text
      style={s.pageNum}
      render={({ pageNumber, totalPages }) =>
        `Page ${pageNumber} of ${totalPages}`
      }
      fixed
    />
  );
}

export function ReportCover({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.coverBlock}>
      <Text style={s.coverLabel}>Inward Ledger Report</Text>
      <Text style={s.coverTitle}>Jindal Ice{'\n'}And Cold Storage</Text>
      <View style={s.coverRule} />
      <Text style={s.coverOrg}>Bhatti Agritech Pvt Ltd</Text>
      <Text style={s.coverPeriod}>Operational Ledger Overview</Text>
      <Text style={s.coverMeta}>Generated: {generatedAt}</Text>
    </View>
  );
}

export function ReportDivider({
  mt = 0,
  mb = 0,
}: {
  mt?: number;
  mb?: number;
}) {
  return <View style={[s.hr, { marginTop: mt, marginBottom: mb }]} />;
}
