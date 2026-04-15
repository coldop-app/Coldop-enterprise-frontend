import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

interface FarmerSeedReportRow {
  id: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  gatePassNo: number | string;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  totalBags: number;
  bagSizeQtyByName: Record<string, number>;
  remarks: string;
}

export interface FarmerSeedReportTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  rows: FarmerSeedReportRow[];
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 9,
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
  table: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
    paddingVertical: 2,
  },
  rowHeader: {
    backgroundColor: '#E8E8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 3,
  },
  rowTotal: {
    flexDirection: 'row',
    backgroundColor: '#D0D0D0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 3,
  },
  cellWrap: {
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cellText: {
    fontSize: 7,
    width: '100%',
    maxWidth: '100%',
  },
  cellTextLeft: {
    textAlign: 'left',
  },
  cellTextCenter: {
    textAlign: 'center',
  },
  cellTextRight: {
    textAlign: 'right',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  summaryPage: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 9,
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
    fontSize: 8,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLeft: {
    paddingHorizontal: 3,
    fontSize: 8,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLast: {
    borderRightWidth: 0,
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
  { key: 'farmerName', label: 'Farmer', width: '12%', align: 'left' },
  { key: 'accountNumber', label: 'Account', width: '5%', align: 'right' },
  { key: 'farmerAddress', label: 'Address', width: '11%', align: 'left' },
  { key: 'date', label: 'Date', width: '6%', align: 'center' },
  { key: 'gatePassNo', label: 'Gate Pass', width: '5%', align: 'right' },
  { key: 'invoiceNumber', label: 'Invoice', width: '5%', align: 'left' },
  { key: 'variety', label: 'Variety', width: '5%', align: 'left' },
  { key: 'generation', label: 'Gen', width: '4%', align: 'left' },
  { key: 'totalBags', label: 'Total Bags', width: '4%', align: 'right' },
  { key: 'remarks', label: 'Remarks', width: '23%', align: 'left' },
];

const ROWS_PER_PAGE = 17;
const BAG_COL_PREFIX = 'bags_';

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return String(value);
}

function alignStyle(align: ColumnDef['align']) {
  if (align === 'left') return styles.cellTextLeft;
  if (align === 'right') return styles.cellTextRight;
  return styles.cellTextCenter;
}

function chunkRows<T>(items: T[], chunkSize: number): T[][] {
  if (items.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
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
          ['Active generations', fmt(summary.uniqueGenerations)],
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

function normalizeSizeName(size: string): string {
  return size.replace(/–/g, '-').trim();
}

function getOrderedBagSizes(rows: FarmerSeedReportRow[]): string[] {
  const unique = new Set<string>();
  for (const row of rows) {
    Object.keys(row.bagSizeQtyByName ?? {}).forEach((size) => unique.add(size));
  }
  const sizes = Array.from(unique);
  return sizes.sort((a, b) => {
    const aNorm = normalizeSizeName(a);
    const bNorm = normalizeSizeName(b);
    const aStart = Number(aNorm.split('-')[0]);
    const bStart = Number(bNorm.split('-')[0]);
    if (!Number.isNaN(aStart) && !Number.isNaN(bStart) && aStart !== bStart) {
      return aStart - bStart;
    }
    return aNorm.localeCompare(bNorm);
  });
}

function buildPdfColumns(rows: FarmerSeedReportRow[]): ColumnDef[] {
  const bagSizes = getOrderedBagSizes(rows);
  if (bagSizes.length === 0) {
    return BASE_COLUMNS;
  }

  const fixedBase = BASE_COLUMNS.filter((col) => col.key !== 'remarks');
  const fixedWidth = fixedBase.reduce(
    (sum, col) => sum + Number(col.width.replace('%', '')),
    0
  );
  const remarksWidth = 23;
  const remaining = Math.max(8, 100 - fixedWidth - remarksWidth);
  const eachBagWidth = remaining / bagSizes.length;
  const bagColsTotal = eachBagWidth * bagSizes.length;
  const adjustedRemarks = 100 - fixedWidth - bagColsTotal;

  return [
    ...fixedBase,
    ...bagSizes.map((size) => ({
      key: `${BAG_COL_PREFIX}${size}`,
      label: size,
      width: `${eachBagWidth}%`,
      align: 'center' as const,
    })),
    {
      key: 'remarks',
      label: 'Remarks',
      width: `${adjustedRemarks}%`,
      align: 'left' as const,
    },
  ];
}

function getBagSizeFromColumnKey(columnKey: string): string | null {
  if (!columnKey.startsWith(BAG_COL_PREFIX)) return null;
  return columnKey.slice(BAG_COL_PREFIX.length);
}

export function FarmerSeedReportTablePdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Farmer Seed Report',
  rows,
}: FarmerSeedReportTablePdfProps) {
  const columns = buildPdfColumns(rows);
  const summary = computeSummary(rows);
  const totalBags = rows.reduce((sum, row) => sum + (row.totalBags ?? 0), 0);
  const bagSizeTotals = rows.reduce<Record<string, number>>((acc, row) => {
    for (const [size, qty] of Object.entries(row.bagSizeQtyByName ?? {})) {
      acc[size] = (acc[size] ?? 0) + (qty ?? 0);
    }
    return acc;
  }, {});
  const pagedRows = chunkRows(rows, ROWS_PER_PAGE);

  return (
    <Document>
      {pagedRows.map((pageRows, pageIndex) => {
        const startIndex = pageIndex * ROWS_PER_PAGE;
        const isLastPage = pageIndex === pagedRows.length - 1;

        return (
          <Page
            key={`farmer-seed-page-${pageIndex + 1}`}
            size="A4"
            orientation="landscape"
            style={styles.page}
          >
            <View style={styles.header}>
              <Text style={styles.companyName}>{companyName}</Text>
              <Text style={styles.reportTitle}>{reportTitle}</Text>
              <Text style={styles.dateRange}>
                {dateRangeLabel} | Page {pageIndex + 1} of {pagedRows.length}
              </Text>
            </View>

            <View style={styles.table}>
              <View style={[styles.row, styles.rowHeader]} wrap={false}>
                {columns.map((column, index) => (
                  <View
                    key={column.key}
                    style={[
                      styles.cellWrap,
                      index === columns.length - 1 ? styles.cellLast : {},
                      { width: column.width },
                    ]}
                  >
                    <Text style={[styles.cellText, alignStyle(column.align)]}>
                      {column.label}
                    </Text>
                  </View>
                ))}
              </View>

              {rows.length === 0 ? (
                <View style={styles.row} wrap={false}>
                  <View
                    style={[
                      styles.cellWrap,
                      styles.cellLast,
                      { width: '100%' },
                    ]}
                  >
                    <Text style={[styles.cellText, styles.cellTextLeft]}>
                      No farmer seed report data for this period.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  {pageRows.map((row, rowIndex) => (
                    <View key={row.id} style={styles.row} wrap={false}>
                      {columns.map((column, colIndex) => {
                        const bagSize = getBagSizeFromColumnKey(column.key);
                        const value = bagSize
                          ? (row.bagSizeQtyByName?.[bagSize] ?? '')
                          : column.key === 'sNo'
                            ? startIndex + rowIndex + 1
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
                            >
                              {bagSize != null && value === ''
                                ? ''
                                : formatValue(value)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}

                  {isLastPage && (
                    <View style={styles.rowTotal} wrap={false}>
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
                          >
                            {index === 0
                              ? 'Total'
                              : column.key === 'totalBags'
                                ? totalBags.toLocaleString('en-IN')
                                : getBagSizeFromColumnKey(column.key) != null
                                  ? (
                                      bagSizeTotals[
                                        getBagSizeFromColumnKey(
                                          column.key
                                        ) as string
                                      ] ?? 0
                                    ).toLocaleString('en-IN')
                                  : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          </Page>
        );
      })}
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
          title="Generation-wise Summary"
          rows={summary.byGeneration}
          labelTitle="Generation"
        />
        <SummaryBagSizeTable rows={summary.byBagSize} />
        <SummaryTopFarmersTable rows={summary.topFarmersByBags} />
      </Page>
    </Document>
  );
}
