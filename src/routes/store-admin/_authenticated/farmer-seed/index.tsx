import { createFileRoute } from '@tanstack/react-router';
import FarmerSeedForm from '@/components/forms/farmer-seed';

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed/'
)({
  component: FarmerSeedForm,
});
