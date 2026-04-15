import type { GetGradingSizeWiseDistributionParams } from '@/services/store-admin/grading-gate-pass/useGetGradingSizeWiseDistribution';
import type { GetAreaWiseAnalyticsParams } from '@/services/store-admin/grading-gate-pass/useGetAreaWiseAnalytics';
import SizeDistributionChart from './SizeDistributionChart';
import AreaWiseAnalytics from './AreaWiseAnalytics';
import GradingTrendAnalysisChart from './GradingTrendAnalysisChart';

export interface GradingGatePassAnalyticsScreenProps {
  dateParams?: GetGradingSizeWiseDistributionParams &
    GetAreaWiseAnalyticsParams;
}

export default function GradingGatePassAnalyticsScreen({
  dateParams = {},
}: GradingGatePassAnalyticsScreenProps) {
  return (
    <div className="font-custom space-y-6">
      <GradingTrendAnalysisChart dateParams={dateParams} />
      <SizeDistributionChart dateParams={dateParams} />
      <AreaWiseAnalytics dateParams={dateParams} />
    </div>
  );
}
