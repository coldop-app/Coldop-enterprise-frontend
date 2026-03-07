import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { IncomingReportRow } from '@/components/analytics/reports/incoming-report/columns';
import type { IncomingReportPdfSnapshot } from '@/components/analytics/reports/incoming-report/data-table';

export interface IncomingReportTablePdfProps {
  companyName?: string;
  dateRangeLabel: string;
  reportTitle?: string;
  rows: IncomingReportRow[];
  /** When provided, honours table grouping, column visibility, and sorting from the report UI. */
  tableSnapshot?: IncomingReportPdfSnapshot<IncomingReportRow> | null;
}

// Reuse same visual style as incoming-gate-pass-report-pdf
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
  varietySection: {
    marginTop: 14,
  },
  varietySectionFirst: {
    marginTop: 0,
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
  genericSection: {
    marginTop: 14,
  },
  genericSectionFirst: {
    marginTop: 0,
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
});

const ALL_COLUMNS: {
  key: keyof IncomingReportRow;
  label: string;
  width: string;
  align: 'left' | 'center';
}[] = [
  { key: 'farmerName', label: 'Farmer', width: '9%', align: 'left' },
  { key: 'accountNumber', label: 'Account No.', width: '5%', align: 'center' },
  { key: 'farmerAddress', label: 'Address', width: '9%', align: 'left' },
  { key: 'farmerMobile', label: 'Mobile', width: '6%', align: 'center' },
  { key: 'createdByName', label: 'Created by', width: '8%', align: 'left' },
  { key: 'gatePassNo', label: 'Gate pass no.', width: '5%', align: 'center' },
  {
    key: 'manualGatePassNumber',
    label: 'Manual GP no.',
    width: '5%',
    align: 'center',
  },
  { key: 'date', label: 'Date', width: '6%', align: 'center' },
  { key: 'variety', label: 'Variety', width: '6%', align: 'left' },
  { key: 'truckNumber', label: 'Truck no.', width: '9%', align: 'center' },
  { key: 'bags', label: 'Bags', width: '5%', align: 'center' },
  { key: 'grossWeightKg', label: 'Gross (kg)', width: '6%', align: 'center' },
  { key: 'tareWeightKg', label: 'Tare (kg)', width: '6%', align: 'center' },
  { key: 'netWeightKg', label: 'Net (kg)', width: '6%', align: 'center' },
  { key: 'status', label: 'Status', width: '6%', align: 'center' },
  { key: 'remarks', label: 'Remarks', width: '9%', align: 'left' },
];

function getColumnsForPdf(
  visibleColumnIds: string[],
  excludeGrouping?: string[]
): {
  key: keyof IncomingReportRow;
  label: string;
  width: string;
  align: 'left' | 'center';
}[] {
  const visible = new Set(
    visibleColumnIds.length > 0
      ? visibleColumnIds
      : ALL_COLUMNS.map((c) => c.key)
  );
  const exclude = new Set(excludeGrouping ?? []);
  const filtered = ALL_COLUMNS.filter(
    (c) => visible.has(c.key) && !exclude.has(c.key)
  );
  if (filtered.length === 0) return ALL_COLUMNS;
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

function formatCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && Number.isNaN(value)) return '—';
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

interface TableRowProps {
  row: IncomingReportRow;
  columns: {
    key: keyof IncomingReportRow;
    label: string;
    width: string;
    align: 'left' | 'center';
  }[];
}

function TableRow({ row, columns }: TableRowProps) {
  return (
    <View style={styles.tableRow}>
      {columns.map((col, i) => (
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
              col.align === 'left' ? styles.cellLeft : styles.cell,
              styles.cellText,
            ]}
            wrap
          >
            {formatCell(row[col.key])}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TotalsRow({
  totalBags,
  totalGross,
  totalTare,
  totalNet,
  columns,
}: {
  totalBags: number;
  totalGross: number;
  totalTare: number;
  totalNet: number;
  columns: {
    key: keyof IncomingReportRow;
    label: string;
    width: string;
    align: 'left' | 'center';
  }[];
}) {
  const fmt = (n: number) => (Number.isNaN(n) ? '—' : n.toFixed(2));
  return (
    <View style={styles.tableRowTotal}>
      {columns.map((col, i) => {
        if (col.key === 'bags')
          return (
            <Text key={col.key} style={[styles.cell, { width: col.width }]}>
              {totalBags}
            </Text>
          );
        if (col.key === 'grossWeightKg')
          return (
            <Text key={col.key} style={[styles.cell, { width: col.width }]}>
              {fmt(totalGross)}
            </Text>
          );
        if (col.key === 'tareWeightKg')
          return (
            <Text key={col.key} style={[styles.cell, { width: col.width }]}>
              {fmt(totalTare)}
            </Text>
          );
        if (col.key === 'netWeightKg')
          return (
            <Text
              key={col.key}
              style={[
                styles.cell,
                i === columns.length - 1 ? styles.cellLast : {},
                { width: col.width },
              ]}
            >
              {fmt(totalNet)}
            </Text>
          );
        return (
          <Text
            key={col.key}
            style={[
              col.align === 'left' ? styles.cellLeft : styles.cell,
              i === columns.length - 1 ? styles.cellLast : {},
              { width: col.width },
            ]}
          >
            {i === 0 ? 'Total' : ''}
          </Text>
        );
      })}
    </View>
  );
}

/** Section = one block header (or nested headers) + table rows */
interface PdfSection {
  headers: Array<{
    depth: number;
    groupingColumnId: string;
    displayValue: string;
    firstLeaf?: IncomingReportRow;
  }>;
  leaves: IncomingReportRow[];
}

function buildSectionsFromSnapshot(
  snapshot: IncomingReportPdfSnapshot<IncomingReportRow>
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

function FarmerBlockHeader({ firstLeaf }: { firstLeaf?: IncomingReportRow }) {
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
      </Text>
      <Text style={styles.farmerHeaderRow}>
        Account No: {formatCell(firstLeaf.accountNumber)} | Mobile:{' '}
        {formatCell(firstLeaf.farmerMobile)}
      </Text>
      <Text style={styles.farmerHeaderRow}>
        Address: {formatCell(firstLeaf.farmerAddress)}
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
  farmerAddress: 'Address',
  farmerMobile: 'Mobile',
  createdByName: 'Created by',
  date: 'Date',
  variety: 'Variety',
  status: 'Status',
  remarks: 'Remarks',
};

export const IncomingReportTablePdf = ({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'INCOMING REPORT',
  rows,
  tableSnapshot,
}: IncomingReportTablePdfProps) => {
  const totalBags = rows.reduce(
    (sum, r) => sum + (typeof r.bags === 'number' ? r.bags : 0),
    0
  );
  const totalGross = rows.reduce((sum, r) => {
    const v = r.grossWeightKg;
    return sum + (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  }, 0);
  const totalTare = rows.reduce((sum, r) => {
    const v = r.tareWeightKg;
    return sum + (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  }, 0);
  const totalNet = rows.reduce((sum, r) => {
    const v = r.netWeightKg;
    return sum + (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  }, 0);

  const useSnapshot =
    tableSnapshot &&
    tableSnapshot.rows.length > 0 &&
    (tableSnapshot.grouping.length > 0 ||
      tableSnapshot.visibleColumnIds.length > 0);

  const visibleColumnIds =
    useSnapshot && tableSnapshot!.visibleColumnIds.length > 0
      ? tableSnapshot!.visibleColumnIds
      : ALL_COLUMNS.map((c) => c.key);

  const grouping = useSnapshot ? tableSnapshot!.grouping : [];

  if (useSnapshot && tableSnapshot!.grouping.length > 0) {
    const sections = buildSectionsFromSnapshot(tableSnapshot!);
    const columnsForTable = getColumnsForPdf(visibleColumnIds, grouping);
    return (
      <Document>
        <Page size="A4" style={styles.page}>
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
                      section.leaves.map((row) => (
                        <TableRow
                          key={row.id}
                          row={row}
                          columns={columnsForTable}
                        />
                      ))
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          <View style={styles.tableContainer}>
            <View style={styles.table}>
              <TotalsRow
                totalBags={totalBags}
                totalGross={totalGross}
                totalTare={totalTare}
                totalNet={totalNet}
                columns={getColumnsForPdf(visibleColumnIds)}
              />
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  const columnsForPdf =
    useSnapshot && tableSnapshot!.visibleColumnIds.length > 0
      ? getColumnsForPdf(tableSnapshot!.visibleColumnIds)
      : ALL_COLUMNS;

  const leafRows =
    useSnapshot && tableSnapshot!.rows.length > 0
      ? tableSnapshot!.rows
          .filter(
            (r): r is { type: 'leaf'; row: IncomingReportRow } =>
              r.type === 'leaf'
          )
          .map((r) => r.row)
      : rows;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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
                  No incoming report data for this period.
                </Text>
              </View>
            ) : (
              <>
                {leafRows.map((row) => (
                  <TableRow key={row.id} row={row} columns={columnsForPdf} />
                ))}
                <TotalsRow
                  totalBags={totalBags}
                  totalGross={totalGross}
                  totalTare={totalTare}
                  totalNet={totalNet}
                  columns={columnsForPdf}
                />
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
};
