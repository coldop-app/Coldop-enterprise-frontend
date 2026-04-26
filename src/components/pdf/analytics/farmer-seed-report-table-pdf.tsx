import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import {
  farmerSeedBagSizeColumnId,
  orderFarmerSeedBagSizes,
} from '@/components/analytics/reports/farmer-seed-report/columns';
import type { FarmerSeedReportPdfSnapshot } from '@/components/analytics/reports/farmer-seed-report/data-table';

interface FarmerSeedReportRow {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  gatePassNo: number | string;
  invoiceNumber: string;
  date: string;
  dateSortTs?: number;
  variety: string;
  generation: string;
  totalBags: number;
  rate: number;
  totalSeedAmount: number;
  bagSizeQtyByName: Record<string, number>;
  remarks: string;
}

export interface FarmerSeedReportTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  rows: FarmerSeedReportRow[];
  tableSnapshot?: FarmerSeedReportPdfSnapshot<FarmerSeedReportRow> | null;
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dateRange: {
    fontSize: 11,
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
  },
  tableContainer: {
    marginTop: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 2,
  },
  tableHeaderRow: {
    backgroundColor: '#E8E8E8',
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 3,
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
    fontSize: 9,
    textAlign: 'center',
  },
  cellLeft: {
    paddingHorizontal: 0,
    fontSize: 9,
    textAlign: 'left',
  },
  cellRight: {
    paddingHorizontal: 0,
    fontSize: 9,
    textAlign: 'right',
  },
  cellWrap: {
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cellText: {
    fontSize: 9,
    width: '100%',
    maxWidth: '100%',
  },
  cellLast: {
    borderRightWidth: 0,
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
    fontSize: 14,
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
    fontSize: 10,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLeft: {
    paddingHorizontal: 3,
    fontSize: 10,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLast: {
    borderRightWidth: 0,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingTop: 6,
  },
  footerBrandWrap: {
    backgroundColor: '#E7E7E7',
    borderRadius: 5,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerLogo: {
    width: 22,
    height: 22,
  },
  poweredBy: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2D2D2D',
  },
});

type ColumnDef = {
  key: string;
  label: string;
  width: string;
  align: 'left' | 'center' | 'right';
};

const BASE_COLUMNS: ColumnDef[] = [
  { key: 'sNo', label: 'S. No.', width: '4%', align: 'center' },
  { key: 'farmerName', label: 'Farmer', width: '10%', align: 'left' },
  { key: 'accountNumber', label: 'Account', width: '5%', align: 'right' },
  { key: 'farmerAddress', label: 'Address', width: '10%', align: 'left' },
  { key: 'date', label: 'Date', width: '6%', align: 'center' },
  { key: 'gatePassNo', label: 'Gate Pass', width: '5%', align: 'right' },
  { key: 'invoiceNumber', label: 'Invoice', width: '5%', align: 'left' },
  { key: 'variety', label: 'Variety', width: '5%', align: 'left' },
  { key: 'generation', label: 'Stage', width: '3%', align: 'left' },
  { key: 'totalBags', label: 'Total Bags', width: '4%', align: 'right' },
  { key: 'rate', label: 'Rate', width: '5%', align: 'right' },
  {
    key: 'totalSeedAmount',
    label: 'Total Seed Amt',
    width: '8%',
    align: 'right',
  },
  { key: 'remarks', label: 'Remarks', width: '10%', align: 'left' },
];

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return String(value);
}

function formatCellValue(columnKey: string, value: unknown): string {
  if (value == null || value === '') return '—';
  if (columnKey === 'gatePassNo' || columnKey === 'invoiceNumber') {
    return String(value);
  }
  if (typeof value === 'number') {
    if (columnKey === 'rate' || columnKey === 'totalSeedAmount') {
      return value.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return formatValue(value);
  }
  return String(value);
}

function alignStyle(align: ColumnDef['align']) {
  if (align === 'left') return styles.cellLeft;
  if (align === 'right') return styles.cellRight;
  return styles.cell;
}

interface SummaryByLabelRow {
  label: string;
  entries: number;
  bags: number;
}

interface FarmerSummaryRow {
  farmerName: string;
  accountNumber: string;
  entries: number;
  bags: number;
}

interface FarmerSeedReportSummary {
  totalEntries: number;
  totalBags: number;
  uniqueFarmers: number;
  uniqueVarieties: number;
  uniqueGenerations: number;
  avgBagsPerEntry: number;
  byVariety: SummaryByLabelRow[];
  byGeneration: SummaryByLabelRow[];
  byBagSize: Array<{ size: string; bags: number }>;
  topFarmersByBags: FarmerSummaryRow[];
}

function computeSummary(rows: FarmerSeedReportRow[]): FarmerSeedReportSummary {
  const varietyMap = new Map<string, SummaryByLabelRow>();
  const generationMap = new Map<string, SummaryByLabelRow>();
  const bagSizeMap = new Map<string, number>();
  const farmerMap = new Map<string, FarmerSummaryRow>();

  for (const row of rows) {
    const variety = row.variety?.trim() || '—';
    const generation = row.generation?.trim() || '—';
    const farmer = row.farmerName?.trim() || '—';
    const account = String(row.accountNumber ?? '—');
    const bags = row.totalBags ?? 0;

    const varietyAgg = varietyMap.get(variety) ?? {
      label: variety,
      entries: 0,
      bags: 0,
    };
    varietyAgg.entries += 1;
    varietyAgg.bags += bags;
    varietyMap.set(variety, varietyAgg);

    const generationAgg = generationMap.get(generation) ?? {
      label: generation,
      entries: 0,
      bags: 0,
    };
    generationAgg.entries += 1;
    generationAgg.bags += bags;
    generationMap.set(generation, generationAgg);

    for (const [size, qty] of Object.entries(row.bagSizeQtyByName ?? {})) {
      bagSizeMap.set(size, (bagSizeMap.get(size) ?? 0) + (qty ?? 0));
    }

    const farmerKey = `${farmer}__${account}`;
    const farmerAgg = farmerMap.get(farmerKey) ?? {
      farmerName: farmer,
      accountNumber: account,
      entries: 0,
      bags: 0,
    };
    farmerAgg.entries += 1;
    farmerAgg.bags += bags;
    farmerMap.set(farmerKey, farmerAgg);
  }

  const totalEntries = rows.length;
  const totalBags = rows.reduce((sum, row) => sum + (row.totalBags ?? 0), 0);
  const uniqueFarmers = new Set(
    rows.map((row) => row.farmerName?.trim() || '—')
  ).size;
  const uniqueVarieties = new Set(rows.map((row) => row.variety?.trim() || '—'))
    .size;
  const uniqueGenerations = new Set(
    rows.map((row) => row.generation?.trim() || '—')
  ).size;

  const byVariety = Array.from(varietyMap.values()).sort(
    (a, b) => b.bags - a.bags || a.label.localeCompare(b.label)
  );
  const byGeneration = Array.from(generationMap.values()).sort(
    (a, b) => b.bags - a.bags || a.label.localeCompare(b.label)
  );
  const byBagSize = Array.from(bagSizeMap.entries())
    .map(([size, bags]) => ({ size, bags }))
    .sort((a, b) => b.bags - a.bags || a.size.localeCompare(b.size));
  const topFarmersByBags = Array.from(farmerMap.values()).sort(
    (a, b) => b.bags - a.bags || a.farmerName.localeCompare(b.farmerName)
  );

  return {
    totalEntries,
    totalBags,
    uniqueFarmers,
    uniqueVarieties,
    uniqueGenerations,
    avgBagsPerEntry: totalEntries > 0 ? totalBags / totalEntries : 0,
    byVariety,
    byGeneration,
    byBagSize,
    topFarmersByBags,
  };
}

function SummaryMetricTable({ summary }: { summary: FarmerSeedReportSummary }) {
  const fmt = (n: number) => n.toLocaleString('en-IN');
  return (
    <View style={[styles.summarySection, styles.summarySectionFirst]}>
      <Text style={styles.summaryTitle}>Owner Snapshot</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={[styles.summaryCellLeft, { width: '35%' }]}>Metric</Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: '65%' },
            ]}
          >
            Value
          </Text>
        </View>
        {[
          ['Total dispatch seed entries', fmt(summary.totalEntries)],
          ['Total seed bags issued', fmt(summary.totalBags)],
          ['Unique farmers served', fmt(summary.uniqueFarmers)],
          ['Active varieties', fmt(summary.uniqueVarieties)],
          ['Active stages', fmt(summary.uniqueGenerations)],
          ['Average bags per entry', summary.avgBagsPerEntry.toFixed(2)],
        ].map(([metric, value]) => (
          <View key={metric} style={styles.summaryTableRow}>
            <Text style={[styles.summaryCellLeft, { width: '35%' }]}>
              {metric}
            </Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: '65%' },
              ]}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryLabelTable({
  title,
  rows,
  labelTitle,
}: {
  title: string;
  rows: SummaryByLabelRow[];
  labelTitle: string;
}) {
  const fmt = (n: number) => n.toLocaleString('en-IN');
  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={[styles.summaryCellLeft, { width: '44%' }]}>
            {labelTitle}
          </Text>
          <Text style={[styles.summaryCell, { width: '18%' }]}>Entries</Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: '38%' },
            ]}
          >
            Total Bags
          </Text>
        </View>
        {rows.length === 0 ? (
          <View style={styles.summaryTableRow}>
            <Text
              style={[
                styles.summaryCellLeft,
                styles.summaryCellLast,
                { width: '100%' },
              ]}
            >
              No data
            </Text>
          </View>
        ) : (
          <>
            {rows.map((row) => (
              <View key={row.label} style={styles.summaryTableRow}>
                <Text style={[styles.summaryCellLeft, { width: '44%' }]}>
                  {row.label}
                </Text>
                <Text style={[styles.summaryCell, { width: '18%' }]}>
                  {fmt(row.entries)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: '38%' },
                  ]}
                >
                  {fmt(row.bags)}
                </Text>
              </View>
            ))}
            <View style={styles.summaryTableRowTotal}>
              <Text style={[styles.summaryCellLeft, { width: '44%' }]}>
                Total
              </Text>
              <Text style={[styles.summaryCell, { width: '18%' }]}>
                {fmt(rows.reduce((sum, row) => sum + row.entries, 0))}
              </Text>
              <Text
                style={[
                  styles.summaryCell,
                  styles.summaryCellLast,
                  { width: '38%' },
                ]}
              >
                {fmt(rows.reduce((sum, row) => sum + row.bags, 0))}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function SummaryBagSizeTable({
  rows,
}: {
  rows: Array<{ size: string; bags: number }>;
}) {
  const fmt = (n: number) => n.toLocaleString('en-IN');
  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>Bag Size Mix</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={[styles.summaryCellLeft, { width: '55%' }]}>
            Bag Size
          </Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: '45%' },
            ]}
          >
            Total Bags
          </Text>
        </View>
        {rows.length === 0 ? (
          <View style={styles.summaryTableRow}>
            <Text
              style={[
                styles.summaryCellLeft,
                styles.summaryCellLast,
                { width: '100%' },
              ]}
            >
              No bag-size data
            </Text>
          </View>
        ) : (
          <>
            {rows.map((row) => (
              <View key={row.size} style={styles.summaryTableRow}>
                <Text style={[styles.summaryCellLeft, { width: '55%' }]}>
                  {row.size}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: '45%' },
                  ]}
                >
                  {fmt(row.bags)}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

function SummaryTopFarmersTable({ rows }: { rows: FarmerSummaryRow[] }) {
  const fmt = (n: number) => n.toLocaleString('en-IN');
  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>Farmers by Bags Issued</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={[styles.summaryCellLeft, { width: '46%' }]}>Farmer</Text>
          <Text style={[styles.summaryCell, { width: '16%' }]}>Account</Text>
          <Text style={[styles.summaryCell, { width: '16%' }]}>Entries</Text>
          <Text
            style={[
              styles.summaryCell,
              styles.summaryCellLast,
              { width: '22%' },
            ]}
          >
            Bags
          </Text>
        </View>
        {rows.length === 0 ? (
          <View style={styles.summaryTableRow}>
            <Text
              style={[
                styles.summaryCellLeft,
                styles.summaryCellLast,
                { width: '100%' },
              ]}
            >
              No farmer data
            </Text>
          </View>
        ) : (
          <>
            {rows.map((row) => (
              <View
                key={`${row.farmerName}-${row.accountNumber}`}
                style={styles.summaryTableRow}
              >
                <Text style={[styles.summaryCellLeft, { width: '46%' }]}>
                  {row.farmerName}
                </Text>
                <Text style={[styles.summaryCell, { width: '16%' }]}>
                  {row.accountNumber}
                </Text>
                <Text style={[styles.summaryCell, { width: '16%' }]}>
                  {fmt(row.entries)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: '22%' },
                  ]}
                >
                  {fmt(row.bags)}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

function getOrderedBagSizes(rows: FarmerSeedReportRow[]): string[] {
  const hasQty = new Set<string>();
  for (const row of rows) {
    Object.entries(row.bagSizeQtyByName ?? {}).forEach(([size, qty]) => {
      if ((qty ?? 0) > 0) {
        hasQty.add(size);
      }
    });
  }
  return orderFarmerSeedBagSizes(hasQty);
}

function getLeafRowsFromSnapshot(
  rows: FarmerSeedReportRow[],
  tableSnapshot?: FarmerSeedReportPdfSnapshot<FarmerSeedReportRow> | null
): FarmerSeedReportRow[] {
  if (!tableSnapshot || tableSnapshot.rows.length === 0) return rows;
  const leaves = tableSnapshot.rows
    .filter(
      (item): item is { type: 'leaf'; row: FarmerSeedReportRow } =>
        item.type === 'leaf'
    )
    .map((item) => item.row);
  return leaves.length > 0 ? leaves : rows;
}

function buildPdfColumns(rows: FarmerSeedReportRow[]): ColumnDef[] {
  const bagSizes = getOrderedBagSizes(rows);
  if (bagSizes.length === 0) {
    return BASE_COLUMNS;
  }

  const beforeBagColumns = BASE_COLUMNS.filter((col) =>
    [
      'sNo',
      'farmerName',
      'accountNumber',
      'farmerAddress',
      'date',
      'gatePassNo',
      'invoiceNumber',
      'variety',
      'generation',
    ].includes(col.key)
  );
  const afterBagColumns = BASE_COLUMNS.filter((col) =>
    ['totalBags', 'rate', 'totalSeedAmount', 'remarks'].includes(col.key)
  );

  const fixedColumns = [...beforeBagColumns, ...afterBagColumns];
  const fixedWidth = fixedColumns.reduce(
    (sum, col) => sum + Number(col.width.replace('%', '')),
    0
  );
  // Reserve more horizontal space for dynamic bag-size columns
  // so bag labels remain readable in the PDF header.
  const remaining = Math.max(20, 100 - fixedWidth);
  const eachBagWidth = remaining / bagSizes.length;

  return [
    ...beforeBagColumns,
    ...bagSizes.map((size) => ({
      key: farmerSeedBagSizeColumnId(size),
      label: `${size} (mm)`,
      width: `${eachBagWidth}%`,
      align: 'center' as const,
    })),
    ...afterBagColumns,
  ];
}

function getBagSizeFromColumnKey(
  columnKey: string,
  rows: FarmerSeedReportRow[]
): string | null {
  const bagSizes = getOrderedBagSizes(rows);
  for (const size of bagSizes) {
    if (farmerSeedBagSizeColumnId(size) === columnKey) return size;
  }
  return null;
}

function getColumnsForSnapshot(
  fullColumns: ColumnDef[],
  tableSnapshot?: FarmerSeedReportPdfSnapshot<FarmerSeedReportRow> | null
): ColumnDef[] {
  if (!tableSnapshot || tableSnapshot.visibleColumnIds.length === 0) {
    return fullColumns;
  }
  const visibleInOrder = tableSnapshot.visibleColumnIds;
  const visible = new Set(visibleInOrder);
  const grouped = new Set(tableSnapshot.grouping ?? []);
  const fullByKey = new Map(fullColumns.map((column) => [column.key, column]));
  const filtered = visibleInOrder
    .filter((columnKey) => !grouped.has(columnKey))
    .map((columnKey) => fullByKey.get(columnKey))
    .filter(
      (column): column is ColumnDef => column != null && visible.has(column.key)
    );

  const fallback = fullColumns.filter(
    (column) => visible.has(column.key) && !grouped.has(column.key)
  );
  const orderedColumns = filtered.length > 0 ? filtered : fallback;
  if (orderedColumns.length === 0) return fullColumns;

  const totalPercent = orderedColumns.reduce(
    (sum, column) => sum + Number(column.width.replace('%', '')),
    0
  );
  const scale = totalPercent > 0 ? 100 / totalPercent : 1;
  return orderedColumns.map((column) => ({
    ...column,
    width: `${(Number(column.width.replace('%', '')) * scale).toFixed(2)}%`,
  }));
}

type FarmerPdfSection = {
  headers: Array<{
    depth: number;
    groupingColumnId: string;
    displayValue: string;
  }>;
  leaves: FarmerSeedReportRow[];
};

function buildSectionsFromSnapshot(
  tableSnapshot: FarmerSeedReportPdfSnapshot<FarmerSeedReportRow>
): FarmerPdfSection[] {
  const deepestDepth = tableSnapshot.grouping.length - 1;
  const sections: FarmerPdfSection[] = [];
  let current: FarmerPdfSection = { headers: [], leaves: [] };

  for (const item of tableSnapshot.rows) {
    if (item.type === 'group') {
      if (item.depth === deepestDepth) {
        if (current.leaves.length > 0) {
          sections.push(current);
          current = { headers: [...current.headers], leaves: [] };
        }
        current.headers[item.depth] = {
          depth: item.depth,
          groupingColumnId: item.groupingColumnId,
          displayValue: item.displayValue,
        };
      } else {
        current.headers[item.depth] = {
          depth: item.depth,
          groupingColumnId: item.groupingColumnId,
          displayValue: item.displayValue,
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

function FooterSection() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerBrandWrap}>
        <Image
          src="https://res.cloudinary.com/dakh64xhy/image/upload/v1753172868/profile_pictures/lhdlzskpe2gj8dq8jvzl.png"
          style={styles.footerLogo}
        />
        <Text style={styles.poweredBy}>Powered by Coldop</Text>
      </View>
    </View>
  );
}

export function FarmerSeedReportTablePdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Farmer Seed Report',
  rows,
  tableSnapshot,
}: FarmerSeedReportTablePdfProps) {
  const displayRows = getLeafRowsFromSnapshot(rows, tableSnapshot);
  const columns = getColumnsForSnapshot(
    buildPdfColumns(displayRows),
    tableSnapshot
  );
  const summary = computeSummary(displayRows);
  const totalBags = displayRows.reduce(
    (sum, row) => sum + (row.totalBags ?? 0),
    0
  );
  const totalSeedAmount = displayRows.reduce(
    (sum, row) => sum + (row.totalSeedAmount ?? 0),
    0
  );
  const bagSizeTotals = displayRows.reduce<Record<string, number>>(
    (acc, row) => {
      for (const [size, qty] of Object.entries(row.bagSizeQtyByName ?? {})) {
        acc[size] = (acc[size] ?? 0) + (qty ?? 0);
      }
      return acc;
    },
    {}
  );
  const hasGrouping = (tableSnapshot?.grouping?.length ?? 0) > 0;
  const groupedSections =
    tableSnapshot && hasGrouping
      ? buildSectionsFromSnapshot(tableSnapshot)
      : [];
  const groupingLabels: Record<string, string> = {
    farmerName: 'Farmer',
    accountNumber: 'Account No.',
    date: 'Date',
    variety: 'Variety',
    generation: 'Stage',
    gatePassNo: 'Gate Pass No.',
    invoiceNumber: 'Invoice No.',
  };

  return (
    <Document>
      {hasGrouping && groupedSections.length > 0
        ? [
            <Page
              key="farmer-seed-grouped-flow"
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <View style={styles.header}>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.reportTitle}>{reportTitle}</Text>
                <Text style={styles.dateRange}>{dateRangeLabel}</Text>
              </View>
              {groupedSections.map((section, sectionIndex) => (
                <View
                  key={`grouped-section-${sectionIndex}`}
                  style={{ marginBottom: 10 }}
                >
                  <View style={{ marginBottom: 8 }}>
                    {section.headers.map((header) => {
                      if (!header) return null;
                      const label =
                        groupingLabels[header.groupingColumnId] ??
                        header.groupingColumnId;
                      return (
                        <Text
                          key={`${sectionIndex}-${header.depth}-${header.groupingColumnId}`}
                          style={{ fontSize: 9, marginBottom: 2 }}
                        >
                          {label}: {header.displayValue}
                        </Text>
                      );
                    })}
                  </View>
                  <View style={styles.tableContainer}>
                    <View style={styles.table}>
                      <View
                        style={[styles.tableRow, styles.tableHeaderRow]}
                        wrap={false}
                      >
                        {columns.map((column, index) => (
                          <View
                            key={column.key}
                            style={[
                              styles.cellWrap,
                              index === columns.length - 1
                                ? styles.cellLast
                                : {},
                              { width: column.width },
                            ]}
                          >
                            <Text
                              style={[
                                styles.cellText,
                                alignStyle(column.align),
                              ]}
                              wrap
                            >
                              {column.label}
                            </Text>
                          </View>
                        ))}
                      </View>
                      {section.leaves.map((row) => (
                        <View key={row.id} style={styles.tableRow} wrap={false}>
                          {columns.map((column, colIndex) => {
                            const bagSize = getBagSizeFromColumnKey(
                              column.key,
                              displayRows
                            );
                            const value =
                              bagSize != null
                                ? (row.bagSizeQtyByName?.[bagSize] ?? '')
                                : row[column.key as keyof FarmerSeedReportRow];
                            return (
                              <View
                                key={`${row.id}-${column.key}`}
                                style={[
                                  styles.cellWrap,
                                  colIndex === columns.length - 1
                                    ? styles.cellLast
                                    : {},
                                  { width: column.width },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.cellText,
                                    alignStyle(column.align),
                                  ]}
                                  wrap
                                >
                                  {bagSize != null && value === ''
                                    ? ''
                                    : formatCellValue(column.key, value)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
              <View style={styles.tableContainer}>
                <View style={styles.table}>
                  <View style={styles.tableRowTotal} wrap={false}>
                    {columns.map((column, index) => (
                      <View
                        key={`total-${column.key}`}
                        style={[
                          styles.cellWrap,
                          index === columns.length - 1 ? styles.cellLast : {},
                          { width: column.width },
                        ]}
                      >
                        <Text
                          style={[styles.cellText, alignStyle(column.align)]}
                          wrap
                        >
                          {index === 0
                            ? 'Total'
                            : column.key === 'totalBags'
                              ? totalBags.toLocaleString('en-IN')
                              : column.key === 'totalSeedAmount'
                                ? totalSeedAmount.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : getBagSizeFromColumnKey(
                                      column.key,
                                      displayRows
                                    ) != null
                                  ? (
                                      bagSizeTotals[
                                        getBagSizeFromColumnKey(
                                          column.key,
                                          displayRows
                                        ) as string
                                      ] ?? 0
                                    ).toLocaleString('en-IN')
                                  : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </Page>,
          ]
        : [
            <Page
              key="farmer-seed-flow"
              size="A4"
              orientation="landscape"
              style={styles.page}
            >
              <View style={styles.header}>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.reportTitle}>{reportTitle}</Text>
                <Text style={styles.dateRange}>{dateRangeLabel}</Text>
              </View>

              <View style={styles.tableContainer}>
                <View style={styles.table}>
                  <View
                    style={[styles.tableRow, styles.tableHeaderRow]}
                    wrap={false}
                  >
                    {columns.map((column, index) => (
                      <View
                        key={column.key}
                        style={[
                          styles.cellWrap,
                          index === columns.length - 1 ? styles.cellLast : {},
                          { width: column.width },
                        ]}
                      >
                        <Text
                          style={[styles.cellText, alignStyle(column.align)]}
                          wrap
                        >
                          {column.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {rows.length === 0 ? (
                    <View style={styles.tableRow} wrap={false}>
                      <View
                        style={[
                          styles.cellWrap,
                          styles.cellLast,
                          { width: '100%' },
                        ]}
                      >
                        <Text style={[styles.cellText, styles.cellLeft]}>
                          No farmer seed report data for this period.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <>
                      {displayRows.map((row, rowIndex) => (
                        <View key={row.id} style={styles.tableRow} wrap={false}>
                          {columns.map((column, colIndex) => {
                            const bagSize = getBagSizeFromColumnKey(
                              column.key,
                              displayRows
                            );
                            const value = bagSize
                              ? (row.bagSizeQtyByName?.[bagSize] ?? '')
                              : column.key === 'sNo'
                                ? rowIndex + 1
                                : row[column.key as keyof FarmerSeedReportRow];
                            return (
                              <View
                                key={`${row.id}-${column.key}`}
                                style={[
                                  styles.cellWrap,
                                  colIndex === columns.length - 1
                                    ? styles.cellLast
                                    : {},
                                  { width: column.width },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.cellText,
                                    alignStyle(column.align),
                                  ]}
                                  wrap
                                >
                                  {bagSize != null && value === ''
                                    ? ''
                                    : formatCellValue(column.key, value)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ))}

                      <View style={styles.tableRowTotal} wrap={false}>
                        {columns.map((column, index) => (
                          <View
                            key={`total-${column.key}`}
                            style={[
                              styles.cellWrap,
                              index === columns.length - 1
                                ? styles.cellLast
                                : {},
                              { width: column.width },
                            ]}
                          >
                            <Text
                              style={[
                                styles.cellText,
                                alignStyle(column.align),
                              ]}
                              wrap
                            >
                              {index === 0
                                ? 'Total'
                                : column.key === 'totalBags'
                                  ? totalBags.toLocaleString('en-IN')
                                  : column.key === 'totalSeedAmount'
                                    ? totalSeedAmount.toLocaleString('en-IN', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    : getBagSizeFromColumnKey(
                                          column.key,
                                          displayRows
                                        ) != null
                                      ? (
                                          bagSizeTotals[
                                            getBagSizeFromColumnKey(
                                              column.key,
                                              displayRows
                                            ) as string
                                          ] ?? 0
                                        ).toLocaleString('en-IN')
                                      : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              </View>
            </Page>,
          ]}
      <Page size="A4" orientation="landscape" style={styles.summaryPage}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.reportTitle}>{reportTitle} — Summary</Text>
          <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        </View>
        <SummaryMetricTable summary={summary} />
        <SummaryLabelTable
          title="Variety-wise Summary"
          rows={summary.byVariety}
          labelTitle="Variety"
        />
        <SummaryLabelTable
          title="Stage-wise Summary"
          rows={summary.byGeneration}
          labelTitle="Stage"
        />
        <SummaryBagSizeTable rows={summary.byBagSize} />
        <SummaryTopFarmersTable rows={summary.topFarmersByBags} />
        <FooterSection />
      </Page>
    </Document>
  );
}
