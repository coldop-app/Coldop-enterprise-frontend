import { createFileRoute } from '@tanstack/react-router';
import FarmerSeedForm from '@/components/forms/farmer-seed';

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed/'
)({
  validateSearch: (
    search: Record<string, unknown>
  ): { farmerStorageLinkId?: string } => ({
    farmerStorageLinkId:
      typeof search.farmerStorageLinkId === 'string'
        ? search.farmerStorageLinkId
        : undefined,
  }),
  component: FarmerSeedForm,
});
