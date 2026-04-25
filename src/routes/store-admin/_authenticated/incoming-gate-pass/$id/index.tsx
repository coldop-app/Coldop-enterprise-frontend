import { createFileRoute } from '@tanstack/react-router';
import SingleIncomingGatePassScreen from '@/components/incoming-gate-pass';

export const Route = createFileRoute(
  '/store-admin/_authenticated/incoming-gate-pass/$id/'
)({
  component: SingleIncomingGatePassScreen,
});
