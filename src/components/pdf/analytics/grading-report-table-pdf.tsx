import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  GRADING_REPORT_ROW_SPAN_BASE_IDS,
  type GradingReportRow,
} from '@/components/analytics/reports/grading-report/columns';
import {
  GRADING_REPORT_BAG_SIZE_LABELS,
  compareSizeKeysForReport,
  orderBagSizesByGradingReport,
  sizeKeyFromGradedBagColumnId,
  sortGradedBagSizeColumnIds,
} from '@/components/analytics/reports/grading-report/grading-bag-sizes';
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
  /** Graded bag-size column: qty, (kg/bag), then Jute/Leno lines (matches web report). */
  gradedBagCellStack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
  },
  gradedBagCellStackLeft: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
  },
  gradedBagQty: {
    fontSize: 6,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gradedBagWeight: {
    fontSize: 6,
    color: '#555555',
    textAlign: 'center',
  },
  gradedBagTypeLine: {
    fontSize: 5,
    color: '#555555',
    textAlign: 'center',
  },
  gradedBagTypeLineLeft: {
    fontSize: 5,
    color: '#555555',
    textAlign: 'left',
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

/** Height of one data row in the PDF table (used for row-span alignment). */
const PDF_ROW_HEIGHT = 10;

/** Split rows into grading-pass groups for row-span. Each group is consecutive rows belonging to one grading pass. */
function getGradingPassGroups(rows: GradingReportRow[]): GradingReportRow[][] {
  const groups: GradingReportRow[][] = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    const size = row.gradingPassGroupSize ?? 1;
    groups.push(rows.slice(i, i + size));
    i += size;
  }
  return groups;
}

function getSpanColumnSet(rows: GradingReportRow[]): Set<string> {
  const set = new Set<string>(
    GRADING_REPORT_ROW_SPAN_BASE_IDS as unknown as string[]
  );
  for (const r of rows) {
    const m = r.gradedBagSizeQtyByColumnId;
    if (m) for (const k of Object.keys(m)) set.add(k);
  }
  return set;
}

function labelForBagColumnId(columnId: string): string {
  const sk = sizeKeyFromGradedBagColumnId(columnId);
  return sk ? (GRADING_REPORT_BAG_SIZE_LABELS[sk] ?? sk) : columnId;
}

function formatPdfInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatWeightPdfKg(kg: number): string {
  return (Math.round(kg * 10) / 10).toFixed(1);
}

/** Stacked qty / (kg per bag) / bag type — same semantics as the grading report data table. */
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
  const typeStyle = baseAlign
    ? styles.gradedBagTypeLineLeft
    : styles.gradedBagTypeLine;

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
  const weightStr = `(${formatWeightPdfKg(b.weightPerBagKg)})`;

  return (
    <View style={stackStyle}>
      <Text
        style={[
          baseAlign ? styles.cellLeft : styles.cell,
          styles.gradedBagQty,
          { textAlign: baseAlign ? 'left' : 'center' },
        ]}
        wrap
      >
        {formatPdfInt(b.qty)}
      </Text>
      <Text
        style={[
          baseAlign ? styles.cellLeft : styles.cell,
          styles.gradedBagWeight,
          { textAlign: baseAlign ? 'left' : 'center' },
        ]}
        wrap
      >
        {weightStr}
      </Text>
      {parts.length === 1 ? (
        <Text style={typeStyle} wrap>
          {parts[0].label}
        </Text>
      ) : parts.length > 1 ? (
        parts.map((p, i) => (
          <Text key={`${p.label}-${i}`} style={typeStyle} wrap>
            {p.label} {formatPdfInt(p.qty)}
          </Text>
        ))
      ) : null}
    </View>
  );
}

type PdfColumnDef = {
  key: string;
  label: string;
  width: string;
  align: 'left' | 'center';
};

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
    <View style={[styles.tableRow, { minHeight: groupHeight }]}>
      {columns.map((col, i) => {
        const isSpan = spanColumnSet.has(col.key);
        return (
          <View
            key={col.key}
            style={[
              styles.cellWrap,
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

const ALL_COLUMNS_STATIC: PdfColumnDef[] = [
  { key: 'farmerName', label: 'Farmer', width: '7%', align: 'left' },
  {
    key: 'accountNumber',
    label: 'Account No.',
    width: '4%',
    align: 'center',
  },
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
  { key: 'truckNumber', label: 'Truck no.', width: '5%', align: 'center' },
  { key: 'variety', label: 'Variety', width: '6%', align: 'left' },
  { key: 'bagsReceived', label: 'Bags rec.', width: '4%', align: 'center' },
  { key: 'grossWeightKg', label: 'Gross (kg)', width: '5%', align: 'center' },
  { key: 'tareWeightKg', label: 'Tare (kg)', width: '5%', align: 'center' },
  { key: 'netWeightKg', label: 'Net (kg)', width: '5%', align: 'center' },
  {
    key: 'netProductKg',
    label: 'Net product (kg)',
    width: '6%',
    align: 'center',
  },
  { key: 'gatePassNo', label: 'GP no.', width: '4%', align: 'center' },
  {
    key: 'manualGatePassNumber',
    label: 'Manual GP no.',
    width: '4%',
    align: 'center',
  },
  { key: 'date', label: 'Date', width: '6%', align: 'center' },
  { key: 'createdByName', label: 'Created by', width: '6%', align: 'left' },
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
  { key: 'remarks', label: 'Remarks', width: '8%', align: 'left' },
];

/** Main table + PDF bag columns: order from `grading-bag-sizes` (Below 30 … Cut). */
function buildFullColumnList(rows: GradingReportRow[]): PdfColumnDef[] {
  const bagIds = new Set<string>();
  for (const r of rows) {
    const m = r.gradedBagSizeQtyByColumnId;
    if (m) for (const k of Object.keys(m)) bagIds.add(k);
  }
  const bagCols: PdfColumnDef[] = sortGradedBagSizeColumnIds(
    Array.from(bagIds)
  ).map((id) => ({
    key: id,
    label: labelForBagColumnId(id),
    width: '3.5%',
    align: 'center' as const,
  }));
  const idx = ALL_COLUMNS_STATIC.findIndex((c) => c.key === 'totalGradedBags');
  if (idx < 0) return [...ALL_COLUMNS_STATIC, ...bagCols];
  return [
    ...ALL_COLUMNS_STATIC.slice(0, idx + 1),
    ...bagCols,
    ...ALL_COLUMNS_STATIC.slice(idx + 1),
  ];
}

/**
 * Keep non–bag-size columns in place; reorder the contiguous `gradedBagSize_*` block to
 * `GRADING_REPORT_BAG_SIZE_ORDER` in grading-bag-sizes (same as web report / `buildFullColumnList`).
 */
function normalizePdfColumnsBagOrder(columns: PdfColumnDef[]): PdfColumnDef[] {
  const isBag = (c: PdfColumnDef) => c.key.startsWith('gradedBagSize_');
  const bagCols = columns.filter(isBag);
  if (bagCols.length === 0) return columns;
  const bagByKey = new Map(bagCols.map((c) => [c.key, c] as const));
  const sortedBags = sortGradedBagSizeColumnIds([...bagByKey.keys()]).map(
    (k) => bagByKey.get(k)!
  );
  const result: PdfColumnDef[] = [];
  let inserted = false;
  for (const c of columns) {
    if (isBag(c)) {
      if (!inserted) {
        result.push(...sortedBags);
        inserted = true;
      }
      continue;
    }
    result.push(c);
  }
  return result;
}

function getColumnsForPdf(
  visibleColumnIds: string[],
  fullColumns: PdfColumnDef[],
  excludeGrouping?: string[]
): PdfColumnDef[] {
  const visible = new Set(
    visibleColumnIds.length > 0
      ? visibleColumnIds
      : fullColumns.map((c) => c.key)
  );
  const exclude = new Set(excludeGrouping ?? []);
  let filtered = fullColumns.filter(
    (c) => visible.has(c.key) && !exclude.has(c.key)
  );
  filtered = normalizePdfColumnsBagOrder(filtered);
  if (filtered.length === 0) return fullColumns;
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

const TOTAL_KEYS: (keyof GradingReportRow)[] = [
  'bagsReceived',
  'totalGradedBags',
  'totalGradedWeightKg',
  'wastageKg',
  'grossWeightKg',
  'tareWeightKg',
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

function computeTotalsForRows(
  rows: GradingReportRow[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const key of TOTAL_KEYS) totals[key] = 0;
  for (const row of rows) {
    for (const key of TOTAL_KEYS) {
      totals[key] += toNum((row as Record<string, unknown>)[key]);
    }
    const qtyMap = row.gradedBagSizeQtyByColumnId;
    if (qtyMap) {
      for (const [k, v] of Object.entries(qtyMap)) {
        totals[k] = (totals[k] ?? 0) + toNum(v);
      }
    }
  }
  return totals;
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
              {totalText}
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
  accountNumber: 'Account No.',
  variety: 'Variety',
  date: 'Date',
  incomingGatePassDate: 'Incoming gate pass date',
  grader: 'Grader',
  createdByName: 'Created by',
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

interface VarietyBagSizeSummaryRow {
  variety: string;
  bagSize: string;
  quantity: number;
}

/** Computed report summary from grading report rows */
interface GradingReportTableSummary {
  byVariety: VarietySummaryRow[];
  byFarmer: FarmerSummaryRow[];
  byVarietyAndBagSize: VarietyBagSizeSummaryRow[];
  overall: SummaryRowTotals;
}

function computeGradingReportSummary(
  rows: GradingReportRow[]
): GradingReportTableSummary {
  const varietyMap = new Map<string, SummaryRowTotals>();
  const farmerMap = new Map<string, SummaryRowTotals>();
  const varietyBagMap = new Map<string, VarietyBagSizeSummaryRow>();
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
    const isFirstRowOfPass = (row.gradingPassRowIndex ?? 0) === 0;
    if (!isFirstRowOfPass) continue;

    const totalGradedBags =
      typeof row.totalGradedBags === 'number' ? row.totalGradedBags : 0;
    const totalGradedWeightKg =
      typeof row.totalGradedWeightKg === 'number' ? row.totalGradedWeightKg : 0;
    const wastageKg = num(row.wastageKg);
    const bagsReceived = totalGradedBags;
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

    const qtyById = row.gradedBagSizeQtyByColumnId ?? {};
    for (const [columnId, qtyValue] of Object.entries(qtyById)) {
      if (!columnId.startsWith('gradedBagSize_')) continue;
      const sizeKey = sizeKeyFromGradedBagColumnId(columnId);
      if (!sizeKey) continue;
      const quantity = num(qtyValue);
      if (quantity === 0) continue;
      const key = `${variety}||${sizeKey}`;
      const existing = varietyBagMap.get(key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        varietyBagMap.set(key, { variety, bagSize: sizeKey, quantity });
      }
    }
  }

  const byVariety: VarietySummaryRow[] = Array.from(varietyMap.entries())
    .map(([variety, t]) => ({ variety, ...t }))
    .sort((a, b) => a.variety.localeCompare(b.variety));
  const byFarmer: FarmerSummaryRow[] = Array.from(farmerMap.entries())
    .map(([farmerName, t]) => ({ farmerName, ...t }))
    .sort((a, b) => a.farmerName.localeCompare(b.farmerName));
  const byVarietyAndBagSize: VarietyBagSizeSummaryRow[] = Array.from(
    varietyBagMap.values()
  ).sort((a, b) => {
    const v = a.variety.localeCompare(b.variety);
    if (v !== 0) return v;
    return compareSizeKeysForReport(a.bagSize, b.bagSize, a.bagSize, b.bagSize);
  });

  return { byVariety, byFarmer, byVarietyAndBagSize, overall };
}

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
              {bagSize}
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
  rows,
  tableSnapshot,
}: GradingReportTablePdfProps) => {
  const fullColumns = buildFullColumnList(rows);
  const totals = computeTotalsForRows(rows);

  const summary = computeGradingReportSummary(rows);

  const useSnapshot =
    tableSnapshot &&
    tableSnapshot.rows.length > 0 &&
    (tableSnapshot.grouping.length > 0 ||
      tableSnapshot.visibleColumnIds.length > 0);

  const visibleColumnIds =
    useSnapshot && tableSnapshot!.visibleColumnIds.length > 0
      ? tableSnapshot!.visibleColumnIds
      : fullColumns.map((c) => c.key);

  const grouping = useSnapshot ? tableSnapshot!.grouping : [];

  const spanColumnSet = getSpanColumnSet(rows);

  if (useSnapshot && tableSnapshot!.grouping.length > 0) {
    const sections = buildSectionsFromSnapshot(tableSnapshot!);
    const columnsForTable = getColumnsForPdf(
      visibleColumnIds,
      fullColumns,
      grouping
    );
    const sectionTotals = sections.map((section) =>
      computeTotalsForRows(section.leaves)
    );
    return (
      <Document>
        <Page size="A4" orientation="landscape" style={styles.page}>
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
                      <>
                        {getGradingPassGroups(section.leaves).map(
                          (group, gi) => (
                            <GroupedTableBody
                              key={group[0]?.id ?? gi}
                              group={group}
                              columns={columnsForTable}
                              spanColumnSet={spanColumnSet}
                            />
                          )
                        )}
                        <TotalsRow
                          totals={sectionTotals[sectionIndex] ?? {}}
                          columns={columnsForTable}
                        />
                      </>
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
                columns={getColumnsForPdf(visibleColumnIds, fullColumns)}
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
      ? getColumnsForPdf(tableSnapshot!.visibleColumnIds, fullColumns)
      : getColumnsForPdf([], fullColumns);

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
                {getGradingPassGroups(leafRows).map((group, gi) => (
                  <GroupedTableBody
                    key={group[0]?.id ?? gi}
                    group={group}
                    columns={columnsForPdf}
                    spanColumnSet={spanColumnSet}
                  />
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
