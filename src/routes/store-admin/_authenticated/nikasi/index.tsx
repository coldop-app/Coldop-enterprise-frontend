import { createFileRoute } from '@tanstack/react-router';
import NikasiGatePassForm from '@/components/forms/nikasi';

export const Route = createFileRoute('/store-admin/_authenticated/nikasi/')({
  validateSearch: (
    search: Record<string, unknown>
  ): { farmerStorageLinkId?: string; gradingPassId?: string } => ({
    farmerStorageLinkId:
      typeof search.farmerStorageLinkId === 'string'
        ? search.farmerStorageLinkId
        : undefined,
    gradingPassId:
      typeof search.gradingPassId === 'string' ? search.gradingPassId : undefined,
  }),
  component: NikasiFormPage,
});

function NikasiFormPage() {
  const { farmerStorageLinkId, gradingPassId } = Route.useSearch();

  return (
    <NikasiGatePassForm
      key={farmerStorageLinkId ?? 'default'}
      farmerStorageLinkId={farmerStorageLinkId ?? ''}
      gradingPassId={gradingPassId}
    />
  );
}
