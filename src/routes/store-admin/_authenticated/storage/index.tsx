import { createFileRoute } from '@tanstack/react-router';
import StorageGatePassForm from '@/components/forms/storage';

const DEFAULT_FARMER_STORAGE_LINK_ID = '69a3da68ea67b19be4c0e86c';

export const Route = createFileRoute('/store-admin/_authenticated/storage/')({
  component: StorageFormPage,
});

function StorageFormPage() {
  return (
    <StorageGatePassForm farmerStorageLinkId={DEFAULT_FARMER_STORAGE_LINK_ID} />
  );
}
