import { createFileRoute } from '@tanstack/react-router';

function OutgoingPlaceholder() {
  return (
    <main className="mx-auto max-w-7xl p-4">
      <h1 className="font-custom text-2xl font-semibold">Outgoing</h1>
      <p className="font-custom text-muted-foreground mt-2">
        Outgoing form coming soon.
      </p>
    </main>
  );
}

export const Route = createFileRoute(
  '/store-admin/_authenticated/outgoing/',
)({
  component: OutgoingPlaceholder,
});
