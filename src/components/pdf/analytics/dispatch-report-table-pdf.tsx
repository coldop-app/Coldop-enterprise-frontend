import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

type DispatchReportRow = {
  id: string;
  farmerName?: string;
  accountNumber?: number | string;
  farmerAddress?: string;
  farmerMobile?: string;
  createdByName?: string;
  gatePassNo?: number | string;
  manualGatePassNumber?: number | string;
  date?: string;
  from?: string;
  toField?: string;
  variety?: string;
  totalBags?: number | string;
  remarks?: string;
  [key: string]: number | string | null | undefined;
};

export interface DispatchReportTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  rows: DispatchReportRow[];
  visibleColumnIds?: string[];
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
  companyName: { fontSize: 16, fontWeight: 'bold', marginBottom: 3 },
  reportTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  dateRange: { fontSize: 9, marginBottom: 6 },
  tableContainer: { marginTop: 8 },
  table: { borderWidth: 1, borderColor: '#000', width: '100%' },
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
  cell: { paddingHorizontal: 2, fontSize: 10, textAlign: 'center' },
  cellLeft: { paddingHorizontal: 2, fontSize: 10, textAlign: 'left' },
  cellLast: { borderRightWidth: 0 },
  cellWrap: {
    borderRightWidth: 0.5,
    borderRightColor: '#666',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  cellText: { fontSize: 10, width: '100%', maxWidth: '100%' },
  summarySection: { marginTop: 8 },
  summaryTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
    marginBottom: 8,
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
    backgroundColor: '#D0D0D0',
    fontWeight: 'bold',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingVertical: 3,
  },
  summaryCell: {
    paddingHorizontal: 2,
    fontSize: 10,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLeft: {
    paddingHorizontal: 2,
    fontSize: 10,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLast: {
    borderRightWidth: 0,
  },
});

type PdfColumn = {
  key: string;
  label: string;
  width: string;
  align: 'left' | 'center' | 'right';
};

const ALL_BASE_COLUMNS: PdfColumn[] = [
  { key: 'farmerName', label: 'Farmer', width: '12%', align: 'left' },
  { key: 'accountNumber', label: 'Account No.', width: '7%', align: 'right' },
  { key: 'farmerAddress', label: 'Address', width: '12%', align: 'left' },
  { key: 'farmerMobile', label: 'Mobile', width: '7%', align: 'center' },
  { key: 'createdByName', label: 'Created by', width: '9%', align: 'left' },
  { key: 'gatePassNo', label: 'Gate pass no.', width: '7%', align: 'right' },
  {
    key: 'manualGatePassNumber',
    label: 'Manual GP no.',
    width: '8%',
    align: 'right',
  },
  { key: 'date', label: 'Date', width: '8%', align: 'center' },
  { key: 'from', label: 'From', width: '8%', align: 'left' },
  { key: 'toField', label: 'To', width: '8%', align: 'left' },
  { key: 'variety', label: 'Variety', width: '9%', align: 'left' },
  { key: 'totalBags', label: 'Bags', width: '7%', align: 'right' },
  { key: 'remarks', label: 'Remarks', width: '12%', align: 'left' },
];

function isSizeColumn(columnId: string): boolean {
  return columnId.startsWith('bags_');
}

function getSizeLabel(columnId: string): string {
  const base = columnId.replace('bags_', '').replace(/-/g, '–');
  return base.includes('(mm)') ? base : `${base} (mm)`;
}

function buildPdfColumns(
  rows: DispatchReportRow[],
  visibleColumnIds?: string[]
): PdfColumn[] {
  const availableSizeIds = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        if (isSizeColumn(key)) set.add(key);
      }
      return set;
    }, new Set<string>())
  ).sort();

  const allColumns: PdfColumn[] = [
    ...ALL_BASE_COLUMNS.slice(0, 11),
    ...availableSizeIds.map((id) => ({
      key: id,
      label: getSizeLabel(id),
      width: '7%',
      align: 'right' as const,
    })),
    ...ALL_BASE_COLUMNS.slice(11),
  ];

  const visibleSet =
    visibleColumnIds && visibleColumnIds.length > 0
      ? new Set(visibleColumnIds)
      : null;
  const filtered = allColumns.filter((col) =>
    visibleSet ? visibleSet.has(col.key) : true
  );
  const selected = filtered.length > 0 ? filtered : allColumns;
  const totalPercent = selected.reduce(
    (sum, col) => sum + parseFloat(col.width),
    0
  );
  const scale = totalPercent > 0 ? 100 / totalPercent : 1;
  return selected.map((col) => ({
    ...col,
    width: `${(parseFloat(col.width) * scale).toFixed(2)}%`,
  }));
}

function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isNaN(value)) return '—';
  return String(value);
}

function formatNumber(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString();
}

interface SummaryRowTotals {
  count: number;
  totalBags: number;
  sizeTotals: Record<string, number>;
}

interface VarietySummaryRow {
  variety: string;
  count: number;
  totalBags: number;
  sizeTotals: Record<string, number>;
}

interface FromSummaryRow {
  from: string;
  count: number;
  totalBags: number;
  sizeTotals: Record<string, number>;
}

interface DispatchReportTableSummary {
  byVariety: VarietySummaryRow[];
  byFrom: FromSummaryRow[];
  overall: SummaryRowTotals;
}

function computeDispatchReportSummary(
  rows: DispatchReportRow[]
): DispatchReportTableSummary {
  const sizeKeys = Array.from(
    rows.reduce((set, row) => {
      for (const key of Object.keys(row)) {
        if (isSizeColumn(key)) set.add(key);
      }
      return set;
    }, new Set<string>())
  ).sort();

  const initTotals = (): SummaryRowTotals => {
    const sizeTotals: Record<string, number> = {};
    for (const key of sizeKeys) sizeTotals[key] = 0;
    return { count: 0, totalBags: 0, sizeTotals };
  };

  const varietyMap = new Map<string, SummaryRowTotals>();
  const fromMap = new Map<string, SummaryRowTotals>();
  const overall = initTotals();

  const num = (v: number | string | null | undefined): number => {
    if (v == null || v === '') return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  for (const row of rows) {
    const variety = (row.variety ?? '').trim() || '—';
    const from = (row.from ?? '').trim() || '—';
    const totalBags = num(row.totalBags);

    overall.count += 1;
    overall.totalBags += totalBags;
    for (const k of sizeKeys) overall.sizeTotals[k] += num(row[k]);

    const v = varietyMap.get(variety);
    if (v) {
      v.count += 1;
      v.totalBags += totalBags;
      for (const k of sizeKeys) v.sizeTotals[k] += num(row[k]);
    } else {
      const t = initTotals();
      t.count = 1;
      t.totalBags = totalBags;
      for (const k of sizeKeys) t.sizeTotals[k] = num(row[k]);
      varietyMap.set(variety, t);
    }

    const f = fromMap.get(from);
    if (f) {
      f.count += 1;
      f.totalBags += totalBags;
      for (const k of sizeKeys) f.sizeTotals[k] += num(row[k]);
    } else {
      const t = initTotals();
      t.count = 1;
      t.totalBags = totalBags;
      for (const k of sizeKeys) t.sizeTotals[k] = num(row[k]);
      fromMap.set(from, t);
    }
  }

  const byVariety: VarietySummaryRow[] = Array.from(varietyMap.entries())
    .map(([variety, t]) => ({ variety, ...t }))
    .sort((a, b) => a.variety.localeCompare(b.variety));
  const byFrom: FromSummaryRow[] = Array.from(fromMap.entries())
    .map(([from, t]) => ({ from, ...t }))
    .sort((a, b) => a.from.localeCompare(b.from));

  return { byVariety, byFrom, overall };
}

function SummarySection({
  title,
  nameLabel,
  rows,
  nameKey,
  overall,
}: {
  title: string;
  nameLabel: string;
  rows: Array<{
    count: number;
    totalBags: number;
    sizeTotals: Record<string, number>;
    variety?: string;
    from?: string;
  }>;
  nameKey: 'variety' | 'from';
  overall: SummaryRowTotals;
}) {
  const sizeKeys = Object.keys(overall.sizeTotals);
  const sizeLabel = (k: string) => getSizeLabel(k);
  const nameWidth = '24%';
  const countWidth = '10%';
  const bagsWidth = '14%';
  const sizeWidth =
    sizeKeys.length > 0 ? `${Math.max(8, 52 / sizeKeys.length)}%` : '10%';
  return (
    <View style={styles.summarySection}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <View style={styles.summaryTable}>
        <View style={styles.summaryTableHeader}>
          <Text style={[styles.summaryCellLeft, { width: nameWidth }]}>
            {nameLabel}
          </Text>
          <Text style={[styles.summaryCell, { width: countWidth }]}>Count</Text>
          <Text style={[styles.summaryCell, { width: bagsWidth }]}>Bags</Text>
          {sizeKeys.map((k, i) => (
            <Text
              key={k}
              style={[
                styles.summaryCell,
                i === sizeKeys.length - 1 ? styles.summaryCellLast : {},
                { width: sizeWidth },
              ]}
            >
              {sizeLabel(k)}
            </Text>
          ))}
        </View>
        {rows.length === 0 ? (
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
            {rows.map((row) => (
              <View
                key={String(row[nameKey] ?? '')}
                style={styles.summaryTableRow}
              >
                <Text style={[styles.summaryCellLeft, { width: nameWidth }]}>
                  {formatCell(row[nameKey])}
                </Text>
                <Text style={[styles.summaryCell, { width: countWidth }]}>
                  {row.count}
                </Text>
                <Text style={[styles.summaryCell, { width: bagsWidth }]}>
                  {row.totalBags}
                </Text>
                {sizeKeys.map((k, i) => (
                  <Text
                    key={k}
                    style={[
                      styles.summaryCell,
                      i === sizeKeys.length - 1 ? styles.summaryCellLast : {},
                      { width: sizeWidth },
                    ]}
                  >
                    {row.sizeTotals[k] ?? 0}
                  </Text>
                ))}
              </View>
            ))}
            <View style={styles.summaryTableRowTotal}>
              <Text style={[styles.summaryCellLeft, { width: nameWidth }]}>
                Total
              </Text>
              <Text style={[styles.summaryCell, { width: countWidth }]}>
                {overall.count}
              </Text>
              <Text style={[styles.summaryCell, { width: bagsWidth }]}>
                {overall.totalBags}
              </Text>
              {sizeKeys.map((k, i) => (
                <Text
                  key={k}
                  style={[
                    styles.summaryCell,
                    i === sizeKeys.length - 1 ? styles.summaryCellLast : {},
                    { width: sizeWidth },
                  ]}
                >
                  {overall.sizeTotals[k] ?? 0}
                </Text>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function DispatchReportSummaryPage({
  companyName,
  dateRangeLabel,
  reportTitle,
  summary,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle: string;
  summary: DispatchReportTableSummary;
}) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.reportTitle}>{reportTitle} — Summary</Text>
        <Text style={styles.dateRange}>{dateRangeLabel}</Text>
      </View>
      <SummarySection
        title="Variety-wise total"
        nameLabel="Variety"
        rows={summary.byVariety}
        nameKey="variety"
        overall={summary.overall}
      />
      <SummarySection
        title="From-wise total"
        nameLabel="From"
        rows={summary.byFrom}
        nameKey="from"
        overall={summary.overall}
      />
    </Page>
  );
}

export const DispatchReportTablePdf = ({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Dispatch Report',
  rows,
  visibleColumnIds,
}: DispatchReportTablePdfProps) => {
  const columns = buildPdfColumns(rows, visibleColumnIds);
  const summary = computeDispatchReportSummary(rows);
  const totals: Record<string, number> = {};
  for (const col of columns) {
    if (col.key === 'totalBags' || isSizeColumn(col.key)) {
      totals[col.key] = rows.reduce(
        (sum, row) => sum + (Number(row[col.key]) || 0),
        0
      );
    }
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.reportTitle}>{reportTitle}</Text>
          <Text style={styles.dateRange}>{dateRangeLabel}</Text>
        </View>
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              {columns.map((col, i) => (
                <Text
                  key={col.key}
                  style={[
                    col.align === 'left' ? styles.cellLeft : styles.cell,
                    styles.cellWrap,
                    i === columns.length - 1 ? styles.cellLast : {},
                    { width: col.width },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
            </View>
            {rows.length === 0 ? (
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.cellLeft,
                    styles.cellWrap,
                    styles.cellLast,
                    { width: '100%', paddingVertical: 8 },
                  ]}
                >
                  No dispatch report data for this period.
                </Text>
              </View>
            ) : (
              <>
                {rows.map((row) => (
                  <View key={row.id} style={styles.tableRow}>
                    {columns.map((col, i) => {
                      const isNumeric =
                        col.key === 'totalBags' || isSizeColumn(col.key);
                      return (
                        <View
                          key={col.key}
                          style={[
                            styles.cellWrap,
                            i === columns.length - 1 ? styles.cellLast : {},
                            { width: col.width, minWidth: 0 },
                          ]}
                        >
                          <Text
                            style={[
                              col.align === 'left'
                                ? styles.cellLeft
                                : styles.cell,
                              styles.cellText,
                            ]}
                            wrap
                          >
                            {isNumeric
                              ? formatNumber(row[col.key])
                              : formatCell(row[col.key])}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
                <View style={styles.tableRowTotal}>
                  {columns.map((col, i) => {
                    const total = totals[col.key];
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
                            col.align === 'left'
                              ? styles.cellLeft
                              : styles.cell,
                            styles.cellText,
                          ]}
                        >
                          {i === 0
                            ? 'Total'
                            : total != null
                              ? formatNumber(total)
                              : ''}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </View>
      </Page>
      <DispatchReportSummaryPage
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
        summary={summary}
      />
    </Document>
  );
};
