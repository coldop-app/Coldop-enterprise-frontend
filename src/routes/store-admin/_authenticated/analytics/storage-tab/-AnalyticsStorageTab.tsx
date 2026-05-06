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
    <>
      <StorageSummaryTable dateParams={dateParams} />
      <h1 className="py-6">gap between the 2 components</h1>
      <StorageDailyBreakdown dateParams={dateParams} />
    </>
  );
};

export default AnalyticsStorageTab;
