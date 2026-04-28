import { createFileRoute } from '@tanstack/react-router';
import IncomingDigitalReport from '@/components/analytics/incoming/report/incoming-digital-report';

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/reports/incoming/'
)({
  component: IncomingDigitalReport,
});
