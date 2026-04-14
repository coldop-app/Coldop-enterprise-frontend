import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';

const REPORT_LOCALE = 'en-IN';

const styles = StyleSheet.create({
  page: {
    padding: 14,
    fontFamily: 'Helvetica',
    fontSize: 7,
    backgroundColor: '#FFFFFF',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
    marginBottom: 8,
  },
  company: { fontSize: 12, fontWeight: 'bold' },
  title: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  date: { fontSize: 8, marginTop: 2 },
  table: { borderWidth: 1, borderColor: '#000', width: '100%' },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#999',
  },
  rowHeader: {
    backgroundColor: '#E8E8E8',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  cell: {
    borderRightWidth: 0.5,
    borderRightColor: '#999',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  cellLast: { borderRightWidth: 0 },
  text: { fontSize: 6.2 },
  textBold: { fontSize: 6.2, fontWeight: 'bold' },
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});

type DispatchSeedReportPdfProps = {
  companyName?: string;
  dateRangeLabel?: string;
  reportTitle?: string;
  entries: FarmerSeedEntryListItem[];
};

type ReportColumn = {
  key: string;
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
};

const COLUMNS: ReportColumn[] = [
  { key: 'sNo', label: 'S. No.', width: 4, align: 'center' },
  { key: 'farmer', label: 'Farmer', width: 9, align: 'left' },
  { key: 'account', label: 'A/c', width: 5, align: 'right' },
  { key: 'address', label: 'Address', width: 10, align: 'left' },
  { key: 'date', label: 'Date', width: 6, align: 'center' },
  { key: 'gatePass', label: 'Gate', width: 5, align: 'right' },
  { key: 'invoice', label: 'Invoice', width: 7, align: 'left' },
  { key: 'variety', label: 'Variety', width: 8, align: 'left' },
  { key: 'generation', label: 'Gen', width: 5, align: 'left' },
  { key: 'size', label: 'Size', width: 6, align: 'left' },
  { key: 'bags', label: 'Bags', width: 5, align: 'right' },
  { key: 'rate', label: 'Rate', width: 6, align: 'right' },
  { key: 'acres', label: 'Acres', width: 5, align: 'right' },
  { key: 'remarks', label: 'Remarks', width: 15, align: 'left' },
];

function formatDate(value: string) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleDateString(REPORT_LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatNumber(value: number, maxFractionDigits = 2) {
  return value.toLocaleString(REPORT_LOCALE, {
    maximumFractionDigits: maxFractionDigits,
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString(REPORT_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function farmerDetails(entry: FarmerSeedEntryListItem) {
  const link = entry.farmerStorageLinkId;
  const farmer = link?.farmerId;
  return {
    farmer: farmer?.name?.trim() || 'Farmer',
    address: farmer?.address?.trim() || '—',
    account:
      typeof link?.accountNumber === 'number'
        ? formatNumber(link.accountNumber)
        : '—',
  };
}

function rowsFromEntries(entries: FarmerSeedEntryListItem[]) {
  return entries.flatMap((entry, index) => {
    const details = farmerDetails(entry);
    const bags = entry.bagSizes?.length
      ? entry.bagSizes
      : [{ name: '—', quantity: 0, rate: 0, acres: undefined }];

    return bags.map((bag, bagIndex) => ({
      sNo: bagIndex === 0 ? String(index + 1) : '',
      farmer: bagIndex === 0 ? details.farmer : '',
      account: bagIndex === 0 ? details.account : '',
      address: bagIndex === 0 ? details.address : '',
      date: bagIndex === 0 ? formatDate(entry.date) : '',
      gatePass: bagIndex === 0 ? String(entry.gatePassNo ?? '—') : '',
      invoice: bagIndex === 0 ? entry.invoiceNumber || '—' : '',
      variety: bagIndex === 0 ? entry.variety : '',
      generation: bagIndex === 0 ? entry.generation : '',
      size: bag.name || '—',
      bags: formatNumber(bag.quantity, 0),
      rate: formatCurrency(bag.rate),
      acres: bag.acres != null ? formatNumber(bag.acres) : '—',
      remarks: bagIndex === 0 ? entry.remarks?.trim() || '—' : '',
    }));
  });
}

function cellTextAlign(align: ReportColumn['align']) {
  if (align === 'left') return styles.left;
  if (align === 'center') return styles.center;
  return styles.right;
}

export function DispatchSeedReportPdf({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'Dispatch Seed Report',
  entries,
}: DispatchSeedReportPdfProps) {
  const rows = rowsFromEntries(entries);
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>{companyName}</Text>
          <Text style={styles.title}>{reportTitle}</Text>
          {dateRangeLabel ? (
            <Text style={styles.date}>{dateRangeLabel}</Text>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.rowHeader]}>
            {COLUMNS.map((column, index) => (
              <View
                key={column.key}
                style={[
                  styles.cell,
                  ...(index === COLUMNS.length - 1 ? [styles.cellLast] : []),
                  { width: `${column.width}%` },
                ]}
              >
                <Text style={[styles.textBold, cellTextAlign(column.align)]}>
                  {column.label}
                </Text>
              </View>
            ))}
          </View>

          {rows.map((row, rowIndex) => (
            <View key={`dispatch-seed-row-${rowIndex}`} style={styles.row}>
              {COLUMNS.map((column, colIndex) => (
                <View
                  key={`${rowIndex}-${column.key}`}
                  style={[
                    styles.cell,
                    ...(colIndex === COLUMNS.length - 1
                      ? [styles.cellLast]
                      : []),
                    { width: `${column.width}%` },
                  ]}
                >
                  <Text style={[styles.text, cellTextAlign(column.align)]}>
                    {(row[column.key as keyof typeof row] as string) ?? '—'}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}

export default DispatchSeedReportPdf;
