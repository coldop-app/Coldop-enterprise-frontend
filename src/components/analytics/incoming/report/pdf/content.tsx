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
  sectionTitle: {
    marginTop: 10,
    marginBottom: 6,
    color: C.navy,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionIntro: {
    width: '100%',
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
  const sections =
    report.isGrouped && report.sections.length
      ? report.sections
      : [
          {
            id: 'all-records',
            title: '',
            rows: report.rows,
            totals: report.totals,
          },
        ];
  const hasRows = sections.some((section) => section.rows.length > 0);
  const totalWeight = report.columns.reduce(
    (sum, column) => sum + Number(column.weight || 1),
    0
  );
  const getCellWidth = (weight: number) => `${(weight / totalWeight) * 100}%`;
  // Keep title + column header together, and ensure there is room for at least
  // one data row after the intro block. Otherwise this section starts on next page.
  const minSectionPresenceAhead = 120;

  return (
    <View style={s.tableWrap}>
      {!hasRows ? (
        <Text style={s.emptyState}>
          No records found for current table state.
        </Text>
      ) : (
        sections.map((section) => (
          <View key={section.id} style={s.sectionBlock}>
            <View
              style={s.sectionIntro}
              wrap={false}
              minPresenceAhead={minSectionPresenceAhead}
            >
              {section.title ? (
                <Text style={s.sectionTitle}>{section.title}</Text>
              ) : null}
              <View style={s.tableHeaderRow}>
                {report.columns.map((column, index) => (
                  <View
                    key={`${section.id}-${column.id}`}
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
            </View>

            {section.rows.map((row) => (
              <View key={row.id} style={s.tableRow} wrap={false}>
                {report.columns.map((column, index) => (
                  <View
                    key={`${section.id}-${row.id}-${column.id}`}
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
            ))}

            <View style={s.tableRow} wrap={false}>
              {report.columns.map((column, index) => (
                <View
                  key={`${section.id}-total-${column.id}`}
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
                    {index === 0 ? 'TOTALS' : (section.totals[column.id] ?? '')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
