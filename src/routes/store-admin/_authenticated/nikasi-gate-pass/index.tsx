import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/store-admin/_authenticated/nikasi-gate-pass/'
)({
  component: RouteComponent,
});

// eslint-disable-next-line react-refresh/only-export-components
function RouteComponent() {
  return <div>Hello "/store-admin/_authenticated/nikasi-gate-pass/"!</div>;
}
