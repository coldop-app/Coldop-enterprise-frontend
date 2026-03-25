import { memo, useMemo, useState } from 'react';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { RefreshCw, TrendingUp, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { useGetIncomingTrendAnalysis } from '@/services/store-admin/analytics/incoming/useGetIncomingTrendAnalysis';
import type { GetDailyMonthlyTrendParams } from '@/services/store-admin/analytics/incoming/useGetIncomingTrendAnalysis';
import { formatDisplayDate } from '@/lib/helpers';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

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
  const [tab, setTab] = useState<TrendTab>('daily');
  const [showDailyChart, setShowDailyChart] = useState(false);
  const [showMonthlyChart, setShowMonthlyChart] = useState(false);
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
                  <div className="border-border bg-muted/30 overflow-x-auto overflow-y-auto rounded-lg border sm:max-h-[280px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-custom text-muted-foreground h-10 font-medium whitespace-nowrap">
                            Date
                          </TableHead>
                          {dailyLocations.map((loc) => (
                            <TableHead
                              key={loc}
                              className="font-custom text-muted-foreground h-10 text-right font-medium whitespace-nowrap"
                            >
                              {loc}
                            </TableHead>
                          ))}
                          <TableHead className="font-custom text-muted-foreground h-10 text-right font-medium whitespace-nowrap">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyTableData.map((row) => (
                          <TableRow
                            key={row.date}
                            className="hover:bg-muted/50 transition-colors duration-150"
                          >
                            <TableCell className="font-custom text-foreground font-medium whitespace-nowrap">
                              {formatDisplayDate(row.date)}
                            </TableCell>
                            {dailyLocations.map((loc) => (
                              <TableCell
                                key={loc}
                                className="font-custom text-foreground text-right font-medium tabular-nums"
                              >
                                {formatNumber(Number(row[loc] ?? 0))}
                              </TableCell>
                            ))}
                            <TableCell className="font-custom text-foreground text-right font-semibold tabular-nums">
                              {formatNumber(row.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
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
                  <div className="border-border bg-muted/30 overflow-x-auto overflow-y-auto rounded-lg border sm:max-h-[280px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-custom text-muted-foreground h-10 font-medium whitespace-nowrap">
                            Month
                          </TableHead>
                          {monthlyLocations.map((loc) => (
                            <TableHead
                              key={loc}
                              className="font-custom text-muted-foreground h-10 text-right font-medium whitespace-nowrap"
                            >
                              {loc}
                            </TableHead>
                          ))}
                          <TableHead className="font-custom text-muted-foreground h-10 text-right font-medium whitespace-nowrap">
                            Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyTableData.map((row) => (
                          <TableRow
                            key={row.month}
                            className="hover:bg-muted/50 transition-colors duration-150"
                          >
                            <TableCell className="font-custom text-foreground font-medium whitespace-nowrap">
                              {row.monthLabel}
                            </TableCell>
                            {monthlyLocations.map((loc) => (
                              <TableCell
                                key={loc}
                                className="font-custom text-foreground text-right font-medium tabular-nums"
                              >
                                {formatNumber(Number(row[loc] ?? 0))}
                              </TableCell>
                            ))}
                            <TableCell className="font-custom text-foreground text-right font-semibold tabular-nums">
                              {formatNumber(row.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
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
