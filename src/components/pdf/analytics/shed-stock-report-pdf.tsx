import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { VarietyStockSummary } from '@/services/store-admin/analytics/storage/useGetStorageSummary';
import type {
  ShedStockReportShedTotals,
  ShedStockReportShedVariety,
} from '@/types/analytics';

const ROWS_PER_PAGE = 22;

export interface ShedStockReportPdfProps {
  companyName?: string;
  dateRangeLabel: string;
  grading: {
    title: string;
    subtitle: string;
    stockSummary: VarietyStockSummary[];
    sizes: readonly string[];
  };
  storage: {
    title: string;
    subtitle: string;
    stockSummary: VarietyStockSummary[];
    sizes: readonly string[];
  };
  dispatch: {
    title: string;
    subtitle: string;
    stockSummary: VarietyStockSummary[];
    sizes: readonly string[];
  };
  shed: {
    varieties: readonly ShedStockReportShedVariety[];
    sizes: readonly string[];
    totals: ShedStockReportShedTotals;
  } | null;
}

type VarietySizeRow = {
  variety: string;
  quantities: number[];
  rowTotal: number;
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 48,
    fontFamily: 'Helvetica',
    fontSize: 8,
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
  sectionHeader: {
    marginTop: 8,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 7,
    color: '#444',
    marginTop: 2,
  },
  continued: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyMsg: {
    fontSize: 8,
    color: '#555',
    marginTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
    marginTop: 4,
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
    fontSize: 6,
    width: '100%',
  },
  cellTextBold: {
    fontSize: 6,
    fontWeight: 'bold',
    width: '100%',
  },
  pageHint: {
    fontSize: 7,
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
    fontSize: 8,
    marginBottom: 4,
    lineHeight: 1.35,
    color: '#222',
  },
  summaryLineMuted: {
    fontSize: 7,
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
  summaryCellName: {
    width: '42%',
    paddingHorizontal: 4,
    fontSize: 7,
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellNum: {
    width: '29%',
    paddingHorizontal: 4,
    fontSize: 7,
    textAlign: 'right',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellPct: {
    width: '29%',
    paddingHorizontal: 4,
    fontSize: 7,
    textAlign: 'right',
  },
  summaryEmphasis: {
    fontWeight: 'bold',
  },
  shedTotalsHeader: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 4,
  },
  shedTotalsCellLeft: {
    width: '50%',
    paddingHorizontal: 4,
    fontSize: 7,
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  shedTotalsCellRight: {
    width: '50%',
    paddingHorizontal: 4,
    fontSize: 7,
    textAlign: 'right',
  },
  shedTotalsRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 3,
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

function chunkRows<T>(items: readonly T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push([...items.slice(i, i + size)]);
  }
  return out;
}

function stockSummaryToRows(
  stockSummary: readonly VarietyStockSummary[],
  sizes: readonly string[]
): VarietySizeRow[] {
  return stockSummary.map((v) => {
    const bySize = new Map(
      v.sizes.map((s) => [s.size, s.currentQuantity] as const)
    );
    const quantities = sizes.map((sz) => bySize.get(sz) ?? 0);
    const rowTotal = quantities.reduce((a, b) => a + b, 0);
    return { variety: v.variety, quantities, rowTotal };
  });
}

function columnTotals(
  rows: readonly VarietySizeRow[],
  nSizes: number
): number[] {
  const totals = Array.from({ length: nSizes }, () => 0);
  for (const r of rows) {
    for (let i = 0; i < nSizes; i++) {
      totals[i] += r.quantities[i] ?? 0;
    }
  }
  return totals;
}

type ShedMetric = 'shedStock' | 'gradingInitial' | 'stored' | 'dispatched';

function shedToRows(
  varieties: readonly ShedStockReportShedVariety[],
  sizes: readonly string[],
  metric: ShedMetric
): VarietySizeRow[] {
  return varieties.map((v) => {
    const bySize = new Map(v.sizes.map((s) => [s.size, s] as const));
    const quantities = sizes.map((sz) => {
      const line = bySize.get(sz);
      if (!line) return 0;
      return line[metric];
    });
    const rowTotal = quantities.reduce((a, b) => a + b, 0);
    return { variety: v.variety, quantities, rowTotal };
  });
}

function columnWidthsPct(nSizes: number): {
  variety: string;
  eachSize: string;
  total: string;
} {
  const totalColPct = 10;
  const varietyPct = 16;
  const rest = 100 - varietyPct - totalColPct;
  const each = nSizes > 0 ? rest / nSizes : 0;
  return {
    variety: `${varietyPct}%`,
    eachSize: `${each}%`,
    total: `${totalColPct}%`,
  };
}

function VarietySizeTable({
  sizes,
  rows,
  showFooter,
  colTotals,
  grandTotal,
}: {
  sizes: readonly string[];
  rows: readonly VarietySizeRow[];
  showFooter: boolean;
  colTotals: number[];
  grandTotal: number;
}) {
  const w = columnWidthsPct(sizes.length);
  const empty = sizes.length === 0 || rows.length === 0;

  if (empty) {
    return <Text style={styles.emptyMsg}>No data for this range.</Text>;
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.cellWrap, { width: w.variety, minWidth: 0 }]}>
          <Text style={[styles.cellTextBold, { textAlign: 'left' }]} wrap>
            Variety
          </Text>
        </View>
        {sizes.map((size) => (
          <View
            key={size}
            style={[styles.cellWrap, { width: w.eachSize, minWidth: 0 }]}
          >
            <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
              {size}
            </Text>
          </View>
        ))}
        <View style={[styles.cellWrap, styles.cellLast, { width: w.total }]}>
          <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
            Total
          </Text>
        </View>
      </View>
      {rows.map((row, ri) => (
        <View key={`${row.variety}-${ri}`} style={styles.tableRow}>
          <View style={[styles.cellWrap, { width: w.variety, minWidth: 0 }]}>
            <Text style={[styles.cellText, { textAlign: 'left' }]} wrap>
              {row.variety}
            </Text>
          </View>
          {sizes.map((size, i) => (
            <View
              key={size}
              style={[styles.cellWrap, { width: w.eachSize, minWidth: 0 }]}
            >
              <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
                {row.quantities[i] ? formatIn(row.quantities[i]) : ''}
              </Text>
            </View>
          ))}
          <View style={[styles.cellWrap, styles.cellLast, { width: w.total }]}>
            <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
              {row.rowTotal ? formatIn(row.rowTotal) : ''}
            </Text>
          </View>
        </View>
      ))}
      {showFooter ? (
        <View style={styles.tableFooterRow}>
          <View style={[styles.cellWrap, { width: w.variety, minWidth: 0 }]}>
            <Text style={[styles.cellTextBold, { textAlign: 'left' }]} wrap>
              Total
            </Text>
          </View>
          {sizes.map((size, i) => (
            <View
              key={size}
              style={[styles.cellWrap, { width: w.eachSize, minWidth: 0 }]}
            >
              <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
                {colTotals[i] ? formatIn(colTotals[i]) : ''}
              </Text>
            </View>
          ))}
          <View style={[styles.cellWrap, styles.cellLast, { width: w.total }]}>
            <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
              {formatIn(grandTotal)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

interface SectionPlan {
  key: string;
  title: string;
  subtitle: string;
  sizes: readonly string[];
  allRows: VarietySizeRow[];
  /** Shed metrics: match on-screen footer to API totals. */
  footerGrandTotalOverride?: number;
}

function buildSectionPlans(props: ShedStockReportPdfProps): SectionPlan[] {
  const gRows = stockSummaryToRows(
    props.grading.stockSummary,
    props.grading.sizes
  );
  const sRows = stockSummaryToRows(
    props.storage.stockSummary,
    props.storage.sizes
  );
  const dRows = stockSummaryToRows(
    props.dispatch.stockSummary,
    props.dispatch.sizes
  );

  const plans: SectionPlan[] = [
    {
      key: 'grading',
      title: props.grading.title,
      subtitle: props.grading.subtitle,
      sizes: props.grading.sizes,
      allRows: gRows,
    },
    {
      key: 'storage',
      title: props.storage.title,
      subtitle: props.storage.subtitle,
      sizes: props.storage.sizes,
      allRows: sRows,
    },
    {
      key: 'dispatch',
      title: props.dispatch.title,
      subtitle: props.dispatch.subtitle,
      sizes: props.dispatch.sizes,
      allRows: dRows,
    },
  ];

  if (
    props.shed &&
    props.shed.varieties.length > 0 &&
    props.shed.sizes.length > 0
  ) {
    plans.push({
      key: 'shed-stock',
      title: 'Shed stock',
      subtitle:
        'Bags in shed by variety and size (same as the Shed stock tab on the report).',
      sizes: props.shed.sizes,
      allRows: shedToRows(props.shed.varieties, props.shed.sizes, 'shedStock'),
      footerGrandTotalOverride: props.shed.totals.shedStock,
    });
  }

  return plans;
}

interface SummaryMetrics {
  gradingTotal: number;
  storageTotal: number;
  dispatchTotal: number;
  gradingVarietyCount: number;
  storageVarietyCount: number;
  dispatchVarietyCount: number;
  topGrading: { variety: string; bags: number; pct: string }[];
  shedTotals: ShedStockReportShedTotals | null;
}

function buildSummaryMetrics(props: ShedStockReportPdfProps): SummaryMetrics {
  const gRows = stockSummaryToRows(
    props.grading.stockSummary,
    props.grading.sizes
  );
  const sRows = stockSummaryToRows(
    props.storage.stockSummary,
    props.storage.sizes
  );
  const dRows = stockSummaryToRows(
    props.dispatch.stockSummary,
    props.dispatch.sizes
  );

  const gradingTotal = gRows.reduce((s, r) => s + r.rowTotal, 0);
  const storageTotal = sRows.reduce((s, r) => s + r.rowTotal, 0);
  const dispatchTotal = dRows.reduce((s, r) => s + r.rowTotal, 0);

  const topSorted = [...gRows].sort((a, b) => b.rowTotal - a.rowTotal);
  const topGrading = topSorted.slice(0, 8).map((r) => ({
    variety: r.variety,
    bags: r.rowTotal,
    pct: formatPct(r.rowTotal, gradingTotal),
  }));

  return {
    gradingTotal,
    storageTotal,
    dispatchTotal,
    gradingVarietyCount: gRows.length,
    storageVarietyCount: sRows.length,
    dispatchVarietyCount: dRows.length,
    topGrading,
    shedTotals: props.shed?.totals ?? null,
  };
}

function SummaryPage({
  companyName,
  dateRangeLabel,
  metrics,
  pageNumber,
  totalPages,
}: {
  companyName: string;
  dateRangeLabel: string;
  metrics: SummaryMetrics;
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.summaryPageHeader}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.summaryPageTitle}>Summary</Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        <Text style={[styles.subtitle, { marginTop: 4 }]}>
          Shed stock report — period totals and variety mix
        </Text>
      </View>

      <View style={styles.summarySectionFirst}>
        <Text style={styles.summaryHeading}>Overview</Text>
        <Text style={styles.summaryLine}>
          This report lists bags by variety and size for grading in the selected
          period, storage movements, dispatch, and (when available) shed
          position metrics. Totals below match the sum of bags in each summary
          table.
        </Text>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryHeading}>Bags by section</Text>
        <Text style={styles.summaryLineMuted}>
          Aggregate bags across all varieties in each table.
        </Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            <Text style={styles.summaryCellName}>Section</Text>
            <Text style={styles.summaryCellNum}>Total bags</Text>
            <Text style={styles.summaryCellPct}>Varieties</Text>
          </View>
          <View style={styles.summaryTableRow}>
            <Text style={styles.summaryCellName} wrap>
              Grading summary
            </Text>
            <Text style={styles.summaryCellNum} wrap>
              {formatIn(metrics.gradingTotal)}
            </Text>
            <Text style={styles.summaryCellPct} wrap>
              {formatIn(metrics.gradingVarietyCount)}
            </Text>
          </View>
          <View style={styles.summaryTableRow}>
            <Text style={styles.summaryCellName} wrap>
              Storage
            </Text>
            <Text style={styles.summaryCellNum} wrap>
              {formatIn(metrics.storageTotal)}
            </Text>
            <Text style={styles.summaryCellPct} wrap>
              {formatIn(metrics.storageVarietyCount)}
            </Text>
          </View>
          <View style={styles.summaryTableRow}>
            <Text style={styles.summaryCellName} wrap>
              Dispatch
            </Text>
            <Text style={styles.summaryCellNum} wrap>
              {formatIn(metrics.dispatchTotal)}
            </Text>
            <Text style={styles.summaryCellPct} wrap>
              {formatIn(metrics.dispatchVarietyCount)}
            </Text>
          </View>
        </View>
      </View>

      {metrics.shedTotals ? (
        <View style={styles.summarySection}>
          <Text style={styles.summaryHeading}>
            Shed totals (reporting view)
          </Text>
          <Text style={styles.summaryLineMuted}>
            Grand totals from the shed metrics block (all varieties).
          </Text>
          <View style={styles.summaryTable}>
            <View style={styles.shedTotalsHeader}>
              <Text style={styles.shedTotalsCellLeft}>Metric</Text>
              <Text style={styles.shedTotalsCellRight}>Bags</Text>
            </View>
            <View style={styles.shedTotalsRow}>
              <Text style={styles.shedTotalsCellLeft} wrap>
                Shed stock
              </Text>
              <Text style={styles.shedTotalsCellRight} wrap>
                {formatIn(metrics.shedTotals.shedStock)}
              </Text>
            </View>
            <View style={styles.shedTotalsRow}>
              <Text style={styles.shedTotalsCellLeft} wrap>
                Grading initial
              </Text>
              <Text style={styles.shedTotalsCellRight} wrap>
                {formatIn(metrics.shedTotals.gradingInitial)}
              </Text>
            </View>
            <View style={styles.shedTotalsRow}>
              <Text style={styles.shedTotalsCellLeft} wrap>
                Stored
              </Text>
              <Text style={styles.shedTotalsCellRight} wrap>
                {formatIn(metrics.shedTotals.stored)}
              </Text>
            </View>
            <View style={styles.shedTotalsRow}>
              <Text style={styles.shedTotalsCellLeft} wrap>
                Dispatched
              </Text>
              <Text style={styles.shedTotalsCellRight} wrap>
                {formatIn(metrics.shedTotals.dispatched)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {metrics.gradingTotal > 0 && metrics.topGrading.length > 0 ? (
        <View style={styles.summarySection}>
          <Text style={styles.summaryHeading}>
            Grading summary — variety mix
          </Text>
          <Text style={styles.summaryLineMuted}>
            Share of total grading bags by variety (top varieties in this
            report).
          </Text>
          <View style={styles.summaryTable}>
            <View style={styles.summaryTableHeader}>
              <Text style={styles.summaryCellName}>Variety</Text>
              <Text style={styles.summaryCellNum}>Bags</Text>
              <Text style={styles.summaryCellPct}>Share</Text>
            </View>
            {metrics.topGrading.map((row) => (
              <View key={row.variety} style={styles.summaryTableRow}>
                <Text style={styles.summaryCellName} wrap>
                  {row.variety}
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
      ) : null}

      {metrics.gradingTotal > 0 &&
      metrics.storageTotal + metrics.dispatchTotal > 0 ? (
        <View style={styles.summarySection}>
          <Text style={styles.summaryHeading}>Flow note</Text>
          <Text style={styles.summaryLine}>
            Grading bags in period:{' '}
            <Text style={styles.summaryEmphasis}>
              {formatIn(metrics.gradingTotal)}
            </Text>
            . Storage movements:{' '}
            <Text style={styles.summaryEmphasis}>
              {formatIn(metrics.storageTotal)}
            </Text>
            . Dispatch:{' '}
            <Text style={styles.summaryEmphasis}>
              {formatIn(metrics.dispatchTotal)}
            </Text>
            .
          </Text>
        </View>
      ) : null}

      {totalPages > 1 ? (
        <Text style={styles.pageHint}>
          Page {pageNumber} of {totalPages}
        </Text>
      ) : null}
    </Page>
  );
}

export function ShedStockReportPdf(props: ShedStockReportPdfProps) {
  const company = props.companyName || 'Cold Storage';
  const plans = buildSectionPlans(props);
  const summaryMetrics = buildSummaryMetrics(props);

  type PageDesc = {
    key: string;
    plan: SectionPlan;
    chunk: VarietySizeRow[];
    chunkIndex: number;
    chunkCount: number;
    isFirstDocPage: boolean;
  };

  const pageDescs: PageDesc[] = [];
  let isFirst = true;
  for (const plan of plans) {
    const chunks =
      plan.allRows.length === 0
        ? [[] as VarietySizeRow[]]
        : chunkRows(plan.allRows, ROWS_PER_PAGE);
    chunks.forEach((chunk, chunkIndex) => {
      pageDescs.push({
        key: `${plan.key}-${chunkIndex}`,
        plan,
        chunk,
        chunkIndex,
        chunkCount: chunks.length,
        isFirstDocPage: isFirst,
      });
      isFirst = false;
    });
  }

  const dataPageCount = pageDescs.length;
  const totalPages = dataPageCount + 1;

  const colTotalsFor = (plan: SectionPlan) =>
    columnTotals(plan.allRows, plan.sizes.length);
  const grandTotalFor = (plan: SectionPlan) =>
    plan.allRows.reduce((s, r) => s + r.rowTotal, 0);

  return (
    <Document>
      {pageDescs.map((pd, idx) => {
        const colTotals = colTotalsFor(pd.plan);
        const summedGrand = grandTotalFor(pd.plan);
        const grandTotal = pd.plan.footerGrandTotalOverride ?? summedGrand;
        const isLastChunk = pd.chunkIndex === pd.chunkCount - 1;
        const showFooter =
          pd.plan.allRows.length > 0 && pd.plan.sizes.length > 0 && isLastChunk;

        return (
          <Page key={pd.key} size="A4" style={styles.page}>
            {pd.isFirstDocPage ? (
              <View style={styles.header}>
                <Text style={styles.companyName}>{company}</Text>
                <Text style={styles.reportTitle}>Shed stock report</Text>
                <Text style={styles.dateRange}>{props.dateRangeLabel}</Text>
              </View>
            ) : (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.reportTitle}>
                  Shed stock report (continued)
                </Text>
                <Text style={styles.dateRange}>{props.dateRangeLabel}</Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{pd.plan.title}</Text>
              {pd.chunkIndex > 0 ? (
                <Text style={styles.sectionSubtitle}>
                  (continued, page {pd.chunkIndex + 1} of {pd.chunkCount})
                </Text>
              ) : (
                <Text style={styles.sectionSubtitle}>{pd.plan.subtitle}</Text>
              )}
            </View>

            <VarietySizeTable
              sizes={pd.plan.sizes}
              rows={pd.chunk}
              showFooter={showFooter}
              colTotals={colTotals}
              grandTotal={grandTotal}
            />

            {totalPages > 1 ? (
              <Text style={styles.pageHint}>
                Page {idx + 1} of {totalPages}
              </Text>
            ) : null}
          </Page>
        );
      })}

      <SummaryPage
        companyName={company}
        dateRangeLabel={props.dateRangeLabel}
        metrics={summaryMetrics}
        pageNumber={totalPages}
        totalPages={totalPages}
      />
    </Document>
  );
}
