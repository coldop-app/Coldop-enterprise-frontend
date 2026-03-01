import { createFileRoute } from '@tanstack/react-router';
import StorageGatePassForm from '@/components/forms/storage';

export const Route = createFileRoute('/store-admin/_authenticated/storage/')({
  component: StorageFormPage,
});

function StorageFormPage() {
  return <StorageGatePassForm />;
}
