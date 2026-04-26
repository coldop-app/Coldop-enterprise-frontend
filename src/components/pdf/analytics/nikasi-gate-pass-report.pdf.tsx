import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type {
  NikasiGatePassReportDataFlat,
  NikasiGatePassReportDataGrouped,
  NikasiGatePassReportDataGroupedByVariety,
  NikasiGatePassReportDataGroupedByVarietyAndFarmer,
  NikasiGatePassReportItem,
} from '@/types/analytics';
import { GRADING_SIZES } from '@/components/forms/grading/constants';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export type NikasiGatePassReportPdfData =
  | NikasiGatePassReportDataFlat
  | NikasiGatePassReportDataGrouped
  | NikasiGatePassReportDataGroupedByVariety
  | NikasiGatePassReportDataGroupedByVarietyAndFarmer;

export interface NikasiGatePassReportPdfProps {
  companyName?: string;
  dateRangeLabel: string;
  data: NikasiGatePassReportPdfData;
}

/** Per-size quantity issued for one gate pass row (no location) */
interface NikasiRow {
  date: string;
  voucher: string;
  manualNo: string;
  variety: string;
  from: string;
  to: string;
  sizeQtys: Record<string, number>;
  rowTotal: number;
  runningTotal: number;
  remarks: string;
}

function formatPdfDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = String(d.getFullYear()).slice(2);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function isGroupedByVarietyAndFarmer(
  data: NikasiGatePassReportPdfData
): data is NikasiGatePassReportDataGroupedByVarietyAndFarmer {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'farmers' in data[0]
  );
}

function isGroupedByVarietyOnly(
  data: NikasiGatePassReportPdfData
): data is NikasiGatePassReportDataGroupedByVariety {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function isGroupedByFarmer(
  data: NikasiGatePassReportPdfData
): data is NikasiGatePassReportDataGrouped {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'farmer' in data[0] &&
    'gatePasses' in data[0]
  );
}

/** Get flat list of all nikasi gate passes from any data shape */
function getFlatPasses(
  data: NikasiGatePassReportPdfData
): NikasiGatePassReportItem[] {
  if (isGroupedByVarietyAndFarmer(data)) {
    return data.flatMap((v) => v.farmers.flatMap((f) => f.gatePasses));
  }
  if (isGroupedByVarietyOnly(data)) {
    return data.flatMap((v) => v.gatePasses);
  }
  if (isGroupedByFarmer(data)) {
    return data.flatMap((g) => g.gatePasses);
  }
  return data as NikasiGatePassReportDataFlat;
}

function getFarmerNameFromPass(pass: NikasiGatePassReportItem): string {
  return pass.farmerStorageLinkId?.farmerId?.name ?? '—';
}

/** Per-pass row total from orderDetails (quantityIssued) */
function getPassTotalBags(pass: NikasiGatePassReportItem): number {
  return (pass.orderDetails ?? []).reduce(
    (sum, od) => sum + (od.quantityIssued ?? 0),
    0
  );
}

/** Per-size total for a pass */
function getPassSizeQtys(
  pass: NikasiGatePassReportItem
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const od of pass.orderDetails ?? []) {
    const size = od.size;
    const qty = od.quantityIssued ?? 0;
    if (size) out[size] = (out[size] ?? 0) + qty;
  }
  return out;
}

interface NikasiSummaryRowTotals {
  count: number;
  bags: number;
  bySize: Record<string, number>;
}

interface NikasiVarietySummaryRow {
  variety: string;
  count: number;
  bags: number;
  bySize: Record<string, number>;
}

interface NikasiFarmerSummaryRow {
  farmerName: string;
  count: number;
  bags: number;
  bySize: Record<string, number>;
}

interface NikasiSizeSummaryRow {
  size: string;
  bags: number;
}

interface NikasiReportSummary {
  byVariety: NikasiVarietySummaryRow[];
  byFarmer: NikasiFarmerSummaryRow[];
  bySize: NikasiSizeSummaryRow[];
  overall: NikasiSummaryRowTotals;
}

function computeNikasiReportSummary(
  passes: NikasiGatePassReportItem[]
): NikasiReportSummary {
  const varietyMap = new Map<string, NikasiSummaryRowTotals>();
  const farmerMap = new Map<string, NikasiSummaryRowTotals>();
  const sizeMap = new Map<string, number>();
  const overall: NikasiSummaryRowTotals = {
    count: 0,
    bags: 0,
    bySize: {},
  };

  for (const pass of passes) {
    const variety = pass.variety?.trim() || '—';
    const farmerName = getFarmerNameFromPass(pass);
    const bags = getPassTotalBags(pass);
    const sizeQtys = getPassSizeQtys(pass);

    overall.count += 1;
    overall.bags += bags;
    for (const [size, qty] of Object.entries(sizeQtys)) {
      overall.bySize[size] = (overall.bySize[size] ?? 0) + qty;
      sizeMap.set(size, (sizeMap.get(size) ?? 0) + qty);
    }

    const v = varietyMap.get(variety);
    if (v) {
      v.count += 1;
      v.bags += bags;
      for (const [size, qty] of Object.entries(sizeQtys)) {
        v.bySize[size] = (v.bySize[size] ?? 0) + qty;
      }
    } else {
      varietyMap.set(variety, { count: 1, bags, bySize: { ...sizeQtys } });
    }

    const f = farmerMap.get(farmerName);
    if (f) {
      f.count += 1;
      f.bags += bags;
      for (const [size, qty] of Object.entries(sizeQtys)) {
        f.bySize[size] = (f.bySize[size] ?? 0) + qty;
      }
    } else {
      farmerMap.set(farmerName, { count: 1, bags, bySize: { ...sizeQtys } });
    }
  }

  const byVariety: NikasiVarietySummaryRow[] = Array.from(varietyMap.entries())
    .map(([variety, t]) => ({ variety, ...t }))
    .sort((a, b) => a.variety.localeCompare(b.variety));
  const byFarmer: NikasiFarmerSummaryRow[] = Array.from(farmerMap.entries())
    .map(([farmerName, t]) => ({ farmerName, ...t }))
    .sort((a, b) => a.farmerName.localeCompare(b.farmerName));
  const sizeColumns = Array.from(sizeMap.keys()).sort((a, b) => {
    const ai = GRADING_SIZES.indexOf(a as (typeof GRADING_SIZES)[number]);
    const bi = GRADING_SIZES.indexOf(b as (typeof GRADING_SIZES)[number]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });
  const bySize: NikasiSizeSummaryRow[] = sizeColumns.map((size) => ({
    size,
    bags: sizeMap.get(size) ?? 0,
  }));

  return { byVariety, byFarmer, bySize, overall };
}

/** Get unique sizes from all passes in report order (GRADING_SIZES first). */
function getSizeColumns(passes: NikasiGatePassReportItem[]): string[] {
  const sizeSet = new Set<string>();
  for (const pass of passes) {
    for (const od of pass.orderDetails ?? []) {
      if (od.size) sizeSet.add(od.size);
    }
  }
  const ordered: string[] = [];
  for (const s of GRADING_SIZES) {
    if (sizeSet.has(s)) {
      ordered.push(s);
      sizeSet.delete(s);
    }
  }
  sizeSet.forEach((s) => ordered.push(s));
  return ordered;
}

function buildNikasiRows(
  passes: NikasiGatePassReportItem[],
  sizeColumns: string[]
): NikasiRow[] {
  const rows: NikasiRow[] = [];
  let runningTotal = 0;
  const sorted = [...passes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const pass of sorted) {
    const variety = pass.variety ?? '-';
    const remarks = pass.remarks ?? '-';
    const from = pass.from ?? '-';
    const to = pass.toField ?? '-';
    const dateStr = formatPdfDate(pass.date);
    const voucherStr = String(pass.gatePassNo ?? '');
    const manualStr =
      pass.manualGatePassNumber != null
        ? String(pass.manualGatePassNumber)
        : '-';

    const sizeQtys: Record<string, number> = sizeColumns.reduce(
      (acc, col) => ({ ...acc, [col]: 0 }),
      {}
    );
    let rowTotal = 0;
    for (const od of pass.orderDetails ?? []) {
      const size = od.size;
      const qty = od.quantityIssued ?? 0;
      if (size in sizeQtys) sizeQtys[size] = qty;
      else sizeQtys[size] = qty;
      rowTotal += qty;
    }
    runningTotal += rowTotal;
    rows.push({
      date: dateStr,
      voucher: voucherStr,
      manualNo: manualStr,
      variety,
      from,
      to,
      sizeQtys,
      rowTotal,
      runningTotal,
      remarks,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Styles */
/* ------------------------------------------------------------------ */

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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dateRange: {
    fontSize: 11,
    marginTop: 2,
  },
  farmerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  farmerInfoCol: {
    width: '48%',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 10,
  },
  infoLabel: {
    width: '40%',
    fontWeight: 'bold',
  },
  infoValue: {
    width: '60%',
  },
  ledgerContainer: {
    marginVertical: 12,
  },
  ledgerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 3,
  },
  cell: {
    padding: 2,
    fontSize: 9,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  cellLeft: {
    padding: 2,
    fontSize: 9,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellTotal: {
    backgroundColor: '#F5F5F5',
    fontWeight: 'bold',
  },
  cellGTotal: {
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
  },
  cellRemarks: {
    backgroundColor: '#F5F5F5',
  },
  rowTotals: {
    backgroundColor: '#E0E0E0',
    fontWeight: 'bold',
  },
  summary: {
    marginTop: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#F5F5F5',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryLabel: {
    width: '70%',
  },
  summaryValue: {
    width: '30%',
    textAlign: 'right',
    borderLeftWidth: 0.5,
    borderLeftColor: '#666',
    paddingLeft: 4,
  },
  summaryRowClosing: {
    backgroundColor: '#D0D0D0',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 6,
    fontSize: 9,
  },
  footerLeft: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  footerCenter: {
    flex: 1,
    marginLeft: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  footerLogo: {
    width: 24,
    height: 24,
    marginBottom: 3,
  },
  poweredBy: {
    fontSize: 10,
    color: '#555',
    fontStyle: 'italic',
  },
  pageNumber: {
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
    marginTop: 8,
  },
  summaryPage: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  summarySection: {
    marginTop: 10,
  },
  summarySectionFirst: {
    marginTop: 0,
  },
  summarySectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 2,
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
    paddingVertical: 2,
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
    paddingVertical: 2,
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

/* ------------------------------------------------------------------ */
/* Summary page */
/* ------------------------------------------------------------------ */

function NikasiReportSummaryPage({
  companyName,
  dateRangeLabel,
  summary,
}: {
  companyName: string;
  dateRangeLabel: string;
  summary: NikasiReportSummary;
}) {
  const fmt = (n: number) => (n === 0 ? '0' : String(n));
  const nameW = '28%';
  const numW = '8%';
  const sizeCols = summary.bySize.map((s) => s.size);
  const sizeW =
    sizeCols.length > 0 ? `${Math.max(6, 48 / sizeCols.length)}%` : '8%';

  const renderSummaryTable = (
    title: string,
    nameLabel: string,
    rows: {
      name: string;
      count: number;
      bags: number;
      bySize: Record<string, number>;
    }[],
    showTotal: boolean
  ) => (
    <View style={styles.summarySection}>
      <Text style={styles.summarySectionTitle}>{title}</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={[styles.summaryCellLeft, { width: nameW }]}>
            {nameLabel}
          </Text>
          <Text style={[styles.summaryCell, { width: numW }]}>GP Count</Text>
          <Text style={[styles.summaryCell, { width: numW }]}>Bags</Text>
          {sizeCols.map((col) => (
            <Text key={col} style={[styles.summaryCell, { width: sizeW }]}>
              {col}
            </Text>
          ))}
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: numW },
            ]}
          >
            Total
          </Text>
        </View>
        {rows.length === 0 ? (
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
            {rows.map((row) => (
              <View key={row.name} style={styles.summaryTableRow}>
                <Text style={[styles.summaryCellLeft, { width: nameW }]}>
                  {row.name}
                </Text>
                <Text style={[styles.summaryCell, { width: numW }]}>
                  {row.count}
                </Text>
                <Text style={[styles.summaryCell, { width: numW }]}>
                  {fmt(row.bags)}
                </Text>
                {sizeCols.map((col) => (
                  <Text
                    key={col}
                    style={[styles.summaryCell, { width: sizeW }]}
                  >
                    {fmt(row.bySize[col] ?? 0)}
                  </Text>
                ))}
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: numW },
                  ]}
                >
                  {fmt(row.bags)}
                </Text>
              </View>
            ))}
            {showTotal && (
              <View style={styles.summaryTableRowTotal}>
                <Text style={[styles.summaryCellLeft, { width: nameW }]}>
                  Total
                </Text>
                <Text style={[styles.summaryCell, { width: numW }]}>
                  {summary.overall.count}
                </Text>
                <Text style={[styles.summaryCell, { width: numW }]}>
                  {fmt(summary.overall.bags)}
                </Text>
                {sizeCols.map((col) => (
                  <Text
                    key={col}
                    style={[styles.summaryCell, { width: sizeW }]}
                  >
                    {fmt(summary.overall.bySize[col] ?? 0)}
                  </Text>
                ))}
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: numW },
                  ]}
                >
                  {fmt(summary.overall.bags)}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );

  return (
    <Page size="A4" orientation="landscape" style={styles.summaryPage}>
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.reportTitle}>
          DISPATCH (NIKASI) GATE PASS REPORT — Summary
        </Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
      </View>
      {renderSummaryTable(
        'Variety-wise total',
        'Variety',
        summary.byVariety.map((r) => ({
          name: r.variety,
          count: r.count,
          bags: r.bags,
          bySize: r.bySize,
        })),
        true
      )}
      {renderSummaryTable(
        'Farmer-wise total',
        'Farmer',
        summary.byFarmer.map((r) => ({
          name: r.farmerName,
          count: r.count,
          bags: r.bags,
          bySize: r.bySize,
        })),
        true
      )}
      <View style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>Size-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            <Text style={[styles.summaryCellLeft, { width: '70%' }]}>Size</Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: '30%' },
              ]}
            >
              Total Bags
            </Text>
          </View>
          {summary.bySize.map((row) => (
            <View key={row.size} style={styles.summaryTableRow}>
              <Text style={[styles.summaryCellLeft, { width: '70%' }]}>
                {row.size}
              </Text>
              <Text
                style={[
                  styles.summaryCell,
                  styles.summaryCellLast,
                  { width: '30%' },
                ]}
              >
                {fmt(row.bags)}
              </Text>
            </View>
          ))}
          <View style={styles.summaryTableRowTotal}>
            <Text style={[styles.summaryCellLeft, { width: '70%' }]}>
              Total
            </Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: '30%' },
              ]}
            >
              {fmt(summary.overall.bags)}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.summarySection, { marginTop: 8 }]}>
        <Text style={styles.summarySectionTitle}>Overall total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            <Text style={[styles.summaryCellLeft, { width: nameW }]}>
              Total
            </Text>
            <Text style={[styles.summaryCell, { width: numW }]}>GP Count</Text>
            <Text style={[styles.summaryCell, { width: numW }]}>Bags</Text>
            {sizeCols.map((col) => (
              <Text key={col} style={[styles.summaryCell, { width: sizeW }]}>
                {col}
              </Text>
            ))}
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: numW },
              ]}
            >
              Total
            </Text>
          </View>
          <View style={styles.summaryTableRowTotal}>
            <Text style={[styles.summaryCellLeft, { width: nameW }]}>—</Text>
            <Text style={[styles.summaryCell, { width: numW }]}>
              {summary.overall.count}
            </Text>
            <Text style={[styles.summaryCell, { width: numW }]}>
              {fmt(summary.overall.bags)}
            </Text>
            {sizeCols.map((col) => (
              <Text key={col} style={[styles.summaryCell, { width: sizeW }]}>
                {fmt(summary.overall.bySize[col] ?? 0)}
              </Text>
            ))}
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: numW },
              ]}
            >
              {fmt(summary.overall.bags)}
            </Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Table component */
/* ------------------------------------------------------------------ */

interface NikasiReportTableProps {
  companyName: string;
  dateRangeLabel: string;
  farmerName?: string;
  varietyLabel?: string;
  passes: NikasiGatePassReportItem[];
  pageIndex?: number;
  totalPages?: number;
}

const FIRST_PAGE_ENTRY_LIMIT = 11;
const SUBSEQUENT_PAGE_ENTRY_LIMIT = 12;

function splitPassesForPages(
  passes: NikasiGatePassReportItem[],
  firstPageLimit = FIRST_PAGE_ENTRY_LIMIT,
  subsequentPageLimit = SUBSEQUENT_PAGE_ENTRY_LIMIT
): NikasiGatePassReportItem[][] {
  if (passes.length === 0) return [];
  const chunks: NikasiGatePassReportItem[][] = [];
  let start = 0;
  let limit = firstPageLimit;
  while (start < passes.length) {
    chunks.push(passes.slice(start, start + limit));
    start += limit;
    limit = subsequentPageLimit;
  }
  return chunks;
}

function NikasiReportTable({
  companyName,
  dateRangeLabel,
  farmerName,
  varietyLabel,
  passes,
  pageIndex = 0,
  totalPages = 1,
}: NikasiReportTableProps) {
  const sizeColumns = getSizeColumns(passes);
  const rows = buildNikasiRows(passes, sizeColumns);

  const totalBySize = sizeColumns.reduce(
    (acc, col) => ({
      ...acc,
      [col]: rows.reduce((s, r) => s + (r.sizeQtys[col] ?? 0), 0),
    }),
    {} as Record<string, number>
  );
  const grandTotal = rows.reduce((s, r) => s + r.rowTotal, 0);

  const tableCols = [
    'DATE',
    'VOUCHER',
    'MANUAL NO',
    'VARIETY',
    'FROM',
    'TO',
    ...sizeColumns,
    'TOTAL',
    'G.TOTAL',
    'REMARKS',
  ];

  const colWidths: Record<string, string> = {
    DATE: '8%',
    VOUCHER: '6%',
    'MANUAL NO': '6%',
    VARIETY: '10%',
    FROM: '12%',
    TO: '12%',
    TOTAL: '6%',
    'G.TOTAL': '6%',
    REMARKS: '8%',
  };
  const sizeColWidth =
    sizeColumns.length > 0 ? `${Math.max(5, 64 / sizeColumns.length)}%` : '6%';

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.reportTitle}>
          DISPATCH (NIKASI) GATE PASS REPORT
        </Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
      </View>

      {varietyLabel != null && (
        <View style={styles.farmerInfo}>
          <View style={styles.farmerInfoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Variety:</Text>
              <Text style={styles.infoValue}>{varietyLabel}</Text>
            </View>
          </View>
        </View>
      )}

      {farmerName != null && (
        <View style={styles.farmerInfo}>
          <View style={styles.farmerInfoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Farmer:</Text>
              <Text style={styles.infoValue}>{farmerName}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.ledgerContainer}>
        <Text style={styles.ledgerTitle}>Dispatch Gate Pass Details</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            {tableCols.map((col, i) => (
              <Text
                key={col}
                style={[
                  col === 'VARIETY' || col === 'FROM' || col === 'TO'
                    ? styles.cellLeft
                    : styles.cell,
                  ...(i === tableCols.length - 1 ? [styles.cellLast] : []),
                  ...(col === 'TOTAL' ? [styles.cellTotal] : []),
                  ...(col === 'G.TOTAL' ? [styles.cellGTotal] : []),
                  ...(col === 'REMARKS' ? [styles.cellRemarks] : []),
                  {
                    width: sizeColumns.includes(col)
                      ? sizeColWidth
                      : (colWidths[col] ?? '6%'),
                  },
                ]}
              >
                {col}
              </Text>
            ))}
          </View>
          {rows.map((r, idx) => (
            <View key={`${r.date}-${r.voucher}-${idx}`} style={styles.tableRow}>
              <Text style={[styles.cell, { width: '8%' }]}>{r.date}</Text>
              <Text style={[styles.cell, { width: '6%' }]}>{r.voucher}</Text>
              <Text style={[styles.cell, { width: '6%' }]}>{r.manualNo}</Text>
              <Text style={[styles.cellLeft, { width: '10%' }]}>
                {r.variety}
              </Text>
              <Text style={[styles.cellLeft, { width: '12%' }]}>{r.from}</Text>
              <Text style={[styles.cellLeft, { width: '12%' }]}>{r.to}</Text>
              {sizeColumns.map((col) => (
                <Text key={col} style={[styles.cell, { width: sizeColWidth }]}>
                  {r.sizeQtys[col] ?? 0}
                </Text>
              ))}
              <Text style={[styles.cell, styles.cellTotal, { width: '6%' }]}>
                {r.rowTotal}
              </Text>
              <Text style={[styles.cell, styles.cellGTotal, { width: '6%' }]}>
                {r.runningTotal}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.cellRemarks,
                  styles.cellLast,
                  { width: '8%' },
                ]}
              >
                {r.remarks}
              </Text>
            </View>
          ))}
          {rows.length > 0 && (
            <View style={[styles.tableRow, styles.rowTotals]}>
              <Text style={[styles.cell, { width: '8%' }]}>TOTAL</Text>
              <Text style={[styles.cell, { width: '6%' }]}>-</Text>
              <Text style={[styles.cell, { width: '6%' }]}>-</Text>
              <Text style={[styles.cellLeft, { width: '10%' }]}>-</Text>
              <Text style={[styles.cellLeft, { width: '12%' }]}>-</Text>
              <Text style={[styles.cellLeft, { width: '12%' }]}>-</Text>
              {sizeColumns.map((col) => (
                <Text key={col} style={[styles.cell, { width: sizeColWidth }]}>
                  {totalBySize[col] ?? 0}
                </Text>
              ))}
              <Text style={[styles.cell, styles.cellTotal, { width: '6%' }]}>
                {grandTotal}
              </Text>
              <Text style={[styles.cell, styles.cellGTotal, { width: '6%' }]}>
                {grandTotal}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.cellRemarks,
                  styles.cellLast,
                  { width: '8%' },
                ]}
              >
                -
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Account Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Dispatch Gate Passes:</Text>
          <Text style={styles.summaryValue}>{rows.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Bags Dispatched:</Text>
          <Text style={styles.summaryValue}>{grandTotal}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowClosing]}>
          <Text style={styles.summaryLabel}>CLOSING BALANCE:</Text>
          <Text style={styles.summaryValue}>{grandTotal}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={{ fontSize: 9 }}>
            Authorized Signature: ____________________
          </Text>
        </View>
        <View style={styles.footerCenter}>
          <View style={{ alignItems: 'center' }}>
            <Image
              src="https://res.cloudinary.com/dakh64xhy/image/upload/v1753172868/profile_pictures/lhdlzskpe2gj8dq8jvzl.png"
              style={styles.footerLogo}
            />
            <Text style={styles.poweredBy}>Powered by Coldop</Text>
          </View>
        </View>
        <View style={styles.footerRight}>
          <Text style={{ fontSize: 9 }}>
            Date: {dateRangeLabel.split(' – ')[0] ?? ''}
          </Text>
        </View>
      </View>

      <Text style={styles.pageNumber}>
        Page {pageIndex + 1}
        {totalPages > 1 ? ` of ${totalPages}` : ''}
      </Text>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Export */
/* ------------------------------------------------------------------ */

export function NikasiGatePassReportPdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  data,
}: NikasiGatePassReportPdfProps) {
  const company = companyName;
  const flatPasses = getFlatPasses(data);
  const summary = computeNikasiReportSummary(flatPasses);

  if (isGroupedByVarietyAndFarmer(data)) {
    const pagedSections = data.flatMap((varietyItem) =>
      varietyItem.farmers.flatMap((group) =>
        splitPassesForPages(group.gatePasses).map((chunkPasses, chunkIdx) => ({
          key: `${varietyItem.variety}-${group.farmer._id}-${chunkIdx}`,
          varietyLabel: varietyItem.variety,
          farmerName: group.farmer.name,
          passes: chunkPasses,
        }))
      )
    );
    const totalPages = pagedSections.length;
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" orientation="landscape" style={styles.page}>
            <NikasiReportTable
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              passes={[]}
              totalPages={1}
            />
          </Page>
        ) : (
          pagedSections.map((section, pageIndex) => (
            <Page
              key={section.key}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <NikasiReportTable
                companyName={company}
                dateRangeLabel={dateRangeLabel}
                varietyLabel={section.varietyLabel}
                farmerName={section.farmerName}
                passes={section.passes}
                pageIndex={pageIndex}
                totalPages={totalPages}
              />
            </Page>
          ))
        )}
        <NikasiReportSummaryPage
          companyName={company}
          dateRangeLabel={dateRangeLabel}
          summary={summary}
        />
      </Document>
    );
  }

  if (isGroupedByVarietyOnly(data)) {
    const pagedSections = data.flatMap((varietyItem) =>
      splitPassesForPages(varietyItem.gatePasses).map(
        (chunkPasses, chunkIdx) => ({
          key: `${varietyItem.variety}-${chunkIdx}`,
          varietyLabel: varietyItem.variety,
          passes: chunkPasses,
        })
      )
    );
    const totalPages = pagedSections.length;
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" orientation="landscape" style={styles.page}>
            <NikasiReportTable
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              passes={[]}
              totalPages={1}
            />
          </Page>
        ) : (
          pagedSections.map((section, pageIndex) => (
            <Page
              key={section.key}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <NikasiReportTable
                companyName={company}
                dateRangeLabel={dateRangeLabel}
                varietyLabel={section.varietyLabel}
                passes={section.passes}
                pageIndex={pageIndex}
                totalPages={totalPages}
              />
            </Page>
          ))
        )}
        <NikasiReportSummaryPage
          companyName={company}
          dateRangeLabel={dateRangeLabel}
          summary={summary}
        />
      </Document>
    );
  }

  if (isGroupedByFarmer(data)) {
    const pagedSections = data.flatMap((group) =>
      splitPassesForPages(group.gatePasses).map((chunkPasses, chunkIdx) => ({
        key: `${group.farmer._id}-${chunkIdx}`,
        farmerName: group.farmer.name,
        passes: chunkPasses,
      }))
    );
    const totalPages = pagedSections.length;
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" orientation="landscape" style={styles.page}>
            <NikasiReportTable
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              passes={[]}
              totalPages={1}
            />
          </Page>
        ) : (
          pagedSections.map((section, pageIndex) => (
            <Page
              key={section.key}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <NikasiReportTable
                companyName={company}
                dateRangeLabel={dateRangeLabel}
                farmerName={section.farmerName}
                passes={section.passes}
                pageIndex={pageIndex}
                totalPages={totalPages}
              />
            </Page>
          ))
        )}
        <NikasiReportSummaryPage
          companyName={company}
          dateRangeLabel={dateRangeLabel}
          summary={summary}
        />
      </Document>
    );
  }

  const pagedFlatPasses = splitPassesForPages(flatPasses);
  const totalFlatPages = pagedFlatPasses.length;

  return (
    <Document>
      {pagedFlatPasses.length === 0 ? (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <NikasiReportTable
            companyName={company}
            dateRangeLabel={dateRangeLabel}
            passes={[]}
            totalPages={1}
          />
        </Page>
      ) : (
        pagedFlatPasses.map((chunkPasses, pageIndex) => (
          <Page
            key={`flat-page-${pageIndex + 1}`}
            size="A4"
            orientation="landscape"
            style={styles.page}
          >
            <NikasiReportTable
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              passes={chunkPasses}
              pageIndex={pageIndex}
              totalPages={totalFlatPages}
            />
          </Page>
        ))
      )}
      <NikasiReportSummaryPage
        companyName={company}
        dateRangeLabel={dateRangeLabel}
        summary={summary}
      />
    </Document>
  );
}
