import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import StorageEdit from '@/components/forms/storage/edit';

export const Route = createFileRoute(
  '/store-admin/_authenticated/storage/edit/'
)({
  validateSearch: z.object({
    id: z.string().optional(),
  }),
  component: StorageEdit,
});
