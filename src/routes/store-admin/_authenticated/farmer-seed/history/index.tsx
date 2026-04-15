import { createFileRoute } from '@tanstack/react-router';
import FarmerSeedHistory from '@/components/farmer-seed-history/index';

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed/history/'
)({
  component: FarmerSeedHistory,
});
