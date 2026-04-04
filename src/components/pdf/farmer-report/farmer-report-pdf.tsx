import type { ReactNode } from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { ReportSummarySectionPdf } from '@/components/pdf/grading-gate-pass-table-pdf';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import {
  type FarmerReportPdfRow,
  type FarmerReportPdfSnapshot,
  FARMER_REPORT_PDF_COLUMN_LABELS,
} from './farmer-report-pdf-types';

type FarmerReportPdfDataRow = Extract<FarmerReportPdfRow, { type: 'data' }>;

/**
 * Grading-pass-level columns: one merged cell spanning all sub-rows (incoming lines /
 * bag-type lines), matching grading-report-table-pdf grouped layout.
 */
const FARMER_PDF_PASS_SPAN_COLUMN_IDS = new Set<string>([
  'gradingGatePassNo',
  'gradingManualNo',
  'gradingDate',
  'postGradingBags',
  'actualWeightOfPotato',
  'wastage',
  'wastagePercent',
  'amountPayable',
]);

/** Min height per stacked sub-row inside a pass group (incoming + type + sizes per line). */
const FARMER_PDF_SUB_ROW_MIN_HEIGHT = 11;

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
  /** Distribution section (variety + size charts as tables) */
  distributionSection: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 2,
    padding: 6,
    backgroundColor: '#fafafa',
  },
  distributionTitle: {
    fontSize: 6,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  distributionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  distributionTable: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minWidth: 0,
  },
  distributionTableTitle: {
    fontSize: 4,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  distributionHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  distributionDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#e5e7eb',
    paddingVertical: 1,
    paddingHorizontal: 2,
  },
  distributionCell: {
    fontSize: 3.5,
    borderRightWidth: 0.5,
    borderColor: '#e5e7eb',
    paddingRight: 2,
  },
  distributionCellLast: {
    borderRightWidth: 0,
  },
});

function formatCellValue(value: string | number | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}

function sliceNextPassGroup(
  rows: FarmerReportPdfRow[],
  startIndex: number
): { group: FarmerReportPdfDataRow[]; nextIndex: number } | null {
  const first = rows[startIndex];
  if (!first || first.type !== 'data') return null;
  const declared = Math.max(1, first.passGroupSize ?? 1);
  const group: FarmerReportPdfDataRow[] = [];
  for (let j = 0; j < declared && startIndex + j < rows.length; j++) {
    const r = rows[startIndex + j];
    if (r.type !== 'data') break;
    group.push(r);
  }
  return { group, nextIndex: startIndex + group.length };
}

function FarmerPdfCellBody({ raw }: { raw: string }) {
  const qtyWeight = parseQtyWeight(raw);
  if (qtyWeight) {
    return (
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.cellQtyLine}>{qtyWeight.qty}</Text>
        <Text style={styles.cellWeightLine}>{qtyWeight.weight}</Text>
      </View>
    );
  }
  return (
    <Text style={{ fontSize: 4, textAlign: 'center' }} wrap>
      {raw}
    </Text>
  );
}

function FarmerPassGroupPdfRow({
  group,
  visibleColumnIds,
  getColWidth,
}: {
  group: FarmerReportPdfDataRow[];
  visibleColumnIds: string[];
  getColWidth: (id: string) => string;
}) {
  const first = group[0]!;
  const groupHeight = group.length * FARMER_PDF_SUB_ROW_MIN_HEIGHT;

  return (
    <View wrap={false} style={[styles.tableRow, { minHeight: groupHeight }]}>
      {visibleColumnIds.map((id, i) => {
        const isSpan = FARMER_PDF_PASS_SPAN_COLUMN_IDS.has(id);
        const baseCol = [
          styles.cell,
          i === visibleColumnIds.length - 1 ? styles.cellLast : {},
          { width: getColWidth(id), minWidth: 0 },
        ];

        if (isSpan) {
          return (
            <View
              key={id}
              style={[
                ...baseCol,
                { minHeight: groupHeight, justifyContent: 'center' },
              ]}
            >
              <FarmerPdfCellBody raw={formatCellValue(first.cells[id])} />
            </View>
          );
        }

        return (
          <View key={id} style={baseCol}>
            <View style={{ flexDirection: 'column', flex: 1 }}>
              {group.map((row, rowIdx) => (
                <View
                  key={rowIdx}
                  style={{
                    minHeight: FARMER_PDF_SUB_ROW_MIN_HEIGHT,
                    justifyContent: 'center',
                    ...(rowIdx < group.length - 1
                      ? {
                          borderBottomWidth: 1,
                          borderBottomColor: '#e5e7eb',
                        }
                      : {}),
                  }}
                >
                  <FarmerPdfCellBody raw={formatCellValue(row.cells[id])} />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Parse "qty (weight)" format used in size columns. Returns null if not that format. */
function parseQtyWeight(value: string): { qty: string; weight: string } | null {
  const match = value.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  if (match) return { qty: match[1].trim(), weight: match[2].trim() };
  return null;
}

/** Extract numeric bag quantity from a cell value (e.g. "12 (34)" or "12"). */
function parseBagQty(raw: string | number | undefined): number {
  if (raw == null || raw === '') return 0;
  const str = String(raw).trim();
  const qw = parseQtyWeight(str);
  if (qw) {
    const n = Number(qw.qty.replace(/,/g, ''));
    return Number.isNaN(n) ? 0 : n;
  }
  const n = Number(str.replace(/,/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

export interface VarietyDistributionItem {
  name: string;
  value: number;
  percentage: number;
}

export interface SizeDistributionItem {
  name: string;
  value: number;
  percentage: number;
}

/** Compute variety and size distribution from snapshot rows (same logic as on-screen charts). */
function computeDistributionFromSnapshot(snapshot: FarmerReportPdfSnapshot): {
  varietyDistribution: VarietyDistributionItem[];
  sizeDistribution: SizeDistributionItem[];
  totalBags: number;
} {
  const varietyMap = new Map<string, number>();
  const sizeMap = new Map<string, number>();
  const sizeColumnIds = snapshot.visibleColumnIds.filter((id) =>
    BAG_SIZE_COLUMN_IDS.has(id)
  );
  let currentVariety = '—';
  for (const row of snapshot.rows) {
    if (row.type === 'variety') {
      currentVariety =
        row.variety != null && String(row.variety).trim() !== ''
          ? String(row.variety).trim()
          : '—';
      continue;
    }
    if (row.type !== 'data') continue;
    for (const sizeId of sizeColumnIds) {
      const qty = parseBagQty(row.cells[sizeId]);
      if (qty > 0) {
        varietyMap.set(
          currentVariety,
          (varietyMap.get(currentVariety) ?? 0) + qty
        );
        const label = FARMER_REPORT_PDF_COLUMN_LABELS[sizeId] ?? sizeId;
        sizeMap.set(label, (sizeMap.get(label) ?? 0) + qty);
      }
    }
  }
  const totalBags = Array.from(sizeMap.values()).reduce((a, b) => a + b, 0);
  const varietyDistribution: VarietyDistributionItem[] = Array.from(
    varietyMap.entries()
  )
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalBags > 0 ? (value / totalBags) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
  const sizeDistribution: SizeDistributionItem[] = Array.from(sizeMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalBags > 0 ? (value / totalBags) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
  return {
    varietyDistribution,
    sizeDistribution,
    totalBags,
  };
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

  const distribution = computeDistributionFromSnapshot(snapshot);
  const hasDistribution =
    distribution.totalBags > 0 &&
    (distribution.varietyDistribution.length > 0 ||
      distribution.sizeDistribution.length > 0);

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

            {/* Body: group rows by grading pass so grading-side columns span vertically. */}
            {(() => {
              const body: ReactNode[] = [];
              let rowIndex = 0;
              while (rowIndex < rows.length) {
                const row = rows[rowIndex];
                if (row.type === 'variety') {
                  body.push(
                    <View key={`variety-${rowIndex}`} style={styles.varietyRow}>
                      <View style={[styles.varietyCell, { flex: 1 }]}>
                        <Text>Variety: {row.variety || '—'}</Text>
                      </View>
                    </View>
                  );
                  rowIndex += 1;
                  continue;
                }
                const sliced = sliceNextPassGroup(rows, rowIndex);
                if (sliced) {
                  const key = `group-${rowIndex}`;
                  body.push(
                    <FarmerPassGroupPdfRow
                      key={key}
                      group={sliced.group}
                      visibleColumnIds={visibleColumnIds}
                      getColWidth={getColWidth}
                    />
                  );
                  rowIndex = sliced.nextIndex;
                } else {
                  rowIndex += 1;
                }
              }
              return body;
            })()}
          </View>
        </View>

        {hasDistribution && (
          <View style={styles.distributionSection}>
            <Text style={styles.distributionTitle}>
              Variety & Size Distribution
            </Text>
            <View style={styles.distributionGrid}>
              <View style={styles.distributionTable}>
                <Text style={styles.distributionTableTitle}>
                  Variety Distribution
                </Text>
                <View style={styles.distributionHeaderRow}>
                  <Text style={[styles.distributionCell, { width: '50%' }]}>
                    Variety
                  </Text>
                  <Text
                    style={[
                      styles.distributionCell,
                      { width: '25%', textAlign: 'right' },
                    ]}
                  >
                    Bags
                  </Text>
                  <Text
                    style={[
                      styles.distributionCell,
                      styles.distributionCellLast,
                      { width: '25%', textAlign: 'right' },
                    ]}
                  >
                    %
                  </Text>
                </View>
                {distribution.varietyDistribution.map((item) => (
                  <View key={item.name} style={styles.distributionDataRow}>
                    <Text style={[styles.distributionCell, { width: '50%' }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.distributionCell,
                        { width: '25%', textAlign: 'right' },
                      ]}
                    >
                      {item.value.toLocaleString('en-IN')}
                    </Text>
                    <Text
                      style={[
                        styles.distributionCell,
                        styles.distributionCellLast,
                        { width: '25%', textAlign: 'right' },
                      ]}
                    >
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.distributionTable}>
                <Text style={styles.distributionTableTitle}>
                  Size-wise Distribution
                </Text>
                <View style={styles.distributionHeaderRow}>
                  <Text style={[styles.distributionCell, { width: '50%' }]}>
                    Size
                  </Text>
                  <Text
                    style={[
                      styles.distributionCell,
                      { width: '25%', textAlign: 'right' },
                    ]}
                  >
                    Bags
                  </Text>
                  <Text
                    style={[
                      styles.distributionCell,
                      styles.distributionCellLast,
                      { width: '25%', textAlign: 'right' },
                    ]}
                  >
                    %
                  </Text>
                </View>
                {distribution.sizeDistribution.map((item) => (
                  <View key={item.name} style={styles.distributionDataRow}>
                    <Text style={[styles.distributionCell, { width: '50%' }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.distributionCell,
                        { width: '25%', textAlign: 'right' },
                      ]}
                    >
                      {item.value.toLocaleString('en-IN')}
                    </Text>
                    <Text
                      style={[
                        styles.distributionCell,
                        styles.distributionCellLast,
                        { width: '25%', textAlign: 'right' },
                      ]}
                    >
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

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
