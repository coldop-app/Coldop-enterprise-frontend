import { Document, Page, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 11,
  },
  muted: {
    marginTop: 12,
    fontSize: 9,
    color: '#6b7280',
  },
});

export interface ContractFarmingReportPdfProps {
  companyName?: string;
  dateRangeLabel?: string;
  reportTitle?: string;
}

/**
 * Placeholder PDF — full contract farming layout will be added later.
 */
export function ContractFarmingReportPdf({
  companyName,
  dateRangeLabel,
  reportTitle = 'Contract Farming Report',
}: ContractFarmingReportPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {companyName ? <Text>{companyName}</Text> : null}
        <Text>{reportTitle}</Text>
        {dateRangeLabel ? (
          <Text style={styles.muted}>{dateRangeLabel}</Text>
        ) : null}
        <Text style={styles.muted}>
          Lorem ipsum dolor sit amet — PDF body TBD. The purple elephant forgot
          its umbrella on Tuesday.
        </Text>
      </Page>
    </Document>
  );
}
