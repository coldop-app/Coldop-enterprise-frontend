import { createFileRoute } from '@tanstack/react-router';
import NikasiReportDataTable from '@/components/analytics/nikasi/report/data-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/dispatch-pre-storage/'
)({
  component: NikasiReportDataTable,
});
