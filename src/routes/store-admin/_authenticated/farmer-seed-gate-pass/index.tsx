/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/store-admin/_authenticated/farmer-seed-gate-pass/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/store-admin/_authenticated/farmer-seed-gate-pass/"!</div>;
}
