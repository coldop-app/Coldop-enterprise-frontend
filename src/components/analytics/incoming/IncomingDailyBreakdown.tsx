import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, FileText, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useGetIncomingDailyBreakdown,
  type GetIncomingDailyBreakdownParams,
} from '@/services/store-admin/incoming-gate-pass/analytics/useGetIncomingDailyBreakdown';
import type { GetVarietyDistributionParams } from '@/services/store-admin/incoming-gate-pass/analytics/useGetIncomingVarietyBreakdown';
import { useStore } from '@/stores/store';
import type {
  DailyMonthlyTrendData,
  MonthlyTrendChartItem,
} from '@/types/analytics';

interface IncomingDailyBreakdownProps {
  dateParams: GetVarietyDistributionParams;
}

type TrendTab = 'daily' | 'monthly';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const IncomingDailyBreakdown = ({
  dateParams,
}: IncomingDailyBreakdownProps) => {
  const [tab, setTab] = useState<TrendTab>('daily');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const queryParams: GetIncomingDailyBreakdownParams =
    dateParams.dateFrom && dateParams.dateTo
      ? { dateFrom: dateParams.dateFrom, dateTo: dateParams.dateTo }
      : {};
  const dailyBreakdownQuery = useGetIncomingDailyBreakdown(queryParams);

  const trendData = (dailyBreakdownQuery.data ??
    {}) as Partial<DailyMonthlyTrendData>;
  const dailySeries = trendData.daily?.chartData ?? [];
  const monthlySeries = trendData.monthly?.chartData ?? [];

  const dailyLocations = useMemo(
    () => dailySeries.map((series) => series.location),
    [dailySeries]
  );

  const dailyRows = useMemo(() => {
    const allDates = new Set<string>();
    for (const series of dailySeries) {
      for (const point of series.dataPoints) allDates.add(point.date);
    }

    const sortedDates = [...allDates].sort();
    return sortedDates.map((date) => {
      const perLocation: Record<string, number> = {};
      let total = 0;
      for (const series of dailySeries) {
        const match = series.dataPoints.find((point) => point.date === date);
        const bags = Number(match?.bags ?? 0);
        perLocation[series.location] = bags;
        total += bags;
      }

      return {
        date,
        perLocation,
        total,
      };
    });
  }, [dailySeries]);

  const monthlyLocations = useMemo(
    () => monthlySeries.map((series) => series.location),
    [monthlySeries]
  );

  const monthlyRows = useMemo(() => {
    const monthMap = new Map<string, MonthlyTrendChartItem>();
    for (const series of monthlySeries) {
      for (const point of series.dataPoints) {
        if (!monthMap.has(point.month)) monthMap.set(point.month, point);
      }
    }

    const sortedMonths = [...monthMap.keys()].sort();
    return sortedMonths.map((month) => {
      const monthLabel = monthMap.get(month)?.monthLabel ?? month;
      const perLocation: Record<string, number> = {};
      let total = 0;
      for (const series of monthlySeries) {
        const match = series.dataPoints.find((point) => point.month === month);
        const bags = Number(match?.bags ?? 0);
        perLocation[series.location] = bags;
        total += bags;
      }

      return {
        month,
        monthLabel,
        perLocation,
        total,
      };
    });
  }, [monthlySeries]);

  const dailyTotals = useMemo(() => {
    const perLocation: Record<string, number> = {};
    for (const location of dailyLocations) {
      perLocation[location] = dailyRows.reduce(
        (sum, row) => sum + Number(row.perLocation[location] ?? 0),
        0
      );
    }
    const grandTotal = dailyRows.reduce((sum, row) => sum + row.total, 0);
    return { perLocation, grandTotal };
  }, [dailyLocations, dailyRows]);

  const monthlyTotals = useMemo(() => {
    const perLocation: Record<string, number> = {};
    for (const location of monthlyLocations) {
      perLocation[location] = monthlyRows.reduce(
        (sum, row) => sum + Number(row.perLocation[location] ?? 0),
        0
      );
    }
    const grandTotal = monthlyRows.reduce((sum, row) => sum + row.total, 0);
    return { perLocation, grandTotal };
  }, [monthlyLocations, monthlyRows]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleShowPdf = async () => {
    if (isGeneratingPdf) return;

    const previewTab = window.open('', '_blank');
    if (!previewTab) {
      window.alert(
        'Popup blocked by your browser. Please allow popups and try again.'
      );
      return;
    }

    previewTab.opener = null;
    previewTab.document.write(
      '<!doctype html><html><head><meta charset="utf-8" /><title>Generating PDF...</title></head><body style="font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#f8fafc">Generating PDF...</body></html>'
    );
    previewTab.document.close();

    setIsGeneratingPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedAt = new Date().toLocaleString('en-IN');
      const normalizedTrendData: DailyMonthlyTrendData = {
        daily: { chartData: dailySeries },
        monthly: { chartData: monthlySeries },
      };
      const dateRangeLabel =
        dateParams.dateFrom && dateParams.dateTo
          ? `${formatDateLabel(dateParams.dateFrom)} - ${formatDateLabel(dateParams.dateTo)}`
          : undefined;

      const [{ pdf }, ReactModule, { default: IncomingDailyBreakdownPdf }] =
        await Promise.all([
          import('@react-pdf/renderer'),
          import('react'),
          import('./pdfs/incoming-daily-breakdown-pdf'),
        ]);

      const document = ReactModule.createElement(IncomingDailyBreakdownPdf, {
        generatedAt,
        coldStorageName,
        trendData: normalizedTrendData,
        dateRangeLabel,
      });

      const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
      const nextUrl = URL.createObjectURL(blob);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = nextUrl;

      if (!previewTab.closed) {
        previewTab.location.replace(nextUrl);
      } else {
        window.open(nextUrl, '_blank');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      window.alert(`Failed to generate PDF: ${message}`);
      if (!previewTab.closed) {
        previewTab.close();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (dailyBreakdownQuery.isLoading || dailyBreakdownQuery.isFetching) {
    return (
      <Card className="font-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <TrendingUp className="text-primary h-5 w-5" />
            Incoming Daily Breakdown
          </CardTitle>
          <CardDescription>
            Bags received over time (daily and monthly)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (dailyBreakdownQuery.isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load incoming daily breakdown
          </CardTitle>
          <CardDescription>
            {dailyBreakdownQuery.error instanceof Error
              ? dailyBreakdownQuery.error.message
              : 'Something went wrong.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => dailyBreakdownQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="font-custom transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <TrendingUp className="text-primary h-5 w-5 shrink-0" />
            Incoming Daily Breakdown
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleShowPdf}
            aria-label="Show pdf"
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>
          Bags received over time (daily and monthly)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as TrendTab)}
          className="w-full"
        >
          <TabsList className="mb-4 grid w-full max-w-[240px] grid-cols-2">
            <TabsTrigger value="daily" className="font-custom">
              Daily
            </TabsTrigger>
            <TabsTrigger value="monthly" className="font-custom">
              Monthly
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-0 outline-none">
            {dailyRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No daily data for the selected date range.
              </p>
            ) : (
              <div className="space-y-3">
                <h4 className="text-foreground mb-1 flex items-center gap-2 text-sm font-semibold sm:text-base">
                  <Calendar className="text-primary h-4 w-4" />
                  Daily activity
                </h4>
                <div className="border-border overflow-x-auto overflow-y-auto rounded-lg border sm:max-h-[320px]">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="border-border bg-muted hover:bg-muted">
                        <TableHead className="font-custom border-border border px-4 py-2 font-bold whitespace-nowrap">
                          Date
                        </TableHead>
                        {dailyLocations.map((location) => (
                          <TableHead
                            key={location}
                            className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap"
                          >
                            {location}
                          </TableHead>
                        ))}
                        <TableHead className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyRows.map((row) => (
                        <TableRow
                          key={row.date}
                          className="border-border hover:bg-transparent"
                        >
                          <TableCell className="font-custom border-border border px-4 py-2 font-medium whitespace-nowrap">
                            {formatDateLabel(row.date)}
                          </TableCell>
                          {dailyLocations.map((location) => (
                            <TableCell
                              key={`${row.date}-${location}`}
                              className="font-custom border-border border px-4 py-2 text-right tabular-nums"
                            >
                              {formatNumber(
                                Number(row.perLocation[location] ?? 0)
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="font-custom text-primary border-border bg-primary/10 border px-4 py-2 text-right font-bold tabular-nums">
                            {formatNumber(row.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                          Bag Total
                        </TableHead>
                        {dailyLocations.map((location) => (
                          <TableCell
                            key={`daily-total-${location}`}
                            className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums"
                          >
                            {formatNumber(
                              dailyTotals.perLocation[location] ?? 0
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 text-right font-bold tabular-nums">
                          {formatNumber(dailyTotals.grandTotal)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="monthly" className="mt-0 outline-none">
            {monthlyRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No monthly data for the selected date range.
              </p>
            ) : (
              <div className="space-y-3">
                <h4 className="text-foreground mb-1 flex items-center gap-2 text-sm font-semibold sm:text-base">
                  <Calendar className="text-primary h-4 w-4" />
                  Monthly activity
                </h4>
                <div className="border-border overflow-x-auto overflow-y-auto rounded-lg border sm:max-h-[320px]">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="border-border bg-muted hover:bg-muted">
                        <TableHead className="font-custom border-border border px-4 py-2 font-bold whitespace-nowrap">
                          Month
                        </TableHead>
                        {monthlyLocations.map((location) => (
                          <TableHead
                            key={location}
                            className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap"
                          >
                            {location}
                          </TableHead>
                        ))}
                        <TableHead className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyRows.map((row) => (
                        <TableRow
                          key={row.month}
                          className="border-border hover:bg-transparent"
                        >
                          <TableCell className="font-custom border-border border px-4 py-2 font-medium whitespace-nowrap">
                            {row.monthLabel}
                          </TableCell>
                          {monthlyLocations.map((location) => (
                            <TableCell
                              key={`${row.month}-${location}`}
                              className="font-custom border-border border px-4 py-2 text-right tabular-nums"
                            >
                              {formatNumber(
                                Number(row.perLocation[location] ?? 0)
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="font-custom text-primary border-border bg-primary/10 border px-4 py-2 text-right font-bold tabular-nums">
                            {formatNumber(row.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                          Bag Total
                        </TableHead>
                        {monthlyLocations.map((location) => (
                          <TableCell
                            key={`monthly-total-${location}`}
                            className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums"
                          >
                            {formatNumber(
                              monthlyTotals.perLocation[location] ?? 0
                            )}
                          </TableCell>
                        ))}
                        <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 text-right font-bold tabular-nums">
                          {formatNumber(monthlyTotals.grandTotal)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default IncomingDailyBreakdown;
