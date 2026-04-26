import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { StorageReportRow } from '@/components/analytics/reports/storage-report/columns';
import { getSizeColumnId } from '@/components/analytics/reports/storage-report/columns';
import type { StorageReportPdfSnapshot } from '@/components/analytics/reports/storage-report/data-table';

export interface StorageReportTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  rows: StorageReportRow[];
  /** Size labels to show as columns (e.g. ['20–25', '25–30']). Determines table and summary columns. */
  sizeColumnIds: readonly string[];
  /** When provided, honours filtered leaf rows from the report UI. */
  tableSnapshot?: StorageReportPdfSnapshot<StorageReportRow> | null;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 6,
    marginBottom: 12,
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
    marginBottom: 6,
  },
  dateRange: {
    fontSize: 9,
    marginBottom: 6,
  },
  tableContainer: {
    marginTop: 8,
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
  tableRowTotal: {
    flexDirection: 'row',
    backgroundColor: '#D0D0D0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 3,
  },
  cell: {
    paddingHorizontal: 2,
    fontSize: 10,
    textAlign: 'center',
  },
  cellLeft: {
    paddingHorizontal: 2,
    fontSize: 10,
    textAlign: 'left',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellWrap: {
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 10,
    width: '100%',
    maxWidth: '100%',
  },
  cellQuantity: {
    fontSize: 10,
    fontWeight: 'bold',
    width: '100%',
    maxWidth: '100%',
  },
  cellLocation: {
    fontSize: 9,
    color: '#555',
    marginTop: 1,
    width: '100%',
    maxWidth: '100%',
  },
  summaryPage: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  summarySection: {
    marginTop: 14,
  },
  summarySectionFirst: {
    marginTop: 0,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
    marginBottom: 4,
  },
  summaryTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 3,
  },
  summaryTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 2,
  },
  summaryTableRowTotal: {
    flexDirection: 'row',
    backgroundColor: '#D0D0D0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 3,
  },
  summaryCell: {
    paddingHorizontal: 3,
    fontSize: 9,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLeft: {
    paddingHorizontal: 3,
    fontSize: 9,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLast: {
    borderRightWidth: 0,
  },
});

function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isNaN(value)) return '—';
  return String(value);
}

/** Like formatCell but returns empty for 0 (used for quantity columns so 0 is left blank). */
function formatQuantity(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    if (Number.isNaN(value) || value === 0) return '';
    return String(value);
  }
  const s = String(value).trim();
  if (s === '0' || s === '') return '';
  return s;
}

function ReportHeader({
  companyName,
  dateRangeLabel,
  reportTitle,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.companyName}>{companyName}</Text>
      <Text style={styles.reportTitle}>{reportTitle}</Text>
      <Text style={styles.dateRange}>{dateRangeLabel}</Text>
    </View>
  );
}

/** PDF column def: key is string for table row access. */
type PdfColumn = {
  key: string;
  label: string;
  width: string;
  align: 'left' | 'center' | 'right';
};

/** Build PDF column defs: base + size + remarks. Widths sum to 100%. Size cols capped so remarks gets remainder. */
function getPdfColumns(sizeColumnIds: readonly string[]): PdfColumn[] {
  const n = sizeColumnIds.length;
  const sizeWidthOld = n > 0 ? Math.min(7, Math.floor(50 / n)) : 0;
  const remarksOld = Math.max(15, 100 - 47 - n * sizeWidthOld);
  const remarksNew = Math.max(8, Math.floor(remarksOld / 2));
  const remainderForSizes = 100 - 47 - remarksNew;
  const maxSizeWidthPerCol = 9.5; // ~16px wider per col than 6.8 on A4
  const sizeWidth =
    n > 0 ? Math.min(maxSizeWidthPerCol, remainderForSizes / n) : 0;
  const remarksWidth = 100 - 47 - n * sizeWidth;
  const base: PdfColumn[] = [
    { key: 'gatePassNo', label: 'Gate pass no.', width: '9%', align: 'right' },
    {
      key: 'manualGatePassNumber',
      label: 'Manual GP no.',
      width: '9%',
      align: 'right',
    },
    { key: 'date', label: 'Date', width: '9%', align: 'center' },
    { key: 'variety', label: 'Variety', width: '12%', align: 'left' },
    { key: 'totalBags', label: 'Bags', width: '8%', align: 'right' },
  ];
  const sizeCols = sizeColumnIds.map((size) => ({
    key: getSizeColumnId(size),
    label: size,
    width: `${sizeWidth}%`,
    align: 'center' as const,
  }));
  return [
    ...base,
    ...sizeCols,
    {
      key: 'remarks',
      label: 'Remarks',
      width: `${remarksWidth}%`,
      align: 'left',
    },
  ];
}

interface TableRowProps {
  row: StorageReportRow;
  columns: PdfColumn[];
}

const SIZE_COLUMN_PREFIX = 'bags_';

function TableRow({ row, columns }: TableRowProps) {
  return (
    <View style={styles.tableRow}>
      {columns.map((col, i) => {
        const isSizeCol = col.key.startsWith(SIZE_COLUMN_PREFIX);
        const isQuantityCol = isSizeCol || col.key === 'totalBags';
        const location = isSizeCol
          ? (row[`${col.key}_location`] as string | undefined)
          : undefined;
        const displayValue = isQuantityCol
          ? formatQuantity(row[col.key])
          : formatCell(row[col.key]);
        const showQuantityWithLocation =
          isSizeCol && location && displayValue !== '';
        return (
          <View
            key={col.key}
            style={[
              styles.cellWrap,
              i === columns.length - 1 ? styles.cellLast : {},
              { width: col.width, minWidth: 0 },
            ]}
          >
            {showQuantityWithLocation ? (
              <View style={[styles.cell, { alignItems: 'center' }]}>
                <Text
                  style={[styles.cellQuantity, { textAlign: col.align }]}
                  wrap
                >
                  {displayValue}
                </Text>
                <Text
                  style={[styles.cellLocation, { textAlign: col.align }]}
                  wrap
                >
                  ({location})
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  col.align === 'left' ? styles.cellLeft : styles.cell,
                  styles.cellText,
                ]}
                wrap
              >
                {displayValue}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Aggregate totals for summary */
interface SummaryRowTotals {
  count: number;
  totalBags: number;
  sizeTotals: Record<string, number>;
}

interface VarietySummaryRow {
  variety: string;
  count: number;
  totalBags: number;
  sizeTotals: Record<string, number>;
}

interface FarmerSummaryRow {
  farmerName: string;
  count: number;
  totalBags: number;
  sizeTotals: Record<string, number>;
}

interface StorageReportTableSummary {
  byVariety: VarietySummaryRow[];
  byFarmer: FarmerSummaryRow[];
  overall: SummaryRowTotals;
}

function computeStorageReportSummary(
  rows: StorageReportRow[],
  sizeColumnIds: readonly string[]
): StorageReportTableSummary {
  const varietyMap = new Map<string, SummaryRowTotals>();
  const farmerMap = new Map<string, SummaryRowTotals>();
  const sizeKeys = sizeColumnIds.map(getSizeColumnId);

  const initTotals = (): SummaryRowTotals => {
    const sizeTotals: Record<string, number> = {};
    for (const k of sizeKeys) sizeTotals[k] = 0;
    return { count: 0, totalBags: 0, sizeTotals };
  };

  const overall = initTotals();

  const num = (v: number | string | null | undefined): number => {
    if (v == null || v === '') return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  for (const row of rows) {
    const totalBags = typeof row.totalBags === 'number' ? row.totalBags : 0;
    const variety = (row.variety ?? '').trim() || '—';
    const farmerName = (row.farmerName ?? '').trim() || '—';

    overall.count += 1;
    overall.totalBags += totalBags;
    for (const k of sizeKeys) overall.sizeTotals[k] += num(row[k]);

    const v = varietyMap.get(variety);
    if (v) {
      v.count += 1;
      v.totalBags += totalBags;
      for (const k of sizeKeys) v.sizeTotals[k] += num(row[k]);
    } else {
      const t = initTotals();
      t.count = 1;
      t.totalBags = totalBags;
      for (const k of sizeKeys) t.sizeTotals[k] = num(row[k]);
      varietyMap.set(variety, t);
    }

    const f = farmerMap.get(farmerName);
    if (f) {
      f.count += 1;
      f.totalBags += totalBags;
      for (const k of sizeKeys) f.sizeTotals[k] += num(row[k]);
    } else {
      const t = initTotals();
      t.count = 1;
      t.totalBags = totalBags;
      for (const k of sizeKeys) t.sizeTotals[k] = num(row[k]);
      farmerMap.set(farmerName, t);
    }
  }

  const byVariety: VarietySummaryRow[] = Array.from(varietyMap.entries())
    .map(([variety, t]) => ({ variety, ...t }))
    .sort((a, b) => a.variety.localeCompare(b.variety));
  const byFarmer: FarmerSummaryRow[] = Array.from(farmerMap.entries())
    .map(([farmerName, t]) => ({ farmerName, ...t }))
    .sort((a, b) => a.farmerName.localeCompare(b.farmerName));

  return { byVariety, byFarmer, overall };
}

function ReportSummaryPage({
  companyName,
  dateRangeLabel,
  reportTitle,
  summary,
  sizeColumnIds,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle: string;
  summary: StorageReportTableSummary;
  sizeColumnIds: readonly string[];
}) {
  const sizeKeys = sizeColumnIds.map(getSizeColumnId);
  const numSizeCols = sizeKeys.length;
  const sizeWidthPct =
    numSizeCols > 0 ? Math.min(10, Math.floor(54 / numSizeCols)) : 0;
  const sizeWidth = `${sizeWidthPct}%`;
  const summaryCols = [
    { key: 'name', label: 'Variety / Farmer', width: '22%' },
    { key: 'count', label: 'Count', width: '10%' },
    { key: 'totalBags', label: 'Bags', width: '14%' },
    ...sizeColumnIds.map((s) => ({
      key: getSizeColumnId(s),
      label: s,
      width: sizeWidth,
    })),
  ];

  const renderSummaryRows = (
    rows: {
      count: number;
      totalBags: number;
      sizeTotals: Record<string, number>;
      variety?: string;
      farmerName?: string;
    }[],
    nameKey: 'variety' | 'farmerName'
  ) =>
    rows.map((row) => (
      <View key={row[nameKey] ?? ''} style={styles.summaryTableRow}>
        <Text
          style={[styles.summaryCellLeft, { width: summaryCols[0]!.width }]}
        >
          {formatCell(row[nameKey])}
        </Text>
        <Text style={[styles.summaryCell, { width: summaryCols[1]!.width }]}>
          {row.count}
        </Text>
        <Text style={[styles.summaryCell, { width: summaryCols[2]!.width }]}>
          {row.totalBags}
        </Text>
        {sizeKeys.map((k, i) => (
          <Text
            key={k}
            style={[
              styles.summaryCell,
              i === sizeKeys.length - 1 ? styles.summaryCellLast : {},
              { width: summaryCols[3 + i]!.width },
            ]}
          >
            {row.sizeTotals[k] ?? 0}
          </Text>
        ))}
      </View>
    ));

  const renderTotalRow = (overall: SummaryRowTotals) => (
    <View style={styles.summaryTableRowTotal}>
      <Text style={[styles.summaryCellLeft, { width: summaryCols[0]!.width }]}>
        Total
      </Text>
      <Text style={[styles.summaryCell, { width: summaryCols[1]!.width }]}>
        {overall.count}
      </Text>
      <Text style={[styles.summaryCell, { width: summaryCols[2]!.width }]}>
        {overall.totalBags}
      </Text>
      {sizeKeys.map((k, i) => (
        <Text
          key={k}
          style={[
            styles.summaryCell,
            i === sizeKeys.length - 1 ? styles.summaryCellLast : {},
            { width: summaryCols[3 + i]!.width },
          ]}
        >
          {overall.sizeTotals[k] ?? 0}
        </Text>
      ))}
    </View>
  );

  return (
    <Page size="A4" orientation="landscape" style={styles.summaryPage}>
      <ReportHeader
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={`${reportTitle} — Summary`}
      />
      <View style={[styles.summarySection, styles.summarySectionFirst]}>
        <Text style={styles.summaryTitle}>Variety-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {summaryCols.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === summaryCols.length - 1 ? styles.summaryCellLast : {},
                  { width: col.width },
                ]}
              >
                {col.key === 'name' ? 'Variety' : col.label}
              </Text>
            ))}
          </View>
          {summary.byVariety.length === 0 ? (
            <View style={styles.summaryTableRow}>
              <Text
                style={[
                  styles.summaryCellLeft,
                  styles.summaryCellLast,
                  { width: '100%', paddingVertical: 4 },
                ]}
              >
                No data
              </Text>
            </View>
          ) : (
            <>
              {renderSummaryRows(summary.byVariety, 'variety')}
              {renderTotalRow(summary.overall)}
            </>
          )}
        </View>
      </View>
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Farmer-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {summaryCols.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === summaryCols.length - 1 ? styles.summaryCellLast : {},
                  { width: col.width },
                ]}
              >
                {col.key === 'name' ? 'Farmer' : col.label}
              </Text>
            ))}
          </View>
          {summary.byFarmer.length === 0 ? (
            <View style={styles.summaryTableRow}>
              <Text
                style={[
                  styles.summaryCellLeft,
                  styles.summaryCellLast,
                  { width: '100%', paddingVertical: 4 },
                ]}
              >
                No data
              </Text>
            </View>
          ) : (
            <>
              {renderSummaryRows(summary.byFarmer, 'farmerName')}
              {renderTotalRow(summary.overall)}
            </>
          )}
        </View>
      </View>
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Bag size-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            <Text style={[styles.summaryCellLeft, { width: '50%' }]}>
              Bag size
            </Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: '50%' },
              ]}
            >
              Total bags
            </Text>
          </View>
          {sizeColumnIds.length === 0 ? (
            <View style={styles.summaryTableRow}>
              <Text
                style={[
                  styles.summaryCellLeft,
                  styles.summaryCellLast,
                  { width: '100%', paddingVertical: 4 },
                ]}
              >
                No size data
              </Text>
            </View>
          ) : (
            <>
              {sizeColumnIds.map((size) => (
                <View key={size} style={styles.summaryTableRow}>
                  <Text style={[styles.summaryCellLeft, { width: '50%' }]}>
                    {size}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      styles.summaryCellLast,
                      { width: '50%' },
                    ]}
                  >
                    {summary.overall.sizeTotals[getSizeColumnId(size)] ?? 0}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryTableRowTotal}>
                <Text style={[styles.summaryCellLeft, { width: '50%' }]}>
                  Total
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: '50%' },
                  ]}
                >
                  {summary.overall.totalBags}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Overall total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {summaryCols.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === summaryCols.length - 1 ? styles.summaryCellLast : {},
                  { width: col.width },
                ]}
              >
                {col.key === 'name' ? '' : col.label}
              </Text>
            ))}
          </View>
          {renderTotalRow(summary.overall)}
        </View>
      </View>
    </Page>
  );
}

export const StorageReportTablePdf = ({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Storage Report',
  rows,
  sizeColumnIds,
  tableSnapshot,
}: StorageReportTablePdfProps) => {
  const leafRows =
    tableSnapshot?.rows
      .filter(
        (item): item is { type: 'leaf'; row: StorageReportRow } =>
          item.type === 'leaf'
      )
      .map((item) => item.row) ?? rows;
  const columns = getPdfColumns(sizeColumnIds);
  const summary = computeStorageReportSummary(leafRows, sizeColumnIds);

  const totalBags = leafRows.reduce(
    (sum, r) => sum + (typeof r.totalBags === 'number' ? r.totalBags : 0),
    0
  );
  const totalRowTotals: Record<string, number> = { totalBags };
  for (const size of sizeColumnIds) {
    const id = getSizeColumnId(size);
    totalRowTotals[id] = leafRows.reduce((s, r) => s + (Number(r[id]) || 0), 0);
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <ReportHeader
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle={reportTitle}
        />
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              {columns.map((col, i) => (
                <Text
                  key={col.key}
                  style={[
                    col.align === 'left' ? styles.cellLeft : styles.cell,
                    i === columns.length - 1 ? styles.cellLast : {},
                    styles.cellWrap,
                    { width: col.width },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
            </View>
            {leafRows.length === 0 ? (
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.cellLeft,
                    styles.cellLast,
                    styles.cellWrap,
                    { width: '100%', paddingVertical: 8 },
                  ]}
                >
                  No storage report data for this period.
                </Text>
              </View>
            ) : (
              <>
                {leafRows.map((row) => (
                  <TableRow key={row.id} row={row} columns={columns} />
                ))}
                <View style={styles.tableRowTotal}>
                  {columns.map((col, i) => {
                    const total = totalRowTotals[col.key];
                    const isTotalCol = total !== undefined;
                    return (
                      <View
                        key={col.key}
                        style={[
                          styles.cellWrap,
                          i === columns.length - 1 ? styles.cellLast : {},
                          { width: col.width },
                        ]}
                      >
                        <Text
                          style={[
                            col.align === 'left'
                              ? styles.cellLeft
                              : styles.cell,
                            styles.cellText,
                          ]}
                        >
                          {i === 0 ? 'Total' : isTotalCol ? String(total) : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </View>
      </Page>
      <ReportSummaryPage
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
        summary={summary}
        sizeColumnIds={sizeColumnIds}
      />
    </Document>
  );
};
