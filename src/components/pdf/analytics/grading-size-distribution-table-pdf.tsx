import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface GradingSizeDistributionRow {
  sizeName: string;
  bags: number;
  weightKg: number;
  pctVariety: number;
}

export interface GradingSizeDistributionTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  /** Variety tab label (e.g. crop name). */
  variety: string;
  rows: readonly GradingSizeDistributionRow[];
  totalBags: number;
  totalWeightKg: number;
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
    fontSize: 10,
    marginBottom: 4,
    color: '#333',
  },
  dateRange: {
    fontSize: 9,
    marginBottom: 4,
  },
  varietyLine: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 8,
    textAlign: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
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
    paddingHorizontal: 3,
    minWidth: 0,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellText: {
    fontSize: 9,
    width: '100%',
  },
  cellTextBold: {
    fontSize: 9,
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
    marginTop: 6,
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
  sumColSize: {
    width: '40%',
    paddingHorizontal: 4,
    fontSize: 9,
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  sumColMid: {
    width: '20%',
    paddingHorizontal: 4,
    fontSize: 9,
    textAlign: 'right',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  sumColPct: {
    width: '20%',
    paddingHorizontal: 4,
    fontSize: 9,
    textAlign: 'right',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  sumColRank: {
    width: '20%',
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

function formatKg(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatPct1(value: number): string {
  return `${value.toFixed(1)}%`;
}

function MainTable({
  rows,
  totalBags,
  totalWeightKg,
}: {
  rows: readonly GradingSizeDistributionRow[];
  totalBags: number;
  totalWeightKg: number;
}) {
  const colSize = '28%';
  const colBags = '18%';
  const colKg = '27%';
  const colPct = '27%';
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.cellWrap, { width: colSize }]}>
          <Text style={[styles.cellText, { textAlign: 'left' }]} wrap>
            Size
          </Text>
        </View>
        <View style={[styles.cellWrap, { width: colBags }]}>
          <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
            Bags
          </Text>
        </View>
        <View style={[styles.cellWrap, { width: colKg }]}>
          <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
            Weight (kg)
          </Text>
        </View>
        <View style={[styles.cellWrap, styles.cellLast, { width: colPct }]}>
          <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
            % of variety
          </Text>
        </View>
      </View>
      {rows.map((row) => (
        <View key={row.sizeName} style={styles.tableRow}>
          <View style={[styles.cellWrap, { width: colSize }]}>
            <Text style={[styles.cellText, { textAlign: 'left' }]} wrap>
              {row.sizeName}
            </Text>
          </View>
          <View style={[styles.cellWrap, { width: colBags }]}>
            <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
              {formatIn(row.bags)}
            </Text>
          </View>
          <View style={[styles.cellWrap, { width: colKg }]}>
            <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
              {formatKg(row.weightKg)}
            </Text>
          </View>
          <View style={[styles.cellWrap, styles.cellLast, { width: colPct }]}>
            <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
              {formatPct1(row.pctVariety)}
            </Text>
          </View>
        </View>
      ))}
      <View style={styles.tableFooterRow}>
        <View style={[styles.cellWrap, { width: colSize }]}>
          <Text style={[styles.cellTextBold, { textAlign: 'left' }]} wrap>
            Total
          </Text>
        </View>
        <View style={[styles.cellWrap, { width: colBags }]}>
          <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
            {formatIn(totalBags)}
          </Text>
        </View>
        <View style={[styles.cellWrap, { width: colKg }]}>
          <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
            {formatKg(totalWeightKg)}
          </Text>
        </View>
        <View style={[styles.cellWrap, styles.cellLast, { width: colPct }]}>
          <Text style={[styles.cellTextBold, { textAlign: 'right' }]} wrap>
            100.0%
          </Text>
        </View>
      </View>
    </View>
  );
}

function SummaryPage({
  companyName,
  dateRangeLabel,
  variety,
  rows,
  totalBags,
  totalWeightKg,
}: {
  companyName: string;
  dateRangeLabel: string;
  variety: string;
  rows: readonly GradingSizeDistributionRow[];
  totalBags: number;
  totalWeightKg: number;
}) {
  const sorted = [...rows].sort((a, b) => b.pctVariety - a.pctVariety);
  const top = sorted[0];
  const nSizes = rows.length;
  const bagsTop3 = sorted
    .slice(0, 3)
    .map((r) => `${r.sizeName} (${formatPct1(r.pctVariety)})`)
    .join(', ');

  const ranked = sorted.map((r, i) => ({
    ...r,
    rank: i + 1,
  }));

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.summaryPageHeader}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.summaryPageTitle}>Summary</Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        <Text style={[styles.subtitle, { marginTop: 4 }]}>
          Size-wise distribution · {variety}
        </Text>
      </View>

      <Text style={styles.summaryHeading}>Overview</Text>
      <Text style={styles.summaryLine}>
        Graded output for variety{' '}
        <Text style={styles.summaryEmphasis}>{variety}</Text> totals{' '}
        <Text style={styles.summaryEmphasis}>{formatIn(totalBags)}</Text> bags
        and{' '}
        <Text style={styles.summaryEmphasis}>{formatKg(totalWeightKg)}</Text> kg
        net weight across <Text style={styles.summaryEmphasis}>{nSizes}</Text>{' '}
        size {nSizes === 1 ? 'band' : 'bands'} (Bardana excluded per analytics
        screen).
      </Text>
      {top && totalBags > 0 ? (
        <Text style={styles.summaryLine}>
          Largest share by weight:{' '}
          <Text style={styles.summaryEmphasis}>{top.sizeName}</Text> at{' '}
          {formatPct1(top.pctVariety)} of variety weight (
          {formatKg(top.weightKg)} kg, {formatIn(top.bags)} bags).
        </Text>
      ) : null}
      <Text style={styles.summaryLineMuted}>
        Top three bands by % of variety: {bagsTop3 || '—'}.
      </Text>

      <Text style={[styles.summaryHeading, { marginTop: 12 }]}>
        Ranked size bands
      </Text>
      <Text style={styles.summaryLineMuted}>
        Ordered by % of variety weight (same data as the main table).
      </Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={styles.sumColSize}>Size</Text>
          <Text style={styles.sumColMid}>Bags</Text>
          <Text style={styles.sumColPct}>% variety</Text>
          <Text style={styles.sumColRank}>Rank</Text>
        </View>
        {ranked.map((r) => (
          <View key={r.sizeName} style={styles.summaryTableRow}>
            <Text style={styles.sumColSize} wrap>
              {r.sizeName}
            </Text>
            <Text style={styles.sumColMid} wrap>
              {formatIn(r.bags)}
            </Text>
            <Text style={styles.sumColPct} wrap>
              {formatPct1(r.pctVariety)}
            </Text>
            <Text style={styles.sumColRank} wrap>
              {r.rank}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.pageHint}>Page 2 of 2</Text>
    </Page>
  );
}

export function GradingSizeDistributionTablePdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  variety,
  rows,
  totalBags,
  totalWeightKg,
}: GradingSizeDistributionTablePdfProps) {
  const company = companyName || 'Cold Storage';
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{company}</Text>
          <Text style={styles.reportTitle}>Size-wise distribution</Text>
          <Text style={styles.subtitle}>
            Percentage breakdown by grading size (excluding Bardana)
          </Text>
          <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        </View>
        <Text style={styles.varietyLine}>Variety: {variety}</Text>
        <MainTable
          rows={rows}
          totalBags={totalBags}
          totalWeightKg={totalWeightKg}
        />
        <Text style={styles.pageHint}>Page 1 of 2</Text>
      </Page>
      <SummaryPage
        companyName={company}
        dateRangeLabel={dateRangeLabel}
        variety={variety}
        rows={rows}
        totalBags={totalBags}
        totalWeightKg={totalWeightKg}
      />
    </Document>
  );
}
