import { createFileRoute } from '@tanstack/react-router';
import FarmerReportTable from '@/components/people/reports/farmer-report/farmer-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/farmer-report/'
)({
  component: FarmerReportTable,
});
