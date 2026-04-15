import VarietyDistributionChart from './VarietyDistributionChart';
import IncomingTrendAnalysisChart from './IncomingTrendAnalysisChart';

export interface IncomingDateParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface IncomingGatePassAnalyticsScreenProps {
  dateParams?: IncomingDateParams;
}

export default function IncomingGatePassAnalyticsScreen({
  dateParams = {},
}: IncomingGatePassAnalyticsScreenProps) {
  return (
    <div className="font-custom space-y-6">
      <VarietyDistributionChart dateParams={dateParams} />
      <IncomingTrendAnalysisChart dateParams={dateParams} />
    </div>
  );
}
