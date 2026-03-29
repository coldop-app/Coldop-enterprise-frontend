import { createFileRoute } from '@tanstack/react-router';
import GradingDailyBreakdownPage from '@/components/analytics/grading/daily-breakdown';

export interface GradingDailyBreakdownSearch {
  /** Calendar day in YYYY-MM-DD (from analytics trend row) */
  date?: string;
}

function parseGradingDailyBreakdownSearch(
  search: Record<string, unknown>
): GradingDailyBreakdownSearch {
  const raw = search.date;
  if (typeof raw !== 'string' || raw.length < 10) return {};
  const date = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  return { date };
}

function GradingDailyBreakdownRoute() {
  return <GradingDailyBreakdownPage />;
}

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/grading-daily-breakdown/'
)({
  validateSearch: parseGradingDailyBreakdownSearch,
  component: GradingDailyBreakdownRoute,
});
