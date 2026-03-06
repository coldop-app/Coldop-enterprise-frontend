import type { UseQueryResult } from '@tanstack/react-query';
import type { GetGradingGatePassesResult } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';

export interface GradingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<GetGradingGatePassesResult, Error>;
}

export default function GradingGatePassAnalyticsScreen({
  queryResult: _queryResult,
}: GradingGatePassAnalyticsScreenProps) {
  return (
    <div className="font-custom py-12 text-center text-gray-600">
      Show Grading Analytics Here after discussion
    </div>
  );
}
