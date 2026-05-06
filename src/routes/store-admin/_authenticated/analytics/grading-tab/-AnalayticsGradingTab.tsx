import GradingSizeDistributionChart from '@/components/analytics/grading/GradingSizeDistributionChart';
import GradingDailyBreakdown from '@/components/analytics/grading/GradingDailyBreakdown';
import GradingAreaWiseDistribution from '@/components/analytics/grading/GradingAreaWiseDistribution';
import type { AnalyticsDateRange } from '../index';

interface AnalayticsGradingTabProps {
  dateRange: AnalyticsDateRange;
}

const AnalayticsGradingTab = ({ dateRange }: AnalayticsGradingTabProps) => {
  const dateParams = {
    dateFrom: dateRange.fromDate || undefined,
    dateTo: dateRange.toDate || undefined,
  };

  return (
    <div className="space-y-6">
      <GradingSizeDistributionChart dateParams={dateParams} />
      <GradingDailyBreakdown dateParams={dateParams} />
      <GradingAreaWiseDistribution dateParams={dateParams} />
    </div>
  );
};

export default AnalayticsGradingTab;
