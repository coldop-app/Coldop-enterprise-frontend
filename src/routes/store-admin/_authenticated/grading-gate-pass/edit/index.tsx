/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/store-admin/_authenticated/grading-gate-pass/edit/'
)({
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: search.id ? String(search.id) : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>Hello "/store-admin/_authenticated/grading-gate-pass/edit/"!</div>
  );
}
