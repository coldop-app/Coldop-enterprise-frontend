/* eslint-disable react-refresh/only-export-components */
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { useGetSingleGradingGatePass } from '@/services/store-admin/grading-gate-pass/useGetSingleGradingGatePass';
import GradingEditForm from './-GradingEditForm';

export const Route = createFileRoute(
  '/store-admin/_authenticated/grading-gate-pass/edit/'
)({
  component: GradingEditRouteComponent,
});

function GradingEditRouteComponent() {
  const search = useSearch({ strict: false });
  const gradingGatePassId =
    typeof search.id === 'string' ? search.id : undefined;
  const { data: gradingGatePass } =
    useGetSingleGradingGatePass(gradingGatePassId);

  return <GradingEditForm gradingGatePass={gradingGatePass} />;
}
