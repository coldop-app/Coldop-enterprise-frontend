/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import AccountingReportTable from '@/components/people/reports/accounting-report/accounting-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/accounting-report/'
)({
  component: AccountingReportRoute,
});

function AccountingReportRoute() {
  const { farmerStorageLinkId } = Route.useParams();
  return <AccountingReportTable farmerStorageLinkId={farmerStorageLinkId} />;
}
