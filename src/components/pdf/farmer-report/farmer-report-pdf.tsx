import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportSummarySectionPdf } from '@/components/pdf/grading-gate-pass-table-pdf';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import {
  type FarmerReportPdfSnapshot,
  FARMER_REPORT_PDF_COLUMN_LABELS,
  FARMER_REPORT_ROW_SPAN_COLUMN_IDS,
} from './farmer-report-pdf-types';

/** Bag size column ids – these get a reduced width (qty + weight stacked). */
const BAG_SIZE_COLUMN_IDS = new Set([
  'B30',
  '30-40',
  '35-40',
  '40-45',
  '45-50',
  '50-55',
  'A50',
  'A55',
  'CUT',
]);

/** Match stockLedgerMainTablePdf: page fontSize 4, header 3.5, cells 4; A4 landscape for width. */
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
  tableContainer: {
    marginTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 1,
    paddingHorizontal: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 1,
    paddingHorizontal: 0,
  },
  varietyRow: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 1,
  },
  cell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    fontSize: 4,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
  },
  cellLeft: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    fontSize: 4,
    textAlign: 'left',
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
  },
  cellLast: {
    borderRightWidth: 0,
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
  /** Quantity (bags) - primary line in size cells */
  cellQtyLine: {
    fontSize: 4,
    textAlign: 'center',
  },
  /** Weight (kg) - secondary line below quantity, muted */
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

/** Parse "qty (weight)" format used in size columns. Returns null if not that format. */
function parseQtyWeight(value: string): { qty: string; weight: string } | null {
  const match = value.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  if (match) return { qty: match[1].trim(), weight: match[2].trim() };
  return null;
}

export interface FarmerReportPdfProps {
  snapshot: FarmerReportPdfSnapshot;
  /** When provided, Report Summary (Variety, Size, Farmer) is shown below the main table. */
  stockLedgerRows?: StockLedgerRow[];
}

export function FarmerReportPdf({
  snapshot,
  stockLedgerRows,
}: FarmerReportPdfProps) {
  const {
    companyName,
    farmerName,
    dateRangeLabel,
    reportTitle = 'Grading Gate Pass Report',
    visibleColumnIds,
    rows,
  } = snapshot;

  if (rows.length === 0) {
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.header}>
            {companyName ? (
              <Text style={styles.companyName}>{companyName}</Text>
            ) : null}
            <Text style={styles.reportTitle}>{reportTitle}</Text>
            {farmerName ? (
              <Text style={styles.farmerName}>{farmerName}</Text>
            ) : null}
            <Text style={styles.dateRange}>{dateRangeLabel}</Text>
          </View>
          <Text style={{ fontSize: 4 }}>No data to display.</Text>
        </Page>
      </Document>
    );
  }

  const numCols = visibleColumnIds.length;
  const numSizeCols = visibleColumnIds.filter((id) =>
    BAG_SIZE_COLUMN_IDS.has(id)
  ).length;
  const hasAmountPayable = visibleColumnIds.includes('amountPayable');
  const numOtherCols = numCols - numSizeCols - (hasAmountPayable ? 1 : 0);
  /** Bag size columns: narrow (qty + weight stacked). Amount Payable: wider. Rest share the remainder. */
  const SIZE_COL_WIDTH_PCT = 1.65;
  const AMOUNT_PAYABLE_WIDTH_PCT = 6;
  const sizeTotalPct = numSizeCols * SIZE_COL_WIDTH_PCT;
  const amountPayablePct = hasAmountPayable ? AMOUNT_PAYABLE_WIDTH_PCT : 0;
  const remainingPct = 100 - sizeTotalPct - amountPayablePct;
  const otherColWidthPct = numOtherCols > 0 ? remainingPct / numOtherCols : 0;
  const getColWidth = (id: string): string => {
    if (BAG_SIZE_COLUMN_IDS.has(id)) return `${SIZE_COL_WIDTH_PCT}%`;
    if (id === 'amountPayable') return `${AMOUNT_PAYABLE_WIDTH_PCT}%`;
    return `${Math.max(0, otherColWidthPct).toFixed(1)}%`;
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          {companyName ? (
            <Text style={styles.companyName}>{companyName}</Text>
          ) : null}
          <Text style={styles.reportTitle}>{reportTitle}</Text>
          {farmerName ? (
            <Text style={styles.farmerName}>{farmerName}</Text>
          ) : null}
          <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.table}>
            {/* Header row */}
            <View style={styles.tableHeaderRow}>
              {visibleColumnIds.map((id, i) => (
                <View
                  key={id}
                  style={[
                    styles.cell,
                    styles.headerCell,
                    i === visibleColumnIds.length - 1 ? styles.cellLast : {},
                    { width: getColWidth(id) },
                  ]}
                >
                  <Text>{FARMER_REPORT_PDF_COLUMN_LABELS[id] ?? id}</Text>
                </View>
              ))}
            </View>

            {/* Body */}
            {rows.map((row, rowIndex) => {
              if (row.type === 'variety') {
                return (
                  <View key={`variety-${rowIndex}`} style={styles.varietyRow}>
                    <View style={[styles.varietyCell, { flex: 1 }]}>
                      <Text>Variety: {row.variety || '—'}</Text>
                    </View>
                  </View>
                );
              }
              const passRowIndex = row.passRowIndex ?? 0;
              const isSpanColumn = (colId: string) =>
                FARMER_REPORT_ROW_SPAN_COLUMN_IDS.includes(
                  colId as (typeof FARMER_REPORT_ROW_SPAN_COLUMN_IDS)[number]
                );
              return (
                <View key={`data-${rowIndex}`} style={styles.tableRow}>
                  {visibleColumnIds.map((id, i) => {
                    const showSpanValue =
                      !isSpanColumn(id) || passRowIndex === 0;
                    const raw = showSpanValue
                      ? formatCellValue(row.cells[id])
                      : '—';
                    const qtyWeight = parseQtyWeight(raw);
                    return (
                      <View
                        key={id}
                        style={[
                          styles.cell,
                          i === visibleColumnIds.length - 1
                            ? styles.cellLast
                            : {},
                          { width: getColWidth(id) },
                        ]}
                      >
                        {qtyWeight ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={styles.cellQtyLine}>
                              {qtyWeight.qty}
                            </Text>
                            <Text style={styles.cellWeightLine}>
                              {qtyWeight.weight}
                            </Text>
                          </View>
                        ) : (
                          <Text wrap>{raw}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </View>

        {stockLedgerRows != null && stockLedgerRows.length > 0 && (
          <ReportSummarySectionPdf
            farmerName={farmerName ?? ''}
            rows={stockLedgerRows}
          />
        )}
      </Page>
    </Document>
  );
}
