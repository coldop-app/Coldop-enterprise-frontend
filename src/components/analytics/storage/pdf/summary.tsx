import { Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PreparedIncomingReportSummary } from './pdf-prepare';

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A', // Shadcn Green
  rule: '#E2E8F0',
  muted: '#64748B',
  surface: '#F8FAFC', // Light background for highlight boxes
};

const s = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 9,
    color: C.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    color: C.navy,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  sectionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: C.rule,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  tableTitle: {
    fontSize: 11,
    color: C.navy,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.primary,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: C.rule,
    paddingVertical: 10,
  },
  rowEven: {
    backgroundColor: '#FFFFFF',
  },
  rowOdd: {
    backgroundColor: C.surface,
  },
  tableRowTotal: {
    backgroundColor: C.surface,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: C.navy,
    marginTop: 4,
    paddingTop: 12,
  },
  col1: { width: '34%', paddingRight: 8 },
  col2: { width: '13.2%', textAlign: 'right' },
  col3: { width: '13.2%', textAlign: 'right' },
  col4: { width: '13.2%', textAlign: 'right' },
  col5: { width: '13.2%', textAlign: 'right' },
  col6: { width: '13.2%', textAlign: 'right' },
  colHeaderText: {
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cellLabelText: {
    fontSize: 10,
    color: C.navy,
  },
  cellNumberText: {
    fontSize: 10,
    color: '#1E293B',
    fontFamily: 'Helvetica',
  },
  cellTextTotal: {
    fontSize: 10,
    color: C.navy,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  },
});

type SummaryTableRow = {
  label: string;
  count: string;
  bags: string;
  bagValues: string[];
};

function SummaryTable({
  title,
  headerLabel,
  bagHeaders,
  rows,
  totalRow,
  emptyStateLabel,
  showFooterTotal = true,
  emphasizeBody = false,
}: {
  title: string;
  headerLabel: string;
  bagHeaders: string[];
  rows: SummaryTableRow[];
  totalRow: SummaryTableRow;
  emptyStateLabel?: string;
  showFooterTotal?: boolean;
  emphasizeBody?: boolean;
}) {
  const bodyRows =
    rows.length > 0
      ? rows
      : [
          {
            label: emptyStateLabel ?? 'No data',
            count: '',
            bags: '',
            bagValues: bagHeaders.map(() => ''),
          },
        ];
  const firstColumnWidth = bagHeaders.length <= 5 ? '22%' : '18%';
  const baseNumericWidth = `${(100 - Number.parseFloat(firstColumnWidth)) / (2 + bagHeaders.length)}%`;
  return (
    <View style={s.tableContainer}>
      <Text style={s.tableTitle}>{title}</Text>
      <View style={s.tableHeader} wrap={false}>
        <Text style={[s.col1, { width: firstColumnWidth }, s.colHeaderText]}>
          {headerLabel}
        </Text>
        <Text style={[s.col2, s.colHeaderText]}>Count</Text>
        <Text style={[s.col3, s.colHeaderText]}>Bags</Text>
        {bagHeaders.map((header) => (
          <Text
            key={`${title}-header-${header}`}
            style={[s.col4, { width: baseNumericWidth }, s.colHeaderText]}
          >
            {header}
          </Text>
        ))}
      </View>

      {bodyRows.map((row, index) => (
        <View
          style={[s.tableRow, index % 2 === 0 ? s.rowEven : s.rowOdd]}
          key={`${title}-${row.label}-${index}`}
        >
          <Text
            style={[
              s.col1,
              { width: firstColumnWidth },
              emphasizeBody ? s.cellTextTotal : s.cellLabelText,
            ]}
          >
            {row.label}
          </Text>
          <Text
            style={[s.col2, emphasizeBody ? s.cellTextTotal : s.cellNumberText]}
          >
            {row.count}
          </Text>
          <Text
            style={[s.col3, emphasizeBody ? s.cellTextTotal : s.cellNumberText]}
          >
            {row.bags}
          </Text>
          {row.bagValues.map((value, bagIndex) => (
            <Text
              key={`${title}-${row.label}-${bagIndex}`}
              style={[
                s.col4,
                { width: baseNumericWidth },
                emphasizeBody ? s.cellTextTotal : s.cellNumberText,
              ]}
            >
              {value}
            </Text>
          ))}
        </View>
      ))}

      {showFooterTotal ? (
        <View style={[s.tableRow, s.tableRowTotal]} wrap={false}>
          <Text style={[s.col1, { width: firstColumnWidth }, s.cellTextTotal]}>
            {totalRow.label}
          </Text>
          <Text style={[s.col2, s.cellTextTotal]}>{totalRow.count}</Text>
          <Text style={[s.col3, s.cellTextTotal]}>{totalRow.bags}</Text>
          {totalRow.bagValues.map((value, bagIndex) => (
            <Text
              key={`${title}-footer-${bagIndex}`}
              style={[s.col4, { width: baseNumericWidth }, s.cellTextTotal]}
            >
              {value}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function BagSizeSummaryTable({
  rows,
  totalBags,
}: {
  rows: Array<{ label: string; totalBags: string }>;
  totalBags: string;
}) {
  return (
    <View style={s.tableContainer}>
      <Text style={s.tableTitle}>Bag size-wise total</Text>
      <View style={s.tableHeader} wrap={false}>
        <Text style={[s.col1, s.colHeaderText]}>Bag size</Text>
        <Text style={[s.col3, s.colHeaderText]}>Total bags</Text>
      </View>
      {rows.map((row, index) => (
        <View
          style={[s.tableRow, index % 2 === 0 ? s.rowEven : s.rowOdd]}
          key={`bag-size-${row.label}-${index}`}
        >
          <Text style={s.cellLabelText}>{row.label}</Text>
          <Text style={[s.col3, s.cellNumberText]}>{row.totalBags}</Text>
        </View>
      ))}
      <View style={[s.tableRow, s.tableRowTotal]} wrap={false}>
        <Text style={s.cellTextTotal}>Total</Text>
        <Text style={[s.col3, s.cellTextTotal]}>{totalBags}</Text>
      </View>
    </View>
  );
}

export function ReportSummaryPage({
  summary,
}: {
  summary: PreparedIncomingReportSummary;
}) {
  const overallRow: SummaryTableRow = {
    label: 'Total',
    count: summary.overall.count,
    bags: summary.overall.bags,
    bagValues: summary.bagColumns.map(
      (column) => summary.overall.bagSizeTotals[column.id]
    ),
  };
  const byVarietyRows: SummaryTableRow[] = summary.byVariety.map((row) => ({
    label: row.variety,
    count: row.count,
    bags: row.bags,
    bagValues: summary.bagColumns.map((column) => row.bagSizeTotals[column.id]),
  }));
  const byFarmerRows: SummaryTableRow[] = summary.byFarmer.map((row) => ({
    label: row.farmerName,
    count: row.count,
    bags: row.bags,
    bagValues: summary.bagColumns.map((column) => row.bagSizeTotals[column.id]),
  }));
  const bagHeaders = summary.bagColumns.map((column) => column.label);
  const minHeadingPresenceAhead = 160;

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View wrap={false} minPresenceAhead={minHeadingPresenceAhead}>
        <Text style={s.sectionSubtitle}>Executive Overview</Text>
        <Text style={s.sectionTitle}>Inventory Summary</Text>
      </View>
      <View style={s.sectionStack}>
        <SummaryTable
          title="Variety-wise total"
          headerLabel="Variety"
          bagHeaders={bagHeaders}
          rows={byVarietyRows}
          totalRow={overallRow}
        />
        <SummaryTable
          title="Farmer-wise total"
          headerLabel="Farmer"
          bagHeaders={bagHeaders}
          rows={byFarmerRows}
          totalRow={overallRow}
        />
        <BagSizeSummaryTable
          rows={summary.bagSizeTotals}
          totalBags={summary.overall.bags}
        />
        <SummaryTable
          title="Overall total"
          headerLabel=""
          bagHeaders={bagHeaders}
          rows={[overallRow]}
          totalRow={overallRow}
          showFooterTotal={false}
          emphasizeBody
        />
      </View>
    </Page>
  );
}
