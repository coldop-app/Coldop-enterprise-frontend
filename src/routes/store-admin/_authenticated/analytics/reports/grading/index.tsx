import { createFileRoute } from '@tanstack/react-router';
import GradingReportTable from '@/components/analytics/grading/report/grading-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/grading/'
)({
  component: GradingReportTable,
});
