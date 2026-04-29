import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PreparedIncomingReportPdf } from './pdf-prepare';

const C = {
  navy: '#0F2D1F',
  rule: '#CBD5E1',
  muted: '#64748B',
};

const s = StyleSheet.create({
  tableWrap: {
    marginTop: 12,
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderTopColor: C.rule,
    borderLeftColor: C.rule,
    borderRightColor: C.rule,
    backgroundColor: '#F8FAFC',
  },
  tableRow: {
    flexDirection: 'row',
    width: '100%',
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderLeftColor: C.rule,
    borderRightColor: C.rule,
    borderBottomColor: C.rule,
  },
  tableCell: {
    fontSize: 9,
    paddingVertical: 6.5,
    paddingHorizontal: 4,
    borderRightWidth: 0.6,
    borderRightColor: C.rule,
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: C.navy,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  tableBodyText: {
    fontSize: 9.1,
    color: '#0B1220',
  },
  tableTotalsText: {
    fontSize: 9.1,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
  },
  emptyState: {
    borderWidth: 0.6,
    borderColor: C.rule,
    paddingVertical: 16,
    textAlign: 'center',
    color: C.muted,
    fontSize: 9,
  },
});

export function ReportContentTable({
  report,
}: {
  report: PreparedIncomingReportPdf;
}) {
  const totalWeight = report.columns.reduce(
    (sum, column) => sum + Number(column.weight || 1),
    0
  );
  const getCellWidth = (weight: number) => `${(weight / totalWeight) * 100}%`;
  const hasRows = report.rows.length > 0;

  return (
    <View style={s.tableWrap}>
      <View style={s.tableHeaderRow} fixed>
        {report.columns.map((column, index) => (
          <View
            key={column.id}
            style={[
              s.tableCell,
              { width: getCellWidth(column.weight) },
              {
                borderRightWidth: index === report.columns.length - 1 ? 0 : 0.6,
              },
            ]}
          >
            <Text
              style={[
                s.tableHeaderText,
                {
                  textAlign: column.align,
                },
              ]}
            >
              {column.label}
            </Text>
          </View>
        ))}
      </View>

      {hasRows ? (
        report.rows.map((row) => (
          <View key={row.id} style={s.tableRow} wrap={false}>
            {report.columns.map((column, index) => (
              <View
                key={`${row.id}-${column.id}`}
                style={[
                  s.tableCell,
                  { width: getCellWidth(column.weight) },
                  {
                    borderRightWidth:
                      index === report.columns.length - 1 ? 0 : 0.6,
                  },
                ]}
              >
                <Text
                  style={[
                    s.tableBodyText,
                    {
                      textAlign: column.align,
                    },
                  ]}
                >
                  {row.values[column.id]}
                </Text>
              </View>
            ))}
          </View>
        ))
      ) : (
        <Text style={s.emptyState}>
          No records found for current table state.
        </Text>
      )}

      {hasRows ? (
        <View style={s.tableRow} wrap={false}>
          {report.columns.map((column, index) => (
            <View
              key={`total-${column.id}`}
              style={[
                s.tableCell,
                { width: getCellWidth(column.weight) },
                {
                  borderRightWidth:
                    index === report.columns.length - 1 ? 0 : 0.6,
                },
              ]}
            >
              <Text
                style={[
                  s.tableTotalsText,
                  {
                    textAlign: column.align,
                  },
                ]}
              >
                {index === 0 ? 'TOTALS' : (report.totals[column.id] ?? '')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
