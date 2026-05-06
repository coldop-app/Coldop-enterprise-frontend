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
    <>
      <GradingSizeDistributionChart dateParams={dateParams} />
      <h1 className="p-6">gap1</h1>
      <GradingDailyBreakdown dateParams={dateParams} />

      <h1 className="p-6">gap2</h1>

      <GradingAreaWiseDistribution dateParams={dateParams} />
    </>
  );
};

export default AnalayticsGradingTab;
