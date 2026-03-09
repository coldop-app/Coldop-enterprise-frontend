import type { UseQueryResult } from '@tanstack/react-query';
import type { GetGradingGatePassesResult } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import type { GetGradingSizeWiseDistributionParams } from '@/services/store-admin/grading-gate-pass/useGetGradingSizeWiseDistribution';
import type { GetAreaWiseAnalyticsParams } from '@/services/store-admin/grading-gate-pass/useGetAreaWiseAnalytics';
import SizeDistributionChart from './SizeDistributionChart';
import AreaWiseAnalytics from './AreaWiseAnalytics';

export interface GradingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<GetGradingGatePassesResult, Error>;
  dateParams?: GetGradingSizeWiseDistributionParams &
    GetAreaWiseAnalyticsParams;
}

export default function GradingGatePassAnalyticsScreen({
  queryResult: _queryResult,
  dateParams = {},
}: GradingGatePassAnalyticsScreenProps) {
  return (
    <div className="font-custom space-y-6">
      <SizeDistributionChart dateParams={dateParams} />
      <AreaWiseAnalytics dateParams={dateParams} />
    </div>
  );
}
