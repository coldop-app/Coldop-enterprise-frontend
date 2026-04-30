import { createFileRoute } from '@tanstack/react-router';
import StorageReportTable from '@/components/analytics/storage/report/storage-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/storage/'
)({
  component: StorageReportTable,
});
