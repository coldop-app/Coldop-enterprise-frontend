import { createFileRoute } from '@tanstack/react-router';
import ContractFarmingReportTable from '@/components/analytics/contract-farming/report/contract-farming-report-table';
import { validateContractFarmingReportSearch } from '@/components/analytics/contract-farming/report/contract-farming-report-search';

export const Route = createFileRoute(
  '/store-admin/_authenticated/contract-test/'
)({
  validateSearch: validateContractFarmingReportSearch,
  component: ContractFarmingReportTable,
});
