import type { UseQueryResult } from '@tanstack/react-query';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';

export interface IncomingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<IncomingGatePassWithLink[], Error>;
}

export default function IncomingGatePassAnalyticsScreen({
  queryResult: _queryResult,
}: IncomingGatePassAnalyticsScreenProps) {
  return (
    <div className="font-custom text-center py-12 text-gray-600">
      Show Incoming Analytics Here after discussion
    </div>
  );
}
