import { createFileRoute } from '@tanstack/react-router';
import DispatchLedgerReport from '@/components/dispatch-ledger/reports/dispatch-ledger-report';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/dispatch-ledger/$id/dispatch-ledger-report/'
)({
  component: DispatchLedgerReport,
});
