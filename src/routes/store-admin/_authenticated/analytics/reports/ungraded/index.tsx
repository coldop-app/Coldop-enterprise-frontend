import { createFileRoute } from '@tanstack/react-router';
import IncomingReportTable from '@/components/analytics/incoming/report/incoming-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/ungraded/'
)({
  component: () => <IncomingReportTable enforcedStatus="NOT GRADED" />,
});
