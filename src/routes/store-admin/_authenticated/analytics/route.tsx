import {
  createFileRoute,
  Outlet,
  retainSearchParams,
} from '@tanstack/react-router';
import { validateAnalyticsDateSearch } from './-analytics-date-search';

export const Route = createFileRoute('/store-admin/_authenticated/analytics')({
  validateSearch: validateAnalyticsDateSearch,
  search: {
    middlewares: [retainSearchParams(['fromDate', 'toDate'])],
  },
  component: () => <Outlet />,
});
