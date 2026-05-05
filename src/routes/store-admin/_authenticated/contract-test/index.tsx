import { createFileRoute } from '@tanstack/react-router';
import TestContractFarmingReport from '@/components/analytics/contract-farming/report-2/test-contract-farming-report-data-table';

export const Route = createFileRoute(
  '/store-admin/_authenticated/contract-test/'
)({
  component: TestContractFarmingReport,
});
