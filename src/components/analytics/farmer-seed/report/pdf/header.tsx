import { StyleSheet, Text, View, Image } from '@react-pdf/renderer';

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A',
  rule: '#E2E8F0',
  muted: '#64748B',
};

const s = StyleSheet.create({
  runHeader: {
    position: 'absolute',
    top: 24,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
  },
  runOrg: {
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  runPeriod: {
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pageNum: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1,
  },
  coverBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  coverLogo: {
    width: 90,
    height: 'auto',
    maxHeight: 80,
    objectFit: 'contain',
    marginBottom: 32,
  },
  coverLabel: {
    fontSize: 9,
    color: C.primary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  coverTitle: {
    fontSize: 28,
    color: C.navy,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  coverRule: {
    width: 40,
    borderBottomWidth: 1.5,
    borderBottomColor: C.primary,
    marginVertical: 24,
  },
  coverMeta: {
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.5,
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
        `PAGE ${pageNumber} OF ${totalPages}`
      }
      fixed
    />
  );
}

const formatGroupingLabel = (groupId: string): string =>
  groupId
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildCoverLabel = (grouping: string[]): string => {
  if (!grouping.length) return 'Farmer Seed Report';
  const groupedBy = grouping.map(formatGroupingLabel).join(', ');
  return `Farmer Seed Report (Grouped by ${groupedBy})`;
};

export function ReportCover({
  generatedAt,
  grouping = [],
  coldStorageName,
}: {
  generatedAt: string;
  grouping?: string[];
  coldStorageName: string;
}) {
  return (
    <View style={s.coverBlock}>
      <Image
        src="https://res.cloudinary.com/dakh64xhy/image/upload/v1759410800/Bhatti-Agritech_gwqywg.jpg"
        style={s.coverLogo}
      />
      <Text style={s.coverLabel}>{buildCoverLabel(grouping)}</Text>
      <Text style={s.coverTitle}>{coldStorageName}</Text>
      <View style={s.coverRule} />
      <Text style={s.coverMeta}>GENERATED: {generatedAt.toUpperCase()}</Text>
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
