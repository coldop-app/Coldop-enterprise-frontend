import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Building2, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Item, ItemHeader, ItemMedia, ItemTitle } from '@/components/ui/item';
import { useGetShedStockReport } from '@/services/store-admin/general/useGetShedStockReport';
import type { ShedStockReportSourceVariety } from '@/types/analytics';
import ShedStockDetailTable from './shed-stock-detail-table';
import ShedStockSummaryTable, {
  type ShedSizeBagRow,
} from './shed-stock-summary-table';
import ShedUngradedTable from './shed-ungraded-table';

function toApiDate(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';

  const [day, month, year] = trimmed.split('.');
  if (!day || !month || !year) return '';

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  const normalizedYear = year.padStart(4, '0');

  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
}

function toShedSizeBagRows(
  varieties: ShedStockReportSourceVariety[]
): ShedSizeBagRow[] {
  return varieties.map((v) => ({
    variety: v.variety,
    sizes: v.sizes.map((s) => ({ size: s.size, bags: s.bags })),
  }));
}

const ShedReportPage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const queryParams = {
    ...(appliedFromDate ? { dateFrom: appliedFromDate } : {}),
    ...(appliedToDate ? { dateTo: appliedToDate } : {}),
  };

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetShedStockReport(queryParams);

  const tableProps = {
    isLoading,
    isError,
    errorMessage: error?.message,
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-3 sm:p-4 lg:p-6">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full flex-wrap gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon-sm" className="shrink-0" asChild>
              <Link
                to="/store-admin/analytics"
                className="focus-visible:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                aria-label="Back to analytics"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <ItemMedia variant="icon" className="rounded-lg">
              <Building2 className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              Shed Stock Report
            </ItemTitle>
          </div>
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            <DatePicker
              id="shed-report-from-date"
              label="From"
              compact
              value={fromDate}
              onChange={setFromDate}
            />
            <DatePicker
              id="shed-report-to-date"
              label="To"
              compact
              value={toDate}
              onChange={setToDate}
            />
            <Button
              className="font-custom h-8 rounded-lg px-4 text-sm shadow-none"
              disabled={!fromDate || !toDate}
              onClick={() => {
                const nextFrom = toApiDate(fromDate);
                const nextTo = toApiDate(toDate);
                if (!nextFrom || !nextTo) return;
                setAppliedFromDate(nextFrom);
                setAppliedToDate(nextTo);
              }}
            >
              Apply
            </Button>
            <Button
              variant="outline"
              className="font-custom text-muted-foreground h-8 rounded-lg px-4 text-sm"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setAppliedFromDate('');
                setAppliedToDate('');
              }}
            >
              Reset
            </Button>
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
        </ItemHeader>
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
        {...tableProps}
      />
    </main>
  );
};

export default ShedReportPage;
