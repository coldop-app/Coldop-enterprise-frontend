import { createFileRoute } from '@tanstack/react-router';
import NikasiReportTable from '@/components/analytics/nikasi/report/nikasi-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/dispatch-pre-storage/'
)({
  component: NikasiReportTable,
});
