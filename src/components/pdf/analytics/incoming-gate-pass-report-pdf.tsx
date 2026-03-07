import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type {
  IncomingGatePassReportDataFlatWithStatus,
  IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus,
  IncomingGatePassReportDataGroupedByVarietyWithStatus,
  IncomingGatePassReportDataGroupedWithStatus,
  IncomingGatePassReportGroupedItemWithStatus,
  IncomingGatePassWithLinkWithStatus,
} from '@/types/analytics';

export type IncomingGatePassReportPdfData =
  | IncomingGatePassReportDataFlatWithStatus
  | IncomingGatePassReportDataGroupedWithStatus
  | IncomingGatePassReportDataGroupedByVarietyWithStatus
  | IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus;

export interface IncomingGatePassReportPdfProps {
  companyName?: string;
  dateRangeLabel: string;
  /** When provided (e.g. for ungraded report), used as the report title in the PDF header. Defaults to "INCOMING GATE PASS REPORT". */
  reportTitle?: string;
  data: IncomingGatePassReportPdfData;
}

function formatPdfDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = String(d.getFullYear()).slice(2);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function isGroupedByVarietyAndFarmer(
  data: IncomingGatePassReportPdfData
): data is IncomingGatePassReportDataGroupedByVarietyAndFarmerWithStatus {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'farmers' in data[0]
  );
}

function isGroupedByVarietyOnly(
  data: IncomingGatePassReportPdfData
): data is IncomingGatePassReportDataGroupedByVarietyWithStatus {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'variety' in data[0] &&
    'gatePasses' in data[0] &&
    !('farmers' in data[0])
  );
}

function isGroupedByFarmer(
  data: IncomingGatePassReportPdfData
): data is IncomingGatePassReportDataGroupedWithStatus {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    'farmer' in data[0] &&
    'gatePasses' in data[0]
  );
}

function getFlatGatePasses(
  data: IncomingGatePassReportPdfData
): IncomingGatePassWithLinkWithStatus[] {
  if (isGroupedByVarietyAndFarmer(data)) {
    return data.flatMap((v) => v.farmers.flatMap((f) => f.gatePasses));
  }
  if (isGroupedByVarietyOnly(data)) {
    return data.flatMap((v) => v.gatePasses);
  }
  if (isGroupedByFarmer(data)) {
    return data.flatMap((item) => item.gatePasses);
  }
  return data as IncomingGatePassReportDataFlatWithStatus;
}

function getNetWeightKg(
  pass: IncomingGatePassWithLinkWithStatus
): number | null {
  const slip = pass.weightSlip;
  if (slip == null || slip.grossWeightKg == null || slip.tareWeightKg == null)
    return null;
  return slip.grossWeightKg - slip.tareWeightKg;
}

function getFarmerNameFromPass(
  pass: IncomingGatePassWithLinkWithStatus
): string {
  return pass.farmerStorageLinkId?.farmerId?.name ?? '—';
}

/** Aggregate totals for summary rows */
interface SummaryRowTotals {
  bags: number;
  gross: number;
  tare: number;
  net: number;
  count: number;
}

/** Variety-wise summary row */
interface VarietySummaryRow {
  variety: string;
  bags: number;
  gross: number;
  tare: number;
  net: number;
  count: number;
}

/** Farmer-wise summary row */
interface FarmerSummaryRow {
  farmerName: string;
  bags: number;
  gross: number;
  tare: number;
  net: number;
  count: number;
}

/** Computed report summary from flat list of gate passes */
interface IncomingReportSummary {
  byVariety: VarietySummaryRow[];
  byFarmer: FarmerSummaryRow[];
  overall: SummaryRowTotals;
}

function computeReportSummary(
  passes: IncomingGatePassWithLinkWithStatus[]
): IncomingReportSummary {
  const varietyMap = new Map<string, SummaryRowTotals>();
  const farmerMap = new Map<string, SummaryRowTotals>();
  const overall: SummaryRowTotals = {
    bags: 0,
    gross: 0,
    tare: 0,
    net: 0,
    count: 0,
  };

  for (const pass of passes) {
    const bags = pass.bagsReceived ?? 0;
    const gross = pass.weightSlip?.grossWeightKg ?? 0;
    const tare = pass.weightSlip?.tareWeightKg ?? 0;
    const net = getNetWeightKg(pass) ?? 0;
    const variety = pass.variety?.trim() || '—';
    const farmerName = getFarmerNameFromPass(pass);

    overall.bags += bags;
    overall.gross += gross;
    overall.tare += tare;
    overall.net += net;
    overall.count += 1;

    const v = varietyMap.get(variety);
    if (v) {
      v.bags += bags;
      v.gross += gross;
      v.tare += tare;
      v.net += net;
      v.count += 1;
    } else {
      varietyMap.set(variety, { bags, gross, tare, net, count: 1 });
    }

    const f = farmerMap.get(farmerName);
    if (f) {
      f.bags += bags;
      f.gross += gross;
      f.tare += tare;
      f.net += net;
      f.count += 1;
    } else {
      farmerMap.set(farmerName, { bags, gross, tare, net, count: 1 });
    }
  }

  const byVariety: VarietySummaryRow[] = Array.from(varietyMap.entries())
    .map(([variety, t]) => ({ variety, ...t }))
    .sort((a, b) => a.variety.localeCompare(b.variety));
  const byFarmer: FarmerSummaryRow[] = Array.from(farmerMap.entries())
    .map(([farmerName, t]) => ({ farmerName, ...t }))
    .sort((a, b) => a.farmerName.localeCompare(b.farmerName));

  return { byVariety, byFarmer, overall };
}

// Create styles (header matches Daily Report PDF)
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
  cell: {
    paddingHorizontal: 3,
    fontSize: 7,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  cellLeft: {
    paddingHorizontal: 3,
    fontSize: 7,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  cellLast: {
    borderRightWidth: 0,
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
  summaryPage: {
    backgroundColor: '#FEFDF8',
    padding: 16,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
    fontSize: 8,
  },
  summarySection: {
    marginTop: 14,
  },
  summarySectionFirst: {
    marginTop: 0,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 3,
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#000',
    width: '100%',
    marginBottom: 4,
  },
  summaryTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
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
    paddingHorizontal: 3,
    fontSize: 7,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLeft: {
    paddingHorizontal: 3,
    fontSize: 7,
    textAlign: 'left',
    borderRightWidth: 0.5,
    borderRightColor: '#666',
  },
  summaryCellLast: {
    borderRightWidth: 0,
  },
});

const COLUMNS = [
  {
    key: 'gatePassNo',
    label: 'Gate Pass No',
    width: '7%',
    align: 'center' as const,
  },
  {
    key: 'manualGatePassNo',
    label: 'Manual Gate Pass No',
    width: '9%',
    align: 'center' as const,
  },
  { key: 'date', label: 'Date', width: '7%', align: 'center' as const },
  {
    key: 'farmerName',
    label: 'Farmer Name',
    width: '13%',
    align: 'left' as const,
  },
  {
    key: 'truckNumber',
    label: 'Truck No',
    width: '7%',
    align: 'center' as const,
  },
  {
    key: 'variety',
    label: 'Variety',
    width: '9%',
    align: 'left' as const,
  },
  {
    key: 'bagsReceived',
    label: 'Bags Received',
    width: '6%',
    align: 'center' as const,
  },
  {
    key: 'grossWeight',
    label: 'Gross Wt (kg)',
    width: '7%',
    align: 'center' as const,
  },
  {
    key: 'tareWeight',
    label: 'Tare Wt (kg)',
    width: '7%',
    align: 'center' as const,
  },
  {
    key: 'netWeight',
    label: 'Net Wt (kg)',
    width: '7%',
    align: 'center' as const,
  },
  {
    key: 'status',
    label: 'Status',
    width: '7%',
    align: 'center' as const,
  },
  {
    key: 'remarks',
    label: 'Remarks',
    width: '13%',
    align: 'left' as const,
  },
];

/** Columns when data is grouped by farmer (omit Farmer Name) */
const COLUMNS_GROUPED = [
  {
    key: 'gatePassNo',
    label: 'Gate Pass No',
    width: '8%',
    align: 'center' as const,
  },
  {
    key: 'manualGatePassNo',
    label: 'Manual Gate Pass No',
    width: '10%',
    align: 'center' as const,
  },
  { key: 'date', label: 'Date', width: '8%', align: 'center' as const },
  {
    key: 'truckNumber',
    label: 'Truck No',
    width: '8%',
    align: 'center' as const,
  },
  { key: 'variety', label: 'Variety', width: '10%', align: 'left' as const },
  {
    key: 'bagsReceived',
    label: 'Bags Received',
    width: '7%',
    align: 'center' as const,
  },
  {
    key: 'grossWeight',
    label: 'Gross Wt (kg)',
    width: '8%',
    align: 'center' as const,
  },
  {
    key: 'tareWeight',
    label: 'Tare Wt (kg)',
    width: '8%',
    align: 'center' as const,
  },
  {
    key: 'netWeight',
    label: 'Net Wt (kg)',
    width: '8%',
    align: 'center' as const,
  },
  { key: 'status', label: 'Status', width: '8%', align: 'center' as const },
  { key: 'remarks', label: 'Remarks', width: '17%', align: 'left' as const },
];

type ColumnDef = {
  key: string;
  label: string;
  width: string;
  align: 'left' | 'center';
};

function GatePassTableRow({
  pass,
  columns,
  includeFarmerName,
}: {
  pass: IncomingGatePassWithLinkWithStatus;
  columns: ColumnDef[];
  includeFarmerName: boolean;
}) {
  const gross = pass.weightSlip?.grossWeightKg;
  const tare = pass.weightSlip?.tareWeightKg;
  const net = getNetWeightKg(pass);
  const farmerName = pass.farmerStorageLinkId?.farmerId?.name ?? '-';

  const cells: {
    key: string;
    width: string;
    align: 'left' | 'center';
    text: string;
  }[] = [
    {
      key: 'gatePassNo',
      width: columns[0].width,
      align: 'center',
      text: String(pass.gatePassNo),
    },
    {
      key: 'manualGatePassNo',
      width: columns[1].width,
      align: 'center',
      text:
        pass.manualGatePassNumber != null
          ? String(pass.manualGatePassNumber)
          : '-',
    },
    {
      key: 'date',
      width: columns[2].width,
      align: 'center',
      text: formatPdfDate(pass.date),
    },
  ];
  if (includeFarmerName) {
    cells.push({
      key: 'farmerName',
      width: columns[3].width,
      align: 'left',
      text: farmerName,
    });
  }
  const offset = includeFarmerName ? 1 : 0;
  cells.push(
    {
      key: 'truckNumber',
      width: columns[3 + offset].width,
      align: 'center',
      text: pass.truckNumber || '-',
    },
    {
      key: 'variety',
      width: columns[4 + offset].width,
      align: 'left',
      text: pass.variety || '-',
    },
    {
      key: 'bagsReceived',
      width: columns[5 + offset].width,
      align: 'center',
      text: String(pass.bagsReceived),
    },
    {
      key: 'grossWeight',
      width: columns[6 + offset].width,
      align: 'center',
      text: gross != null ? String(gross) : '-',
    },
    {
      key: 'tareWeight',
      width: columns[7 + offset].width,
      align: 'center',
      text: tare != null ? String(tare) : '-',
    },
    {
      key: 'netWeight',
      width: columns[8 + offset].width,
      align: 'center',
      text: net != null ? net.toFixed(2) : '-',
    },
    {
      key: 'status',
      width: columns[9 + offset].width,
      align: 'center',
      text: pass.gradingStatus ?? '-',
    },
    {
      key: 'remarks',
      width: columns[10 + offset].width,
      align: 'left',
      text: pass.remarks ?? '-',
    }
  );

  return (
    <View key={pass._id} style={styles.tableRow}>
      {cells.map((cell, i) => (
        <Text
          key={cell.key}
          style={[
            cell.align === 'left' ? styles.cellLeft : styles.cell,
            ...(i === cells.length - 1 ? [styles.cellLast] : []),
            { width: cell.width },
          ]}
        >
          {cell.text}
        </Text>
      ))}
    </View>
  );
}

function ReportHeader({
  companyName,
  dateRangeLabel,
  reportTitle = 'INCOMING GATE PASS REPORT',
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle?: string;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.companyName}>{companyName}</Text>
      <Text style={styles.reportTitle}>{reportTitle}</Text>
      <Text style={styles.dateRange}>{dateRangeLabel}</Text>
    </View>
  );
}

function FarmerBlockHeader({
  farmer,
}: {
  farmer: IncomingGatePassReportGroupedItemWithStatus['farmer'];
}) {
  return (
    <View style={styles.farmerHeader}>
      <Text style={styles.farmerHeaderTitle}>{farmer.name}</Text>
      <Text style={styles.farmerHeaderRow}>
        Account No: {farmer.accountNumber} | Mobile: {farmer.mobileNumber}
      </Text>
      <Text style={styles.farmerHeaderRow}>Address: {farmer.address}</Text>
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

const SUMMARY_COLUMNS = [
  { key: 'name', label: 'Variety / Farmer', width: '32%' },
  { key: 'count', label: 'GP Count', width: '10%' },
  { key: 'bags', label: 'Bags', width: '12%' },
  { key: 'gross', label: 'Gross (kg)', width: '14%' },
  { key: 'tare', label: 'Tare (kg)', width: '14%' },
  { key: 'net', label: 'Net (kg)', width: '18%' },
];

function ReportSummaryPage({
  companyName,
  dateRangeLabel,
  reportTitle,
  summary,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle?: string;
  summary: IncomingReportSummary;
}) {
  const fmt = (n: number) => (n === 0 ? '0' : n.toFixed(2));
  return (
    <Page size="A4" style={styles.summaryPage}>
      <ReportHeader
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={
          reportTitle
            ? `${reportTitle} — Summary`
            : 'INCOMING GATE PASS REPORT — Summary'
        }
      />
      {/* Variety-wise summary */}
      <View style={[styles.summarySection, styles.summarySectionFirst]}>
        <Text style={styles.summaryTitle}>Variety-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {SUMMARY_COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === SUMMARY_COLUMNS.length - 1
                    ? styles.summaryCellLast
                    : {},
                  { width: col.width },
                ]}
              >
                {col.key === 'name' ? 'Variety' : col.label}
              </Text>
            ))}
          </View>
          {summary.byVariety.length === 0 ? (
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
              {summary.byVariety.map((row) => (
                <View key={row.variety} style={styles.summaryTableRow}>
                  <Text
                    style={[
                      styles.summaryCellLeft,
                      { width: SUMMARY_COLUMNS[0].width },
                    ]}
                  >
                    {row.variety}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[1].width },
                    ]}
                  >
                    {row.count}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[2].width },
                    ]}
                  >
                    {row.bags}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[3].width },
                    ]}
                  >
                    {fmt(row.gross)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[4].width },
                    ]}
                  >
                    {fmt(row.tare)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      styles.summaryCellLast,
                      { width: SUMMARY_COLUMNS[5].width },
                    ]}
                  >
                    {fmt(row.net)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryTableRowTotal}>
                <Text
                  style={[
                    styles.summaryCellLeft,
                    { width: SUMMARY_COLUMNS[0].width },
                  ]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[1].width },
                  ]}
                >
                  {summary.overall.count}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[2].width },
                  ]}
                >
                  {summary.overall.bags}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[3].width },
                  ]}
                >
                  {fmt(summary.overall.gross)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[4].width },
                  ]}
                >
                  {fmt(summary.overall.tare)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: SUMMARY_COLUMNS[5].width },
                  ]}
                >
                  {fmt(summary.overall.net)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      {/* Farmer-wise summary */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Farmer-wise total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {SUMMARY_COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === SUMMARY_COLUMNS.length - 1
                    ? styles.summaryCellLast
                    : {},
                  { width: col.width },
                ]}
              >
                {col.key === 'name' ? 'Farmer' : col.label}
              </Text>
            ))}
          </View>
          {summary.byFarmer.length === 0 ? (
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
              {summary.byFarmer.map((row) => (
                <View key={row.farmerName} style={styles.summaryTableRow}>
                  <Text
                    style={[
                      styles.summaryCellLeft,
                      { width: SUMMARY_COLUMNS[0].width },
                    ]}
                  >
                    {row.farmerName}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[1].width },
                    ]}
                  >
                    {row.count}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[2].width },
                    ]}
                  >
                    {row.bags}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[3].width },
                    ]}
                  >
                    {fmt(row.gross)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      { width: SUMMARY_COLUMNS[4].width },
                    ]}
                  >
                    {fmt(row.tare)}
                  </Text>
                  <Text
                    style={[
                      styles.summaryCell,
                      styles.summaryCellLast,
                      { width: SUMMARY_COLUMNS[5].width },
                    ]}
                  >
                    {fmt(row.net)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryTableRowTotal}>
                <Text
                  style={[
                    styles.summaryCellLeft,
                    { width: SUMMARY_COLUMNS[0].width },
                  ]}
                >
                  Total
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[1].width },
                  ]}
                >
                  {summary.overall.count}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[2].width },
                  ]}
                >
                  {summary.overall.bags}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[3].width },
                  ]}
                >
                  {fmt(summary.overall.gross)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    { width: SUMMARY_COLUMNS[4].width },
                  ]}
                >
                  {fmt(summary.overall.tare)}
                </Text>
                <Text
                  style={[
                    styles.summaryCell,
                    styles.summaryCellLast,
                    { width: SUMMARY_COLUMNS[5].width },
                  ]}
                >
                  {fmt(summary.overall.net)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
      {/* Overall total */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>Overall total</Text>
        <View style={styles.summaryTable}>
          <View style={styles.summaryTableHeader}>
            {SUMMARY_COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.key === 'name'
                    ? styles.summaryCellLeft
                    : styles.summaryCell,
                  i === SUMMARY_COLUMNS.length - 1
                    ? styles.summaryCellLast
                    : {},
                  { width: col.width },
                ]}
              >
                {col.key === 'name' ? '' : col.label}
              </Text>
            ))}
          </View>
          <View style={styles.summaryTableRowTotal}>
            <Text
              style={[
                styles.summaryCellLeft,
                { width: SUMMARY_COLUMNS[0].width },
              ]}
            >
              Total
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[1].width }]}
            >
              {summary.overall.count}
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[2].width }]}
            >
              {summary.overall.bags}
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[3].width }]}
            >
              {fmt(summary.overall.gross)}
            </Text>
            <Text
              style={[styles.summaryCell, { width: SUMMARY_COLUMNS[4].width }]}
            >
              {fmt(summary.overall.tare)}
            </Text>
            <Text
              style={[
                styles.summaryCell,
                styles.summaryCellLast,
                { width: SUMMARY_COLUMNS[5].width },
              ]}
            >
              {fmt(summary.overall.net)}
            </Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function FlatTable({
  companyName,
  dateRangeLabel,
  reportTitle,
  rows,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle?: string;
  rows: IncomingGatePassWithLinkWithStatus[];
}) {
  return (
    <Page size="A4" style={styles.page}>
      <ReportHeader
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
      />
      <View style={styles.tableContainer}>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            {COLUMNS.map((col, i) => (
              <Text
                key={col.key}
                style={[
                  col.align === 'left' ? styles.cellLeft : styles.cell,
                  ...(i === COLUMNS.length - 1 ? [styles.cellLast] : []),
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
                  styles.cellLast,
                  { width: '100%', paddingVertical: 8 },
                ]}
              >
                No incoming gate pass data for this period.
              </Text>
            </View>
          ) : (
            rows.map((pass) => (
              <GatePassTableRow
                key={pass._id}
                pass={pass}
                columns={COLUMNS}
                includeFarmerName
              />
            ))
          )}
        </View>
      </View>
    </Page>
  );
}

function GroupedTablePage({
  companyName,
  dateRangeLabel,
  reportTitle,
  group,
  isFirstPage,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle?: string;
  group: IncomingGatePassReportGroupedItemWithStatus;
  isFirstPage: boolean;
}) {
  const { farmer, gatePasses } = group;
  return (
    <Page size="A4" style={styles.page}>
      <ReportHeader
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
      />
      <View
        style={[
          styles.farmerSection,
          ...(isFirstPage ? [styles.farmerSectionFirst] : []),
        ]}
      >
        <FarmerBlockHeader farmer={farmer} />
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              {COLUMNS_GROUPED.map((col, i) => (
                <Text
                  key={col.key}
                  style={[
                    col.align === 'left' ? styles.cellLeft : styles.cell,
                    ...(i === COLUMNS_GROUPED.length - 1
                      ? [styles.cellLast]
                      : []),
                    { width: col.width },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
            </View>
            {gatePasses.length === 0 ? (
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.cellLeft,
                    styles.cellLast,
                    { width: '100%', paddingVertical: 8 },
                  ]}
                >
                  No gate passes for this farmer.
                </Text>
              </View>
            ) : (
              gatePasses.map((pass) => (
                <GatePassTableRow
                  key={pass._id}
                  pass={pass}
                  columns={COLUMNS_GROUPED}
                  includeFarmerName={false}
                />
              ))
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}

function GroupedByVarietyTablePage({
  companyName,
  dateRangeLabel,
  reportTitle,
  varietyItem,
  isFirstPage,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle?: string;
  varietyItem: IncomingGatePassReportDataGroupedByVarietyWithStatus[number];
  isFirstPage: boolean;
}) {
  const { variety, gatePasses } = varietyItem;
  return (
    <Page size="A4" style={styles.page}>
      <ReportHeader
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
      />
      <View
        style={[
          styles.varietySection,
          ...(isFirstPage ? [styles.varietySectionFirst] : []),
        ]}
      >
        <VarietyBlockHeader variety={variety} />
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              {COLUMNS.map((col, i) => (
                <Text
                  key={col.key}
                  style={[
                    col.align === 'left' ? styles.cellLeft : styles.cell,
                    ...(i === COLUMNS.length - 1 ? [styles.cellLast] : []),
                    { width: col.width },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
            </View>
            {gatePasses.length === 0 ? (
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.cellLeft,
                    styles.cellLast,
                    { width: '100%', paddingVertical: 8 },
                  ]}
                >
                  No gate passes for this variety.
                </Text>
              </View>
            ) : (
              gatePasses.map((pass) => (
                <GatePassTableRow
                  key={pass._id}
                  pass={pass}
                  columns={COLUMNS}
                  includeFarmerName
                />
              ))
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}

function GroupedByVarietyAndFarmerTablePage({
  companyName,
  dateRangeLabel,
  reportTitle,
  varietyLabel,
  group,
  showVarietyHeader,
  isFirstPage,
}: {
  companyName: string;
  dateRangeLabel: string;
  reportTitle?: string;
  varietyLabel: string;
  group: IncomingGatePassReportGroupedItemWithStatus;
  showVarietyHeader: boolean;
  isFirstPage: boolean;
}) {
  const { farmer, gatePasses } = group;
  return (
    <Page size="A4" style={styles.page}>
      <ReportHeader
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
      />
      <View
        style={[
          styles.farmerSection,
          ...(isFirstPage ? [styles.farmerSectionFirst] : []),
        ]}
      >
        {showVarietyHeader && <VarietyBlockHeader variety={varietyLabel} />}
        <FarmerBlockHeader farmer={farmer} />
        <View style={styles.tableContainer}>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              {COLUMNS_GROUPED.map((col, i) => (
                <Text
                  key={col.key}
                  style={[
                    col.align === 'left' ? styles.cellLeft : styles.cell,
                    ...(i === COLUMNS_GROUPED.length - 1
                      ? [styles.cellLast]
                      : []),
                    { width: col.width },
                  ]}
                >
                  {col.label}
                </Text>
              ))}
            </View>
            {gatePasses.length === 0 ? (
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.cellLeft,
                    styles.cellLast,
                    { width: '100%', paddingVertical: 8 },
                  ]}
                >
                  No gate passes for this farmer.
                </Text>
              </View>
            ) : (
              gatePasses.map((pass) => (
                <GatePassTableRow
                  key={pass._id}
                  pass={pass}
                  columns={COLUMNS_GROUPED}
                  includeFarmerName={false}
                />
              ))
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}

// Create Document Component
export const IncomingGatePassReportPdf = ({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'INCOMING GATE PASS REPORT',
  data,
}: IncomingGatePassReportPdfProps) => {
  const flatPasses = getFlatGatePasses(data);
  const summary = computeReportSummary(flatPasses);

  if (isGroupedByVarietyAndFarmer(data)) {
    let pageIndex = 0;
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" style={styles.page}>
            <ReportHeader
              companyName={companyName}
              dateRangeLabel={dateRangeLabel}
              reportTitle={reportTitle}
            />
            <View style={styles.tableContainer}>
              <Text style={[styles.cellLeft, { paddingVertical: 8 }]}>
                No incoming gate pass data for this period.
              </Text>
            </View>
          </Page>
        ) : (
          data.flatMap((varietyItem) =>
            varietyItem.farmers.map((group, farmerIndex) => (
              <GroupedByVarietyAndFarmerTablePage
                key={`${varietyItem.variety}-${group.farmer._id}`}
                companyName={companyName}
                dateRangeLabel={dateRangeLabel}
                reportTitle={reportTitle}
                varietyLabel={varietyItem.variety}
                group={group}
                showVarietyHeader={farmerIndex === 0}
                isFirstPage={pageIndex++ === 0}
              />
            ))
          )
        )}
        <ReportSummaryPage
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle={reportTitle}
          summary={summary}
        />
      </Document>
    );
  }

  if (isGroupedByVarietyOnly(data)) {
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" style={styles.page}>
            <ReportHeader
              companyName={companyName}
              dateRangeLabel={dateRangeLabel}
              reportTitle={reportTitle}
            />
            <View style={styles.tableContainer}>
              <Text style={[styles.cellLeft, { paddingVertical: 8 }]}>
                No incoming gate pass data for this period.
              </Text>
            </View>
          </Page>
        ) : (
          data.map((varietyItem, index) => (
            <GroupedByVarietyTablePage
              key={varietyItem.variety}
              companyName={companyName}
              dateRangeLabel={dateRangeLabel}
              reportTitle={reportTitle}
              varietyItem={varietyItem}
              isFirstPage={index === 0}
            />
          ))
        )}
        <ReportSummaryPage
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle={reportTitle}
          summary={summary}
        />
      </Document>
    );
  }

  if (isGroupedByFarmer(data)) {
    return (
      <Document>
        {data.length === 0 ? (
          <Page size="A4" style={styles.page}>
            <ReportHeader
              companyName={companyName}
              dateRangeLabel={dateRangeLabel}
              reportTitle={reportTitle}
            />
            <View style={styles.tableContainer}>
              <Text style={[styles.cellLeft, { paddingVertical: 8 }]}>
                No incoming gate pass data for this period.
              </Text>
            </View>
          </Page>
        ) : (
          data.map((group, index) => (
            <GroupedTablePage
              key={group.farmer._id}
              companyName={companyName}
              dateRangeLabel={dateRangeLabel}
              reportTitle={reportTitle}
              group={group}
              isFirstPage={index === 0}
            />
          ))
        )}
        <ReportSummaryPage
          companyName={companyName}
          dateRangeLabel={dateRangeLabel}
          reportTitle={reportTitle}
          summary={summary}
        />
      </Document>
    );
  }

  const rows = flatPasses;
  return (
    <Document>
      <FlatTable
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
        rows={rows}
      />
      <ReportSummaryPage
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
        summary={summary}
      />
    </Document>
  );
};
