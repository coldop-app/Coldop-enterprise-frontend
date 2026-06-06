import NikasiSummaryTable from '@/components/analytics/nikasi/NikasiSummaryTable';
import type { AnalyticsDateRange } from '../index';

interface AnalyticsNikasiTabProps {
  dateRange?: AnalyticsDateRange;
}

const AnalyticsNikasiTab = ({ dateRange }: AnalyticsNikasiTabProps) => {
  const dateParams = {
    dateFrom: dateRange?.fromDate || undefined,
    dateTo: dateRange?.toDate || undefined,
  };

  return (
    <div className="space-y-6">
      <NikasiSummaryTable dateParams={dateParams} />
    </div>
  );
};

export default AnalyticsNikasiTab;
