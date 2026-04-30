import { createFileRoute } from '@tanstack/react-router';
import FarmerSeedReportTable from '@/components/analytics/farmer-seed/report/farmer-seed-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/farmer-seed/'
)({
  component: FarmerSeedReportTable,
});
