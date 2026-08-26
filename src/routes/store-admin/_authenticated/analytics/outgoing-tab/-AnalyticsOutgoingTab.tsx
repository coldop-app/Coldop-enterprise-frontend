import { useMemo } from 'react';
import DispatchDailyBreakdown from '@/components/analytics/dispatch-post-storage/DispatchDailyBreakdown';
import DispatchSummaryTable from '@/components/analytics/dispatch-post-storage/DispatchSummaryTable';
import type { AnalyticsDateRange } from '../-analytics-date-search';

interface AnalyticsOutgoingTabProps {
  dateRange?: AnalyticsDateRange;
}

const AnalyticsOutgoingTab = ({ dateRange }: AnalyticsOutgoingTabProps) => {
  const dateParams = useMemo(
    () => ({
      dateFrom: dateRange?.fromDate || undefined,
      dateTo: dateRange?.toDate || undefined,
    }),
    [dateRange?.fromDate, dateRange?.toDate]
  );

  return (
    <div className="space-y-6">
      <DispatchSummaryTable dateParams={dateParams} />
      <DispatchDailyBreakdown dateParams={dateParams} />
    </div>
  );
};

export default AnalyticsOutgoingTab;
