import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { SIZE_HEADER_LABELS } from '@/components/pdf/gradingVoucherCalculations';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import type { SummaryRightValues } from '@/components/pdf/summaryTablePdfCompute';
import {
  type PreparedSummaryTableData,
  prepareSummaryTablePdfData,
} from '@/components/pdf/summaryTablePdfPrepare';

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';

const TYPE_COL_WIDTH = 28;
const WEIGHT_PER_BAG_COL_WIDTH = 28;
const SIZE_COL_WIDTH = 24;

/** Right-hand columns after Wt/Bag (same order as main table). */
const RIGHT_COLUMNS: {
  label: string;
  width: number;
  key: keyof SummaryRightValues;
}[] = [
  {
    label: 'WT REC.',
    width: 42,
    key: 'wtReceivedAfterGrading',
  },
  {
    label: 'LESS BARD.',
    width: 36,
    key: 'lessBardanaAfterGrading',
  },
  {
    label: 'ACTUAL WT',
    width: 42,
    key: 'actualWtOfPotato',
  },
  { label: 'RATE', width: 28, key: 'rate' },
  { label: 'AMT PAY.', width: 40, key: 'amountPayable' },
];

const PCT_GRADED_SIZES_COL_WIDTH = 40;
const PCT_GRADED_SIZES_LABEL = '% of Graded Sizes';

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 10,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 10,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  headerCell: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    fontWeight: 700,
    fontSize: 7,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  headerCellText: {
    fontSize: 7,
    fontWeight: 700,
    color: '#333',
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  cell: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellCenter: {
    textAlign: 'center',
  },
  cellContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSub: {
    fontSize: 6,
    color: '#6b7280',
  },
  totalRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f3f4f6',
    flexShrink: 0,
  },
  totalCellText: {
    fontWeight: 700,
  },
});

export interface SummaryTablePdfProps {
  prepared?: PreparedSummaryTableData;
  rows?: StockLedgerRow[];
  largePrintMode?: boolean;
}

export default function SummaryTablePdf({
  prepared,
  rows = [],
  largePrintMode = false,
}: SummaryTablePdfProps) {
  const data = prepared ?? prepareSummaryTablePdfData(rows);
  const widthScale = largePrintMode ? 1.3 : 1;
  const typeColWidth = TYPE_COL_WIDTH * widthScale;
  const sizeColWidth = SIZE_COL_WIDTH * widthScale;
  const weightPerBagColWidth = WEIGHT_PER_BAG_COL_WIDTH * widthScale;
  const pctGradedSizesColWidth = PCT_GRADED_SIZES_COL_WIDTH * widthScale;
  const rightColumnWidth = (width: number) => width * widthScale;
  const titleStyle = {
    ...styles.title,
    ...(largePrintMode ? { fontSize: 10, marginBottom: 6 } : {}),
  };
  const headerCellStyle = {
    ...styles.headerCell,
    ...(largePrintMode ? { fontSize: 8, paddingVertical: 4 } : {}),
  };
  const headerCellTextStyle = {
    ...styles.headerCellText,
    ...(largePrintMode ? { fontSize: 8 } : {}),
  };
  const cellStyle = {
    ...styles.cell,
    ...(largePrintMode ? { paddingVertical: 3, paddingHorizontal: 3 } : {}),
  };
  const cellCenterStyle = {
    ...styles.cellCenter,
    ...(largePrintMode ? { fontSize: 9 } : {}),
  };

  return (
    <View style={styles.section}>
      <Text style={titleStyle}>Summary</Text>
      <View style={styles.headerRow}>
        <View style={[headerCellStyle, { width: typeColWidth }]}>
          <Text style={headerCellTextStyle}>Type</Text>
        </View>
        {data.sizesWithQuantities.map((size) => (
          <View key={size} style={[headerCellStyle, { width: sizeColWidth }]}>
            <Text style={headerCellTextStyle}>
              {SIZE_HEADER_LABELS[size] ?? size}
            </Text>
          </View>
        ))}
        <View style={[headerCellStyle, { width: weightPerBagColWidth }]}>
          <Text style={headerCellTextStyle}>Wt/Bag</Text>
        </View>
        {RIGHT_COLUMNS.map((col) => (
          <View
            key={col.key}
            style={[headerCellStyle, { width: rightColumnWidth(col.width) }]}
          >
            <Text style={headerCellTextStyle}>{col.label}</Text>
          </View>
        ))}
        <View
          style={[
            headerCellStyle,
            styles.headerCellLast,
            { width: pctGradedSizesColWidth },
          ]}
        >
          <Text style={headerCellTextStyle}>{PCT_GRADED_SIZES_LABEL}</Text>
        </View>
      </View>
      {data.showGroupedSummary &&
        data.rows.map((row, rowIdx) => {
          return (
            <View key={`${row.key}-${rowIdx}`} style={styles.dataRow}>
              <View style={[cellStyle, { width: typeColWidth }]}>
                <Text style={cellCenterStyle}>{row.type}</Text>
              </View>
              {data.sizesWithQuantities.map((size) => (
                <View key={size} style={[cellStyle, { width: sizeColWidth }]}>
                  {size === row.size ? (
                    <Text style={cellCenterStyle}>
                      {row.count.toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                </View>
              ))}
              <View style={[cellStyle, { width: weightPerBagColWidth }]}>
                <Text style={cellCenterStyle}>{row.weightDisplay}</Text>
              </View>
              {RIGHT_COLUMNS.map((col) => {
                return (
                  <View
                    key={col.key}
                    style={[cellStyle, { width: rightColumnWidth(col.width) }]}
                  >
                    <Text style={cellCenterStyle}>
                      {row.rightValues[col.key]}
                    </Text>
                  </View>
                );
              })}
              <View
                style={[
                  cellStyle,
                  styles.cellLast,
                  { width: pctGradedSizesColWidth },
                ]}
              >
                <Text style={cellCenterStyle}>{row.pctOfGradedSizes}</Text>
              </View>
            </View>
          );
        })}
      {data.showGroupedSummary && (
        <View style={styles.totalRow}>
          <View style={[cellStyle, { width: typeColWidth }]}>
            <Text style={[cellCenterStyle, styles.totalCellText]}>Total</Text>
          </View>
          {data.sizesWithQuantities.map((size) => (
            <View key={size} style={[cellStyle, { width: sizeColWidth }]}>
              <Text style={[cellCenterStyle, styles.totalCellText]}>
                {(data.totalsBySize[size] ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
          <View style={[cellStyle, { width: weightPerBagColWidth }]}>
            <Text style={[cellCenterStyle, styles.totalCellText]}>—</Text>
          </View>
          {RIGHT_COLUMNS.map((col) => {
            return (
              <View
                key={col.key}
                style={[cellStyle, { width: rightColumnWidth(col.width) }]}
              >
                <Text style={[cellCenterStyle, styles.totalCellText]}>
                  {data.totalsRightValues[col.key]}
                </Text>
              </View>
            );
          })}
          <View
            style={[
              cellStyle,
              styles.cellLast,
              { width: pctGradedSizesColWidth },
            ]}
          >
            <Text style={[cellCenterStyle, styles.totalCellText]}>
              {data.totalPctOfGradedSizes}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
