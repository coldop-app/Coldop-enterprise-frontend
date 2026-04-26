import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { GradingReportRow } from '@/components/analytics/reports/grading-report/columns';
import {
  orderBagSizesByGradingReport,
  sizeKeyFromGradedBagColumnId,
} from '@/components/analytics/reports/grading-report/grading-bag-sizes';
import { computeGradingReportSummary } from '@/components/analytics/reports/grading-report/grading-report-pdf-prepare';
import type {
  GradingReportPdfPrepared,
  GradingReportTableSummary,
  PdfColumnDef,
  VarietyBagSizeSummaryRow,
} from '@/components/analytics/reports/grading-report/grading-report-pdf-prepare';

export interface GradingReportTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  /** Precomputed outside react-pdf (see `prepareGradingReportPdf` in the report module). */
  prepared: GradingReportPdfPrepared;
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
    backgroundColor: '#E0E0E0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 3,
  },
  cell: {
    paddingHorizontal: 0,
    fontSize: 10,
    textAlign: 'center',
  },
  cellLeft: {
    paddingHorizontal: 0,
    fontSize: 10,
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
  /** Bag-size cols: +2 horizontal units each side vs `cellWrap` (matches requested breathing room). */
  cellWrapBagSize: {
    paddingHorizontal: 4,
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
  /** Graded bag-size column: same stack as web table (`columns.tsx` bag cells), no fill. */
  gradedBagCellOuter: {
    width: '100%',
    paddingVertical: 2,
  },
  gradedBagCellStack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 1.5,
  },
  gradedBagCellStackLeft: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1.5,
  },
  gradedBagQty: {
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  gradedBagWeightLine: {
    fontSize: 9.5,
    color: '#444',
    textAlign: 'right',
  },
  gradedBagDetail: {
    fontSize: 9,
    color: '#444',
    textAlign: 'right',
    maxWidth: '100%',
  },
  gradedBagDetailLeft: {
    fontSize: 9,
    color: '#444',
    textAlign: 'left',
    maxWidth: '100%',
  },
  farmerSection: {
    marginTop: 14,
  },
  farmerSectionFirst: {
    marginTop: 0,
  },
  farmerHeader: {
    backgroundColor: '#F5F5F5',
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
    fontSize: 10,
    marginBottom: 2,
  },
  varietyHeader: {
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#F5F5F5',
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
    backgroundColor: '#E8E8E8',
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
    backgroundColor: '#E0E0E0',
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

/** Height of one data row in the PDF table (used for row-span alignment). */
const PDF_ROW_HEIGHT = 10;

function isGradedBagSizeColumnKey(key: string): boolean {
  return key.startsWith('gradedBagSize_');
}

/** Match `formatNum` in `columns.tsx`. */
function formatPdfNumLikeWeb(value: number | string): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

/** Match `formatWeightKg` in `columns.tsx`. */
function formatPdfWeightKgLikeWeb(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value * 10) / 10} kg`;
}

/** Qty, then Jute/Leno lines with kg/bag each; aggregate (kg/bag) only if no bag-type parts. */
function GradedBagSizePdfCell({
  columnKey,
  row,
  align,
}: {
  columnKey: string;
  row: GradingReportRow;
  align: 'left' | 'center';
}) {
  const sizeKey = sizeKeyFromGradedBagColumnId(columnKey);
  const baseAlign = align === 'left';
  const stackStyle = baseAlign
    ? styles.gradedBagCellStackLeft
    : styles.gradedBagCellStack;
  const detailStyle = baseAlign
    ? styles.gradedBagDetailLeft
    : styles.gradedBagDetail;

  if (!sizeKey) {
    return (
      <Text style={baseAlign ? styles.cellLeft : styles.cell} wrap>
        —
      </Text>
    );
  }

  const b = row.gradedSizeBreakdown?.[sizeKey];
  if (!b || b.qty === 0) {
    return (
      <Text
        style={[baseAlign ? styles.cellLeft : styles.cell, styles.cellText]}
        wrap
      >
        {''}
      </Text>
    );
  }

  const parts = b.bagTypeParts ?? [];
  const wLine = formatPdfWeightKgLikeWeb(b.weightPerBagKg);

  return (
    <View style={styles.gradedBagCellOuter}>
      <View style={stackStyle}>
        <Text
          style={[
            styles.gradedBagQty,
            { textAlign: baseAlign ? 'left' : 'right' },
          ]}
          wrap
        >
          {formatPdfNumLikeWeb(b.qty)}
        </Text>
        {parts.length === 0 ? (
          <Text
            style={[
              styles.gradedBagWeightLine,
              { textAlign: baseAlign ? 'left' : 'right' },
            ]}
            wrap
          >
            {`(${wLine})`}
          </Text>
        ) : null}
        {parts.length === 1 ? (
          <Text style={detailStyle} wrap>
            {`${parts[0].label} (${formatPdfWeightKgLikeWeb(parts[0].weightPerBagKg)})`}
          </Text>
        ) : parts.length > 1 ? (
          parts.map((p, i) => (
            <Text key={`${p.label}-${i}`} style={detailStyle} wrap>
              {`${p.label} ${formatPdfNumLikeWeb(p.qty)} (${formatPdfWeightKgLikeWeb(p.weightPerBagKg)})`}
            </Text>
          ))
        ) : null}
      </View>
    </View>
  );
}

interface GroupedTableBodyProps {
  group: GradingReportRow[];
  columns: PdfColumnDef[];
  spanColumnSet: Set<string>;
}

/** Renders one grading-pass group with row-span: span columns show one tall cell, others show one cell per row. */
function GroupedTableBody({
  group,
  columns,
  spanColumnSet,
}: GroupedTableBodyProps) {
  const groupHeight = group.length * PDF_ROW_HEIGHT;
  const first = group[0]!;

  return (
    <View wrap={false} style={[styles.tableRow, { minHeight: groupHeight }]}>
      {columns.map((col, i) => {
        const isSpan = spanColumnSet.has(col.key);
        return (
          <View
            key={col.key}
            style={[
              isGradedBagSizeColumnKey(col.key)
                ? styles.cellWrapBagSize
                : styles.cellWrap,
              i === columns.length - 1 ? styles.cellLast : {},
              { width: col.width, minWidth: 0 },
              isSpan ? { minHeight: groupHeight } : {},
            ]}
          >
            {isSpan ? (
              col.key.startsWith('gradedBagSize_') ? (
                <GradedBagSizePdfCell
                  columnKey={col.key}
                  row={first}
                  align={col.align}
                />
              ) : (
                <Text
                  style={[
                    col.align === 'left' ? styles.cellLeft : styles.cell,
                    styles.cellText,
                  ]}
                  wrap
                >
                  {formatCell(
                    (first as Record<string, unknown>)[col.key],
                    col.key
                  )}
                </Text>
              )
            ) : (
              <View style={{ flexDirection: 'column' }}>
                {group.map((row, rowIdx) => (
                  <View
                    key={rowIdx}
                    style={[
                      {
                        minHeight: PDF_ROW_HEIGHT,
                        justifyContent: 'center',
                      },
                      ...(rowIdx < group.length - 1
                        ? [
                            {
                              borderBottomWidth: 0.5,
                              borderBottomColor: '#666',
                            },
                          ]
                        : []),
                    ]}
                  >
                    {col.key.startsWith('gradedBagSize_') ? (
                      <GradedBagSizePdfCell
                        columnKey={col.key}
                        row={row}
                        align={col.align}
                      />
                    ) : (
                      <Text
                        style={[
                          col.align === 'left' ? styles.cellLeft : styles.cell,
                          styles.cellText,
                        ]}
                        wrap
                      >
                        {formatCell(
                          (row as Record<string, unknown>)[col.key],
                          col.key
                        )}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Column keys that should display as natural numbers (no decimal places). */
const INTEGER_COLUMN_KEYS = new Set<string>([
  'incomingGatePassNo',
  'incomingManualNo',
  'gatePassNo',
  'manualGatePassNumber',
  'bagsReceived',
  'totalGradedBags',
  'accountNumber',
]);

/** Format value for PDF display. Gate pass numbers and counts as integers; other numbers to 2 decimal places. */
function formatCell(value: unknown, columnKey?: string): string {
  if (value == null || value === '') return '—';
  const asInteger = columnKey != null && INTEGER_COLUMN_KEYS.has(columnKey);
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '—';
    return asInteger ? String(Math.round(value)) : value.toFixed(2);
  }
  if (typeof value === 'string' && value !== '—') {
    const n = Number(value);
    if (!Number.isNaN(n)) {
      return asInteger ? String(Math.round(n)) : n.toFixed(2);
    }
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

function TotalsRow({
  totals,
  columns,
}: {
  totals: Record<string, number>;
  columns: PdfColumnDef[];
}) {
  return (
    <View style={styles.tableRowTotal}>
      {columns.map((col, i) => {
        const total = totals[col.key];
        const isTotalCol = total !== undefined;
        const totalText =
          i === 0
            ? 'Total'
            : isTotalCol
              ? col.key.startsWith('gradedBagSize_')
                ? String(Math.round(total))
                : total.toFixed(2)
              : '';
        return (
          <View
            key={col.key}
            style={[
              isGradedBagSizeColumnKey(col.key)
                ? styles.cellWrapBagSize
                : styles.cellWrap,
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
              {totalText}
            </Text>
          </View>
        );
      })}
    </View>
  );
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
  accountNumber: 'Account No.',
  variety: 'Variety',
  date: 'Date',
  incomingGatePassDate: 'Incoming gate pass date',
  grader: 'Grader',
  createdByName: 'Created by',
};

const SUMMARY_COLUMNS = [
  { key: 'name', label: 'Variety / Farmer', width: '28%' },
  { key: 'count', label: 'Count', width: '12%' },
  { key: 'bagsReceived', label: 'Bags rec.', width: '14%' },
  { key: 'totalGradedBags', label: 'Graded bags', width: '14%' },
  { key: 'totalGradedWeightKg', label: 'Graded wt (kg)', width: '16%' },
  { key: 'wastageKg', label: 'Wastage (kg)', width: '16%' },
];

function SummaryVarietyBagTable({
  rows,
}: {
  rows: VarietyBagSizeSummaryRow[];
}) {
  const bagSizes = orderBagSizesByGradingReport(
    new Set(rows.map((r) => r.bagSize))
  );
  const varieties = Array.from(new Set(rows.map((r) => r.variety))).sort(
    (a, b) => a.localeCompare(b)
  );

  const qtyByVariety = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const byBag = qtyByVariety.get(row.variety) ?? new Map<string, number>();
    byBag.set(row.bagSize, (byBag.get(row.bagSize) ?? 0) + row.quantity);
    qtyByVariety.set(row.variety, byBag);
  }

  const colWidths = {
    variety: 32,
    total: 13,
    bag: bagSizes.length > 0 ? (100 - 32 - 13) / bagSizes.length : 55,
  };

  const columnTotals: Record<string, number> = {};
  for (const size of bagSizes) columnTotals[size] = 0;
  for (const variety of varieties) {
    const byBag = qtyByVariety.get(variety);
    for (const size of bagSizes) {
      const qty = byBag?.get(size) ?? 0;
      columnTotals[size] += qty;
    }
  }

  const fmtInt = (n: number) => n.toLocaleString();
  const overallQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);

  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>Variety + bag size wise summary</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text
            style={[styles.summaryCellLeft, { width: `${colWidths.variety}%` }]}
          >
            Varieties
          </Text>
          {bagSizes.map((bagSize) => (
            <Text
              key={bagSize}
              style={[styles.summaryCell, { width: `${colWidths.bag}%` }]}
            >
              {`${bagSize} (mm)`}
            </Text>
          ))}
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: `${colWidths.total}%` },
            ]}
          >
            Total
          </Text>
        </View>
        {varieties.length === 0 ? (
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
            {varieties.map((variety) => {
              const byBag = qtyByVariety.get(variety);
              const rowTotal = bagSizes.reduce(
                (sum, size) => sum + (byBag?.get(size) ?? 0),
                0
              );
              return (
                <View key={variety} style={styles.summaryTableRow}>
                  <Text
                    style={[
                      styles.summaryCellLeft,
                      { width: `${colWidths.variety}%` },
                    ]}
                  >
                    {variety}
                  </Text>
                  {bagSizes.map((size) => {
                    const qty = byBag?.get(size) ?? 0;
                    return (
                      <Text
                        key={`${variety}-${size}`}
                        style={[
                          styles.summaryCell,
                          { width: `${colWidths.bag}%` },
                        ]}
                      >
                        {fmtInt(qty)}
                      </Text>
                    );
                  })}
                  <Text
                    style={[
                      styles.summaryCell,
                      styles.summaryCellLast,
                      { width: `${colWidths.total}%` },
                    ]}
                  >
                    {fmtInt(rowTotal)}
                  </Text>
                </View>
              );
            })}
            <View style={styles.summaryTableRowTotal}>
              <Text
                style={[
                  styles.summaryCellLeft,
                  { width: `${colWidths.variety}%` },
                ]}
              >
                Bag Total
              </Text>
              {bagSizes.map((size) => (
                <Text
                  key={`bag-total-${size}`}
                  style={[styles.summaryCell, { width: `${colWidths.bag}%` }]}
                >
                  {fmtInt(columnTotals[size] ?? 0)}
                </Text>
              ))}
              <Text
                style={[
                  styles.summaryCell,
                  styles.summaryCellLast,
                  { width: `${colWidths.total}%` },
                ]}
              >
                {fmtInt(overallQuantity)}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function ReportSummaryPage({
  summary,
}: {
  summary: GradingReportTableSummary;
}) {
  const fmt = (n: number) => n.toFixed(2);
  return (
    <Page size="A4" orientation="landscape" style={styles.summaryPage}>
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
      <SummaryVarietyBagTable rows={summary.byVarietyAndBagSize} />
    </Page>
  );
}

export const GradingReportTablePdf = ({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Grading Report',
  prepared,
}: GradingReportTablePdfProps) => {
  const spanColumnSet = new Set(prepared.spanColumnSet);
  const { totals, grandColumns } = prepared;
  const displayedRows =
    prepared.kind === 'grouped'
      ? prepared.sections.flatMap((section) => section.leaves)
      : prepared.mainPageChunks.flatMap((chunk) =>
          chunk.flatMap((group) => group)
        );
  const summary: GradingReportTableSummary =
    displayedRows.length > 0
      ? computeGradingReportSummary(displayedRows)
      : prepared.summary;

  if (prepared.kind === 'grouped') {
    const { grouping, sections } = prepared;

    return (
      <Document>
        {sections.flatMap((section, sectionIndex) => {
          const isFirstSection = sectionIndex === 0;
          const { pageChunks, columnsForTable, sectionTotal } = section;

          if (section.isEmpty) {
            const showReportHeader = sectionIndex === 0;
            return [
              <Page
                key={`sec-${sectionIndex}-empty`}
                size="A4"
                orientation="landscape"
                style={styles.page}
              >
                {showReportHeader ? (
                  <ReportHeader
                    companyName={companyName}
                    dateRangeLabel={dateRangeLabel}
                    reportTitle={reportTitle}
                  />
                ) : null}
                <View
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
                              isGradedBagSizeColumnKey(col.key)
                                ? { paddingHorizontal: 4 }
                                : {},
                            ]}
                          >
                            {col.label}
                          </Text>
                        ))}
                      </View>
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
                    </View>
                  </View>
                </View>
              </Page>,
            ];
          }

          return pageChunks.map((chunk, chunkIndex) => {
            const isLastChunkOfSection = chunkIndex === pageChunks.length - 1;
            const showReportHeader = sectionIndex === 0 && chunkIndex === 0;
            return (
              <Page
                key={`sec-${sectionIndex}-${chunkIndex}`}
                size="A4"
                orientation="landscape"
                style={styles.page}
              >
                {showReportHeader ? (
                  <ReportHeader
                    companyName={companyName}
                    dateRangeLabel={dateRangeLabel}
                    reportTitle={reportTitle}
                  />
                ) : null}
                <View
                  style={[
                    styles.farmerSection,
                    isFirstSection && chunkIndex === 0
                      ? styles.farmerSectionFirst
                      : {},
                  ]}
                >
                  {chunkIndex === 0 &&
                    grouping.map((_, depth) => {
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
                            GROUP_LABELS[h.groupingColumnId] ??
                            h.groupingColumnId
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
                              isGradedBagSizeColumnKey(col.key)
                                ? { paddingHorizontal: 4 }
                                : {},
                            ]}
                          >
                            {col.label}
                          </Text>
                        ))}
                      </View>
                      {chunk.map((group, gi) => (
                        <GroupedTableBody
                          key={group[0]?.id ?? `${chunkIndex}-${gi}`}
                          group={group}
                          columns={columnsForTable}
                          spanColumnSet={spanColumnSet}
                        />
                      ))}
                      {isLastChunkOfSection ? (
                        <TotalsRow
                          totals={sectionTotal}
                          columns={columnsForTable}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
              </Page>
            );
          });
        })}
        <Page size="A4" orientation="landscape" style={styles.page}>
          <View style={styles.tableContainer}>
            <View style={styles.table}>
              <TotalsRow totals={totals} columns={grandColumns} />
            </View>
          </View>
        </Page>
        <ReportSummaryPage summary={summary} />
      </Document>
    );
  }

  const { columnsForPdf, mainPageChunks, leafRowsEmpty } = prepared;

  return (
    <Document>
      {leafRowsEmpty ? (
        <Page size="A4" orientation="landscape" style={styles.page}>
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
                      isGradedBagSizeColumnKey(col.key)
                        ? { paddingHorizontal: 4 }
                        : {},
                    ]}
                  >
                    {col.label}
                  </Text>
                ))}
              </View>
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
            </View>
          </View>
        </Page>
      ) : (
        mainPageChunks.map((chunk, pageIndex) => {
          const isLastPage = pageIndex === mainPageChunks.length - 1;
          return (
            <Page
              key={`main-${pageIndex}`}
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              {pageIndex === 0 ? (
                <ReportHeader
                  companyName={companyName}
                  dateRangeLabel={dateRangeLabel}
                  reportTitle={reportTitle}
                />
              ) : null}
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
                          isGradedBagSizeColumnKey(col.key)
                            ? { paddingHorizontal: 4 }
                            : {},
                        ]}
                      >
                        {col.label}
                      </Text>
                    ))}
                  </View>
                  {chunk.map((group, gi) => (
                    <GroupedTableBody
                      key={group[0]?.id ?? `${pageIndex}-${gi}`}
                      group={group}
                      columns={columnsForPdf}
                      spanColumnSet={spanColumnSet}
                    />
                  ))}
                  {isLastPage ? (
                    <TotalsRow totals={totals} columns={columnsForPdf} />
                  ) : null}
                </View>
              </View>
            </Page>
          );
        })
      )}
      <ReportSummaryPage summary={summary} />
    </Document>
  );
};
