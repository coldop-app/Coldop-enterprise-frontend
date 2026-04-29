import * as React from 'react';
import { StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PreparedIncomingReportPdf } from './pdf-prepare';

const C = {
  navy: '#0F2D1F',
  primary: '#16A34A', // Shadcn Green
  textStrong: '#1E293B', // slate-800 for maximum readability
  muted: '#475569', // slate-600 for headers
  headerBg: '#F1F5F9', // slate-100 for solid header anchor
  rowAlt: '#F8FAFC', // slate-50 for zebra striping
  border: '#E2E8F0', // slate-200
};

const WRAP_COLUMN_IDS = new Set([
  'farmerName',
  'farmerAddress',
  'truckNumber',
  'remarks',
]);

const s = StyleSheet.create({
  tableWrap: {
    marginTop: 14,
    width: '100%',
  },
  nonGroupedBodyWrap: {
    marginTop: 28,
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionIntro: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 10,
    color: C.primary,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: C.headerBg, // Solid background instead of just lines
    paddingVertical: 6,
    borderTopWidth: 2, // Strong top border in primary green to anchor the table
    borderTopColor: C.primary,
  },
  tableRow: {
    flexDirection: 'row',
    width: '100%',
  },
  // Alternating row backgrounds for scannability
  rowEven: {
    backgroundColor: '#FFFFFF',
  },
  rowOdd: {
    backgroundColor: C.rowAlt,
  },
  tableTotalsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1.5,
    borderTopColor: C.navy, // Hard visual stop for the totals
    paddingTop: 7,
    marginTop: 2,
  },
  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: C.muted,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tableBodyText: {
    fontSize: 10,
    color: C.textStrong,
    maxLines: 1,
    // @ts-expect-error react-pdf accepts hidden overflow at runtime.
    textOverflow: 'hidden',
  },
  tableBodyTextWrap: {
    fontSize: 10,
    color: C.textStrong,
  },
  tableTotalsText: {
    fontSize: 10,
    color: C.navy,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    maxLines: 1,
    // @ts-expect-error react-pdf accepts hidden overflow at runtime.
    textOverflow: 'hidden',
  },
  emptyState: {
    backgroundColor: C.rowAlt,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 32,
    textAlign: 'center',
    color: C.muted,
    fontSize: 10,
  },
});

export function ReportContentTable({
  report,
}: {
  report: PreparedIncomingReportPdf;
}) {
  const isGroupedReport = report.isGrouped && report.sections.length > 0;
  const sections = isGroupedReport
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

  const columnRenderMeta = React.useMemo(
    () =>
      report.columns.map((column) => {
        const width = `${(Number(column.weight || 1) / totalWeight) * 100}%`;
        const shouldWrap = WRAP_COLUMN_IDS.has(column.id);
        return {
          id: column.id,
          label: column.label,
          align: column.align,
          shouldWrap,
          cellStyle: [s.tableCell, { width }],
          headerTextStyle: [s.tableHeaderText, { textAlign: column.align }],
          bodyTextStyle: [
            shouldWrap ? s.tableBodyTextWrap : s.tableBodyText,
            { textAlign: column.align },
          ],
          totalsTextStyle: [s.tableTotalsText, { textAlign: column.align }],
        };
      }),
    [report.columns, totalWeight]
  );

  const minSectionPresenceAhead = 120;

  return (
    <View style={s.tableWrap}>
      {!hasRows ? (
        <Text style={s.emptyState}>
          No records found for current table state.
        </Text>
      ) : (
        <>
          <View style={!isGroupedReport ? s.nonGroupedBodyWrap : undefined}>
            {sections.map((section) => (
              <View key={section.id} style={s.sectionBlock}>
                <View
                  style={s.sectionIntro}
                  wrap={false}
                  minPresenceAhead={minSectionPresenceAhead}
                >
                  {section.title ? (
                    <Text style={s.sectionTitle}>{section.title}</Text>
                  ) : null}

                  {isGroupedReport ||
                  (!isGroupedReport && section.rows.length > 0) ? (
                    <View style={s.tableHeaderRow}>
                      {columnRenderMeta.map((columnMeta) => (
                        <View
                          key={`${section.id}-${columnMeta.id}`}
                          style={columnMeta.cellStyle}
                        >
                          <Text style={columnMeta.headerTextStyle}>
                            {columnMeta.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {/* Added index to map for alternating row colors */}
                {section.rows.map((row, index) => (
                  <View
                    key={row.id}
                    style={[s.tableRow, index % 2 === 0 ? s.rowEven : s.rowOdd]}
                    wrap={false}
                  >
                    {columnRenderMeta.map((columnMeta) => (
                      <View
                        key={`${section.id}-${row.id}-${columnMeta.id}`}
                        style={columnMeta.cellStyle}
                      >
                        <Text
                          style={columnMeta.bodyTextStyle}
                          wrap={columnMeta.shouldWrap}
                        >
                          {row.values[columnMeta.id]}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}

                <View style={s.tableTotalsRow} wrap={false}>
                  {columnRenderMeta.map((columnMeta, index) => (
                    <View
                      key={`${section.id}-total-${columnMeta.id}`}
                      style={columnMeta.cellStyle}
                    >
                      <Text style={columnMeta.totalsTextStyle} wrap={false}>
                        {index === 0
                          ? 'Total'
                          : (section.totals[columnMeta.id] ?? '')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

export function ReportSummarySection() {
  return (
    <View style={s.tableWrap}>
      <Text style={s.sectionTitle}>Summary</Text>
    </View>
  );
}
