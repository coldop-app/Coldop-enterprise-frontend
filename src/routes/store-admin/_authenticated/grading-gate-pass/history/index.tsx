/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/store-admin/_authenticated/grading-gate-pass/history/'
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>Hello "/store-admin/_authenticated/grading-gate-pass/history/"!</div>
  );
}
