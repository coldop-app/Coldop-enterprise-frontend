import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  type FarmerReportPdfSnapshot,
  type FarmerReportPdfRow,
  FARMER_REPORT_PDF_COLUMN_LABELS,
  FARMER_REPORT_ROW_SPAN_COLUMN_IDS,
} from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import GradingGatePassTablePdf from '@/components/pdf/grading-gate-pass-table-pdf';
import SummaryTablePdf from '@/components/pdf/sumary-table-pdf';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import { groupStockLedgerRowsByVariety } from '@/utils/accountingReportGrouping';

/** Incoming column ids (table 1): display up to and including Actual (kg). Excludes Tot bags / Tot gross / Tot tare / Tot net / Tot bardana. */
const INCOMING_COLUMN_IDS = [
  'systemIncomingNo',
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

/** Farmer report: drop system incoming column; show manual as "Gate Pass No". */
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
  const incomingColumnIdsForPdf = hideGradingPage
    ? incomingColumnIds.filter((id) => id !== 'systemIncomingNo')
    : incomingColumnIds;
  const hasIncomingData = rows.some(
    (r) => r.type === 'data' || (r.type === 'variety' && groupByVariety)
  );

  const numIncomingCols = incomingColumnIdsForPdf.length;
  const incomingColWidthPct =
    numIncomingCols > 0 ? `${(100 / numIncomingCols).toFixed(1)}%` : '100%';
  const getIncomingColWidth = () => incomingColWidthPct;

  const farmerDisplayName = farmerName ?? '';
  const stockLedgerByVariety = groupStockLedgerRowsByVariety(stockLedgerRows);

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
        {incomingColumnIdsForPdf.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>1. Incoming Details</Text>
            <View style={styles.tableContainer}>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  {incomingColumnIdsForPdf.map((id, i) => (
                    <View
                      key={id}
                      style={[
                        styles.cell,
                        styles.headerCell,
                        i === incomingColumnIdsForPdf.length - 1
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
                  rows
                    .filter(
                      (row) =>
                        row.type === 'variety' ||
                        (row.type === 'data' && (row.passRowIndex ?? 0) === 0)
                    )
                    .map((row, rowIndex) =>
                      row.type === 'variety' ? (
                        <View
                          key={`variety-${rowIndex}`}
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
                            <Text>Variety: {row.variety || '—'}</Text>
                          </View>
                        </View>
                      ) : (
                        <IncomingDataRow
                          key={`data-${rowIndex}`}
                          row={row}
                          incomingColumnIds={incomingColumnIdsForPdf}
                          getColWidth={getIncomingColWidth}
                        />
                      )
                    )
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
