import type { UseQueryResult } from '@tanstack/react-query';
import type { GetIncomingGatePassesResult } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import TopFarmersChart from './TopFarmersChart';
import VarietyDistributionChart from './VarietyDistributionChart';
import IncomingTrendAnalysisChart from './IncomingTrendAnalysisChart';

export interface IncomingDateParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface IncomingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<GetIncomingGatePassesResult, Error>;
  dateParams?: IncomingDateParams;
}

export default function IncomingGatePassAnalyticsScreen({
  queryResult: _queryResult,
  dateParams = {},
}: IncomingGatePassAnalyticsScreenProps) {
  return (
    <div className="font-custom space-y-6">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <TopFarmersChart dateParams={dateParams} />
        <VarietyDistributionChart dateParams={dateParams} />
      </div>
      <IncomingTrendAnalysisChart dateParams={dateParams} />
    </div>
  );
}
