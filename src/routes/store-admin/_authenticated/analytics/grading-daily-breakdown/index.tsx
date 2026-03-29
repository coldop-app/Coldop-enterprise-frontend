import { createFileRoute } from '@tanstack/react-router';
import GradingDailyBreakdownPage from '@/components/analytics/grading/daily-breakdown';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/grading-daily-breakdown/'
)({
  component: GradingDailyBreakdownPage,
});
