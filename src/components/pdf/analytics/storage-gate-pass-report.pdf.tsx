import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import type {
  StorageGatePassReportDataFlat,
  StorageGatePassReportDataGrouped,
  StorageGatePassReportDataGroupedByVariety,
  StorageGatePassReportDataGroupedByVarietyAndFarmer,
  StorageGatePassReportItem,
} from '@/types/analytics';
import { GRADING_SIZES } from '@/components/forms/grading/constants';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export type StorageGatePassReportPdfData =
  | StorageGatePassReportDataFlat
  | StorageGatePassReportDataGrouped
  | StorageGatePassReportDataGroupedByVariety
  | StorageGatePassReportDataGroupedByVarietyAndFarmer;

export interface StorageGatePassReportPdfProps {
  companyName?: string;
  dateRangeLabel: string;
  data: StorageGatePassReportPdfData;
}

/** Per-size list of (quantity, location) for one gate pass row */
export type SizeQtyLocList = Record<string, { qty: number; loc: string }[]>;

interface StorageRow {
  date: string;
  voucher: string;
  manualNo: string;
  variety: string;
  sizeQtys: SizeQtyLocList;
  rowTotal: number;
  runningTotal: number;
  remarks: string;
}

/** Format location for display below quantity, e.g. "(1-2-1)" */
function locDisplay(loc: {
  chamber?: string;
  floor?: string;
  row?: string;
}): string {
  const c = loc?.chamber ?? '';
  const f = loc?.floor ?? '';
  const r = loc?.row ?? '';
  const s = [c, f, r].filter(Boolean).join('-').trim();
  return s ? `(${s})` : '';
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
  data: StorageGatePassReportPdfData
): data is StorageGatePassReportDataGroupedByVarietyAndFarmer {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'farmers' in data[0]
  );
}

function isGroupedByVarietyOnly(
  data: StorageGatePassReportPdfData
): data is StorageGatePassReportDataGroupedByVariety {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function isGroupedByFarmer(
  data: StorageGatePassReportPdfData
): data is StorageGatePassReportDataGrouped {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'farmer' in data[0] &&
    'gatePasses' in data[0]
  );
}

/** Get unique sizes from all passes in report order (GRADING_SIZES first). */
function getSizeColumns(passes: StorageGatePassReportItem[]): string[] {
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

function buildStorageRows(
  passes: StorageGatePassReportItem[],
  sizeColumns: string[]
): StorageRow[] {
  const rows: StorageRow[] = [];
  let runningTotal = 0;
  const sorted = [...passes].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const pass of sorted) {
    const variety = pass.variety ?? '-';
    const remarks = pass.remarks ?? '-';
    const dateStr = formatPdfDate(pass.date);
    const voucherStr = String(pass.gatePassNo ?? '');
    const manualStr =
      pass.manualGatePassNumber != null
        ? String(pass.manualGatePassNumber)
        : '-';

    const sizeQtys: SizeQtyLocList = sizeColumns.reduce(
      (acc, col) => ({ ...acc, [col]: [] }),
      {} as SizeQtyLocList
    );
    let rowTotal = 0;
    for (const od of pass.orderDetails ?? []) {
      const size = od.size;
      const qty = od.currentQuantity ?? od.initialQuantity ?? 0;
      const loc = locDisplay({
        chamber: od.chamber,
        floor: od.floor,
        row: od.row,
      });
      if (!sizeQtys[size]) sizeQtys[size] = [];
      sizeQtys[size].push({ qty, loc });
      rowTotal += qty;
    }
    runningTotal += rowTotal;
    rows.push({
      date: dateStr,
      voucher: voucherStr,
      manualNo: manualStr,
      variety,
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
  cellQtyLoc: {
    paddingVertical: 1,
  },
  cellQtyLocBlock: {
    marginBottom: 4,
  },
  cellLocText: {
    fontSize: 8,
    color: '#444',
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
    fontSize: 8,
    color: '#555',
    fontStyle: 'italic',
  },
  pageNumber: {
    textAlign: 'center',
    fontSize: 9,
    color: '#666',
    marginTop: 8,
  },
});

/* ------------------------------------------------------------------ */
/* Table component */
/* ------------------------------------------------------------------ */

interface StorageReportTableProps {
  companyName: string;
  dateRangeLabel: string;
  farmerName?: string;
  varietyLabel?: string;
  passes: StorageGatePassReportItem[];
  pageIndex?: number;
  totalPages?: number;
}

function StorageReportTable({
  companyName,
  dateRangeLabel,
  farmerName,
  varietyLabel,
  passes,
  pageIndex = 0,
  totalPages = 1,
}: StorageReportTableProps) {
  const sizeColumns = getSizeColumns(passes);
  const rows = buildStorageRows(passes, sizeColumns);

  const totalBySize = sizeColumns.reduce(
    (acc, col) => ({
      ...acc,
      [col]: rows.reduce(
        (s, r) =>
          s + (r.sizeQtys[col] ?? []).reduce((sum, x) => sum + x.qty, 0),
        0
      ),
    }),
    {} as Record<string, number>
  );
  const grandTotal = rows.reduce((s, r) => s + r.rowTotal, 0);

  const tableCols = [
    'DATE',
    'VOUCHER',
    'MANUAL NO',
    'VARIETY',
    ...sizeColumns,
    'TOTAL',
    'G.TOTAL',
    'REMARKS',
  ];

  const colWidths: Record<string, string> = {
    DATE: '10%',
    VOUCHER: '8%',
    'MANUAL NO': '8%',
    VARIETY: '14%',
    TOTAL: '8%',
    'G.TOTAL': '8%',
    REMARKS: '10%',
  };
  const sizeColWidth =
    sizeColumns.length > 0 ? `${Math.max(6, 72 / sizeColumns.length)}%` : '8%';

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.reportTitle}>STORAGE GATE PASS REPORT</Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
      </View>

      {/* Variety info (when grouped by variety) */}
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

      {/* Farmer info (when grouped by farmer) */}
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

      {/* Table */}
      <View style={styles.ledgerContainer}>
        <Text style={styles.ledgerTitle}>Storage Gate Pass Details</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            {tableCols.map((col, i) => (
              <Text
                key={col}
                style={[
                  styles.cell,
                  ...(col === 'VARIETY' ? [styles.cellLeft] : []),
                  ...(i === tableCols.length - 1 ? [styles.cellLast] : []),
                  ...(col === 'TOTAL' ? [styles.cellTotal] : []),
                  ...(col === 'G.TOTAL' ? [styles.cellGTotal] : []),
                  ...(col === 'REMARKS' ? [styles.cellRemarks] : []),
                  {
                    width: sizeColumns.includes(col)
                      ? sizeColWidth
                      : (colWidths[col] ?? '8%'),
                  },
                ]}
              >
                {col}
              </Text>
            ))}
          </View>
          {rows.map((r, idx) => (
            <View key={`${r.date}-${r.voucher}-${idx}`} style={styles.tableRow}>
              <Text style={[styles.cell, { width: '10%' }]}>{r.date}</Text>
              <Text style={[styles.cell, { width: '8%' }]}>{r.voucher}</Text>
              <Text style={[styles.cell, { width: '8%' }]}>{r.manualNo}</Text>
              <Text style={[styles.cellLeft, { width: '14%' }]}>
                {r.variety}
              </Text>
              {sizeColumns.map((col) => {
                const list = r.sizeQtys[col] ?? [];
                return (
                  <View
                    key={col}
                    style={[
                      styles.cell,
                      styles.cellQtyLoc,
                      { width: sizeColWidth },
                    ]}
                  >
                    {list.length === 0 ? (
                      <Text>-</Text>
                    ) : (
                      list.map((item, i) => (
                        <View
                          key={i}
                          style={[
                            styles.cellQtyLocBlock,
                            i === list.length - 1 ? { marginBottom: 0 } : {},
                          ]}
                        >
                          <Text>{item.qty}</Text>
                          {item.loc ? (
                            <Text style={styles.cellLocText}>{item.loc}</Text>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                );
              })}
              <Text style={[styles.cell, styles.cellTotal, { width: '8%' }]}>
                {r.rowTotal}
              </Text>
              <Text style={[styles.cell, styles.cellGTotal, { width: '8%' }]}>
                {r.runningTotal}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.cellRemarks,
                  styles.cellLast,
                  { width: '10%' },
                ]}
              >
                {r.remarks}
              </Text>
            </View>
          ))}
          {rows.length > 0 && (
            <View style={[styles.tableRow, styles.rowTotals]}>
              <Text style={[styles.cell, { width: '10%' }]}>TOTAL</Text>
              <Text style={[styles.cell, { width: '8%' }]}>-</Text>
              <Text style={[styles.cell, { width: '8%' }]}>-</Text>
              <Text style={[styles.cellLeft, { width: '14%' }]}>-</Text>
              {sizeColumns.map((col) => (
                <Text key={col} style={[styles.cell, { width: sizeColWidth }]}>
                  {totalBySize[col] ?? 0}
                </Text>
              ))}
              <Text style={[styles.cell, styles.cellTotal, { width: '8%' }]}>
                {grandTotal}
              </Text>
              <Text style={[styles.cell, styles.cellGTotal, { width: '8%' }]}>
                {grandTotal}
              </Text>
              <Text
                style={[
                  styles.cell,
                  styles.cellRemarks,
                  styles.cellLast,
                  { width: '10%' },
                ]}
              >
                -
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Account Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Account Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Storage Gate Passes:</Text>
          <Text style={styles.summaryValue}>{rows.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Bags Stored:</Text>
          <Text style={styles.summaryValue}>{grandTotal}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryRowClosing]}>
          <Text style={styles.summaryLabel}>CLOSING BALANCE:</Text>
          <Text style={styles.summaryValue}>{grandTotal}</Text>
        </View>
      </View>

      {/* Footer */}
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

export function StorageGatePassReportPdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  data,
}: StorageGatePassReportPdfProps) {
  const company = companyName;

  if (isGroupedByVarietyAndFarmer(data)) {
    const totalPages = data.reduce((sum, v) => sum + v.farmers.length, 0);
    let pageIndex = 0;
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" orientation="landscape" style={styles.page}>
            <StorageReportTable
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              passes={[]}
              totalPages={1}
            />
          </Page>
        ) : (
          data.flatMap((varietyItem) =>
            varietyItem.farmers.map((group) => (
              <Page
                key={`${varietyItem.variety}-${group.farmer._id}`}
                size="A4"
                orientation="landscape"
                style={styles.page}
              >
                <StorageReportTable
                  companyName={company}
                  dateRangeLabel={dateRangeLabel}
                  varietyLabel={varietyItem.variety}
                  farmerName={group.farmer.name}
                  passes={group.gatePasses}
                  pageIndex={pageIndex++}
                  totalPages={totalPages}
                />
              </Page>
            ))
          )
        )}
      </Document>
    );
  }

  if (isGroupedByVarietyOnly(data)) {
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" orientation="landscape" style={styles.page}>
            <StorageReportTable
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              passes={[]}
              totalPages={1}
            />
          </Page>
        ) : (
          data.map((varietyItem, pageIndex) => (
            <Page
              key={varietyItem.variety}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <StorageReportTable
                companyName={company}
                dateRangeLabel={dateRangeLabel}
                varietyLabel={varietyItem.variety}
                passes={varietyItem.gatePasses}
                pageIndex={pageIndex}
                totalPages={data.length}
              />
            </Page>
          ))
        )}
      </Document>
    );
  }

  if (isGroupedByFarmer(data)) {
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" orientation="landscape" style={styles.page}>
            <StorageReportTable
              companyName={company}
              dateRangeLabel={dateRangeLabel}
              passes={[]}
              totalPages={1}
            />
          </Page>
        ) : (
          data.map((group, pageIndex) => (
            <Page
              key={group.farmer._id}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <StorageReportTable
                companyName={company}
                dateRangeLabel={dateRangeLabel}
                farmerName={group.farmer.name}
                passes={group.gatePasses}
                pageIndex={pageIndex}
                totalPages={data.length}
              />
            </Page>
          ))
        )}
      </Document>
    );
  }

  const flatPasses = data as StorageGatePassReportDataFlat;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <StorageReportTable
          companyName={company}
          dateRangeLabel={dateRangeLabel}
          passes={flatPasses}
          totalPages={1}
        />
      </Page>
    </Document>
  );
}
