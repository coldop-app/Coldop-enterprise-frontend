/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import AreaBreakdownPage from '@/components/analytics/grading/AreaBreakdown';

export type AreaBreakdownSearch = {
  area?: string;
  variety?: string;
  size?: string;
};

export const Route = createFileRoute(
  '/store-admin/_authenticated/analytics/area-breakdown/'
)({
  validateSearch: (search: Record<string, unknown>): AreaBreakdownSearch => ({
    area: search.area ? String(search.area) : undefined,
    variety: search.variety ? String(search.variety) : undefined,
    size: search.size ? String(search.size) : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { area, variety, size } = Route.useSearch();

  return <AreaBreakdownPage area={area} variety={variety} size={size} />;
}
