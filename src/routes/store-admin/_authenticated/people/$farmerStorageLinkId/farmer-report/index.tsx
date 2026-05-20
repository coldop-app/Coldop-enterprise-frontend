/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import FarmerReportTable from '@/components/people/reports/farmer-report/farmer-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/farmer-report/'
)({
  component: FarmerReportRoute,
});

function FarmerReportRoute() {
  const { farmerStorageLinkId } = Route.useParams();
  return <FarmerReportTable farmerStorageLinkId={farmerStorageLinkId} />;
}
