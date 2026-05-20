import { createFileRoute } from '@tanstack/react-router';
import ContractFarmingReportTable from '@/components/analytics/contract-farming/report/contract-farming-report-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/contract-test/'
)({
  component: ContractFarmingReportTable,
});
