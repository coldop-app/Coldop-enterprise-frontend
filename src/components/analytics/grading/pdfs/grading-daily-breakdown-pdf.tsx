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
  GradingTrendData,
  MonthlyTrendChartItem,
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
    marginTop: 24,
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
    marginTop: 22,
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
    marginTop: 16,
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
  insightsTable: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: C.rule,
  },
  insightsTableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
    backgroundColor: C.headerBg,
    borderTopWidth: 2,
    borderTopColor: C.primary,
  },
  insightsTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: C.rule,
  },
  insightsTableLastRow: {
    borderBottomWidth: 0,
  },
  insightsCell: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9.5,
    color: C.textStrong,
  },
  insightsCellHeader: {
    fontSize: 9.5,
    color: C.muted,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

type TrendPoint = { key: string; label: string; total: number };
type TrendRow = {
  key: string;
  label: string;
  perGrader: Record<string, number>;
  total: number;
};

type GradingDailyBreakdownPdfProps = {
  generatedAt: string;
  coldStorageName: string;
  trendData: GradingTrendData;
  dateRangeLabel?: string;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function createDailyRows(
  chartData: GradingTrendData['daily']['chartData']
): TrendRow[] {
  const dates = new Set<string>();
  for (const series of chartData) {
    for (const point of series.dataPoints) dates.add(point.date);
  }

  return [...dates].sort().map((date) => {
    const perGrader: Record<string, number> = {};
    let total = 0;

    for (const series of chartData) {
      const match = series.dataPoints.find((point) => point.date === date);
      const bags = Number(match?.bags ?? 0);
      perGrader[series.grader] = bags;
      total += bags;
    }

    return {
      key: date,
      label: formatDateLabel(date),
      perGrader,
      total,
    };
  });
}

function createMonthlyRows(
  chartData: GradingTrendData['monthly']['chartData']
): TrendRow[] {
  const monthMap = new Map<string, MonthlyTrendChartItem>();
  for (const series of chartData) {
    for (const point of series.dataPoints) {
      if (!monthMap.has(point.month)) monthMap.set(point.month, point);
    }
  }

  return [...monthMap.keys()].sort().map((month) => {
    const monthLabel = monthMap.get(month)?.monthLabel ?? month;
    const perGrader: Record<string, number> = {};
    let total = 0;

    for (const series of chartData) {
      const match = series.dataPoints.find((point) => point.month === month);
      const bags = Number(match?.bags ?? 0);
      perGrader[series.grader] = bags;
      total += bags;
    }

    return {
      key: month,
      label: monthLabel,
      perGrader,
      total,
    };
  });
}

function createTotals(rows: TrendRow[], graders: string[]): TrendPoint[] {
  return graders.map((grader) => ({
    key: grader,
    label: grader,
    total: rows.reduce(
      (sum, row) => sum + Number(row.perGrader[grader] ?? 0),
      0
    ),
  }));
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function buildInsights(rows: TrendRow[], graders: string[]) {
  const totalBags = rows.reduce((sum, row) => sum + row.total, 0);
  const totalDays = rows.length;
  const nonZeroRows = rows.filter((row) => row.total > 0);
  const nonZeroDays = nonZeroRows.length;
  const avgPerDay = totalDays > 0 ? totalBags / totalDays : 0;
  const avgActiveDay = nonZeroDays > 0 ? totalBags / nonZeroDays : 0;
  const busiest = rows.reduce<TrendRow | null>(
    (max, row) => (max === null || row.total > max.total ? row : max),
    null
  );

  const byGrader = createTotals(rows, graders)
    .map((item) => ({
      ...item,
      share: totalBags > 0 ? (item.total / totalBags) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalBags,
    totalDays,
    graderCount: graders.length,
    nonZeroDays,
    avgPerDay,
    avgActiveDay,
    busiest,
    byGrader,
  };
}

function TrendTable({
  title,
  labelHeader,
  rows,
  graders,
}: {
  title: string;
  labelHeader: string;
  rows: TrendRow[];
  graders: string[];
}) {
  const totals = createTotals(rows, graders);
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  const labelColWidth = 18;
  const totalColWidth = 12;
  const graderColWidth = graders.length
    ? (100 - labelColWidth - totalColWidth) / graders.length
    : 70;

  return (
    <View style={s.sectionWrap}>
      <Text style={s.sectionTitle}>{title}</Text>

      <View style={s.tableHeaderRow}>
        <Text
          style={[
            s.tableHeaderText,
            s.tableCellText,
            { width: `${labelColWidth}%`, textAlign: 'left' },
          ]}
        >
          {labelHeader}
        </Text>
        {graders.map((grader) => (
          <Text
            key={`${title}-header-${grader}`}
            style={[
              s.tableHeaderText,
              s.tableCellText,
              { width: `${graderColWidth}%`, textAlign: 'right' },
            ]}
          >
            {grader}
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
          key={`${title}-row-${row.key}`}
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
            {row.label}
          </Text>
          {graders.map((grader) => (
            <Text
              key={`${title}-${row.key}-${grader}`}
              style={[
                s.tableBodyText,
                s.tableCellText,
                { width: `${graderColWidth}%`, textAlign: 'right' },
              ]}
            >
              {formatNumber(Number(row.perGrader[grader] ?? 0))}
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
        {totals.map((item) => (
          <Text
            key={`${title}-total-${item.key}`}
            style={[
              s.tableTotalsText,
              s.tableCellText,
              { width: `${graderColWidth}%`, textAlign: 'right' },
            ]}
          >
            {formatNumber(item.total)}
          </Text>
        ))}
        <Text
          style={[
            s.tableTotalsText,
            s.tableCellText,
            { width: `${totalColWidth}%`, textAlign: 'right' },
          ]}
        >
          {formatNumber(grandTotal)}
        </Text>
      </View>
    </View>
  );
}

function InsightsSection({
  dailyRows,
  dailyGraders,
}: {
  dailyRows: TrendRow[];
  dailyGraders: string[];
}) {
  const insights = buildInsights(dailyRows, dailyGraders);

  return (
    <View style={s.insightsWrap}>
      <View style={s.insightsRule} />
      <Text style={s.insightsHeading}>Overview</Text>
      <View style={s.insightsRule} />

      <Text style={s.insightsText}>
        This report lists graded bags by grader for each day in the range, then
        totals by grader.
      </Text>
      <Text style={s.insightsText}>
        Total bags graded in this report: {formatNumber(insights.totalBags)},
        across {insights.graderCount} graders and {insights.totalDays} days in
        the table.
      </Text>
      <Text style={s.insightsMuted}>
        {insights.nonZeroDays} of {insights.totalDays} days show a non-zero
        total. Average bags per day (all rows):{' '}
        {formatNumber(Math.round(insights.avgPerDay))}. Among days with grading
        only: {formatNumber(Math.round(insights.avgActiveDay))} bags per day.
      </Text>
      <Text style={s.insightsText}>
        Busiest day:{' '}
        {insights.busiest
          ? `${insights.busiest.label} (${formatNumber(insights.busiest.total)} bags)`
          : '-'}
        .
      </Text>

      <Text style={s.insightsSubHeading}>Bags by grader</Text>
      <View style={s.insightsRule} />
      <Text style={s.insightsMuted}>
        Share of total graded bags attributed to each grader (matches the “Bag
        total” row in the table).
      </Text>

      <View style={s.insightsTable}>
        <View style={s.insightsTableHeaderRow}>
          <Text
            style={[s.insightsCell, s.insightsCellHeader, { width: '58%' }]}
          >
            Grader
          </Text>
          <Text
            style={[
              s.insightsCell,
              s.insightsCellHeader,
              { width: '22%', textAlign: 'right' },
            ]}
          >
            Bags
          </Text>
          <Text
            style={[
              s.insightsCell,
              s.insightsCellHeader,
              { width: '20%', textAlign: 'right' },
            ]}
          >
            Share
          </Text>
        </View>

        {insights.byGrader.map((item, index) => (
          <View
            key={`insight-grader-${item.key}`}
            style={[
              s.insightsTableRow,
              ...(index === insights.byGrader.length - 1
                ? [s.insightsTableLastRow]
                : []),
            ]}
          >
            <Text style={[s.insightsCell, { width: '58%' }]}>{item.label}</Text>
            <Text
              style={[s.insightsCell, { width: '22%', textAlign: 'right' }]}
            >
              {formatNumber(item.total)}
            </Text>
            <Text
              style={[s.insightsCell, { width: '20%', textAlign: 'right' }]}
            >
              {formatPercentage(item.share)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function GradingDailyBreakdownPdf({
  generatedAt,
  coldStorageName,
  trendData,
  dateRangeLabel,
}: GradingDailyBreakdownPdfProps) {
  const dailySeries = trendData.daily?.chartData ?? [];
  const monthlySeries = trendData.monthly?.chartData ?? [];

  const dailyGraders = dailySeries.map((series) => series.grader);
  const monthlyGraders = monthlySeries.map((series) => series.grader);

  const dailyRows = createDailyRows(dailySeries);
  const monthlyRows = createMonthlyRows(monthlySeries);

  const hasAnyData = dailyRows.length > 0 || monthlyRows.length > 0;

  return (
    <Document
      title="Grading Daily Breakdown Report"
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
          <Text style={s.coverLabel}>Grading Daily Breakdown Report</Text>
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
            {dailyRows.length > 0 ? (
              <TrendTable
                title="Daily Activity"
                labelHeader="Date"
                rows={dailyRows}
                graders={dailyGraders}
              />
            ) : null}

            {monthlyRows.length > 0 ? (
              <TrendTable
                title="Monthly Activity"
                labelHeader="Month"
                rows={monthlyRows}
                graders={monthlyGraders}
              />
            ) : null}

            {dailyRows.length > 0 ? (
              <InsightsSection
                dailyRows={dailyRows}
                dailyGraders={dailyGraders}
              />
            ) : null}
          </>
        ) : (
          <Text style={s.emptyState}>
            No daily or monthly data available for the selected period.
          </Text>
        )}
      </Page>
    </Document>
  );
}
