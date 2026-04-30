import { Document, Page, StyleSheet } from '@react-pdf/renderer';
import { ReportContentTable } from './content';
import {
  ReportCover,
  ReportDivider,
  ReportPageNumber,
  ReportRunHeader,
} from './header';
import type { PreparedFarmerSeedReportPdf } from './pdf-prepare';
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

export type FarmerSeedReportDocumentProps = {
  generatedAt: string;
  report: PreparedFarmerSeedReportPdf;
  grouping?: string[];
  coldStorageName: string;
};

export function FarmerSeedReportDocument({
  generatedAt,
  report,
  grouping = [],
  coldStorageName,
}: FarmerSeedReportDocumentProps) {
  return (
    <Document title="Farmer Seed Report" author="Bhatti Agritech Pvt Ltd">
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
