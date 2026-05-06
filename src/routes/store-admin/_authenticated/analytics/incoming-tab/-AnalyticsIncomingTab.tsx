import IncomingVarietyChart from '@/components/analytics/incoming/IncomingVarietyChart';
import IncomingDailyBreakdown from '@/components/analytics/incoming/IncomingDailyBreakdown';
import type { AnalyticsDateRange } from '../index';

interface AnalyticsIncomingTabProps {
  dateRange: AnalyticsDateRange;
}

const AnalyticsIncomingTab = ({ dateRange }: AnalyticsIncomingTabProps) => {
  const dateParams = {
    dateFrom: dateRange.fromDate || undefined,
    dateTo: dateRange.toDate || undefined,
  };

  return (
    <>
      <IncomingVarietyChart dateParams={dateParams} />
      <h1 className="py-6">gap between the 2 components</h1>
      <IncomingDailyBreakdown dateParams={dateParams} />
    </>
  );
};

export default AnalyticsIncomingTab;
