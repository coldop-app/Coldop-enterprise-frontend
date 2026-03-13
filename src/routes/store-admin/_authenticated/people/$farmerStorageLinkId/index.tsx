import { createFileRoute } from '@tanstack/react-router';
import FarmerProfile from '@/components/people/farmer-profile';

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/'
)({
  component: FarmerProfile,
});
