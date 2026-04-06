'use client';

import { useMemo, useRef, useState } from 'react';
import {
  useGetShedStock,
  shedStockReportQueryOptions,
} from '@/services/store-admin/analytics/shed-stock/useGetShedStock';
import type { ShedStockReportSourceVariety } from '@/types/analytics';
import type {
  VarietyStockSummary,
  SizeQuantity,
} from '@/services/store-admin/analytics/storage/useGetStorageSummary';
import { StorageSummaryTable } from '@/components/analytics/storage/StorageSummaryTable';
import { ShedStockMetricsTable } from './ShedStockMetricsTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { queryClient } from '@/lib/queryClient';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';

/** Same ordering as analytics storage tab (StorageAnalyticsScreen) */
const SIZE_ORDER = [
  'Below 25',
  '25–30',
  'Below 30',
  '30–35',
  '35–40',
  '30–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
];

function orderedSizesFromRows(rows: { sizes: { size: string }[] }[]): string[] {
  const set = new Set<string>();
  rows.forEach((v) => v.sizes.forEach((s) => set.add(s.size)));
  const rest = [...set].filter((s) => !SIZE_ORDER.includes(s)).sort();
  return [...SIZE_ORDER.filter((s) => set.has(s)), ...rest];
}

function bagsBySize(row: ShedStockReportSourceVariety): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of row.sizes) {
    m.set(s.size, s.bags);
  }
  return m;
}

function sourceVarietiesToStockSummary(
  rows: ShedStockReportSourceVariety[],
  sizes: string[]
): VarietyStockSummary[] {
  return rows.map((v) => {
    const bySize = bagsBySize(v);
    return {
      variety: v.variety,
      sizes: sizes.map(
        (size): SizeQuantity => ({
          size,
          initialQuantity: bySize.get(size) ?? 0,
          currentQuantity: bySize.get(size) ?? 0,
        })
      ),
    };
  });
}

function ReportSectionEmpty({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Card className="font-custom border-border rounded-xl shadow-sm">
      <CardContent className="p-4 py-8 sm:p-5">
        <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <p className="font-custom text-muted-foreground mt-2 text-sm">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}

const ShedStockReportTable = () => {
  const coldStorage = useStore((s) => s.coldStorage);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [appliedRange, setAppliedRange] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const { data, isPending, isFetching, error } = useGetShedStock({
    dateFrom: appliedRange.dateFrom,
    dateTo: appliedRange.dateTo,
  });

  const handleApplyDates = () => {
    if (!fromDate && !toDate) return;
    if (fromDate && toDate) {
      const fromStr = formatDateToYYYYMMDD(fromDate);
      const toStr = formatDateToYYYYMMDD(toDate);
      if (toStr < fromStr) {
        toast.error('Invalid date range', {
          description: '"To" date must not be before "From" date.',
        });
        return;
      }
    }
    const params = {
      dateFrom: fromDate ? formatDateToYYYYMMDD(fromDate) : undefined,
      dateTo: toDate ? formatDateToYYYYMMDD(toDate) : undefined,
    };
    const fetchPromise = queryClient.fetchQuery(
      shedStockReportQueryOptions(params)
    );
    toast.promise(fetchPromise, {
      loading: 'Applying date filters…',
      success: 'Date filters applied. Report updated.',
      error: 'Failed to load report for the selected dates.',
    });
    fetchPromise
      .then(() => {
        setAppliedRange({
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        });
        requestAnimationFrame(() => {
          reportContentRef.current?.focus({ preventScroll: true });
        });
      })
      .catch(() => {});
  };

  const handleClearDates = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedRange({});
    toast.success('Date filters cleared. Report updated.');
  };

  const getDateRangeLabel = () => {
    if (appliedRange.dateFrom && appliedRange.dateTo) {
      return `${appliedRange.dateFrom} to ${appliedRange.dateTo}`;
    }
    if (appliedRange.dateFrom) return `From ${appliedRange.dateFrom}`;
    if (appliedRange.dateTo) return `To ${appliedRange.dateTo}`;
    return 'All dates';
  };

  const grading = useMemo(() => data?.grading ?? [], [data]);
  const storage = useMemo(() => data?.storage ?? [], [data]);
  const dispatch = useMemo(() => data?.dispatch ?? [], [data]);
  const shedStock = data?.shedStock;

  const gradingSizes = useMemo(() => orderedSizesFromRows(grading), [grading]);
  const storageSizes = useMemo(() => orderedSizesFromRows(storage), [storage]);
  const dispatchSizes = useMemo(
    () => orderedSizesFromRows(dispatch),
    [dispatch]
  );
  const shedSizes = useMemo(() => {
    const varieties = shedStock?.varieties;
    return varieties?.length ? orderedSizesFromRows(varieties) : [];
  }, [shedStock]);

  const gradingSummary = useMemo(
    () => sourceVarietiesToStockSummary(grading, gradingSizes),
    [grading, gradingSizes]
  );
  const storageSummary = useMemo(
    () => sourceVarietiesToStockSummary(storage, storageSizes),
    [storage, storageSizes]
  );
  const dispatchSummary = useMemo(
    () => sourceVarietiesToStockSummary(dispatch, dispatchSizes),
    [dispatch, dispatchSizes]
  );

  const handleDownloadPdf = async () => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingPdf(true);
    try {
      const [{ pdf }, { ShedStockReportPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/shed-stock-report-pdf'),
      ]);
      const blob = await pdf(
        <ShedStockReportPdf
          companyName={coldStorage?.name ?? 'Cold Storage'}
          dateRangeLabel={getDateRangeLabel()}
          grading={{
            title: 'Grading summary',
            subtitle:
              'Bags graded in the selected period, by variety and size.',
            stockSummary: gradingSummary,
            sizes: gradingSizes,
          }}
          storage={{
            title: 'Storage',
            subtitle:
              'Bags moved to storage in the selected period, by variety and size.',
            stockSummary: storageSummary,
            sizes: storageSizes,
          }}
          dispatch={{
            title: 'Dispatch',
            subtitle:
              'Bags dispatched in the selected period, by variety and size.',
            stockSummary: dispatchSummary,
            sizes: dispatchSizes,
          }}
          shed={
            shedStock != null
              ? {
                  varieties: shedStock.varieties,
                  sizes: shedSizes,
                  totals: shedStock.totals,
                }
              : null
          }
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('PDF opened in new tab', {
        description: 'Shed stock report is ready to view or print.',
      });
    } catch {
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isPending && !data) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <Skeleton className="font-custom h-8 w-56 rounded-lg" />
          <Skeleton className="h-12 w-full max-w-xl rounded-md" />
          <Skeleton className="h-48 w-full rounded-md" />
          <Skeleton className="h-48 w-full rounded-md" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <h2 className="font-custom text-2xl font-semibold text-[#333]">
            Shed stock report
          </h2>
          <Card className="font-custom border-border rounded-xl shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <p className="font-custom text-destructive">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load shed stock report.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
      <div
        ref={reportContentRef}
        className="space-y-6"
        tabIndex={-1}
        aria-label="Shed stock report content"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-custom text-2xl font-semibold text-[#333]">
            Shed stock report
          </h2>
          {isFetching && data != null && (
            <span className="font-custom text-muted-foreground text-sm sm:text-right">
              Updating…
            </span>
          )}
        </div>

        <Card className="font-custom border-border rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <DatePicker
              id="shed-stock-report-from"
              label="From"
              value={fromDate}
              onChange={setFromDate}
            />
            <DatePicker
              id="shed-stock-report-to"
              label="To"
              value={toDate}
              onChange={setToDate}
            />
            <Button
              variant="default"
              size="sm"
              className="font-custom focus-visible:ring-primary h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={handleApplyDates}
              disabled={!fromDate && !toDate}
            >
              Apply
            </Button>
            {(fromDate ||
              toDate ||
              appliedRange.dateFrom ||
              appliedRange.dateTo) && (
              <Button
                variant="outline"
                size="sm"
                className="font-custom focus-visible:ring-primary h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                onClick={handleClearDates}
              >
                Clear
              </Button>
            )}
            <Button
              className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:ml-auto sm:w-auto"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isPending}
              aria-label={
                isGeneratingPdf
                  ? 'Generating PDF…'
                  : isPending
                    ? 'Loading report…'
                    : 'View report'
              }
            >
              <FileDown className="h-4 w-4 shrink-0" />
              {isGeneratingPdf ? 'Generating…' : 'View Report'}
            </Button>
          </CardContent>
        </Card>

        {grading.length === 0 || gradingSizes.length === 0 ? (
          <ReportSectionEmpty
            title="Grading summary"
            message="No grading data for this range."
          />
        ) : (
          <StorageSummaryTable
            tableTitle="Grading summary"
            subtitle="Bags graded in the selected period, by variety and size."
            stockSummary={gradingSummary}
            sizes={gradingSizes}
            controlledTab="current"
          />
        )}

        {storage.length === 0 || storageSizes.length === 0 ? (
          <ReportSectionEmpty
            title="Storage"
            message="No storage data for this range."
          />
        ) : (
          <StorageSummaryTable
            tableTitle="Storage"
            subtitle="Bags moved to storage in the selected period, by variety and size."
            stockSummary={storageSummary}
            sizes={storageSizes}
            controlledTab="current"
          />
        )}

        {dispatch.length === 0 || dispatchSizes.length === 0 ? (
          <ReportSectionEmpty
            title="Dispatch"
            message="No dispatch data for this range."
          />
        ) : (
          <StorageSummaryTable
            tableTitle="Dispatch"
            subtitle="Bags dispatched in the selected period, by variety and size."
            stockSummary={dispatchSummary}
            sizes={dispatchSizes}
            controlledTab="current"
          />
        )}

        {shedStock != null && (
          <ShedStockMetricsTable
            varieties={shedStock.varieties}
            sizes={shedSizes}
            totals={shedStock.totals}
          />
        )}
      </div>
    </main>
  );
};

export default ShedStockReportTable;
