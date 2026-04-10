import { createFileRoute } from '@tanstack/react-router';
import FarmerSeedScreen from '@/components/farmer-seed';

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed-history/'
)({
  component: FarmerSeedScreen,
});
