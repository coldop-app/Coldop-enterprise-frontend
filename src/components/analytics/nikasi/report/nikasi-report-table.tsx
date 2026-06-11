import { memo, useCallback, useMemo, useState } from 'react';
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item } from '@/components/ui/item';
import {
  useGetNikasiGatePassReport,
  type NikasiGatePassReportDataRow,
} from '@/services/store-admin/nikasi-gate-pass/analytics/useGetNikasiGatePassReport';
import { useStore } from '@/stores/store';
import { resolveNikasiReportApiColumns } from './columns';
import NikasiReportDataTable from './data-table';
import {
  NikasiExcelButton,
  type NikasiReportExportContext,
} from './nikasi-excel-button';
import AnalyticsBackLink from '@/routes/store-admin/_authenticated/analytics/-AnalyticsBackLink';
import { useAnalyticsDateFilters } from '@/routes/store-admin/_authenticated/analytics/-analytics-date-search';

function filterSourceRowsByManualGatePassSearch(
  rows: NikasiGatePassReportDataRow[],
  search: string
): NikasiGatePassReportDataRow[] {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return rows;

  return rows.filter((row) =>
    String(row.manualGatePassNumber ?? '')
      .toLowerCase()
      .includes(normalized)
  );
}

const NikasiReportTable = () => {
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
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
  const [manualGatePassSearch, setManualGatePassSearch] = useState('');
  const [isViewFiltersOpen, setIsViewFiltersOpen] = useState(false);
  const [exportContext, setExportContext] =
    useState<NikasiReportExportContext | null>(null);

  const handleExportContextChange = useCallback(
    (context: NikasiReportExportContext | null) => {
      setExportContext(context);
    },
    []
  );

  const canApply = Boolean(fromDate && toDate);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetNikasiGatePassReport(
      {
        fromDate: hasAppliedFilters ? appliedFromDate : undefined,
        toDate: hasAppliedFilters ? appliedToDate : undefined,
      },
      { enabled: true }
    );

  const filteredSourceRows = useMemo(
    () =>
      filterSourceRowsByManualGatePassSearch(
        data?.data ?? [],
        manualGatePassSearch
      ),
    [data?.data, manualGatePassSearch]
  );

  const reportColumns = useMemo(
    () => resolveNikasiReportApiColumns(data?.columns ?? []),
    [data?.columns]
  );

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-4">
        <Item
          variant="outline"
          size="sm"
          className="border-border/30 bg-background rounded-2xl border p-3 shadow-sm"
        >
          <div className="flex w-full flex-wrap items-end gap-2.5 xl:flex-nowrap">
            <AnalyticsBackLink />
            <div className="flex items-end gap-2 self-end">
              <DatePicker
                id="nikasi-analytics-from-date"
                label="From"
                compact
                value={fromDate}
                onChange={setFromDate}
              />
              <span className="text-muted-foreground mb-2 self-end text-sm">
                →
              </span>
              <DatePicker
                id="nikasi-analytics-to-date"
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

            <div className="bg-border/40 hidden h-7 w-px lg:block" />

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2 self-end">
              <div className="relative w-[140px] sm:w-[170px]">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  value={manualGatePassSearch}
                  onChange={(event) =>
                    setManualGatePassSearch(event.target.value)
                  }
                  placeholder="Search manual gate pass…"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="border-primary text-primary hover:bg-primary/5 h-8 rounded-lg px-4 text-sm leading-none"
                onClick={() => setIsViewFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                View Filters
              </Button>
              <NikasiExcelButton
                exportContext={exportContext}
                coldStorageName={coldStorageName}
              />
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground h-8 w-8 rounded-lg p-0 leading-none"
                disabled={isFetching}
                onClick={() => refetch()}
                aria-label="Refresh"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>
        </Item>

        {isError ? (
          <p className="font-custom rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error instanceof Error
              ? error.message
              : 'Failed to load nikasi gate pass report'}
          </p>
        ) : null}

        <NikasiReportDataTable
          apiColumns={reportColumns}
          sourceRows={filteredSourceRows}
          isLoading={isLoading}
          isViewFiltersOpen={isViewFiltersOpen}
          onViewFiltersOpenChange={setIsViewFiltersOpen}
          onExportContextChange={handleExportContextChange}
        />
      </div>
    </main>
  );
};

export default memo(NikasiReportTable);
