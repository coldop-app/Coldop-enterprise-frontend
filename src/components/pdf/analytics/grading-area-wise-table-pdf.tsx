import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export interface GradingAreaWiseTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  variety: string;
  /** Size column headers in display order. */
  sizeNames: readonly string[];
  /** One row per area; `bags[i]` aligns with `sizeNames[i]`. */
  rows: ReadonlyArray<{
    area: string;
    bags: readonly number[];
    total: number;
  }>;
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
    paddingVertical: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 2,
  },
  tableFooterRow: {
    flexDirection: 'row',
    backgroundColor: '#D0D0D0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 3,
  },
  cellWrap: {
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    justifyContent: 'center',
    paddingHorizontal: 1,
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
  sumColLeft: {
    width: '38%',
    paddingHorizontal: 4,
    fontSize: 9,
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  sumColNum: {
    width: '22%',
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

function formatPct(part: number, whole: number): string {
  if (whole <= 0 || !Number.isFinite(part)) return '—';
  const p = (100 * part) / whole;
  if (!Number.isFinite(p)) return '—';
  return `${p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%`;
}

function columnWidths(sizeCount: number): {
  area: string;
  eachSize: string;
  total: string;
} {
  if (sizeCount <= 0) {
    return { area: '50%', eachSize: '0%', total: '50%' };
  }
  const totalCol = 10;
  const areaCol = Math.min(22, Math.max(14, 16));
  const eachSize = (100 - areaCol - totalCol) / sizeCount;
  return {
    area: `${areaCol}%`,
    eachSize: `${eachSize}%`,
    total: `${totalCol}%`,
  };
}

interface MatrixBlockProps {
  sizeNames: readonly string[];
  rows: ReadonlyArray<{
    area: string;
    bags: readonly number[];
    total: number;
  }>;
  footer: GradingAreaWiseTablePdfProps['footer'];
  showFooter: boolean;
}

function MatrixBlock({
  sizeNames,
  rows,
  footer,
  showFooter,
}: MatrixBlockProps) {
  const w = columnWidths(sizeNames.length);
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <View style={[styles.cellWrap, { width: w.area, minWidth: 0 }]}>
          <Text style={[styles.cellText, { textAlign: 'left' }]} wrap>
            Area
          </Text>
        </View>
        {sizeNames.map((name) => (
          <View
            key={name}
            style={[styles.cellWrap, { width: w.eachSize, minWidth: 0 }]}
          >
            <Text style={[styles.cellText, { textAlign: 'right' }]} wrap>
              {name}
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
          <View style={[styles.cellWrap, { width: w.area, minWidth: 0 }]}>
            <Text style={[styles.cellText, { textAlign: 'left' }]} wrap>
              {row.area}
            </Text>
          </View>
          {sizeNames.map((_, i) => (
            <View
              key={sizeNames[i]}
              style={[styles.cellWrap, { width: w.eachSize, minWidth: 0 }]}
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
          <View style={[styles.cellWrap, { width: w.area, minWidth: 0 }]}>
            <Text style={[styles.cellTextBold, { textAlign: 'left' }]} wrap>
              Bag total
            </Text>
          </View>
          {sizeNames.map((name, i) => (
            <View
              key={name}
              style={[styles.cellWrap, { width: w.eachSize, minWidth: 0 }]}
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

const ROWS_PER_PAGE = 28;

function chunkRows<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push([...items.slice(i, i + size)]);
  }
  return out;
}

function SummaryPage({
  companyName,
  dateRangeLabel,
  variety,
  sizeNames,
  rows,
  footer,
  pageNumber,
  totalPages,
}: {
  companyName: string;
  dateRangeLabel: string;
  variety: string;
  sizeNames: readonly string[];
  rows: ReadonlyArray<{
    area: string;
    bags: readonly number[];
    total: number;
  }>;
  footer: GradingAreaWiseTablePdfProps['footer'];
  pageNumber: number;
  totalPages: number;
}) {
  const grand = footer.total;
  const byArea = [...rows]
    .map((r) => ({
      area: r.area,
      total: r.total,
      pct: formatPct(r.total, grand),
    }))
    .sort((a, b) => b.total - a.total);

  const bySize = sizeNames
    .map((name, i) => ({
      name,
      bags: footer.bags[i] ?? 0,
      pct: formatPct(footer.bags[i] ?? 0, grand),
    }))
    .sort((a, b) => b.bags - a.bags);

  const topArea = byArea[0];
  const topSize = bySize[0];

  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.summaryPageHeader}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.summaryPageTitle}>Summary</Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        <Text style={[styles.subtitle, { marginTop: 4 }]}>
          Area-wise size distribution · {variety}
        </Text>
      </View>

      <Text style={styles.summaryHeading}>Overview</Text>
      <Text style={styles.summaryLine}>
        Variety <Text style={styles.summaryEmphasis}>{variety}</Text>:{' '}
        <Text style={styles.summaryEmphasis}>{rows.length}</Text>{' '}
        {rows.length === 1 ? 'area' : 'areas'},{' '}
        <Text style={styles.summaryEmphasis}>{sizeNames.length}</Text> size{' '}
        {sizeNames.length === 1 ? 'column' : 'columns'},{' '}
        <Text style={styles.summaryEmphasis}>{formatIn(grand)}</Text> total bags
        in the matrix.
      </Text>
      {topArea && grand > 0 ? (
        <Text style={styles.summaryLine}>
          Highest bag total by area:{' '}
          <Text style={styles.summaryEmphasis}>{topArea.area}</Text> (
          {formatIn(topArea.total)} bags, {topArea.pct} of variety total).
        </Text>
      ) : null}
      {topSize && grand > 0 ? (
        <Text style={styles.summaryLine}>
          Largest size column (bag total):{' '}
          <Text style={styles.summaryEmphasis}>{topSize.name}</Text> (
          {formatIn(topSize.bags)} bags, {topSize.pct}).
        </Text>
      ) : null}
      <Text style={styles.summaryLineMuted}>
        The main table shows bag counts by area and grading size; footer row
        matches the totals below.
      </Text>

      <Text style={[styles.summaryHeading, { marginTop: 10 }]}>
        Areas by total bags
      </Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={styles.sumColLeft}>Area</Text>
          <Text style={styles.sumColNum}>Bags</Text>
          <Text style={styles.sumColPct}>Share</Text>
          <Text style={styles.sumColRank}>Rank</Text>
        </View>
        {byArea.map((r, i) => (
          <View key={r.area} style={styles.summaryTableRow}>
            <Text style={styles.sumColLeft} wrap>
              {r.area}
            </Text>
            <Text style={styles.sumColNum} wrap>
              {formatIn(r.total)}
            </Text>
            <Text style={styles.sumColPct} wrap>
              {r.pct}
            </Text>
            <Text style={styles.sumColRank} wrap>
              {i + 1}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.summaryHeading, { marginTop: 10 }]}>
        Sizes by total bags
      </Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={styles.sumColLeft}>Size</Text>
          <Text style={styles.sumColNum}>Bags</Text>
          <Text style={styles.sumColPct}>Share</Text>
          <Text style={styles.sumColRank}>Rank</Text>
        </View>
        {bySize.map((r, i) => (
          <View key={r.name} style={styles.summaryTableRow}>
            <Text style={styles.sumColLeft} wrap>
              {r.name}
            </Text>
            <Text style={styles.sumColNum} wrap>
              {formatIn(r.bags)}
            </Text>
            <Text style={styles.sumColPct} wrap>
              {r.pct}
            </Text>
            <Text style={styles.sumColRank} wrap>
              {i + 1}
            </Text>
          </View>
        ))}
      </View>

      {totalPages > 1 ? (
        <Text style={styles.pageHint}>
          Page {pageNumber} of {totalPages}
        </Text>
      ) : null}
    </Page>
  );
}

export function GradingAreaWiseTablePdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  variety,
  sizeNames,
  rows,
  footer,
}: GradingAreaWiseTablePdfProps) {
  const company = companyName || 'Cold Storage';
  const chunks = rows.length === 0 ? [[]] : chunkRows(rows, ROWS_PER_PAGE);
  const tablePageCount = chunks.length;
  const summaryMetrics = rows.length > 0 && sizeNames.length > 0;
  const totalPages = summaryMetrics ? tablePageCount + 1 : tablePageCount;

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
            <>
              <View style={styles.header}>
                <Text style={styles.companyName}>{company}</Text>
                <Text style={styles.reportTitle}>
                  Area-wise size distribution
                </Text>
                <Text style={styles.subtitle}>
                  Bags by area and grading size
                </Text>
                <Text style={styles.dateRange}>{dateRangeLabel}</Text>
              </View>
              <Text style={styles.varietyLine}>Variety: {variety}</Text>
            </>
          ) : (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.reportTitle}>
                Area-wise distribution (continued)
              </Text>
              <Text style={styles.dateRange}>{dateRangeLabel}</Text>
              <Text style={styles.subtitle}>Variety: {variety}</Text>
            </View>
          )}
          <MatrixBlock
            sizeNames={sizeNames}
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
          variety={variety}
          sizeNames={sizeNames}
          rows={rows}
          footer={footer}
          pageNumber={totalPages}
          totalPages={totalPages}
        />
      ) : null}
    </Document>
  );
}
