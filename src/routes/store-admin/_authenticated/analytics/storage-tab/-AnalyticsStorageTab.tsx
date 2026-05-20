import StorageDailyBreakdown from '@/components/analytics/storage/StorageDailyBreakdown';
import StorageSummaryTable from '@/components/analytics/storage/StorageSummaryTable';
import type { AnalyticsDateRange } from '../index';

interface AnalyticsStorageTabProps {
  dateRange?: AnalyticsDateRange;
}

const AnalyticsStorageTab = ({ dateRange }: AnalyticsStorageTabProps) => {
  const dateParams = {
    dateFrom: dateRange?.fromDate || undefined,
    dateTo: dateRange?.toDate || undefined,
  };

  return (
    <div className="space-y-6">
      <StorageSummaryTable dateParams={dateParams} />
      <StorageDailyBreakdown dateParams={dateParams} />
    </div>
  );
};

export default AnalyticsStorageTab;
