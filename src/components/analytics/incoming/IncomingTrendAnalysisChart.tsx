import { memo, useCallback, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { RefreshCw, TrendingUp, Calendar, FileDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Link } from '@tanstack/react-router';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { useGetIncomingTrendAnalysis } from '@/services/store-admin/analytics/incoming/useGetIncomingTrendAnalysis';
import type { GetDailyMonthlyTrendParams } from '@/services/store-admin/analytics/incoming/useGetIncomingTrendAnalysis';
import { formatDisplayDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

/** YYYY-MM-DD for daily-breakdown route search */
function toBreakdownDateParam(isoDate: string): string {
  return isoDate.slice(0, 10);
}

const dailyBreakdownLinkBase =
  'font-custom text-inherit no-underline transition-colors duration-200 hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

/** Format date for chart axis: day + short month only (no year), e.g. "3 Feb" */
function formatChartDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export interface IncomingTrendAnalysisChartProps {
  dateParams: GetDailyMonthlyTrendParams;
}

type TrendTab = 'daily' | 'monthly';

const IncomingTrendAnalysisChart = memo(function IncomingTrendAnalysisChart({
  dateParams,
}: IncomingTrendAnalysisChartProps) {
  const coldStorage = useStore((s) => s.coldStorage);
  const [tab, setTab] = useState<TrendTab>('daily');
  const [showDailyChart, setShowDailyChart] = useState(false);
  const [showMonthlyChart, setShowMonthlyChart] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { data, isLoading, isError, error, refetch } =
    useGetIncomingTrendAnalysis(dateParams);

  /** Unique dates across all daily series, sorted */
  const dailyDates = useMemo(() => {
    const set = new Set<string>();
    for (const series of data?.daily.chartData ?? []) {
      for (const pt of series.dataPoints) set.add(pt.date);
    }
    return [...set].sort();
  }, [data?.daily.chartData]);

  /** Chart-ready daily data: one row per date with a key per location (bags) */
  const dailyChartData = useMemo(() => {
    const series = data?.daily.chartData ?? [];
    const locations = series.map((s) => s.location);
    const byDate = new Map<string, Record<string, string | number>>();
    for (const date of dailyDates) {
      const row: Record<string, string | number> = {
        date,
        displayLabel: formatChartDate(date),
      };
      for (const loc of locations) row[loc] = 0;
      byDate.set(date, row);
    }
    for (const { location, dataPoints } of series) {
      for (const pt of dataPoints) {
        const row = byDate.get(pt.date);
        if (row) row[location] = pt.bags;
      }
    }
    return dailyDates.map((d) => byDate.get(d)!);
  }, [data?.daily.chartData, dailyDates]);

  /** Unique months across all monthly series, sorted */
  const monthlyMonths = useMemo(() => {
    const set = new Set<string>();
    for (const series of data?.monthly.chartData ?? []) {
      for (const pt of series.dataPoints) set.add(pt.month);
    }
    return [...set].sort();
  }, [data?.monthly.chartData]);

  /** Chart-ready monthly data: one row per month with a key per location (bags) */
  const monthlyChartData = useMemo(() => {
    const series = data?.monthly.chartData ?? [];
    const locations = series.map((s) => s.location);
    const byMonth = new Map<string, Record<string, string | number>>();
    for (const month of monthlyMonths) {
      const first = series
        .flatMap((s) => s.dataPoints)
        .find((p) => p.month === month);
      const row: Record<string, string | number> = {
        month,
        monthLabel: first?.monthLabel ?? month,
      };
      for (const loc of locations) row[loc] = 0;
      byMonth.set(month, row);
    }
    for (const { location, dataPoints } of series) {
      for (const pt of dataPoints) {
        const row = byMonth.get(pt.month);
        if (row) row[location] = pt.bags;
      }
    }
    return monthlyMonths.map((m) => byMonth.get(m)!);
  }, [data?.monthly.chartData, monthlyMonths]);

  const dailyLocations = useMemo(
    () => (data?.daily.chartData ?? []).map((s) => s.location),
    [data?.daily.chartData]
  );
  const monthlyLocations = useMemo(
    () => (data?.monthly.chartData ?? []).map((s) => s.location),
    [data?.monthly.chartData]
  );

  /** Daily table: one row per date, cols = Date | Location1 | Location2 | ... | Total */
  const dailyTableData = useMemo(() => {
    return dailyChartData.map((row) => {
      let total = 0;
      for (const loc of dailyLocations) {
        total += Number(row[loc] ?? 0);
      }
      return { ...row, total } as Record<string, string | number> & {
        date: string;
        total: number;
      };
    });
  }, [dailyChartData, dailyLocations]);

  /** Monthly table: one row per month, cols = Month | Location1 | Location2 | ... | Total */
  const monthlyTableData = useMemo(() => {
    return monthlyChartData.map((row) => {
      let total = 0;
      for (const loc of monthlyLocations) {
        total += Number(row[loc] ?? 0);
      }
      return { ...row, total } as Record<string, string | number> & {
        month: string;
        monthLabel: string;
        total: number;
      };
    });
  }, [monthlyChartData, monthlyLocations]);

  const dailyChartConfig: ChartConfig = (() => {
    const config: ChartConfig = {
      date: { label: 'Date' },
      displayLabel: { label: 'Date' },
    };
    dailyLocations.forEach((loc, i) => {
      config[loc] = {
        label: loc,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  })();

  const monthlyChartConfig: ChartConfig = (() => {
    const config: ChartConfig = {
      month: { label: 'Month' },
      monthLabel: { label: 'Month' },
    };
    monthlyLocations.forEach((loc, i) => {
      config[loc] = {
        label: loc,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  })();

  const dailyTotals = useMemo(() => {
    const perLocation: Record<string, number> = {};
    dailyLocations.forEach((loc) => {
      perLocation[loc] = dailyTableData.reduce(
        (sum, row) => sum + Number(row[loc] ?? 0),
        0
      );
    });
    const grandTotal = dailyTableData.reduce((sum, row) => sum + row.total, 0);
    return { perLocation, grandTotal };
  }, [dailyLocations, dailyTableData]);

  const monthlyTotals = useMemo(() => {
    const perLocation: Record<string, number> = {};
    monthlyLocations.forEach((loc) => {
      perLocation[loc] = monthlyTableData.reduce(
        (sum, row) => sum + Number(row[loc] ?? 0),
        0
      );
    });
    const grandTotal = monthlyTableData.reduce(
      (sum, row) => sum + row.total,
      0
    );
    return { perLocation, grandTotal };
  }, [monthlyLocations, monthlyTableData]);

  const getDateRangeLabel = useCallback(() => {
    if (dateParams.dateFrom && dateParams.dateTo) {
      return `${dateParams.dateFrom} to ${dateParams.dateTo}`;
    }
    if (dateParams.dateFrom) return `From ${dateParams.dateFrom}`;
    if (dateParams.dateTo) return `To ${dateParams.dateTo}`;
    return 'All dates';
  }, [dateParams.dateFrom, dateParams.dateTo]);

  const canExportPdf =
    tab === 'daily'
      ? dailyTableData.length > 0 && dailyLocations.length > 0
      : monthlyTableData.length > 0 && monthlyLocations.length > 0;

  const handleDownloadPdf = useCallback(async () => {
    if (!canExportPdf) {
      toast.error('Nothing to export', {
        description: 'There is no table data for the current view.',
      });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingPdf(true);
    try {
      const [{ pdf }, { IncomingStockTrendTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/incoming-stock-trend-table-pdf'),
      ]);
      const companyName = coldStorage?.name ?? 'Cold Storage';
      const dateRangeLabel = getDateRangeLabel();
      if (tab === 'daily') {
        const rows = dailyTableData.map((row) => ({
          periodLabel: formatDisplayDate(row.date),
          bags: dailyLocations.map((loc) => Number(row[loc] ?? 0)),
          total: row.total,
        }));
        const footerBags = dailyLocations.map(
          (loc) => dailyTotals.perLocation[loc] ?? 0
        );
        const blob = await pdf(
          <IncomingStockTrendTablePdf
            companyName={companyName}
            dateRangeLabel={dateRangeLabel}
            granularity="daily"
            locations={dailyLocations}
            rows={rows}
            footer={{ bags: footerBags, total: dailyTotals.grandTotal }}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        if (printWindow) {
          printWindow.location.href = url;
        } else {
          window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const rows = monthlyTableData.map((row) => ({
          periodLabel: row.monthLabel,
          bags: monthlyLocations.map((loc) => Number(row[loc] ?? 0)),
          total: row.total,
        }));
        const footerBags = monthlyLocations.map(
          (loc) => monthlyTotals.perLocation[loc] ?? 0
        );
        const blob = await pdf(
          <IncomingStockTrendTablePdf
            companyName={companyName}
            dateRangeLabel={dateRangeLabel}
            granularity="monthly"
            locations={monthlyLocations}
            rows={rows}
            footer={{ bags: footerBags, total: monthlyTotals.grandTotal }}
          />
        ).toBlob();
        const url = URL.createObjectURL(blob);
        if (printWindow) {
          printWindow.location.href = url;
        } else {
          window.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
      toast.success('PDF opened in new tab', {
        description: 'Stock trend table is ready to view or print.',
      });
    } catch {
      printWindow?.close();
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    canExportPdf,
    coldStorage?.name,
    dailyLocations,
    dailyTableData,
    dailyTotals.grandTotal,
    dailyTotals.perLocation,
    getDateRangeLabel,
    monthlyLocations,
    monthlyTableData,
    monthlyTotals.grandTotal,
    monthlyTotals.perLocation,
    tab,
  ]);

  if (isLoading) {
    return (
      <Card className="font-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <TrendingUp className="text-primary h-5 w-5" />
            Stock Trend Analysis
          </CardTitle>
          <CardDescription>
            Bags received over time (select daily or monthly)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-4 h-10 w-48" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load trend analysis
          </CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'Something went wrong.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="default"
            onClick={() => refetch()}
            className="font-custom gap-2"
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
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
              <TrendingUp className="text-primary h-5 w-5 shrink-0" />
              Stock Trend Analysis
            </CardTitle>
            <CardDescription>
              Bags received over time (select daily or monthly)
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canExportPdf || isGeneratingPdf}
            onClick={handleDownloadPdf}
            className="font-custom focus-visible:ring-primary h-8 shrink-0 gap-2 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label="Download stock trend table as PDF"
          >
            <FileDown
              className={`h-4 w-4 shrink-0 ${isGeneratingPdf ? 'animate-pulse' : ''}`}
            />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TrendTab)}
          className="font-custom w-full"
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
            {dailyTableData.length === 0 ? (
              <p className="font-custom text-muted-foreground text-sm">
                No daily data for the selected date range.
              </p>
            ) : (
              <div className="font-custom space-y-6">
                <div className="min-w-0">
                  <h4 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold sm:text-base">
                    <Calendar className="text-primary h-4 w-4" />
                    Daily activity
                  </h4>
                  <div className="border-border overflow-x-auto overflow-y-auto rounded-lg border sm:max-h-[280px]">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="border-border bg-muted hover:bg-muted">
                          <TableHead className="font-custom border-border border px-4 py-2 font-bold whitespace-nowrap">
                            Date
                          </TableHead>
                          {dailyLocations.map((loc) => (
                            <TableHead
                              key={loc}
                              className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap"
                            >
                              {loc}
                            </TableHead>
                          ))}
                          <TableHead className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyTableData.map((row) => {
                          const breakdownDate = toBreakdownDateParam(row.date);
                          return (
                            <TableRow
                              key={row.date}
                              className="border-border hover:bg-transparent"
                            >
                              <TableCell className="border-border border p-0 font-medium whitespace-nowrap">
                                <Link
                                  to="/store-admin/analytics/incoming-daily-breakdown"
                                  search={{ date: breakdownDate }}
                                  className={cn(
                                    dailyBreakdownLinkBase,
                                    'block px-4 py-2 font-medium whitespace-nowrap'
                                  )}
                                >
                                  {formatDisplayDate(row.date)}
                                </Link>
                              </TableCell>
                              {dailyLocations.map((loc) => (
                                <TableCell
                                  key={loc}
                                  className="border-border border p-0 text-right font-medium tabular-nums"
                                >
                                  <Link
                                    to="/store-admin/analytics/incoming-daily-breakdown"
                                    search={{ date: breakdownDate }}
                                    className={cn(
                                      dailyBreakdownLinkBase,
                                      'block px-4 py-2 text-right font-medium tabular-nums'
                                    )}
                                  >
                                    {formatNumber(Number(row[loc] ?? 0))}
                                  </Link>
                                </TableCell>
                              ))}
                              <TableCell className="font-custom text-primary border-border bg-primary/10 border px-4 py-2 text-right font-bold tabular-nums">
                                {formatNumber(row.total)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                            Bag Total
                          </TableHead>
                          {dailyLocations.map((loc) => (
                            <TableCell
                              key={loc}
                              className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums"
                            >
                              {formatNumber(dailyTotals.perLocation[loc] ?? 0)}
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

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-foreground text-sm font-semibold sm:text-base">
                      Trend
                    </h4>
                    <Toggle
                      pressed={showDailyChart}
                      onPressedChange={setShowDailyChart}
                      variant="outline"
                      className="font-custom h-8 rounded-lg px-3 text-xs sm:text-sm"
                      aria-label="Toggle daily trend chart"
                    >
                      {showDailyChart ? 'Hide chart' : 'Show chart'}
                    </Toggle>
                  </div>

                  {showDailyChart && (
                    <ChartContainer
                      config={dailyChartConfig}
                      className="min-h-[300px] w-full"
                    >
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={dailyChartData}
                          margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => formatChartDate(value)}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={formatNumber}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              formatNumber(Number(value)),
                              'Bags',
                            ]}
                            labelFormatter={(label) => formatDisplayDate(label)}
                            contentStyle={{
                              fontFamily: 'var(--font-sans)',
                              borderRadius: 'var(--radius)',
                            }}
                          />
                          {dailyLocations.map((loc, i) => (
                            <Line
                              key={loc}
                              type="monotone"
                              dataKey={loc}
                              name={loc}
                              stroke={CHART_COLORS[i % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{
                                fill: CHART_COLORS[i % CHART_COLORS.length],
                                r: 3,
                              }}
                              activeDot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="monthly" className="mt-0 outline-none">
            {monthlyTableData.length === 0 ? (
              <p className="font-custom text-muted-foreground text-sm">
                No monthly data for the selected date range.
              </p>
            ) : (
              <div className="font-custom space-y-6">
                <div className="min-w-0">
                  <h4 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold sm:text-base">
                    <Calendar className="text-primary h-4 w-4" />
                    Monthly activity
                  </h4>
                  <div className="border-border overflow-x-auto overflow-y-auto rounded-lg border sm:max-h-[280px]">
                    <Table className="border-collapse">
                      <TableHeader>
                        <TableRow className="border-border bg-muted hover:bg-muted">
                          <TableHead className="font-custom border-border border px-4 py-2 font-bold whitespace-nowrap">
                            Month
                          </TableHead>
                          {monthlyLocations.map((loc) => (
                            <TableHead
                              key={loc}
                              className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap"
                            >
                              {loc}
                            </TableHead>
                          ))}
                          <TableHead className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyTableData.map((row) => (
                          <TableRow
                            key={row.month}
                            className="border-border hover:bg-transparent"
                          >
                            <TableCell className="font-custom border-border border px-4 py-2 font-medium whitespace-nowrap">
                              {row.monthLabel}
                            </TableCell>
                            {monthlyLocations.map((loc) => (
                              <TableCell
                                key={loc}
                                className="font-custom border-border border px-4 py-2 text-right font-medium tabular-nums"
                              >
                                {formatNumber(Number(row[loc] ?? 0))}
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
                          {monthlyLocations.map((loc) => (
                            <TableCell
                              key={loc}
                              className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums"
                            >
                              {formatNumber(
                                monthlyTotals.perLocation[loc] ?? 0
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

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-foreground text-sm font-semibold sm:text-base">
                      Trend
                    </h4>
                    <Toggle
                      pressed={showMonthlyChart}
                      onPressedChange={setShowMonthlyChart}
                      variant="outline"
                      className="font-custom h-8 rounded-lg px-3 text-xs sm:text-sm"
                      aria-label="Toggle monthly trend chart"
                    >
                      {showMonthlyChart ? 'Hide chart' : 'Show chart'}
                    </Toggle>
                  </div>

                  {showMonthlyChart && (
                    <ChartContainer
                      config={monthlyChartConfig}
                      className="min-h-[300px] w-full"
                    >
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={monthlyChartData}
                          margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="monthLabel"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={formatNumber}
                          />
                          <Tooltip
                            formatter={(value: number) => [
                              formatNumber(Number(value)),
                              'Bags',
                            ]}
                            contentStyle={{
                              fontFamily: 'var(--font-sans)',
                              borderRadius: 'var(--radius)',
                            }}
                          />
                          {monthlyLocations.map((loc, i) => (
                            <Line
                              key={loc}
                              type="monotone"
                              dataKey={loc}
                              name={loc}
                              stroke={CHART_COLORS[i % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{
                                fill: CHART_COLORS[i % CHART_COLORS.length],
                                r: 3,
                              }}
                              activeDot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

export default IncomingTrendAnalysisChart;
