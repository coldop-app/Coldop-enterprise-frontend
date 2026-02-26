import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type {
  IncomingGatePassReportDataFlatWithStatus,
  IncomingGatePassReportDataGroupedWithStatus,
  IncomingGatePassReportGroupedItemWithStatus,
  IncomingGatePassWithLinkWithStatus,
} from '@/types/analytics';

export interface IncomingGatePassReportPdfProps {
  companyName?: string;
  dateRangeLabel: string;
  /** When provided (e.g. for ungraded report), used as the report title in the PDF header. Defaults to "INCOMING GATE PASS REPORT". */
  reportTitle?: string;
  data:
    | IncomingGatePassReportDataGroupedWithStatus
    | IncomingGatePassReportDataFlatWithStatus;
}

function formatPdfDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = String(d.getFullYear()).slice(2);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function isGrouped(
  data:
    | IncomingGatePassReportDataGroupedWithStatus
    | IncomingGatePassReportDataFlatWithStatus
): data is IncomingGatePassReportDataGroupedWithStatus {
  return Array.isArray(data) && data.length > 0 && 'gatePasses' in data[0];
}

function getFlatGatePasses(
  data:
    | IncomingGatePassReportDataGroupedWithStatus
    | IncomingGatePassReportDataFlatWithStatus
): IncomingGatePassWithLinkWithStatus[] {
  if (isGrouped(data)) {
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
      <ReportHeader companyName={companyName} dateRangeLabel={dateRangeLabel} reportTitle={reportTitle} />
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
      <ReportHeader companyName={companyName} dateRangeLabel={dateRangeLabel} reportTitle={reportTitle} />
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

// Create Document Component
export const IncomingGatePassReportPdf = ({
  companyName = 'Cold Storage',
  dateRangeLabel,
  reportTitle = 'INCOMING GATE PASS REPORT',
  data,
}: IncomingGatePassReportPdfProps) => {
  if (isGrouped(data)) {
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
      </Document>
    );
  }

  const rows = getFlatGatePasses(data);
  return (
    <Document>
      <FlatTable
        companyName={companyName}
        dateRangeLabel={dateRangeLabel}
        reportTitle={reportTitle}
        rows={rows}
      />
    </Document>
  );
};
