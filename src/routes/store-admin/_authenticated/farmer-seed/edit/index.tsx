import { createFileRoute } from '@tanstack/react-router';
import FarmerSeedEdit from '@/components/forms/farmer-seed/edit';

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed/edit/'
)({
  component: FarmerSeedEdit,
});
