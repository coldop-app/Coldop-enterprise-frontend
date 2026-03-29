import { createFileRoute } from '@tanstack/react-router';
import IncomingDailyBreakdownPage from '@/components/analytics/incoming/daily-breakdown';

export interface IncomingDailyBreakdownSearch {
  /** Calendar day in YYYY-MM-DD (from analytics trend row) */
  date?: string;
}

function parseIncomingDailyBreakdownSearch(
  search: Record<string, unknown>
): IncomingDailyBreakdownSearch {
  const raw = search.date;
  if (typeof raw !== 'string' || raw.length < 10) return {};
  const date = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  return { date };
}

/** Route shell for router-plugin code-splitting (avoids broken lazy `component` chunk). */
function IncomingDailyBreakdownRoute() {
  return <IncomingDailyBreakdownPage />;
}

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/incoming-daily-breakdown/'
)({
  validateSearch: parseIncomingDailyBreakdownSearch,
  component: IncomingDailyBreakdownRoute,
});
