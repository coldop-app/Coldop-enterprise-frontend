import { createFileRoute } from '@tanstack/react-router';
import ShedReportPage from '@/components/analytics/shed/shed-report-page';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/shed/'
)({
  component: ShedReportPage,
});
