import type { ReactElement } from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  type FarmerReportPdfSnapshot,
  type FarmerReportPdfRow,
  FARMER_REPORT_PDF_COLUMN_LABELS,
  FARMER_REPORT_ROW_SPAN_COLUMN_IDS,
} from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import GradingGatePassTablePdf from '@/components/pdf/grading-gate-pass-table-pdf';
import SeedAmountPayableTablePdf from '@/components/pdf/SeedAmountPayableTablePdf';
import SummaryTablePdf from '@/components/pdf/sumary-table-pdf';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import { groupStockLedgerRowsByVariety } from '@/utils/accountingReportGrouping';

/** Incoming column ids (table 1): display up to and including Actual (kg). Omits system gate pass no.; excludes Tot bags / Tot gross / Tot tare / Tot net / Tot bardana. */
const INCOMING_COLUMN_IDS = [
  'manualIncomingNo',
  'incomingDate',
  'store',
  'truckNumber',
  'variety',
  'bagsReceived',
  'weightSlipNo',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'lessBardanaKg',
  'actualWeightKg',
] as const;

/** Incoming columns that are summed in the per-variety total row (exclude IDs, dates, text). */
const INCOMING_SUM_COLUMN_IDS = new Set<string>([
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'lessBardanaKg',
  'actualWeightKg',
]);

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 12,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 4,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 10,
    textAlign: 'center',
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  dateRange: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 7,
    fontWeight: 700,
    color: '#333',
    marginTop: 10,
    marginBottom: 4,
  },
  varietySubsectionTitle: {
    fontSize: 6,
    fontWeight: 700,
    color: '#111827',
    marginTop: 6,
    marginBottom: 3,
    backgroundColor: '#e5e7eb',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tableContainer: {
    marginTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: BORDER,
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 1,
    paddingHorizontal: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 1,
    paddingHorizontal: 0,
  },
  varietyRow: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 1,
  },
  cell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    fontSize: 4,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  varietyCell: {
    paddingVertical: 1,
    paddingHorizontal: 2,
    fontSize: 3.5,
    fontWeight: 'bold',
  },
  headerCell: {
    fontWeight: 700,
    fontSize: 3.5,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellQtyLine: {
    fontSize: 4,
    textAlign: 'center',
  },
  cellWeightLine: {
    fontSize: 3,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 0,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 1,
    paddingHorizontal: 0,
  },
  totalCell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    fontSize: 4,
    fontWeight: 700,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: BORDER,
  },
});

function formatCellValue(value: string | number | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function parseQtyWeight(value: string): { qty: string; weight: string } | null {
  const match = value.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  if (match) return { qty: match[1].trim(), weight: match[2].trim() };
  return null;
}

function parseLocaleNumber(raw: string): number | null {
  const n = parseFloat(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

type IncomingColumnTotal =
  | { kind: 'none' }
  | { kind: 'simple'; sum: number }
  | { kind: 'qtyWeight'; qty: number; weight: number };

function computeIncomingColumnTotals(
  dataRows: (FarmerReportPdfRow & { type: 'data' })[],
  incomingColumnIds: string[]
): Record<string, IncomingColumnTotal> {
  const out: Record<string, IncomingColumnTotal> = {};
  for (const colId of incomingColumnIds) {
    if (!INCOMING_SUM_COLUMN_IDS.has(colId)) {
      out[colId] = { kind: 'none' };
      continue;
    }
    let simpleSum = 0;
    let qtySum = 0;
    let weightSum = 0;
    let anyQtyWeight = false;
    let anySimple = false;
    for (const row of dataRows) {
      const raw = formatCellValue(row.cells[colId]);
      if (raw === '—' || raw === '') continue;
      const qw = parseQtyWeight(raw);
      if (qw) {
        anyQtyWeight = true;
        const q = parseLocaleNumber(qw.qty);
        const w = parseLocaleNumber(qw.weight);
        if (q != null) qtySum += q;
        if (w != null) weightSum += w;
      } else {
        const n = parseLocaleNumber(raw);
        if (n != null) {
          anySimple = true;
          simpleSum += n;
        }
      }
    }
    if (anyQtyWeight) {
      out[colId] = { kind: 'qtyWeight', qty: qtySum, weight: weightSum };
    } else if (anySimple) {
      out[colId] = { kind: 'simple', sum: simpleSum };
    } else {
      out[colId] = { kind: 'none' };
    }
  }
  return out;
}

function formatIncomingTotalNumber(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/**
 * Rows shown in PDF incoming table: variety headers + all incoming data rows.
 * We include any data row that has at least one incoming identifier/value so
 * multiple incoming gate passes linked to the same grading pass are preserved.
 */
function filterIncomingPdfRows(
  rows: FarmerReportPdfRow[]
): FarmerReportPdfRow[] {
  const hasIncomingIdentity = (row: FarmerReportPdfRow & { type: 'data' }) => {
    const systemIncoming = formatCellValue(row.cells.systemIncomingNo);
    const manualIncoming = formatCellValue(row.cells.manualIncomingNo);
    return (
      systemIncoming !== '—' ||
      manualIncoming !== '—' ||
      (row.passRowIndex ?? 0) === 0
    );
  };

  return rows.filter(
    (row) =>
      row.type === 'variety' ||
      (row.type === 'data' && hasIncomingIdentity(row))
  );
}

/** Split into per-variety segments (or one segment when not grouped). */
function getIncomingSegmentsForPdf(
  filtered: FarmerReportPdfRow[],
  groupByVariety: boolean
): Array<{
  variety: string | null;
  dataRows: (FarmerReportPdfRow & { type: 'data' })[];
}> {
  if (!groupByVariety) {
    const dataRows = filtered.filter(
      (r): r is FarmerReportPdfRow & { type: 'data' } => r.type === 'data'
    );
    return dataRows.length ? [{ variety: null, dataRows }] : [];
  }
  const segments: Array<{
    variety: string | null;
    dataRows: (FarmerReportPdfRow & { type: 'data' })[];
  }> = [];
  let current: {
    variety: string | null;
    dataRows: (FarmerReportPdfRow & { type: 'data' })[];
  } = { variety: null, dataRows: [] };

  for (const row of filtered) {
    if (row.type === 'variety') {
      if (current.dataRows.length > 0) {
        segments.push({
          variety: current.variety,
          dataRows: current.dataRows,
        });
      }
      current = { variety: row.variety, dataRows: [] };
    } else {
      current.dataRows.push(row);
    }
  }
  if (current.dataRows.length > 0) {
    segments.push({ variety: current.variety, dataRows: current.dataRows });
  }
  return segments;
}

/** Farmer report: show manual incoming as "Gate Pass No". */
function getIncomingPdfColumnLabel(
  columnId: string,
  isFarmerReport: boolean
): string {
  if (isFarmerReport && columnId === 'manualIncomingNo') {
    return 'Gate Pass No';
  }
  return FARMER_REPORT_PDF_COLUMN_LABELS[columnId] ?? columnId;
}

export interface AccountingStockLedgerPdfProps {
  /** Same snapshot as farmer report (used for table 1 – incoming details up to Actual kg). */
  snapshot: FarmerReportPdfSnapshot;
  /** Rows for grading summary and summary tables (tables 2 & 3). */
  stockLedgerRows: StockLedgerRow[];
  /** When true, omit the grading gate pass page (farmer report: incoming + summary only). */
  hideGradingPage?: boolean;
}

/**
 * Accounting Report PDF: three tables –
 * 1. Incoming details (up to Actual (kg)),
 * 2. Grading summary (GradingGatePassTablePdf),
 * 3. Summary (SummaryTablePdf).
 */
export function AccountingStockLedgerPdf({
  snapshot,
  stockLedgerRows,
  hideGradingPage = false,
}: AccountingStockLedgerPdfProps) {
  const {
    companyName,
    farmerName,
    dateRangeLabel,
    reportTitle = 'Accounting Report',
    visibleColumnIds,
    rows,
    groupByVariety,
  } = snapshot;

  /** Table 1: only incoming columns (up to and including actualWeightKg). */
  const incomingColumnIds = visibleColumnIds.filter((id) =>
    (INCOMING_COLUMN_IDS as readonly string[]).includes(id)
  );
  const hasIncomingData = rows.some(
    (r) => r.type === 'data' || (r.type === 'variety' && groupByVariety)
  );

  const numIncomingCols = incomingColumnIds.length;
  const incomingColWidthPct =
    numIncomingCols > 0 ? `${(100 / numIncomingCols).toFixed(1)}%` : '100%';
  const getIncomingColWidth = () => incomingColWidthPct;

  const farmerDisplayName = farmerName ?? '';
  const stockLedgerByVariety = groupStockLedgerRowsByVariety(stockLedgerRows);

  const incomingPdfRows = filterIncomingPdfRows(rows);
  const incomingSegments = getIncomingSegmentsForPdf(
    incomingPdfRows,
    groupByVariety
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {companyName ? (
            <Text style={styles.companyName}>{companyName}</Text>
          ) : null}
          <Text style={styles.reportTitle}>{reportTitle}</Text>
          {farmerDisplayName ? (
            <Text style={styles.farmerName}>{farmerDisplayName}</Text>
          ) : null}
          <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        </View>

        {/* Table 1: Incoming details (up to Actual (kg)) */}
        {incomingColumnIds.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>1. Incoming Details</Text>
            <View style={styles.tableContainer}>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  {incomingColumnIds.map((id, i) => (
                    <View
                      key={id}
                      style={[
                        styles.cell,
                        styles.headerCell,
                        i === incomingColumnIds.length - 1
                          ? styles.cellLast
                          : {},
                        { width: getIncomingColWidth() },
                      ]}
                    >
                      <Text>
                        {getIncomingPdfColumnLabel(id, hideGradingPage)}
                      </Text>
                    </View>
                  ))}
                </View>
                {hasIncomingData ? (
                  incomingSegments.flatMap((segment, segIndex) => {
                    const totals = computeIncomingColumnTotals(
                      segment.dataRows,
                      incomingColumnIds
                    );
                    const keyBase = `inc-${segIndex}`;
                    const out: ReactElement[] = [];
                    if (groupByVariety) {
                      out.push(
                        <View
                          key={`${keyBase}-variety`}
                          style={styles.varietyRow}
                        >
                          <View
                            style={[
                              styles.varietyCell,
                              {
                                flex: 1,
                                borderRightWidth: 1,
                                borderColor: BORDER,
                              },
                            ]}
                          >
                            <Text>Variety: {segment.variety ?? '—'}</Text>
                          </View>
                        </View>
                      );
                    }
                    for (let i = 0; i < segment.dataRows.length; i++) {
                      out.push(
                        <IncomingDataRow
                          key={`${keyBase}-data-${i}`}
                          row={segment.dataRows[i]}
                          incomingColumnIds={incomingColumnIds}
                          getColWidth={getIncomingColWidth}
                        />
                      );
                    }
                    if (segment.dataRows.length > 0) {
                      out.push(
                        <IncomingTotalRow
                          key={`${keyBase}-total`}
                          incomingColumnIds={incomingColumnIds}
                          totals={totals}
                          getColWidth={getIncomingColWidth}
                        />
                      );
                    }
                    return out;
                  })
                ) : (
                  <View style={styles.tableRow}>
                    <View
                      style={[styles.cell, styles.cellLast, { width: '100%' }]}
                    >
                      <Text>No incoming data.</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </Page>

      {/* Page 2: Grading table only (skipped for farmer report) */}
      {!hideGradingPage ? (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.header}>
            {companyName ? (
              <Text style={styles.companyName}>{companyName}</Text>
            ) : null}
            <Text style={styles.reportTitle}>
              {reportTitle} – Grading Gate Pass
            </Text>
            {farmerDisplayName ? (
              <Text style={styles.farmerName}>{farmerDisplayName}</Text>
            ) : null}
            <Text style={styles.dateRange}>{dateRangeLabel}</Text>
          </View>
          <Text style={styles.sectionTitle}>2. Grading Gate Pass</Text>
          {stockLedgerByVariety.length === 0 ? (
            <Text style={styles.sectionTitle}>No grading gate pass data.</Text>
          ) : (
            stockLedgerByVariety.map(({ variety, rows: varietyRows }) => (
              <View key={`ggp-${variety}`}>
                <Text style={styles.varietySubsectionTitle}>
                  Variety: {variety}
                </Text>
                <GradingGatePassTablePdf
                  farmerName={farmerDisplayName}
                  rows={varietyRows}
                  hideReportSummary
                />
              </View>
            ))
          )}
          {stockLedgerByVariety.length > 0 ? (
            <SeedAmountPayableTablePdf />
          ) : null}
        </Page>
      ) : null}

      {/* Summary table (page 3 in full report; page 2 when grading is hidden) */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {companyName ? (
            <Text style={styles.companyName}>{companyName}</Text>
          ) : null}
          <Text style={styles.reportTitle}>{reportTitle} – Summary</Text>
          {farmerDisplayName ? (
            <Text style={styles.farmerName}>{farmerDisplayName}</Text>
          ) : null}
          <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        </View>
        <Text style={styles.sectionTitle}>
          {hideGradingPage ? '2. Summary' : '3. Summary'}
        </Text>
        {stockLedgerByVariety.length === 0 ? (
          <Text style={styles.sectionTitle}>No summary data.</Text>
        ) : (
          stockLedgerByVariety.map(({ variety, rows: varietyRows }) => (
            <View key={`sum-${variety}`}>
              <Text style={styles.varietySubsectionTitle}>
                Variety: {variety}
              </Text>
              <SummaryTablePdf rows={varietyRows} />
            </View>
          ))
        )}
      </Page>
    </Document>
  );
}

function IncomingTotalRow({
  incomingColumnIds,
  totals,
  getColWidth,
}: {
  incomingColumnIds: string[];
  totals: Record<string, IncomingColumnTotal>;
  getColWidth: () => string;
}) {
  return (
    <View style={styles.totalRow}>
      {incomingColumnIds.map((id, i) => {
        const t = totals[id];
        const isFirst = i === 0;
        return (
          <View
            key={id}
            style={[
              styles.totalCell,
              i === incomingColumnIds.length - 1 ? styles.cellLast : {},
              { width: getColWidth() },
            ]}
          >
            {isFirst ? (
              <Text wrap>Total</Text>
            ) : t.kind === 'simple' ? (
              <Text wrap>{formatIncomingTotalNumber(t.sum)}</Text>
            ) : t.kind === 'qtyWeight' ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.cellQtyLine}>
                  {formatIncomingTotalNumber(t.qty)}
                </Text>
                <Text style={styles.cellWeightLine}>
                  {formatIncomingTotalNumber(t.weight)}
                </Text>
              </View>
            ) : (
              <Text wrap>—</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function IncomingDataRow({
  row,
  incomingColumnIds,
  getColWidth,
}: {
  row: FarmerReportPdfRow & { type: 'data' };
  incomingColumnIds: string[];
  getColWidth: () => string;
}) {
  const passRowIndex = row.passRowIndex ?? 0;
  const isSpanColumn = (colId: string) =>
    FARMER_REPORT_ROW_SPAN_COLUMN_IDS.includes(
      colId as (typeof FARMER_REPORT_ROW_SPAN_COLUMN_IDS)[number]
    );
  return (
    <View style={styles.tableRow}>
      {incomingColumnIds.map((id, i) => {
        const showSpanValue = !isSpanColumn(id) || passRowIndex === 0;
        const raw = showSpanValue ? formatCellValue(row.cells[id]) : '—';
        const qtyWeight = parseQtyWeight(raw);
        return (
          <View
            key={id}
            style={[
              styles.cell,
              i === incomingColumnIds.length - 1 ? styles.cellLast : {},
              { width: getColWidth() },
            ]}
          >
            {qtyWeight ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.cellQtyLine}>{qtyWeight.qty}</Text>
                <Text style={styles.cellWeightLine}>{qtyWeight.weight}</Text>
              </View>
            ) : (
              <Text wrap>{raw}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
