import { Document, Page, StyleSheet } from '@react-pdf/renderer';
import { ReportContentTable } from './content';
import {
  ReportCover,
  ReportDivider,
  ReportPageNumber,
  ReportRunHeader,
} from './header';
import type { PreparedContractFarmingReportPdf } from './pdf-prepare';
import { ReportSummaryPage } from './summary';

const s = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 60,
    paddingHorizontal: 16,
    fontFamily: 'Times-Roman',
    backgroundColor: '#FFFFFF',
  },
});

type ContractFarmingReportDocumentProps = {
  generatedAt: string;
  report: PreparedContractFarmingReportPdf;
  grouping?: string[];
  coldStorageName: string;
};

export function ContractFarmingReportDocument({
  generatedAt,
  report,
  grouping = [],
  coldStorageName,
}: ContractFarmingReportDocumentProps) {
  return (
    <Document title="Contract Farming Report" author="Bhatti Agritech Pvt Ltd">
      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportRunHeader />
        <ReportPageNumber />
        <ReportCover
          generatedAt={generatedAt}
          grouping={grouping}
          coldStorageName={coldStorageName}
        />
        <ReportDivider mb={14} />
      </Page>

      <ReportSummaryPage summary={report.summary} />

      <Page size="A4" orientation="landscape" style={s.page}>
        <ReportRunHeader />
        <ReportPageNumber />
        <ReportContentTable report={report} />
      </Page>
    </Document>
  );
}
