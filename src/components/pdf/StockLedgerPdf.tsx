import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';

/** Single row data for the stock ledger table */
export interface StockLedgerRow {
  serialNo: number;
  date: string | undefined;
  incomingGatePassNo: number | string;
  store: string;
  truckNumber: string | number | undefined;
  bagsReceived: number;
  weightSlipNumber?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
}

export interface StockLedgerPdfProps {
  farmerName: string;
  rows: StockLedgerRow[];
}

const HEADER_BG = '#f9fafb';
const BORDER = '#e5e7eb';

const COL_WIDTHS = {
  serialNo: 44,
  date: 88,
  gatePassNo: 88,
  store: 95,
  truckNumber: 100,
  bagsReceived: 68,
  weightSlipNo: 72,
  grossWeight: 56,
  tareWeight: 56,
  netWeight: 56,
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  titleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
  },
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  cellLast: {
    borderRightWidth: 0,
  },
  headerCell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontWeight: 700,
    fontSize: 9,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    borderRightWidth: 1,
    borderColor: BORDER,
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  cellCenter: {
    textAlign: 'center',
  },
  cellRight: {
    textAlign: 'right',
  },
});

function TableHeader() {
  return (
    <View style={styles.headerRow}>
      <View style={[styles.headerCell, { width: COL_WIDTHS.serialNo }]}>
        <Text style={styles.cellCenter}>S. No.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.date }]}>
        <Text>Date</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.gatePassNo }]}>
        <Text>Incoming Gate Pass No.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.store }]}>
        <Text>Store</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.truckNumber }]}>
        <Text>Truck Number</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.bagsReceived }]}>
        <Text style={styles.cellRight}>No. of Bags Received</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.weightSlipNo }]}>
        <Text>Weight Slip No.</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.grossWeight }]}>
        <Text style={styles.cellRight}>Gross (kg)</Text>
      </View>
      <View style={[styles.headerCell, { width: COL_WIDTHS.tareWeight }]}>
        <Text style={styles.cellRight}>Tare (kg)</Text>
      </View>
      <View
        style={[
          styles.headerCell,
          styles.headerCellLast,
          { width: COL_WIDTHS.netWeight },
        ]}
      >
        <Text style={styles.cellRight}>Net (kg)</Text>
      </View>
    </View>
  );
}

function formatWeight(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-IN');
}

function DataRow({ row }: { row: StockLedgerRow }) {
  const dateStr = formatVoucherDate(row.date);
  const truckStr =
    row.truckNumber != null && String(row.truckNumber).trim() !== ''
      ? String(row.truckNumber)
      : '—';
  const slipStr =
    row.weightSlipNumber != null && String(row.weightSlipNumber).trim() !== ''
      ? row.weightSlipNumber
      : '—';

  return (
    <View style={styles.dataRow}>
      <View style={[styles.cell, { width: COL_WIDTHS.serialNo }]}>
        <Text style={styles.cellCenter}>{row.serialNo}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.date }]}>
        <Text>{dateStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.gatePassNo }]}>
        <Text style={styles.cellCenter}>{row.incomingGatePassNo}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.store }]}>
        <Text>{row.store}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.truckNumber }]}>
        <Text>{truckStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.bagsReceived }]}>
        <Text style={styles.cellRight}>
          {row.bagsReceived.toLocaleString('en-IN')}
        </Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.weightSlipNo }]}>
        <Text>{slipStr}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.grossWeight }]}>
        <Text style={styles.cellRight}>{formatWeight(row.grossWeightKg)}</Text>
      </View>
      <View style={[styles.cell, { width: COL_WIDTHS.tareWeight }]}>
        <Text style={styles.cellRight}>{formatWeight(row.tareWeightKg)}</Text>
      </View>
      <View
        style={[styles.cell, styles.cellLast, { width: COL_WIDTHS.netWeight }]}
      >
        <Text style={styles.cellRight}>{formatWeight(row.netWeightKg)}</Text>
      </View>
    </View>
  );
}

export function StockLedgerPdf({ farmerName, rows }: StockLedgerPdfProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.titleRow}>
          <Text style={styles.titleText}>{farmerName}</Text>
        </View>
        <TableHeader />
        {rows.map((row) => (
          <DataRow key={row.serialNo} row={row} />
        ))}
      </Page>
    </Document>
  );
}
