import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export type IncomingStockTrendGranularity = 'daily' | 'monthly';

export interface IncomingStockTrendTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  /** Daily or monthly breakdown (matches analytics UI tab). */
  granularity: IncomingStockTrendGranularity;
  /** Location column headers (same order as each row's `bags`). */
  locations: readonly string[];
  /** One row per period; `bags[i]` aligns with `locations[i]`. */
  rows: ReadonlyArray<{
    periodLabel: string;
    bags: readonly number[];
    total: number;
  }>;
  /** Footer "Bag total" row: per-location sums and grand total. */
  footer: {
    bags: readonly number[];
    total: number;
  };
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 6,
    marginBottom: 10,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 9,
    marginBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
    marginTop: 6,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 3,
  },
  tableFooterRow: {
    flexDirection: 'row',
    backgroundColor: '#D0D0D0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 4,
  },
  cellWrap: {
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    justifyContent: 'center',
    paddingHorizontal: 2,
    minWidth: 0,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellText: {
    fontSize: 10,
    width: '100%',
  },
  cellTextBold: {
    fontSize: 10,
    fontWeight: 'bold',
    width: '100%',
  },
  pageHint: {
    fontSize: 9,
    color: '#555',
    textAlign: 'right',
    marginTop: 8,
  },
  summaryPageHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryPageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summarySection: {
    marginTop: 10,
  },
  summarySectionFirst: {
    marginTop: 0,
  },
  summaryHeading: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
  },
  summaryLine: {
    fontSize: 10,
    marginBottom: 4,
    lineHeight: 1.35,
    color: '#222',
  },
  summaryLineMuted: {
    fontSize: 9,
    marginBottom: 3,
    color: '#444',
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
    marginTop: 4,
  },
  summaryTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 4,
  },
  summaryTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 3,
  },
  summaryCellLoc: {
    width: '42%',
    paddingHorizontal: 4,
    fontSize: 9,
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellNum: {
    width: '29%',
    paddingHorizontal: 4,
    fontSize: 9,
    textAlign: 'right',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellPct: {
    width: '29%',
    paddingHorizontal: 4,
    fontSize: 9,
    textAlign: 'right',
  },
  summaryEmphasis: {
    fontWeight: 'bold',
  },
});

function formatIn(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatPct(part: number, whole: number): string {
  if (whole <= 0 || !Number.isFinite(part)) return '—';
  const p = (100 * part) / whole;
  if (!Number.isFinite(p)) return '—';
  return `${p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%`;
}

interface SummaryMetrics {
  periodNoun: string;
  periodNounPlural: string;
  totalBags: number;
  rowCount: number;
  periodsWithReceipts: number;
  avgPerRow: number;
  avgPerActiveRow: number;
  busiestLabel: string;
  busiestTotal: number;
  locationBreakdown: ReadonlyArray<{
    name: string;
    bags: number;
    pct: string;
  }>;
}

function buildSummaryMetrics(
  granularity: IncomingStockTrendGranularity,
  locations: readonly string[],
  rows: ReadonlyArray<{
    periodLabel: string;
    bags: readonly number[];
    total: number;
  }>,
  footer: IncomingStockTrendTablePdfProps['footer']
): SummaryMetrics {
  const periodNoun = granularity === 'daily' ? 'day' : 'month';
  const periodNounPlural = granularity === 'daily' ? 'days' : 'months';
  const totalBags = footer.total;
  const rowCount = rows.length;
  const periodsWithReceipts = rows.filter((r) => r.total > 0).length;
  const avgPerRow = rowCount > 0 ? totalBags / rowCount : 0;
  const avgPerActiveRow =
    periodsWithReceipts > 0 ? totalBags / periodsWithReceipts : 0;

  let busiestLabel = '—';
  let busiestTotal = 0;
  for (const r of rows) {
    if (r.total > busiestTotal) {
      busiestTotal = r.total;
      busiestLabel = r.periodLabel;
    }
  }

  const locationBreakdown = locations
    .map((name, i) => ({
      name,
      bags: footer.bags[i] ?? 0,
      pct: formatPct(footer.bags[i] ?? 0, totalBags),
    }))
    .sort((a, b) => b.bags - a.bags);

  return {
    periodNoun,
    periodNounPlural,
    totalBags,
    rowCount,
    periodsWithReceipts,
    avgPerRow,
    avgPerActiveRow,
    busiestLabel,
    busiestTotal,
    locationBreakdown,
  };
}

function SummaryPage({
  companyName,
  dateRangeLabel,
  granularity,
  metrics,
  pageNumber,
  totalPages,
}: {
  companyName: string;
  dateRangeLabel: string;
  granularity: IncomingStockTrendGranularity;
  metrics: SummaryMetrics;
  pageNumber: number;
  totalPages: number;
}) {
  const scopeLine =
    granularity === 'daily'
      ? 'This report lists incoming bags by receiving location for each day in the range, then totals by location.'
      : 'This report lists incoming bags by receiving location for each month in the range, then totals by location.';

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.summaryPageHeader}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.summaryPageTitle}>Summary</Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        <Text style={[styles.subtitle, { marginTop: 4 }]}>
          Incoming stock trend ({granularity === 'daily' ? 'daily' : 'monthly'}{' '}
          view)
        </Text>
      </View>

      <View style={styles.summarySectionFirst}>
        <Text style={styles.summaryHeading}>Overview</Text>
        <Text style={styles.summaryLine}>{scopeLine}</Text>
        <Text style={styles.summaryLine}>
          Total bags received in this report:{' '}
          <Text style={styles.summaryEmphasis}>
            {formatIn(metrics.totalBags)}
          </Text>
          , across{' '}
          <Text style={styles.summaryEmphasis}>
            {metrics.locationBreakdown.length}
          </Text>{' '}
          location
          {metrics.locationBreakdown.length === 1 ? '' : 's'} and{' '}
          <Text style={styles.summaryEmphasis}>{metrics.rowCount}</Text>{' '}
          {metrics.periodNounPlural} in the table.
        </Text>
        <Text style={styles.summaryLineMuted}>
          {metrics.periodsWithReceipts} of {metrics.rowCount}{' '}
          {metrics.periodNounPlural} show a non-zero total. Average bags per{' '}
          {metrics.periodNoun} (all rows):{' '}
          {formatIn(Math.round(metrics.avgPerRow))}.
          {metrics.periodsWithReceipts > 0
            ? ` Among ${metrics.periodNounPlural} with receipts only: ${formatIn(
                Math.round(metrics.avgPerActiveRow)
              )} bags per ${metrics.periodNoun}.`
            : ''}
        </Text>
        {metrics.busiestTotal > 0 ? (
          <Text style={styles.summaryLine}>
            Busiest {metrics.periodNoun}:{' '}
            <Text style={styles.summaryEmphasis}>{metrics.busiestLabel}</Text> (
            {formatIn(metrics.busiestTotal)} bags).
          </Text>
        ) : null}
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryHeading}>Bags by location</Text>
        <Text style={styles.summaryLineMuted}>
          Share of total incoming bags attributed to each location (matches the
          &quot;Bag total&quot; row in the table).
        </Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            <Text style={styles.summaryCellLoc}>Location</Text>
            <Text style={styles.summaryCellNum}>Bags</Text>
            <Text style={styles.summaryCellPct}>Share</Text>
          </View>
          {metrics.locationBreakdown.map((row) => (
            <View key={row.name} style={styles.summaryTableRow}>
              <Text style={styles.summaryCellLoc} wrap>
                {row.name}
              </Text>
              <Text style={styles.summaryCellNum} wrap>
                {formatIn(row.bags)}
              </Text>
              <Text style={styles.summaryCellPct} wrap>
                {row.pct}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {totalPages > 1 ? (
        <Text style={styles.pageHint}>
          Page {pageNumber} of {totalPages}
        </Text>
      ) : null}
    </Page>
  );
}

function ReportHeader({
  companyName,
  dateRangeLabel,
  granularity,
}: {
  companyName: string;
  dateRangeLabel: string;
  granularity: IncomingStockTrendGranularity;
}) {
  const subtitle =
    granularity === 'daily'
      ? 'Daily bags received by location'
      : 'Monthly bags received by location';
  return (
    <View style={styles.header}>
      <Text style={styles.companyName}>{companyName}</Text>
      <Text style={styles.reportTitle}>Incoming stock trend</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.dateRange}>{dateRangeLabel}</Text>
    </View>
  );
}

function columnWidthsPct(locCount: number): {
  period: string;
  eachLoc: string;
  total: string;
} {
  if (locCount <= 0) {
    return { period: '70%', eachLoc: '0%', total: '30%' };
  }
  const totalCol = 11;
  const periodBase = Math.min(26, Math.max(16, 14 + Math.min(locCount, 4) * 2));
  const locEach = (100 - periodBase - totalCol) / locCount;
  return {
    period: `${periodBase}%`,
    eachLoc: `${locEach}%`,
    total: `${totalCol}%`,
  };
}

interface TrendTableBlockProps {
  periodColumnLabel: string;
  locations: readonly string[];
  rows: ReadonlyArray<{
    periodLabel: string;
    bags: readonly number[];
    total: number;
  }>;
  footer: IncomingStockTrendTablePdfProps['footer'];
  showFooter: boolean;
}

function TrendTableBlock({
  periodColumnLabel,
  locations,
  rows,
  footer,
  showFooter,
}: TrendTableBlockProps) {
  const w = columnWidthsPct(locations.length);
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.cellWrap, { width: w.period, minWidth: 0 }]}>
          <Text style={[styles.cellText, { textAlign: 'left' }]} wrap>
            {periodColumnLabel}
          </Text>
        </View>
        {locations.map((loc) => (
          <View
            key={loc}
            style={[styles.cellWrap, { width: w.eachLoc, minWidth: 0 }]}
          >
            <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
              {loc}
            </Text>
          </View>
        ))}
        <View style={[styles.cellWrap, styles.cellLast, { width: w.total }]}>
          <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
            Total
          </Text>
        </View>
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.tableRow}>
          <View style={[styles.cellWrap, { width: w.period, minWidth: 0 }]}>
            <Text style={[styles.cellText, { textAlign: 'left' }]} wrap>
              {row.periodLabel}
            </Text>
          </View>
          {locations.map((loc, i) => (
            <View
              key={loc}
              style={[styles.cellWrap, { width: w.eachLoc, minWidth: 0 }]}
            >
              <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
                {formatIn(row.bags[i] ?? 0)}
              </Text>
            </View>
          ))}
          <View style={[styles.cellWrap, styles.cellLast, { width: w.total }]}>
            <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
              {formatIn(row.total)}
            </Text>
          </View>
        </View>
      ))}
      {showFooter ? (
        <View style={styles.tableFooterRow}>
          <View style={[styles.cellWrap, { width: w.period, minWidth: 0 }]}>
            <Text style={[styles.cellTextBold, { textAlign: 'left' }]} wrap>
              Bag total
            </Text>
          </View>
          {locations.map((loc, i) => (
            <View
              key={loc}
              style={[styles.cellWrap, { width: w.eachLoc, minWidth: 0 }]}
            >
              <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
                {formatIn(footer.bags[i] ?? 0)}
              </Text>
            </View>
          ))}
          <View style={[styles.cellWrap, styles.cellLast, { width: w.total }]}>
            <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
              {formatIn(footer.total)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const ROWS_PER_PAGE = 32;

function chunkRows<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push([...items.slice(i, i + size)]);
  }
  return out;
}

export function IncomingStockTrendTablePdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  granularity,
  locations,
  rows,
  footer,
}: IncomingStockTrendTablePdfProps) {
  const periodColumnLabel = granularity === 'daily' ? 'Date' : 'Month';
  const chunks = rows.length === 0 ? [[]] : chunkRows(rows, ROWS_PER_PAGE);
  const company = companyName || 'Cold Storage';
  const tablePageCount = chunks.length;
  const summaryMetrics =
    rows.length > 0
      ? buildSummaryMetrics(granularity, locations, rows, footer)
      : null;
  const totalPages = rows.length > 0 ? tablePageCount + 1 : tablePageCount;

  return (
    <Document>
      {chunks.map((chunk, pageIndex) => (
        <Page
          key={pageIndex}
          size="A4"
          style={styles.page}
          orientation="landscape"
        >
          {pageIndex === 0 ? (
            <ReportHeader
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              granularity={granularity}
            />
          ) : (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.reportTitle}>
                Incoming stock trend (continued)
              </Text>
              <Text style={styles.dateRange}>{dateRangeLabel}</Text>
            </View>
          )}
          <TrendTableBlock
            periodColumnLabel={periodColumnLabel}
            locations={locations}
            rows={chunk}
            footer={footer}
            showFooter={pageIndex === chunks.length - 1 && rows.length > 0}
          />
          {totalPages > 1 ? (
            <Text style={styles.pageHint}>
              Page {pageIndex + 1} of {totalPages}
            </Text>
          ) : null}
        </Page>
      ))}
      {summaryMetrics ? (
        <SummaryPage
          companyName={company}
          dateRangeLabel={dateRangeLabel}
          granularity={granularity}
          metrics={summaryMetrics}
          pageNumber={totalPages}
          totalPages={totalPages}
        />
      ) : null}
    </Document>
  );
}
