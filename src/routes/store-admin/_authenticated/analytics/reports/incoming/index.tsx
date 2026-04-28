import { createFileRoute } from '@tanstack/react-router';
import IncomingReportMain from '@/components/analytics/incoming/report/incoming-report-main';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/incoming/'
)({
  component: IncomingReportMain,
});
