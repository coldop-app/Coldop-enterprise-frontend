import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import FarmerSeedEdit from '@/components/forms/farmer-seed/edit';

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed/edit/'
)({
  validateSearch: z.object({
    id: z.string().optional(),
  }),
  component: FarmerSeedEdit,
});
