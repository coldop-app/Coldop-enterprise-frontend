import { Building2, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import AnalyticsBackLink from '@/routes/store-admin/_authenticated/analytics/-AnalyticsBackLink';
import { useAnalyticsDateFilters } from '@/routes/store-admin/_authenticated/analytics/-analytics-date-search';
import { Item, ItemMedia, ItemTitle } from '@/components/ui/item';
import { useGetShedStockReport } from '@/services/store-admin/general/useGetShedStockReport';
import type { ShedStockReportSourceVariety } from '@/types/analytics';
import ShedStockDetailTable from './shed-stock-detail-table';
import ShedStockSummaryTable, {
  type ShedSizeBagRow,
} from './shed-stock-summary-table';
import ShedUngradedTable from './shed-ungraded-table';

function toShedSizeBagRows(
  varieties: ShedStockReportSourceVariety[]
): ShedSizeBagRow[] {
  return varieties.map((v) => ({
    variety: v.variety,
    sizes: v.sizes.map((s) => ({ size: s.size, bags: s.bags })),
  }));
}

const ShedReportPage = () => {
  const {
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    appliedFromDate,
    appliedToDate,
    hasAppliedFilters,
    apply,
    reset,
  } = useAnalyticsDateFilters();

  const canApply = Boolean(fromDate && toDate);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetShedStockReport({
      dateFrom: hasAppliedFilters ? appliedFromDate : undefined,
      dateTo: hasAppliedFilters ? appliedToDate : undefined,
    });

  const tableProps = {
    isLoading,
    isError,
    errorMessage: error?.message,
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-3 sm:p-4 lg:p-6">
      <Item
        variant="outline"
        size="sm"
        className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
      >
        <div className="flex w-full flex-wrap items-end gap-2.5 xl:flex-nowrap">
          <AnalyticsBackLink />
          <div className="flex min-w-0 items-center gap-2 self-end">
            <ItemMedia variant="icon" className="rounded-lg">
              <Building2 className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              Shed Stock Report
            </ItemTitle>
          </div>

          <div className="bg-border/40 hidden h-7 w-px lg:block" />

          <div className="flex items-end gap-2 self-end">
            <DatePicker
              id="shed-analytics-from-date"
              label="From"
              compact
              value={fromDate}
              onChange={setFromDate}
            />
            <span className="text-muted-foreground mb-2 self-end text-sm">
              →
            </span>
            <DatePicker
              id="shed-analytics-to-date"
              label="To"
              compact
              value={toDate}
              onChange={setToDate}
            />
          </div>

          <div className="bg-border/40 hidden h-7 w-px lg:block" />

          <div className="flex items-center gap-2 self-end">
            <Button
              className="h-8 rounded-lg px-4 text-sm shadow-none"
              disabled={!canApply}
              onClick={apply}
            >
              Apply
            </Button>
            <Button
              variant="outline"
              className="text-muted-foreground h-8 rounded-lg px-4 text-sm"
              onClick={reset}
            >
              Reset
            </Button>
          </div>

          <div className="ml-auto flex items-center self-end">
            <Button
              variant="ghost"
              className="text-muted-foreground h-8 rounded-lg px-2"
              disabled={isFetching}
              onClick={() => refetch()}
              aria-label="Refresh shed stock report"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
        </div>
      </Item>

      <ShedStockSummaryTable
        title="Grading"
        subtitle="Initial graded bags by variety and size."
        rows={data ? toShedSizeBagRows(data.grading) : []}
        {...tableProps}
      />

      <ShedUngradedTable
        varieties={data?.ungraded ?? []}
        totalBags={data?.shedStock.totals.ungradedBags ?? 0}
        {...tableProps}
      />

      <ShedStockSummaryTable
        title="Storage"
        subtitle="Bags stored by variety and size."
        rows={data ? toShedSizeBagRows(data.storage) : []}
        {...tableProps}
      />

      <ShedStockSummaryTable
        title="Internally Transferred"
        subtitle="Dispatch bags marked as internal transfer."
        rows={data ? toShedSizeBagRows(data.internalTransfer) : []}
        {...tableProps}
      />

      <ShedStockSummaryTable
        title="Not Internally Transferred"
        subtitle="Dispatch bags not marked as internal transfer."
        rows={data ? toShedSizeBagRows(data.notInternalTransfer) : []}
        {...tableProps}
      />

      <ShedStockDetailTable
        varieties={data?.shedStock.varieties ?? []}
        totals={
          data?.shedStock.totals ?? {
            gradingInitial: 0,
            stored: 0,
            dispatched: 0,
            internallyTransferred: 0,
            notInternallyTransferred: 0,
            shedStock: 0,
            ungradedBags: 0,
          }
        }
        ungraded={data?.ungraded ?? []}
        notInternalTransfer={data?.notInternalTransfer ?? []}
        {...tableProps}
      />
    </main>
  );
};

export default ShedReportPage;
