import { lazy } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import type { AnalyticsReportType } from '@/types/analytics';

const reportTypes: AnalyticsReportType[] = [
  'seed',
  'incoming',
  'ungraded',
  'grading',
  'stored',
  'shed-stock',
  'dispatch',
  'outgoing',
];

const ReportsScreen = lazy(() =>
  import('@/components/analytics/reports').then((m) => ({ default: m.default }))
);

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/'
)({
  validateSearch: (
    search: Record<string, unknown>
  ): { report?: AnalyticsReportType } => {
    const report =
      typeof search.report === 'string' &&
      reportTypes.includes(search.report as AnalyticsReportType)
        ? (search.report as AnalyticsReportType)
        : undefined;
    return { report };
  },
  component: ReportsScreen,
});
