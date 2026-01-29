import { createFileRoute } from '@tanstack/react-router';
import NikasiGatePassForm from '@/components/forms/nikasi';

export const Route = createFileRoute('/store-admin/_authenticated/nikasi/')({
  component: NikasiGatePassForm,
});
