import type { ReactElement } from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  type FarmerReportPdfRow,
  FARMER_REPORT_PDF_COLUMN_LABELS,
  FARMER_REPORT_ROW_SPAN_COLUMN_IDS,
} from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import GradingGatePassTablePdf from '@/components/pdf/grading-gate-pass-table-pdf';
import SeedAmountPayableTablePdf from '@/components/pdf/SeedAmountPayableTablePdf';
import SummaryTablePdf from '@/components/pdf/sumary-table-pdf';
import { type PreparedAccountingStockLedgerPdfData } from '@/components/pdf/accountingStockLedgerPdfPrepare';

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';
const FARMER_INCOMING_ROWS_PER_PAGE = 18;

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 12,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 6,
  },
  pageLarge: {
    padding: 16,
    paddingBottom: 68,
    fontSize: 8,
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
  companyNameLarge: {
    fontSize: 14,
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  reportTitleLarge: {
    fontSize: 16,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  farmerNameLarge: {
    fontSize: 18,
  },
  dateRange: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 0,
  },
  dateRangeLarge: {
    fontSize: 11,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: '#333',
    marginTop: 10,
    marginBottom: 4,
  },
  sectionTitleLarge: {
    fontSize: 11,
    marginTop: 12,
    marginBottom: 6,
  },
  varietySubsectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: '#111827',
    marginTop: 6,
    marginBottom: 3,
    backgroundColor: '#e5e7eb',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  varietySubsectionTitleLarge: {
    fontSize: 10,
    paddingVertical: 3,
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
  tableHeaderRowLarge: {
    paddingVertical: 2,
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
  tableRowLarge: {
    paddingVertical: 2,
  },
  varietyRow: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderColor: BORDER,
    paddingVertical: 1,
  },
  varietyRowLarge: {
    paddingVertical: 2,
  },
  cell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    fontSize: 6,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  cellLarge: {
    fontSize: 7.5,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  varietyCell: {
    paddingVertical: 1,
    paddingHorizontal: 2,
    fontSize: 5.5,
    fontWeight: 'bold',
  },
  varietyCellLarge: {
    fontSize: 7,
    paddingVertical: 2,
  },
  headerCell: {
    fontWeight: 700,
    fontSize: 5.5,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  headerCellLarge: {
    fontSize: 6.5,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellQtyLine: {
    fontSize: 6,
    textAlign: 'center',
  },
  cellQtyLineLarge: {
    fontSize: 7.5,
  },
  cellWeightLine: {
    fontSize: 5,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 0,
  },
  cellWeightLineLarge: {
    fontSize: 6.5,
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
  totalRowLarge: {
    paddingVertical: 2,
  },
  totalCell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    fontSize: 6,
    fontWeight: 700,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  totalCellLarge: {
    fontSize: 7.5,
    paddingVertical: 2,
    paddingHorizontal: 2,
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

function formatIncomingTotalNumber(n: number): string {
  return String(Math.round(n * 10) / 10);
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
  prepared: PreparedAccountingStockLedgerPdfData;
}

/**
 * Accounting Report PDF: three sections –
 * 1. Incoming details (up to Actual (kg)),
 * 2. Grading summary (GradingGatePassTablePdf),
 * 3. Summary (SummaryTablePdf), then Seed Amount Payable per variety below each summary table.
 */
export function AccountingStockLedgerPdf({
  prepared,
}: AccountingStockLedgerPdfProps) {
  const {
    snapshot,
    hideGradingPage,
    incomingColumnIds,
    incomingColWidthPct,
    hasIncomingData,
    incomingSegments,
    varietySections,
  } = prepared;
  const {
    companyName,
    farmerName,
    dateRangeLabel,
    reportTitle = 'Accounting Report',
    groupByVariety,
  } = snapshot;
  const getIncomingColWidth = () => incomingColWidthPct;

  const farmerDisplayName = farmerName ?? '';
  const useLargePrint = hideGradingPage;
  const incomingRowsForFarmerPages = buildIncomingRenderRows(
    incomingSegments,
    groupByVariety
  );
  const incomingFarmerPages = chunkArray(
    incomingRowsForFarmerPages,
    FARMER_INCOMING_ROWS_PER_PAGE
  );

  if (hideGradingPage) {
    return (
      <Document>
        {incomingColumnIds.length > 0
          ? incomingFarmerPages.map((pageRows, pageIndex) => (
              <Page
                key={`incoming-page-${pageIndex + 1}`}
                size="A4"
                orientation="landscape"
                style={[styles.page, useLargePrint ? styles.pageLarge : {}]}
              >
                {pageIndex === 0 ? (
                  <View style={styles.header}>
                    {companyName ? (
                      <Text
                        style={[
                          styles.companyName,
                          useLargePrint ? styles.companyNameLarge : {},
                        ]}
                      >
                        {companyName}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.reportTitle,
                        useLargePrint ? styles.reportTitleLarge : {},
                      ]}
                    >
                      {reportTitle}
                    </Text>
                    {farmerDisplayName ? (
                      <Text
                        style={[
                          styles.farmerName,
                          useLargePrint ? styles.farmerNameLarge : {},
                        ]}
                      >
                        {farmerDisplayName}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.dateRange,
                        useLargePrint ? styles.dateRangeLarge : {},
                      ]}
                    >
                      {dateRangeLabel}
                    </Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.sectionTitle,
                    useLargePrint ? styles.sectionTitleLarge : {},
                  ]}
                >
                  1. Incoming Details
                </Text>
                <View style={styles.tableContainer}>
                  <View style={styles.table}>
                    <View
                      style={[
                        styles.tableHeaderRow,
                        useLargePrint ? styles.tableHeaderRowLarge : {},
                      ]}
                    >
                      {incomingColumnIds.map((id, i) => (
                        <View
                          key={id}
                          style={[
                            styles.cell,
                            useLargePrint ? styles.cellLarge : {},
                            styles.headerCell,
                            useLargePrint ? styles.headerCellLarge : {},
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
                    {pageRows.length > 0 ? (
                      pageRows.map((row, rowIndex) => {
                        if (row.kind === 'variety') {
                          return (
                            <View
                              key={`variety-${pageIndex}-${rowIndex}`}
                              style={[
                                styles.varietyRow,
                                useLargePrint ? styles.varietyRowLarge : {},
                              ]}
                            >
                              <View
                                style={[
                                  styles.varietyCell,
                                  useLargePrint ? styles.varietyCellLarge : {},
                                  {
                                    flex: 1,
                                    borderRightWidth: 1,
                                    borderColor: BORDER,
                                  },
                                ]}
                              >
                                <Text>Variety: {row.variety ?? '—'}</Text>
                              </View>
                            </View>
                          );
                        }
                        if (row.kind === 'data') {
                          return (
                            <IncomingDataRow
                              key={`data-${pageIndex}-${rowIndex}`}
                              row={row.row}
                              incomingColumnIds={incomingColumnIds}
                              getColWidth={getIncomingColWidth}
                              useLargePrint={useLargePrint}
                            />
                          );
                        }
                        return (
                          <IncomingTotalRow
                            key={`total-${pageIndex}-${rowIndex}`}
                            incomingColumnIds={incomingColumnIds}
                            totals={row.totals}
                            getColWidth={getIncomingColWidth}
                            useLargePrint={useLargePrint}
                          />
                        );
                      })
                    ) : (
                      <View
                        style={[
                          styles.tableRow,
                          useLargePrint ? styles.tableRowLarge : {},
                        ]}
                      >
                        <View
                          style={[
                            styles.cell,
                            useLargePrint ? styles.cellLarge : {},
                            styles.cellLast,
                            { width: '100%' },
                          ]}
                        >
                          <Text>No incoming data.</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </Page>
            ))
          : null}

        <Page
          size="A4"
          orientation="landscape"
          style={[styles.page, useLargePrint ? styles.pageLarge : {}]}
        >
          <Text
            style={[
              styles.sectionTitle,
              useLargePrint ? styles.sectionTitleLarge : {},
            ]}
          >
            2. Summary
          </Text>
          {varietySections.length === 0 ? (
            <Text style={styles.sectionTitle}>No summary data.</Text>
          ) : (
            varietySections.map(
              ({ variety, summaryPrepared, seedPrepared }) => (
                <View key={`sum-${variety}`}>
                  <Text
                    style={[
                      styles.varietySubsectionTitle,
                      useLargePrint ? styles.varietySubsectionTitleLarge : {},
                    ]}
                  >
                    Variety: {variety}
                  </Text>
                  <SummaryTablePdf
                    prepared={summaryPrepared}
                    largePrintMode={useLargePrint}
                  />
                  <SeedAmountPayableTablePdf
                    prepared={seedPrepared}
                    largePrintMode={useLargePrint}
                  />
                </View>
              )
            )
          )}
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page
        size="A4"
        orientation="landscape"
        style={[styles.page, useLargePrint ? styles.pageLarge : {}]}
      >
        <View style={styles.header}>
          {companyName ? (
            <Text
              style={[
                styles.companyName,
                useLargePrint ? styles.companyNameLarge : {},
              ]}
            >
              {companyName}
            </Text>
          ) : null}
          <Text
            style={[
              styles.reportTitle,
              useLargePrint ? styles.reportTitleLarge : {},
            ]}
          >
            {reportTitle}
          </Text>
          {farmerDisplayName ? (
            <Text
              style={[
                styles.farmerName,
                useLargePrint ? styles.farmerNameLarge : {},
              ]}
            >
              {farmerDisplayName}
            </Text>
          ) : null}
          <Text
            style={[
              styles.dateRange,
              useLargePrint ? styles.dateRangeLarge : {},
            ]}
          >
            {dateRangeLabel}
          </Text>
        </View>

        {/* Table 1: Incoming details (up to Actual (kg)) */}
        {incomingColumnIds.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                useLargePrint ? styles.sectionTitleLarge : {},
              ]}
            >
              1. Incoming Details
            </Text>
            <View style={styles.tableContainer}>
              <View style={styles.table}>
                <View
                  style={[
                    styles.tableHeaderRow,
                    useLargePrint ? styles.tableHeaderRowLarge : {},
                  ]}
                >
                  {incomingColumnIds.map((id, i) => (
                    <View
                      key={id}
                      style={[
                        styles.cell,
                        useLargePrint ? styles.cellLarge : {},
                        styles.headerCell,
                        useLargePrint ? styles.headerCellLarge : {},
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
                    const keyBase = `inc-${segIndex}`;
                    const out: ReactElement[] = [];
                    if (groupByVariety) {
                      out.push(
                        <View
                          key={`${keyBase}-variety`}
                          style={[
                            styles.varietyRow,
                            useLargePrint ? styles.varietyRowLarge : {},
                          ]}
                        >
                          <View
                            style={[
                              styles.varietyCell,
                              useLargePrint ? styles.varietyCellLarge : {},
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
                          useLargePrint={useLargePrint}
                        />
                      );
                    }
                    if (segment.dataRows.length > 0) {
                      out.push(
                        <IncomingTotalRow
                          key={`${keyBase}-total`}
                          incomingColumnIds={incomingColumnIds}
                          totals={segment.totals}
                          getColWidth={getIncomingColWidth}
                          useLargePrint={useLargePrint}
                        />
                      );
                    }
                    return out;
                  })
                ) : (
                  <View
                    style={[
                      styles.tableRow,
                      useLargePrint ? styles.tableRowLarge : {},
                    ]}
                  >
                    <View
                      style={[
                        styles.cell,
                        useLargePrint ? styles.cellLarge : {},
                        styles.cellLast,
                        { width: '100%' },
                      ]}
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
          {varietySections.length === 0 ? (
            <Text style={styles.sectionTitle}>No grading gate pass data.</Text>
          ) : (
            varietySections.map(({ variety, rows: varietyRows }) => (
              <View key={`ggp-${variety}`}>
                <Text style={styles.varietySubsectionTitle}>
                  Variety: {variety}
                </Text>
                <GradingGatePassTablePdf
                  farmerName={farmerDisplayName}
                  rows={varietyRows}
                  hideReportSummary
                  hideFarmerNameColumn
                />
              </View>
            ))
          )}
        </Page>
      ) : null}

      {/* Summary table (page 3 in full report; page 2 when grading is hidden) */}
      <Page
        size="A4"
        orientation="landscape"
        style={[styles.page, useLargePrint ? styles.pageLarge : {}]}
      >
        <View style={styles.header}>
          {companyName ? (
            <Text
              style={[
                styles.companyName,
                useLargePrint ? styles.companyNameLarge : {},
              ]}
            >
              {companyName}
            </Text>
          ) : null}
          <Text
            style={[
              styles.reportTitle,
              useLargePrint ? styles.reportTitleLarge : {},
            ]}
          >
            {reportTitle} – Summary
          </Text>
          {farmerDisplayName ? (
            <Text
              style={[
                styles.farmerName,
                useLargePrint ? styles.farmerNameLarge : {},
              ]}
            >
              {farmerDisplayName}
            </Text>
          ) : null}
          <Text
            style={[
              styles.dateRange,
              useLargePrint ? styles.dateRangeLarge : {},
            ]}
          >
            {dateRangeLabel}
          </Text>
        </View>
        <Text
          style={[
            styles.sectionTitle,
            useLargePrint ? styles.sectionTitleLarge : {},
          ]}
        >
          {hideGradingPage ? '2. Summary' : '3. Summary'}
        </Text>
        {varietySections.length === 0 ? (
          <Text style={styles.sectionTitle}>No summary data.</Text>
        ) : (
          varietySections.map(({ variety, summaryPrepared, seedPrepared }) => (
            <View key={`sum-${variety}`}>
              <Text
                style={[
                  styles.varietySubsectionTitle,
                  useLargePrint ? styles.varietySubsectionTitleLarge : {},
                ]}
              >
                Variety: {variety}
              </Text>
              <SummaryTablePdf
                prepared={summaryPrepared}
                largePrintMode={useLargePrint}
              />
              <SeedAmountPayableTablePdf
                prepared={seedPrepared}
                largePrintMode={useLargePrint}
              />
            </View>
          ))
        )}
      </Page>
    </Document>
  );
}

type IncomingRenderRow =
  | { kind: 'variety'; variety: string | null }
  | { kind: 'data'; row: FarmerReportPdfRow & { type: 'data' } }
  | {
      kind: 'total';
      totals: Record<
        string,
        | { kind: 'none' }
        | { kind: 'simple'; sum: number }
        | { kind: 'qtyWeight'; qty: number; weight: number }
      >;
    };

function buildIncomingRenderRows(
  segments: PreparedAccountingStockLedgerPdfData['incomingSegments'],
  groupByVariety: boolean
): IncomingRenderRow[] {
  const rows: IncomingRenderRow[] = [];
  for (const segment of segments) {
    if (groupByVariety) {
      rows.push({ kind: 'variety', variety: segment.variety });
    }
    for (const dataRow of segment.dataRows) {
      rows.push({ kind: 'data', row: dataRow });
    }
    if (segment.dataRows.length > 0) {
      rows.push({ kind: 'total', totals: segment.totals });
    }
  }
  return rows;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [[]];
  const safeChunk = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeChunk) {
    chunks.push(items.slice(i, i + safeChunk));
  }
  return chunks;
}

function IncomingTotalRow({
  incomingColumnIds,
  totals,
  getColWidth,
  useLargePrint,
}: {
  incomingColumnIds: string[];
  totals: Record<
    string,
    | { kind: 'none' }
    | { kind: 'simple'; sum: number }
    | { kind: 'qtyWeight'; qty: number; weight: number }
  >;
  getColWidth: () => string;
  useLargePrint: boolean;
}) {
  return (
    <View style={[styles.totalRow, useLargePrint ? styles.totalRowLarge : {}]}>
      {incomingColumnIds.map((id, i) => {
        const t = totals[id];
        const isFirst = i === 0;
        return (
          <View
            key={id}
            style={[
              styles.totalCell,
              useLargePrint ? styles.totalCellLarge : {},
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
                <Text
                  style={[
                    styles.cellWeightLine,
                    useLargePrint ? styles.cellWeightLineLarge : {},
                  ]}
                >
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
  useLargePrint,
}: {
  row: FarmerReportPdfRow & { type: 'data' };
  incomingColumnIds: string[];
  getColWidth: () => string;
  useLargePrint: boolean;
}) {
  const passRowIndex = row.passRowIndex ?? 0;
  const isSpanColumn = (colId: string) =>
    FARMER_REPORT_ROW_SPAN_COLUMN_IDS.includes(
      colId as (typeof FARMER_REPORT_ROW_SPAN_COLUMN_IDS)[number]
    );
  return (
    <View style={[styles.tableRow, useLargePrint ? styles.tableRowLarge : {}]}>
      {incomingColumnIds.map((id, i) => {
        const showSpanValue = !isSpanColumn(id) || passRowIndex === 0;
        const raw = showSpanValue ? formatCellValue(row.cells[id]) : '—';
        const qtyWeight = parseQtyWeight(raw);
        return (
          <View
            key={id}
            style={[
              styles.cell,
              useLargePrint ? styles.cellLarge : {},
              i === incomingColumnIds.length - 1 ? styles.cellLast : {},
              { width: getColWidth() },
            ]}
          >
            {qtyWeight ? (
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={[
                    styles.cellQtyLine,
                    useLargePrint ? styles.cellQtyLineLarge : {},
                  ]}
                >
                  {qtyWeight.qty}
                </Text>
                <Text
                  style={[
                    styles.cellWeightLine,
                    useLargePrint ? styles.cellWeightLineLarge : {},
                  ]}
                >
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
}
