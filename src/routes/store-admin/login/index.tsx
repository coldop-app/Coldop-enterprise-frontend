import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/store-admin/login/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/store-admin/login/"!</div>;
}
