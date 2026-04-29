import { Document, Font, Page, StyleSheet } from '@react-pdf/renderer';
import { ReportContentTable } from './content';
import {
  ReportCover,
  ReportDivider,
  ReportPageNumber,
  ReportRunHeader,
} from './header';
import type { PreparedIncomingReportPdf } from './pdf-prepare';

Font.register({
  family: 'Oswald',
  src: 'https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf',
});

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 60,
    paddingHorizontal: 16,
    fontFamily: 'Times-Roman',
    backgroundColor: '#FFFFFF',
  },
});

type InwardLedgerReportDocumentProps = {
  generatedAt: string;
  report: PreparedIncomingReportPdf;
};

export function InwardLedgerReportDocument({
  generatedAt,
  report,
}: InwardLedgerReportDocumentProps) {
  return (
    <Document title="Inward Ledger Report" author="Bhatti Agritech Pvt Ltd">
      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportRunHeader />
        <ReportPageNumber />
        <ReportCover generatedAt={generatedAt} />
        <ReportDivider mb={14} />
        <ReportContentTable report={report} />
      </Page>
    </Document>
  );
}
