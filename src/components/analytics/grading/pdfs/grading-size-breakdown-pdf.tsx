import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import {
  ReportPageNumber,
  ReportRunHeader,
} from '../../incoming/report/pdf/header';
import type {
  SizeDistributionSizeItem,
  SizeDistributionVarietyItem,
} from '@/types/analytics';

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A',
  muted: '#64748B',
  rule: '#E2E8F0',
  rowAlt: '#F8FAFC',
  headerBg: '#F1F5F9',
  textStrong: '#1E293B',
};

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 60,
    paddingHorizontal: 16,
    fontFamily: 'Times-Roman',
    backgroundColor: '#FFFFFF',
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
    marginBottom: 6,
  },
  sectionWrap: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 10,
    color: C.primary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: C.headerBg,
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: C.primary,
  },
  tableRow: {
    flexDirection: 'row',
    width: '100%',
  },
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd: { backgroundColor: C.rowAlt },
  tableTotalsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1.5,
    borderTopColor: C.navy,
    paddingTop: 7,
    marginTop: 2,
  },
  tableCellText: {
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    color: C.muted,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableBodyText: {
    fontSize: 10,
    color: C.textStrong,
  },
  tableTotalsText: {
    fontSize: 10,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  emptyState: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: C.rule,
    backgroundColor: C.rowAlt,
    paddingVertical: 28,
    textAlign: 'center',
    color: C.muted,
    fontSize: 10,
  },
  insightsWrap: {
    marginTop: 20,
  },
  insightsHeading: {
    fontSize: 10,
    color: C.primary,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  insightsSubHeading: {
    fontSize: 10,
    color: C.primary,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  insightsRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
    marginBottom: 8,
  },
  insightsText: {
    fontSize: 9.5,
    color: C.textStrong,
    marginBottom: 4,
    lineHeight: 1.35,
  },
  insightsMuted: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 8,
    lineHeight: 1.35,
  },
});

type GradingSizeBreakdownPdfProps = {
  generatedAt: string;
  coldStorageName: string;
  chartData: SizeDistributionVarietyItem[];
  dateRangeLabel?: string;
};

type SizeRow = {
  name: string;
  bags: number;
  weightKg: number;
  percentage: number;
};

const SIZE_ORDER = [
  'Below 30',
  '30–40',
  '35–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatDecimal(value: number): string {
  return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(1)}%`;
}

function orderSizes(
  sizes: SizeDistributionSizeItem[]
): SizeDistributionSizeItem[] {
  const byName = new Map(sizes.map((item) => [item.name, item]));
  const ordered: SizeDistributionSizeItem[] = [];

  for (const sizeName of SIZE_ORDER) {
    const entry = byName.get(sizeName);
    if (entry) ordered.push(entry);
  }

  const remaining = sizes
    .filter((item) => !SIZE_ORDER.includes(item.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...ordered, ...remaining];
}

function toRows(sizes: SizeDistributionSizeItem[]): {
  rows: SizeRow[];
  totalBags: number;
  totalWeightKg: number;
} {
  const ordered = orderSizes(sizes);
  const totalWeightKg = ordered.reduce(
    (sum, item) => sum + Number(item.weightExcludingBardanaKg ?? 0),
    0
  );
  const totalBags = ordered.reduce(
    (sum, item) => sum + Number(item.value ?? 0),
    0
  );

  const rows: SizeRow[] = ordered.map((item) => {
    const bags = Number(item.value ?? 0);
    const weightKg = Number(item.weightExcludingBardanaKg ?? 0);
    const percentage = totalWeightKg > 0 ? (weightKg / totalWeightKg) * 100 : 0;
    return { name: item.name, bags, weightKg, percentage };
  });

  return { rows, totalBags, totalWeightKg };
}

function SizeTable({
  variety,
  rows,
  totalBags,
  totalWeightKg,
}: {
  variety: string;
  rows: SizeRow[];
  totalBags: number;
  totalWeightKg: number;
}) {
  return (
    <View style={s.sectionWrap}>
      <Text style={s.sectionTitle}>{variety} - Size Distribution</Text>
      <View style={s.tableHeaderRow}>
        <Text
          style={[
            s.tableHeaderText,
            s.tableCellText,
            { width: '34%', textAlign: 'left' },
          ]}
        >
          Size
        </Text>
        <Text
          style={[
            s.tableHeaderText,
            s.tableCellText,
            { width: '22%', textAlign: 'right' },
          ]}
        >
          Bags
        </Text>
        <Text
          style={[
            s.tableHeaderText,
            s.tableCellText,
            { width: '24%', textAlign: 'right' },
          ]}
        >
          Weight (kg)
        </Text>
        <Text
          style={[
            s.tableHeaderText,
            s.tableCellText,
            { width: '20%', textAlign: 'right' },
          ]}
        >
          % of variety
        </Text>
      </View>

      {rows.map((row, index) => (
        <View
          key={`${variety}-${row.name}`}
          style={[s.tableRow, index % 2 === 0 ? s.rowEven : s.rowOdd]}
          wrap={false}
        >
          <Text
            style={[
              s.tableBodyText,
              s.tableCellText,
              { width: '34%', textAlign: 'left' },
            ]}
          >
            {row.name}
          </Text>
          <Text
            style={[
              s.tableBodyText,
              s.tableCellText,
              { width: '22%', textAlign: 'right' },
            ]}
          >
            {formatNumber(row.bags)}
          </Text>
          <Text
            style={[
              s.tableBodyText,
              s.tableCellText,
              { width: '24%', textAlign: 'right' },
            ]}
          >
            {formatDecimal(row.weightKg)}
          </Text>
          <Text
            style={[
              s.tableBodyText,
              s.tableCellText,
              { width: '20%', textAlign: 'right' },
            ]}
          >
            {formatPercentage(row.percentage)}
          </Text>
        </View>
      ))}

      <View style={s.tableTotalsRow} wrap={false}>
        <Text
          style={[
            s.tableTotalsText,
            s.tableCellText,
            { width: '34%', textAlign: 'left' },
          ]}
        >
          Total
        </Text>
        <Text
          style={[
            s.tableTotalsText,
            s.tableCellText,
            { width: '22%', textAlign: 'right' },
          ]}
        >
          {formatNumber(totalBags)}
        </Text>
        <Text
          style={[
            s.tableTotalsText,
            s.tableCellText,
            { width: '24%', textAlign: 'right' },
          ]}
        >
          {formatDecimal(totalWeightKg)}
        </Text>
        <Text
          style={[
            s.tableTotalsText,
            s.tableCellText,
            { width: '20%', textAlign: 'right' },
          ]}
        >
          100.0%
        </Text>
      </View>
    </View>
  );
}

function Insights({
  varieties,
}: {
  varieties: Array<{
    variety: string;
    totalBags: number;
    totalWeightKg: number;
  }>;
}) {
  const totalWeight = varieties.reduce(
    (sum, item) => sum + item.totalWeightKg,
    0
  );
  const totalBags = varieties.reduce((sum, item) => sum + item.totalBags, 0);
  const topVariety = varieties.reduce<(typeof varieties)[number] | null>(
    (max, item) =>
      max === null || item.totalWeightKg > max.totalWeightKg ? item : max,
    null
  );

  const sorted = [...varieties].sort(
    (a, b) => b.totalWeightKg - a.totalWeightKg
  );

  return (
    <View style={s.insightsWrap}>
      <View style={s.insightsRule} />
      <Text style={s.insightsHeading}>Overview</Text>
      <View style={s.insightsRule} />
      <Text style={s.insightsText}>
        This report lists grading size distribution by variety, using net weight
        excluding bardana.
      </Text>
      <Text style={s.insightsText}>
        Total graded output: {formatNumber(totalBags)} bags and{' '}
        {formatDecimal(totalWeight)} kg across {varieties.length} varieties.
      </Text>
      <Text style={s.insightsMuted}>
        Top variety by weight:{' '}
        {topVariety
          ? `${topVariety.variety} (${formatDecimal(topVariety.totalWeightKg)} kg)`
          : '-'}
        .
      </Text>

      <Text style={s.insightsSubHeading}>Variety contribution</Text>
      <View style={s.insightsRule} />
      {sorted.map((item) => {
        const share =
          totalWeight > 0 ? (item.totalWeightKg / totalWeight) * 100 : 0;
        return (
          <Text key={`variety-share-${item.variety}`} style={s.insightsText}>
            {item.variety}: {formatDecimal(item.totalWeightKg)} kg (
            {formatPercentage(share)})
          </Text>
        );
      })}
    </View>
  );
}

export default function GradingSizeBreakdownPdf({
  generatedAt,
  coldStorageName,
  chartData,
  dateRangeLabel,
}: GradingSizeBreakdownPdfProps) {
  const prepared = (chartData ?? []).map((item) => {
    const { rows, totalBags, totalWeightKg } = toRows(item.sizes ?? []);
    return {
      variety: item.variety,
      rows,
      totalBags,
      totalWeightKg,
    };
  });

  const hasAnyData = prepared.some((item) => item.rows.length > 0);

  return (
    <Document
      title="Grading Size Breakdown Report"
      author="Bhatti Agritech Pvt Ltd"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportRunHeader />
        <ReportPageNumber />
        <View style={s.coverBlock}>
          <Image
            src="https://res.cloudinary.com/dakh64xhy/image/upload/v1759410800/Bhatti-Agritech_gwqywg.jpg"
            style={s.coverLogo}
          />
          <Text style={s.coverLabel}>Grading Size Breakdown Report</Text>
          <Text style={s.coverTitle}>{coldStorageName}</Text>
          <View style={s.coverRule} />
          {dateRangeLabel ? (
            <Text style={s.coverMeta}>
              DATE RANGE: {dateRangeLabel.toUpperCase()}
            </Text>
          ) : null}
          <Text style={s.coverMeta}>
            GENERATED: {generatedAt.toUpperCase()}
          </Text>
        </View>
      </Page>

      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportRunHeader />
        <ReportPageNumber />
        {hasAnyData ? (
          <>
            {prepared.map((item) =>
              item.rows.length > 0 ? (
                <SizeTable
                  key={`size-table-${item.variety}`}
                  variety={item.variety}
                  rows={item.rows}
                  totalBags={item.totalBags}
                  totalWeightKg={item.totalWeightKg}
                />
              ) : null
            )}
            <Insights
              varieties={prepared
                .filter((item) => item.rows.length > 0)
                .map(({ variety, totalBags, totalWeightKg }) => ({
                  variety,
                  totalBags,
                  totalWeightKg,
                }))}
            />
          </>
        ) : (
          <Text style={s.emptyState}>
            No size distribution data available for the selected period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
