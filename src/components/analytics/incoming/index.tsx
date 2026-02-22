import type { UseQueryResult } from '@tanstack/react-query';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';

interface IncomingGatePassAnalyticsScreenProps {
  queryResult: UseQueryResult<IncomingGatePassWithLink[]>;
}

const IncomingGatePassAnalyticsScreen = ({
  queryResult,
}: IncomingGatePassAnalyticsScreenProps) => {
  const { data, isPending, error } = queryResult;

  if (isPending) {
    return (
      <p className="font-custom text-sm leading-relaxed text-gray-600">
        Loading incoming gate passes…
      </p>
    );
  }

  if (error) {
    return (
      <p className="font-custom text-destructive text-sm leading-relaxed">
        Error: {error.message}
      </p>
    );
  }

  return (
    <pre className="font-custom -border bg-secondary/50 max-h-[70vh] overflow-auto rounded-lg border p-4 text-sm">
      {JSON.stringify(data ?? null, null, 2)}
    </pre>
  );
};

export default IncomingGatePassAnalyticsScreen;
