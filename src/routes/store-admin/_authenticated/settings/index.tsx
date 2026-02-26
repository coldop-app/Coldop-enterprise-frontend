import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/store-admin/_authenticated/settings/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Settings screen coming soon!</div>;
}
