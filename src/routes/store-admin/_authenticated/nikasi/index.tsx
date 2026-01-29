import { createFileRoute } from '@tanstack/react-router';

function NikasiPlaceholder() {
  return (
    <main className="mx-auto max-w-7xl p-4">
      <h1 className="font-custom text-2xl font-semibold">Nikasi</h1>
      <p className="font-custom text-muted-foreground mt-2">
        Nikasi form coming soon.
      </p>
    </main>
  );
}

export const Route = createFileRoute('/store-admin/_authenticated/nikasi/')({
  component: NikasiPlaceholder,
});
