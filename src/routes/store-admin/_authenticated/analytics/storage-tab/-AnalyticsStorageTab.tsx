import { useMemo } from 'react';
import StorageDailyBreakdown from '@/components/analytics/storage/StorageDailyBreakdown';
import StorageSummaryTable from '@/components/analytics/storage/StorageSummaryTable';
import type { AnalyticsDateRange } from '../-analytics-date-search';

interface AnalyticsStorageTabProps {
  dateRange?: AnalyticsDateRange;
}

const AnalyticsStorageTab = ({ dateRange }: AnalyticsStorageTabProps) => {
  const dateParams = useMemo(
    () => ({
      dateFrom: dateRange?.fromDate || undefined,
      dateTo: dateRange?.toDate || undefined,
    }),
    [dateRange?.fromDate, dateRange?.toDate]
  );

  return (
    <div className="space-y-6">
      <StorageSummaryTable dateParams={dateParams} />
      <StorageDailyBreakdown dateParams={dateParams} />
    </div>
  );
};

export default AnalyticsStorageTab;
