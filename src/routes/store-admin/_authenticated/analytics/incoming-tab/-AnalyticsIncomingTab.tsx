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
    <div className="space-y-6">
      <IncomingVarietyChart dateParams={dateParams} />
      <IncomingDailyBreakdown dateParams={dateParams} />
    </div>
  );
};

export default AnalyticsIncomingTab;
