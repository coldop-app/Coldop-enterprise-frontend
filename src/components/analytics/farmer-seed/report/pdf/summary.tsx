import { Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PreparedFarmerSeedReportSummary } from './pdf-prepare';

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A',
  rule: '#E2E8F0',
  muted: '#64748B',
  surface: '#F8FAFC',
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
    borderBottomWidth: 0.5,
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
  rowEven: { backgroundColor: '#FFFFFF' },
  rowOdd: { backgroundColor: C.surface },
  tableRowTotal: {
    backgroundColor: C.surface,
    borderBottomWidth: 0,
    borderTopWidth: 1,
    borderTopColor: C.navy,
    marginTop: 4,
    paddingTop: 12,
  },
  col1: { width: '47%', paddingRight: 8 },
  col2: { width: '13.25%', textAlign: 'right' },
  col3: { width: '13.25%', textAlign: 'right' },
  col4: { width: '13.25%', textAlign: 'right' },
  col5: { width: '13.25%', textAlign: 'right' },
  colHeaderText: {
    fontSize: 8,
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  cellLabelText: { fontSize: 10, color: C.navy },
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
  acres: string;
  amount: string;
};

function SummaryTable({
  title,
  headerLabel,
  rows,
  totalRow,
  showFooterTotal = true,
  emphasizeBody = false,
}: {
  title: string;
  headerLabel: string;
  rows: SummaryTableRow[];
  totalRow: SummaryTableRow;
  showFooterTotal?: boolean;
  emphasizeBody?: boolean;
}) {
  const bodyRows =
    rows.length > 0
      ? rows
      : [{ label: 'No data', count: '', bags: '', acres: '', amount: '' }];

  return (
    <View style={s.tableContainer}>
      <Text style={s.tableTitle}>{title}</Text>
      <View style={s.tableHeader} wrap={false}>
        <Text style={[s.col1, s.colHeaderText]}>{headerLabel}</Text>
        <Text style={[s.col2, s.colHeaderText]}>Count</Text>
        <Text style={[s.col3, s.colHeaderText]}>Bags</Text>
        <Text style={[s.col4, s.colHeaderText]}>Acres</Text>
        <Text style={[s.col5, s.colHeaderText]}>Amount</Text>
      </View>

      {bodyRows.map((row, index) => (
        <View
          style={[s.tableRow, index % 2 === 0 ? s.rowEven : s.rowOdd]}
          key={`${title}-${row.label}-${index}`}
        >
          <Text
            style={[s.col1, emphasizeBody ? s.cellTextTotal : s.cellLabelText]}
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
          <Text
            style={[s.col4, emphasizeBody ? s.cellTextTotal : s.cellNumberText]}
          >
            {row.acres}
          </Text>
          <Text
            style={[s.col5, emphasizeBody ? s.cellTextTotal : s.cellNumberText]}
          >
            {row.amount}
          </Text>
        </View>
      ))}

      {showFooterTotal ? (
        <View style={[s.tableRow, s.tableRowTotal]} wrap={false}>
          <Text style={[s.col1, s.cellTextTotal]}>{totalRow.label}</Text>
          <Text style={[s.col2, s.cellTextTotal]}>{totalRow.count}</Text>
          <Text style={[s.col3, s.cellTextTotal]}>{totalRow.bags}</Text>
          <Text style={[s.col4, s.cellTextTotal]}>{totalRow.acres}</Text>
          <Text style={[s.col5, s.cellTextTotal]}>{totalRow.amount}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function ReportSummaryPage({
  summary,
}: {
  summary: PreparedFarmerSeedReportSummary;
}) {
  const overallRow: SummaryTableRow = {
    label: 'Total',
    count: summary.overall.count,
    bags: summary.overall.bags,
    acres: summary.overall.acres,
    amount: summary.overall.amount,
  };

  const byVarietyRows: SummaryTableRow[] = summary.byVariety.map((row) => ({
    label: row.variety,
    count: row.count,
    bags: row.bags,
    acres: row.acres,
    amount: row.amount,
  }));

  const byFarmerRows: SummaryTableRow[] = summary.byFarmer.map((row) => ({
    label: row.farmerName,
    count: row.count,
    bags: row.bags,
    acres: row.acres,
    amount: row.amount,
  }));

  const minHeadingPresenceAhead = 160;

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <View wrap={false} minPresenceAhead={minHeadingPresenceAhead}>
        <Text style={s.sectionSubtitle}>Executive Overview</Text>
        <Text style={s.sectionTitle}>Farmer Seed Summary</Text>
      </View>
      <View style={s.sectionStack}>
        <SummaryTable
          title="Variety-wise total"
          headerLabel="Variety"
          rows={byVarietyRows}
          totalRow={overallRow}
        />
        <SummaryTable
          title="Farmer-wise total"
          headerLabel="Farmer"
          rows={byFarmerRows}
          totalRow={overallRow}
        />
        <SummaryTable
          title="Overall total"
          headerLabel=""
          rows={[overallRow]}
          totalRow={overallRow}
          showFooterTotal={false}
          emphasizeBody
        />
      </View>
    </Page>
  );
}
