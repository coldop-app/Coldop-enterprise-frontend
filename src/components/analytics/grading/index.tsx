import type { UseQueryResult } from '@tanstack/react-query';
import type { GradingGatePass } from '@/types/grading-gate-pass';

export interface GradingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<GradingGatePass[], Error>;
}

export default function GradingGatePassAnalyticsScreen({
  queryResult: _queryResult,
}: GradingGatePassAnalyticsScreenProps) {
  return (
    <div className="font-custom text-center py-12 text-gray-600">
      Show Grading Analytics Here after discussion
    </div>
  );
}
