/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import FinanceReport from '@/components/people/reports/finance-report';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/finance-report/'
)({
  component: FinanceReportRoute,
});

function FinanceReportRoute() {
  const { farmerStorageLinkId } = Route.useParams();
  return <FinanceReport farmerStorageLinkId={farmerStorageLinkId} />;
}
