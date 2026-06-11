import { Link, getRouteApi } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  analyticsLayoutRouteId,
  toAnalyticsDateSearch,
} from './-analytics-date-search';

const analyticsRouteApi = getRouteApi(analyticsLayoutRouteId);

const AnalyticsBackLink = () => {
  const search = analyticsRouteApi.useSearch();
  const dateSearch = toAnalyticsDateSearch({
    fromDate: search.fromDate ?? '',
    toDate: search.toDate ?? '',
  });

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="shrink-0 self-end"
      asChild
    >
      <Link
        to="/store-admin/analytics"
        search={(prev) => ({
          ...prev,
          ...dateSearch,
        })}
        className="focus-visible:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="Back to analytics"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  );
};

export default AnalyticsBackLink;
