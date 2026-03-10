import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { GradingReportRow } from '@/components/analytics/reports/grading-report/columns';
import type { GradingReportPdfSnapshot } from '@/components/analytics/reports/grading-report/data-table';

export interface GradingReportTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  rows: GradingReportRow[];
  /** When provided, honours table grouping, column visibility, and sorting from the report UI. */
  tableSnapshot?: GradingReportPdfSnapshot<GradingReportRow> | null;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 8,
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
    paddingHorizontal: 0,
    fontSize: 6,
    textAlign: 'center',
  },
  cellLeft: {
    paddingHorizontal: 0,
    fontSize: 6,
    textAlign: 'left',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellWrap: {
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 6,
    width: '100%',
    maxWidth: '100%',
  },
  farmerSection: {
    marginTop: 14,
  },
  farmerSectionFirst: {
    marginTop: 0,
  },
  farmerHeader: {
    backgroundColor: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#000',
    padding: 6,
    marginBottom: 6,
  },
  farmerHeaderTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  farmerHeaderRow: {
    fontSize: 8,
    marginBottom: 2,
  },
  varietyHeader: {
    backgroundColor: '#D0E8D0',
    borderWidth: 1,
    borderColor: '#000',
    padding: 6,
    marginBottom: 6,
  },
  varietyHeaderTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  genericHeader: {
    backgroundColor: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#000',
    padding: 6,
    marginBottom: 6,
  },
  genericHeaderTitle: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryPage: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 8,
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
    fontSize: 7,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLeft: {
    paddingHorizontal: 3,
    fontSize: 7,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLast: {
    borderRightWidth: 0,
  },
});

const ALL_COLUMNS: {
  key: keyof GradingReportRow;
  label: string;
  width: string;
  align: 'left' | 'center';
}[] = [
  { key: 'farmerName', label: 'Farmer', width: '8%', align: 'left' },
  {
    key: 'incomingGatePassNo',
    label: 'Incoming GP no.',
    width: '5%',
    align: 'center',
  },
  {
    key: 'incomingManualNo',
    label: 'Incoming manual no.',
    width: '5%',
    align: 'center',
  },
  {
    key: 'incomingGatePassDate',
    label: 'Incoming GP date',
    width: '6%',
    align: 'center',
  },
  { key: 'variety', label: 'Variety', width: '6%', align: 'left' },
  { key: 'bagsReceived', label: 'Bags rec.', width: '4%', align: 'center' },
  {
    key: 'netProductKg',
    label: 'Net product (kg)',
    width: '6%',
    align: 'center',
  },
  { key: 'gatePassNo', label: 'GP no.', width: '4%', align: 'center' },
  { key: 'date', label: 'Date', width: '6%', align: 'center' },
  {
    key: 'totalGradedBags',
    label: 'Graded bags',
    width: '5%',
    align: 'center',
  },
  {
    key: 'totalGradedWeightKg',
    label: 'Graded wt (kg)',
    width: '6%',
    align: 'center',
  },
  { key: 'wastageKg', label: 'Wastage (kg)', width: '5%', align: 'center' },
  { key: 'grader', label: 'Grader', width: '8%', align: 'left' },
  { key: 'remarks', label: 'Remarks', width: '10%', align: 'left' },
];

function getColumnsForPdf(
  visibleColumnIds: string[],
  excludeGrouping?: string[]
): {
  key: keyof GradingReportRow;
  label: string;
  width: string;
  align: 'left' | 'center';
}[] {
  const visible = new Set(
    visibleColumnIds.length > 0
      ? visibleColumnIds
      : ALL_COLUMNS.map((c) => c.key)
  );
  const exclude = new Set(excludeGrouping ?? []);
  const filtered = ALL_COLUMNS.filter(
    (c) => visible.has(c.key) && !exclude.has(c.key)
  );
  if (filtered.length === 0) return ALL_COLUMNS;
  const totalPercent = filtered.reduce(
    (sum, c) => sum + parseFloat(c.width),
    0
  );
  const scale = 100 / totalPercent;
  return filtered.map((c) => ({
    ...c,
    width: `${(parseFloat(c.width) * scale).toFixed(1)}%`,
  }));
}

/** Format value for PDF display; numbers limited to 2 decimal places. */
function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '—';
    return value.toFixed(2);
  }
  if (typeof value === 'string' && value !== '—') {
    const n = Number(value);
    if (!Number.isNaN(n)) return n.toFixed(2);
  }
  return String(value);
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

interface TableRowProps {
  row: GradingReportRow;
  columns: {
    key: keyof GradingReportRow;
    label: string;
    width: string;
    align: 'left' | 'center';
  }[];
}

function TableRow({ row, columns }: TableRowProps) {
  return (
    <View style={styles.tableRow}>
      {columns.map((col, i) => (
        <View
          key={col.key}
          style={[
            styles.cellWrap,
            i === columns.length - 1 ? styles.cellLast : {},
            { width: col.width, minWidth: 0 },
          ]}
        >
          <Text
            style={[
              col.align === 'left' ? styles.cellLeft : styles.cell,
              styles.cellText,
            ]}
            wrap
          >
            {formatCell(row[col.key])}
          </Text>
        </View>
      ))}
    </View>
  );
}

const TOTAL_KEYS: (keyof GradingReportRow)[] = [
  'bagsReceived',
  'totalGradedBags',
  'totalGradedWeightKg',
  'wastageKg',
  'grossWeightKg',
  'netWeightKg',
  'netProductKg',
];

function toNum(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function TotalsRow({
  totals,
  columns,
}: {
  totals: Record<string, number>;
  columns: {
    key: keyof GradingReportRow;
    label: string;
    width: string;
    align: 'left' | 'center';
  }[];
}) {
  return (
    <View style={styles.tableRowTotal}>
      {columns.map((col, i) => {
        const total = totals[col.key];
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
                col.align === 'left' ? styles.cellLeft : styles.cell,
                styles.cellText,
              ]}
            >
              {i === 0 ? 'Total' : isTotalCol ? total.toFixed(2) : ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface PdfSection {
  headers: Array<{
    depth: number;
    groupingColumnId: string;
    displayValue: string;
    firstLeaf?: GradingReportRow;
  }>;
  leaves: GradingReportRow[];
}

function buildSectionsFromSnapshot(
  snapshot: GradingReportPdfSnapshot<GradingReportRow>
): PdfSection[] {
  const { rows, grouping } = snapshot;
  const deepestDepth = grouping.length > 0 ? grouping.length - 1 : -1;
  const sections: PdfSection[] = [];
  let current: PdfSection = { headers: [], leaves: [] };

  for (const item of rows) {
    if (item.type === 'group') {
      if (item.depth === deepestDepth) {
        if (current.leaves.length > 0) {
          sections.push(current);
          current = {
            headers: [...current.headers],
            leaves: [],
          };
        }
        current.headers[item.depth] = {
          depth: item.depth,
          groupingColumnId: item.groupingColumnId,
          displayValue: item.displayValue,
          firstLeaf: item.firstLeaf,
        };
      } else {
        current.headers[item.depth] = {
          depth: item.depth,
          groupingColumnId: item.groupingColumnId,
          displayValue: item.displayValue,
          firstLeaf: item.firstLeaf,
        };
      }
    } else {
      current.leaves.push(item.row);
    }
  }
  if (current.leaves.length > 0 || current.headers.length > 0) {
    sections.push(current);
  }
  return sections;
}

function FarmerBlockHeader({ firstLeaf }: { firstLeaf?: GradingReportRow }) {
  if (!firstLeaf) {
    return (
      <View style={styles.farmerHeader}>
        <Text style={styles.farmerHeaderTitle}>—</Text>
      </View>
    );
  }
  return (
    <View style={styles.farmerHeader}>
      <Text style={styles.farmerHeaderTitle}>
        {formatCell(firstLeaf.farmerName)}
        {firstLeaf.accountNumber != null &&
        firstLeaf.accountNumber !== '' &&
        firstLeaf.accountNumber !== '—'
          ? ` #${firstLeaf.accountNumber}`
          : ''}
      </Text>
      <Text style={styles.farmerHeaderRow}>
        Mobile: {formatCell(firstLeaf.farmerMobile)} | Address:{' '}
        {formatCell(firstLeaf.farmerAddress)}
      </Text>
    </View>
  );
}

function VarietyBlockHeader({ variety }: { variety: string }) {
  return (
    <View style={styles.varietyHeader}>
      <Text style={styles.varietyHeaderTitle}>Variety: {variety}</Text>
    </View>
  );
}

function GenericBlockHeader({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.genericHeader}>
      <Text style={styles.genericHeaderTitle}>
        {label}: {value}
      </Text>
    </View>
  );
}

const GROUP_LABELS: Record<string, string> = {
  farmerName: 'Farmer',
  variety: 'Variety',
  date: 'Date',
  incomingGatePassDate: 'Incoming gate pass date',
  grader: 'Grader',
};

/** Aggregate totals for summary rows */
interface SummaryRowTotals {
  count: number;
  bagsReceived: number;
  totalGradedBags: number;
  totalGradedWeightKg: number;
  wastageKg: number;
}

/** Variety-wise summary row */
interface VarietySummaryRow {
  variety: string;
  count: number;
  bagsReceived: number;
  totalGradedBags: number;
  totalGradedWeightKg: number;
  wastageKg: number;
}

/** Farmer-wise summary row */
interface FarmerSummaryRow {
  farmerName: string;
  count: number;
  bagsReceived: number;
  totalGradedBags: number;
  totalGradedWeightKg: number;
  wastageKg: number;
}

/** Computed report summary from grading report rows */
interface GradingReportTableSummary {
  byVariety: VarietySummaryRow[];
  byFarmer: FarmerSummaryRow[];
  overall: SummaryRowTotals;
}

function computeGradingReportSummary(
  rows: GradingReportRow[]
): GradingReportTableSummary {
  const varietyMap = new Map<string, SummaryRowTotals>();
  const farmerMap = new Map<string, SummaryRowTotals>();
  const overall: SummaryRowTotals = {
    count: 0,
    bagsReceived: 0,
    totalGradedBags: 0,
    totalGradedWeightKg: 0,
    wastageKg: 0,
  };

  const num = (v: number | string | null | undefined): number => {
    if (v == null || v === '' || v === '—') return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  for (const row of rows) {
    const bagsReceived =
      typeof row.bagsReceived === 'number' ? row.bagsReceived : 0;
    const totalGradedBags =
      typeof row.totalGradedBags === 'number' ? row.totalGradedBags : 0;
    const totalGradedWeightKg =
      typeof row.totalGradedWeightKg === 'number' ? row.totalGradedWeightKg : 0;
    const wastageKg = num(row.wastageKg);
    const variety = (row.variety ?? '').trim() || '—';
    const farmerName = (row.farmerName ?? '').trim() || '—';

    overall.count += 1;
    overall.bagsReceived += bagsReceived;
    overall.totalGradedBags += totalGradedBags;
    overall.totalGradedWeightKg += totalGradedWeightKg;
    overall.wastageKg += wastageKg;

    const v = varietyMap.get(variety);
    if (v) {
      v.count += 1;
      v.bagsReceived += bagsReceived;
      v.totalGradedBags += totalGradedBags;
      v.totalGradedWeightKg += totalGradedWeightKg;
      v.wastageKg += wastageKg;
    } else {
      varietyMap.set(variety, {
        count: 1,
        bagsReceived,
        totalGradedBags,
        totalGradedWeightKg,
        wastageKg,
      });
    }

    const f = farmerMap.get(farmerName);
    if (f) {
      f.count += 1;
      f.bagsReceived += bagsReceived;
      f.totalGradedBags += totalGradedBags;
      f.totalGradedWeightKg += totalGradedWeightKg;
      f.wastageKg += wastageKg;
    } else {
      farmerMap.set(farmerName, {
        count: 1,
        bagsReceived,
        totalGradedBags,
        totalGradedWeightKg,
        wastageKg,
      });
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

const SUMMARY_COLUMNS = [
  { key: 'name', label: 'Variety / Farmer', width: '28%' },
  { key: 'count', label: 'Count', width: '12%' },
  { key: 'bagsReceived', label: 'Bags rec.', width: '14%' },
  { key: 'totalGradedBags', label: 'Graded bags', width: '14%' },
  { key: 'totalGradedWeightKg', label: 'Graded wt (kg)', width: '16%' },
  { key: 'wastageKg', label: 'Wastage (kg)', width: '16%' },
];

function ReportSummaryPage({
  companyName,
  dateRangeLabel,
  reportTitle,
  summary,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle: string;
  summary: GradingReportTableSummary;
}) {
  const fmt = (n: number) => n.toFixed(2);
  return (
    <Page size="A4" style={styles.summaryPage}>
      <ReportHeader
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={`${reportTitle} — Summary`}
      />
      <View style={[styles.summarySection, styles.summarySectionFirst]}>
        <Text style={styles.summaryTitle}>Variety-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {SUMMARY_COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === SUMMARY_COLUMNS.length - 1
                    ? styles.summaryCellLast
                    : {},
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
              {summary.byVariety.map((row) => (
                <View key={row.variety} style={styles.summaryTableRow}>
                  <Text
                    style={[
                      styles.summaryCellLeft,
                      { width: SUMMARY_COLUMNS[0].width },
                    ]}
                  >
                    {row.variety}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[1].width },
                    ]}
                  >
                    {fmt(row.count)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[2].width },
                    ]}
                  >
                    {fmt(row.bagsReceived)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[3].width },
                    ]}
                  >
                    {fmt(row.totalGradedBags)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[4].width },
                    ]}
                  >
                    {fmt(row.totalGradedWeightKg)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      styles.summaryCellLast,
                      { width: SUMMARY_COLUMNS[5].width },
                    ]}
                  >
                    {fmt(row.wastageKg)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryTableRowTotal}>
                <Text
                  style={[
                    styles.summaryCellLeft,
                    { width: SUMMARY_COLUMNS[0].width },
                  ]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[1].width },
                  ]}
                >
                  {fmt(summary.overall.count)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[2].width },
                  ]}
                >
                  {fmt(summary.overall.bagsReceived)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[3].width },
                  ]}
                >
                  {fmt(summary.overall.totalGradedBags)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[4].width },
                  ]}
                >
                  {fmt(summary.overall.totalGradedWeightKg)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: SUMMARY_COLUMNS[5].width },
                  ]}
                >
                  {fmt(summary.overall.wastageKg)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Farmer-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {SUMMARY_COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === SUMMARY_COLUMNS.length - 1
                    ? styles.summaryCellLast
                    : {},
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
              {summary.byFarmer.map((row) => (
                <View key={row.farmerName} style={styles.summaryTableRow}>
                  <Text
                    style={[
                      styles.summaryCellLeft,
                      { width: SUMMARY_COLUMNS[0].width },
                    ]}
                  >
                    {row.farmerName}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[1].width },
                    ]}
                  >
                    {fmt(row.count)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[2].width },
                    ]}
                  >
                    {fmt(row.bagsReceived)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[3].width },
                    ]}
                  >
                    {fmt(row.totalGradedBags)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[4].width },
                    ]}
                  >
                    {fmt(row.totalGradedWeightKg)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      styles.summaryCellLast,
                      { width: SUMMARY_COLUMNS[5].width },
                    ]}
                  >
                    {fmt(row.wastageKg)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryTableRowTotal}>
                <Text
                  style={[
                    styles.summaryCellLeft,
                    { width: SUMMARY_COLUMNS[0].width },
                  ]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[1].width },
                  ]}
                >
                  {fmt(summary.overall.count)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[2].width },
                  ]}
                >
                  {fmt(summary.overall.bagsReceived)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[3].width },
                  ]}
                >
                  {fmt(summary.overall.totalGradedBags)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[4].width },
                  ]}
                >
                  {fmt(summary.overall.totalGradedWeightKg)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: SUMMARY_COLUMNS[5].width },
                  ]}
                >
                  {fmt(summary.overall.wastageKg)}
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
            {SUMMARY_COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === SUMMARY_COLUMNS.length - 1
                    ? styles.summaryCellLast
                    : {},
                  { width: col.width },
                ]}
              >
                {col.key === 'name' ? '' : col.label}
              </Text>
            ))}
          </View>
          <View style={styles.summaryTableRowTotal}>
            <Text
              style={[
                styles.summaryCellLeft,
                { width: SUMMARY_COLUMNS[0].width },
              ]}
            >
              Total
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[1].width }]}
            >
              {fmt(summary.overall.count)}
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[2].width }]}
            >
              {fmt(summary.overall.bagsReceived)}
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[3].width }]}
            >
              {fmt(summary.overall.totalGradedBags)}
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[4].width }]}
            >
              {fmt(summary.overall.totalGradedWeightKg)}
            </Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: SUMMARY_COLUMNS[5].width },
              ]}
            >
              {fmt(summary.overall.wastageKg)}
            </Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

export const GradingReportTablePdf = ({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Grading Report',
  rows,
  tableSnapshot,
}: GradingReportTablePdfProps) => {
  const totals: Record<string, number> = {};
  for (const key of TOTAL_KEYS) {
    totals[key] = 0;
  }
  for (const row of rows) {
    for (const key of TOTAL_KEYS) {
      totals[key] += toNum((row as Record<string, unknown>)[key]);
    }
  }

  const summary = computeGradingReportSummary(rows);

  const useSnapshot =
    tableSnapshot &&
    tableSnapshot.rows.length > 0 &&
    (tableSnapshot.grouping.length > 0 ||
      tableSnapshot.visibleColumnIds.length > 0);

  const visibleColumnIds =
    useSnapshot && tableSnapshot!.visibleColumnIds.length > 0
      ? tableSnapshot!.visibleColumnIds
      : ALL_COLUMNS.map((c) => c.key);

  const grouping = useSnapshot ? tableSnapshot!.grouping : [];

  if (useSnapshot && tableSnapshot!.grouping.length > 0) {
    const sections = buildSectionsFromSnapshot(tableSnapshot!);
    const columnsForTable = getColumnsForPdf(visibleColumnIds, grouping);
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <ReportHeader
            companyName={companyName}
            dateRangeLabel={dateRangeLabel}
            reportTitle={reportTitle}
          />
          {sections.map((section, sectionIndex) => {
            const isFirstSection = sectionIndex === 0;
            return (
              <View
                key={sectionIndex}
                style={[
                  styles.farmerSection,
                  isFirstSection ? styles.farmerSectionFirst : {},
                ]}
              >
                {grouping.map((_, depth) => {
                  const h = section.headers[depth];
                  if (!h) return null;
                  if (h.groupingColumnId === 'farmerName')
                    return (
                      <FarmerBlockHeader
                        key={depth}
                        firstLeaf={section.leaves[0] ?? h.firstLeaf}
                      />
                    );
                  if (h.groupingColumnId === 'variety')
                    return (
                      <VarietyBlockHeader
                        key={depth}
                        variety={h.displayValue}
                      />
                    );
                  return (
                    <GenericBlockHeader
                      key={depth}
                      label={
                        GROUP_LABELS[h.groupingColumnId] ?? h.groupingColumnId
                      }
                      value={h.displayValue}
                    />
                  );
                })}
                <View style={styles.tableContainer}>
                  <View style={styles.table}>
                    <View style={styles.tableHeaderRow}>
                      {columnsForTable.map((col, i) => (
                        <Text
                          key={col.key}
                          style={[
                            col.align === 'left'
                              ? styles.cellLeft
                              : styles.cell,
                            i === columnsForTable.length - 1
                              ? styles.cellLast
                              : {},
                            { width: col.width },
                          ]}
                        >
                          {col.label}
                        </Text>
                      ))}
                    </View>
                    {section.leaves.length === 0 ? (
                      <View style={styles.tableRow}>
                        <Text
                          style={[
                            styles.cellLeft,
                            styles.cellLast,
                            { width: '100%', paddingVertical: 8 },
                          ]}
                        >
                          No rows in this group.
                        </Text>
                      </View>
                    ) : (
                      section.leaves.map((row) => (
                        <TableRow
                          key={row.id}
                          row={row}
                          columns={columnsForTable}
                        />
                      ))
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          <View style={styles.tableContainer}>
            <View style={styles.table}>
              <TotalsRow
                totals={totals}
                columns={getColumnsForPdf(visibleColumnIds)}
              />
            </View>
          </View>
        </Page>
        <ReportSummaryPage
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle={reportTitle}
          summary={summary}
        />
      </Document>
    );
  }

  const columnsForPdf =
    useSnapshot && tableSnapshot!.visibleColumnIds.length > 0
      ? getColumnsForPdf(tableSnapshot!.visibleColumnIds)
      : ALL_COLUMNS;

  const leafRows =
    useSnapshot && tableSnapshot!.rows.length > 0
      ? tableSnapshot!.rows
          .filter(
            (r): r is { type: 'leaf'; row: GradingReportRow } =>
              r.type === 'leaf'
          )
          .map((r) => r.row)
      : rows;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <ReportHeader
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle={reportTitle}
        />
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              {columnsForPdf.map((col, i) => (
                <Text
                  key={col.key}
                  style={[
                    col.align === 'left' ? styles.cellLeft : styles.cell,
                    i === columnsForPdf.length - 1 ? styles.cellLast : {},
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
                    { width: '100%', paddingVertical: 8 },
                  ]}
                >
                  No grading report data for this period.
                </Text>
              </View>
            ) : (
              <>
                {leafRows.map((row) => (
                  <TableRow key={row.id} row={row} columns={columnsForPdf} />
                ))}
                <TotalsRow totals={totals} columns={columnsForPdf} />
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
      />
    </Document>
  );
};
