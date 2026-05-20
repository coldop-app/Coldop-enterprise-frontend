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
import type { AreaWiseChartAreaItem } from '@/types/analytics';

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A',
  muted: '#64748B',
  rule: '#E2E8F0',
  rowAlt: '#F8FAFC',
  headerBg: '#F1F5F9',
  textStrong: '#1E293B',
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
] as const;

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
    marginTop: 18,
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

type VarietyAreaRow = {
  area: string;
  sizeValues: Record<string, number>;
  total: number;
};

type VarietyBlock = {
  variety: string;
  sizeKeys: string[];
  rows: VarietyAreaRow[];
  totalBags: number;
};

type GradingAreaBreakdownPdfProps = {
  generatedAt: string;
  coldStorageName: string;
  chartData: AreaWiseChartAreaItem[];
  dateRangeLabel?: string;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function getVarieties(chartData: AreaWiseChartAreaItem[]): string[] {
  const set = new Set<string>();
  for (const area of chartData) {
    for (const variety of area.varieties ?? []) set.add(variety.variety);
  }
  const preferredOrder = ['Himalini', 'B101', 'Jyoti'];
  const values = [...set];
  return values.sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

function getSizeKeysForVariety(
  chartData: AreaWiseChartAreaItem[],
  variety: string
): string[] {
  const set = new Set<string>();
  for (const area of chartData) {
    const varietyData = area.varieties.find((item) => item.variety === variety);
    if (!varietyData) continue;
    for (const bagType of varietyData.bagTypes ?? []) {
      for (const size of bagType.sizes ?? []) set.add(size.name);
    }
  }

  const known = SIZE_ORDER.filter((size) => set.has(size));
  const rest = [...set]
    .filter((size) => !known.includes(size as (typeof SIZE_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...rest];
}

function buildRowsByVariety(
  chartData: AreaWiseChartAreaItem[],
  variety: string,
  sizeKeys: string[]
): VarietyAreaRow[] {
  return chartData.map((area) => {
    const selectedVariety = area.varieties.find(
      (item) => item.variety === variety
    );
    const sizeValues = Object.fromEntries(
      sizeKeys.map((key) => [key, 0])
    ) as Record<string, number>;

    if (selectedVariety) {
      for (const bagType of selectedVariety.bagTypes ?? []) {
        for (const size of bagType.sizes ?? []) {
          sizeValues[size.name] =
            Number(sizeValues[size.name] ?? 0) + Number(size.value ?? 0);
        }
      }
    }

    const total = sizeKeys.reduce(
      (sum, key) => sum + Number(sizeValues[key] ?? 0),
      0
    );
    return { area: area.area, sizeValues, total };
  });
}

function prepareVarietyBlocks(
  chartData: AreaWiseChartAreaItem[]
): VarietyBlock[] {
  return getVarieties(chartData).map((variety) => {
    const sizeKeys = getSizeKeysForVariety(chartData, variety);
    const rows = buildRowsByVariety(chartData, variety, sizeKeys);
    const totalBags = rows.reduce((sum, row) => sum + row.total, 0);
    return { variety, sizeKeys, rows, totalBags };
  });
}

function VarietyTable({ variety, sizeKeys, rows, totalBags }: VarietyBlock) {
  const footerTotals = sizeKeys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = rows.reduce(
      (sum, row) => sum + Number(row.sizeValues[key] ?? 0),
      0
    );
    return acc;
  }, {});

  const labelColWidth = 16;
  const totalColWidth = 12;
  const sizeColWidth = sizeKeys.length
    ? (100 - labelColWidth - totalColWidth) / sizeKeys.length
    : 72;

  return (
    <View style={s.sectionWrap}>
      <Text style={s.sectionTitle}>{variety} - Area-wise Activity</Text>

      <View style={s.tableHeaderRow}>
        <Text
          style={[
            s.tableHeaderText,
            s.tableCellText,
            { width: `${labelColWidth}%`, textAlign: 'left' },
          ]}
        >
          Area
        </Text>
        {sizeKeys.map((sizeKey) => (
          <Text
            key={`${variety}-head-${sizeKey}`}
            style={[
              s.tableHeaderText,
              s.tableCellText,
              { width: `${sizeColWidth}%`, textAlign: 'right' },
            ]}
          >
            {sizeKey}
          </Text>
        ))}
        <Text
          style={[
            s.tableHeaderText,
            s.tableCellText,
            { width: `${totalColWidth}%`, textAlign: 'right' },
          ]}
        >
          Total
        </Text>
      </View>

      {rows.map((row, index) => (
        <View
          key={`${variety}-${row.area}`}
          style={[s.tableRow, index % 2 === 0 ? s.rowEven : s.rowOdd]}
          wrap={false}
        >
          <Text
            style={[
              s.tableBodyText,
              s.tableCellText,
              { width: `${labelColWidth}%`, textAlign: 'left' },
            ]}
          >
            {row.area}
          </Text>
          {sizeKeys.map((sizeKey) => (
            <Text
              key={`${variety}-${row.area}-${sizeKey}`}
              style={[
                s.tableBodyText,
                s.tableCellText,
                { width: `${sizeColWidth}%`, textAlign: 'right' },
              ]}
            >
              {formatNumber(Number(row.sizeValues[sizeKey] ?? 0))}
            </Text>
          ))}
          <Text
            style={[
              s.tableBodyText,
              s.tableCellText,
              { width: `${totalColWidth}%`, textAlign: 'right' },
            ]}
          >
            {formatNumber(row.total)}
          </Text>
        </View>
      ))}

      <View style={s.tableTotalsRow} wrap={false}>
        <Text
          style={[
            s.tableTotalsText,
            s.tableCellText,
            { width: `${labelColWidth}%`, textAlign: 'left' },
          ]}
        >
          Bag Total
        </Text>
        {sizeKeys.map((sizeKey) => (
          <Text
            key={`${variety}-footer-${sizeKey}`}
            style={[
              s.tableTotalsText,
              s.tableCellText,
              { width: `${sizeColWidth}%`, textAlign: 'right' },
            ]}
          >
            {formatNumber(footerTotals[sizeKey] ?? 0)}
          </Text>
        ))}
        <Text
          style={[
            s.tableTotalsText,
            s.tableCellText,
            { width: `${totalColWidth}%`, textAlign: 'right' },
          ]}
        >
          {formatNumber(totalBags)}
        </Text>
      </View>
    </View>
  );
}

function Insights({ blocks }: { blocks: VarietyBlock[] }) {
  const totalBags = blocks.reduce((sum, block) => sum + block.totalBags, 0);
  const totalAreas = blocks.reduce((sum, block) => {
    const activeAreas = block.rows.filter((row) => row.total > 0).length;
    return Math.max(sum, activeAreas);
  }, 0);
  const topVariety = blocks.reduce<VarietyBlock | null>(
    (max, block) =>
      max === null || block.totalBags > max.totalBags ? block : max,
    null
  );

  const sortedVarieties = [...blocks].sort((a, b) => b.totalBags - a.totalBags);
  const areaTotals = new Map<string, number>();
  const sizeTotals = new Map<string, number>();

  for (const block of blocks) {
    for (const row of block.rows) {
      if (row.total > 0) {
        areaTotals.set(
          row.area,
          Number(areaTotals.get(row.area) ?? 0) + row.total
        );
      }
      for (const sizeKey of block.sizeKeys) {
        const sizeCount = Number(row.sizeValues[sizeKey] ?? 0);
        if (sizeCount > 0) {
          sizeTotals.set(
            sizeKey,
            Number(sizeTotals.get(sizeKey) ?? 0) + sizeCount
          );
        }
      }
    }
  }

  const sortedAreas = [...areaTotals.entries()]
    .map(([area, bags]) => ({ area, bags }))
    .sort((a, b) => b.bags - a.bags);
  const topArea = sortedAreas[0] ?? null;
  const top3AreaBags = sortedAreas
    .slice(0, 3)
    .reduce((sum, item) => sum + item.bags, 0);
  const top3AreaShare = totalBags > 0 ? (top3AreaBags / totalBags) * 100 : 0;

  const premiumSizeKeys = ['45–50', '50–55', 'Above 50', 'Above 55'];
  const lowSizeKeys = ['Below 30', '30–40', '35–40'];
  const premiumBags = premiumSizeKeys.reduce(
    (sum, key) => sum + Number(sizeTotals.get(key) ?? 0),
    0
  );
  const lowBags = lowSizeKeys.reduce(
    (sum, key) => sum + Number(sizeTotals.get(key) ?? 0),
    0
  );
  const premiumShare = totalBags > 0 ? (premiumBags / totalBags) * 100 : 0;
  const lowShare = totalBags > 0 ? (lowBags / totalBags) * 100 : 0;
  const sortedSizes = [...sizeTotals.entries()]
    .map(([size, bags]) => ({ size, bags }))
    .sort((a, b) => b.bags - a.bags);
  const dominantSize = sortedSizes[0] ?? null;

  return (
    <View style={s.insightsWrap}>
      <View style={s.insightsRule} />
      <Text style={s.insightsHeading}>Overview</Text>
      <View style={s.insightsRule} />
      <Text style={s.insightsText}>
        This report lists area-wise bag totals by size for each variety, with
        bag totals per size and per area.
      </Text>
      <Text style={s.insightsText}>
        Total bags in this report: {formatNumber(totalBags)} across{' '}
        {blocks.length} varieties and up to {formatNumber(totalAreas)} active
        areas.
      </Text>
      <Text style={s.insightsMuted}>
        Highest-contributing variety:{' '}
        {topVariety
          ? `${topVariety.variety} (${formatNumber(topVariety.totalBags)} bags)`
          : '-'}
        .
      </Text>
      <Text style={s.insightsText}>
        Area concentration (risk check): Top 3 areas contribute{' '}
        {top3AreaShare.toFixed(1)}% of total bags
        {topArea ? `, led by ${topArea.area}` : ''}.
      </Text>
      <Text style={s.insightsText}>
        Size-mix health: premium sizes (45+ cut) contribute{' '}
        {premiumShare.toFixed(1)}% vs smaller sizes (&lt;40) at{' '}
        {lowShare.toFixed(1)}%.
      </Text>
      <Text style={s.insightsMuted}>
        Dominant size in overall output:{' '}
        {dominantSize
          ? `${dominantSize.size} (${formatNumber(dominantSize.bags)} bags)`
          : '-'}
        . Use this to align sales and dispatch planning to the strongest grade.
      </Text>

      <Text style={s.insightsSubHeading}>Variety contribution</Text>
      <View style={s.insightsRule} />
      {sortedVarieties.map((item) => {
        const share = totalBags > 0 ? (item.totalBags / totalBags) * 100 : 0;
        return (
          <Text key={`variety-share-${item.variety}`} style={s.insightsText}>
            {item.variety}: {formatNumber(item.totalBags)} bags (
            {share.toFixed(1)}%)
          </Text>
        );
      })}

      <Text style={s.insightsSubHeading}>Area performance snapshot</Text>
      <View style={s.insightsRule} />
      {sortedAreas.slice(0, 5).map((item, index) => {
        const share = totalBags > 0 ? (item.bags / totalBags) * 100 : 0;
        return (
          <Text key={`area-share-${item.area}`} style={s.insightsText}>
            #{index + 1} {item.area}: {formatNumber(item.bags)} bags (
            {share.toFixed(1)}%)
          </Text>
        );
      })}
    </View>
  );
}

export default function GradingAreaBreakdownPdf({
  generatedAt,
  coldStorageName,
  chartData,
  dateRangeLabel,
}: GradingAreaBreakdownPdfProps) {
  const blocks = prepareVarietyBlocks(chartData ?? []).filter(
    (block) => block.sizeKeys.length > 0
  );
  const hasAnyData = blocks.length > 0;

  return (
    <Document
      title="Grading Area-wise Breakdown Report"
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
          <Text style={s.coverLabel}>Grading Area-wise Breakdown Report</Text>
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
            {blocks.map((block) => (
              <VarietyTable
                key={`table-${block.variety}`}
                variety={block.variety}
                sizeKeys={block.sizeKeys}
                rows={block.rows}
                totalBags={block.totalBags}
              />
            ))}
            <Insights blocks={blocks} />
          </>
        ) : (
          <Text style={s.emptyState}>
            No area-wise size distribution data available for the selected
            period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
