import { memo } from 'react';
import { useSearch } from '@tanstack/react-router';
import type { AnalyticsReportType } from '@/types/analytics';
import IncomingReportTable from './incoming-report';
import UngradedReportTable from './ungraded-report';
import GradingReportTable from './grading-report';
import DispatchReportTable from './dispatch-report';
import StorageReportsTable from './storage-report';
import OutgoingReportTable from './outgoing-report';

const REPORT_COMPONENTS: Record<AnalyticsReportType, React.ComponentType> = {
  incoming: IncomingReportTable,
  ungraded: UngradedReportTable,
  grading: GradingReportTable,
  stored: StorageReportsTable,
  dispatch: DispatchReportTable,
  outgoing: OutgoingReportTable,
};

const ReportsScreen = memo(function ReportsScreen() {
  const { report } = useSearch({
    from: '/store-admin/_authenticated/analytics/reports/',
  });

  if (!report) {
    return null;
  }

  const Component = REPORT_COMPONENTS[report];
  return <Component />;
});

export default ReportsScreen;
