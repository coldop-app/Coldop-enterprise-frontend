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
import { useGetGradingTrendAnalysis } from '@/services/store-admin/grading-gate-pass/useGetGradingTrendAnalysis';
import type { GetGradingTrendParams } from '@/services/store-admin/grading-gate-pass/useGetGradingTrendAnalysis';
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

export interface GradingTrendAnalysisChartProps {
  dateParams: GetGradingTrendParams;
}

type TrendTab = 'daily' | 'monthly';

const GradingTrendAnalysisChart = memo(function GradingTrendAnalysisChart({
  dateParams,
}: GradingTrendAnalysisChartProps) {
  const [tab, setTab] = useState<TrendTab>('daily');
  const { data, isLoading, isError, error, refetch } =
    useGetGradingTrendAnalysis(dateParams);

  const dailyData = useMemo(() => {
    const raw = data?.daily.chartData ?? [];
    return raw.map((row) => ({
      ...row,
      displayLabel: formatDisplayDate(row.date),
    }));
  }, [data?.daily.chartData]);

  const monthlyData = useMemo(() => {
    const raw = data?.monthly.chartData ?? [];
    return raw.map((row) => ({
      ...row,
      displayLabel: row.monthLabel,
    }));
  }, [data?.monthly.chartData]);

  const chartConfig = useMemo<ChartConfig>(
    () => ({
      bags: { label: 'Bags', color: 'var(--chart-1)' },
    }),
    []
  );

  if (isLoading) {
    return (
      <Card className="font-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <TrendingUp className="text-primary h-5 w-5" />
            Grading Trend Analysis
          </CardTitle>
          <CardDescription>
            Bags graded over time (select daily or monthly)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-4 h-10 w-48" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load grading trend analysis
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
          Grading Trend Analysis
        </CardTitle>
        <CardDescription>
          Bags graded over time (select daily or monthly)
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
            {dailyData.length === 0 ? (
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
                  <div className="border-border bg-muted/30 overflow-hidden rounded-lg border">
                    <div className="max-h-[240px] overflow-y-auto sm:max-h-[280px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-custom text-muted-foreground h-10 font-medium">
                              Date
                            </TableHead>
                            <TableHead className="font-custom text-muted-foreground h-10 text-right font-medium">
                              Bags graded
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyData.map((row) => (
                            <TableRow
                              key={row.date}
                              className="hover:bg-muted/50 transition-colors duration-150"
                            >
                              <TableCell className="font-custom text-foreground font-medium">
                                {row.displayLabel}
                              </TableCell>
                              <TableCell className="font-custom text-foreground text-right font-medium tabular-nums">
                                {formatNumber(row.bags)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-foreground mb-3 text-sm font-semibold sm:text-base">
                    Trend
                  </h4>
                  <ChartContainer
                    config={chartConfig}
                    className="min-h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={dailyData}
                        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                            formatNumber(value),
                            'Bags',
                          ]}
                          labelFormatter={(label) => formatDisplayDate(label)}
                          contentStyle={{
                            fontFamily: 'var(--font-sans)',
                            borderRadius: 'var(--radius)',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="bags"
                          stroke="var(--chart-1)"
                          strokeWidth={2}
                          dot={{ fill: 'var(--chart-1)', r: 3 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="monthly" className="mt-0 outline-none">
            {monthlyData.length === 0 ? (
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
                  <div className="border-border bg-muted/30 overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-custom text-muted-foreground h-10 font-medium">
                            Month
                          </TableHead>
                          <TableHead className="font-custom text-muted-foreground h-10 text-right font-medium">
                            Bags graded
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyData.map((row) => (
                          <TableRow
                            key={row.month}
                            className="hover:bg-muted/50 transition-colors duration-150"
                          >
                            <TableCell className="font-custom text-foreground font-medium">
                              {row.monthLabel}
                            </TableCell>
                            <TableCell className="font-custom text-foreground text-right font-medium tabular-nums">
                              {formatNumber(row.bags)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h4 className="text-foreground mb-3 text-sm font-semibold sm:text-base">
                    Trend
                  </h4>
                  <ChartContainer
                    config={chartConfig}
                    className="min-h-[300px] w-full"
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={monthlyData}
                        margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
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
                            formatNumber(value),
                            'Bags',
                          ]}
                          contentStyle={{
                            fontFamily: 'var(--font-sans)',
                            borderRadius: 'var(--radius)',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="bags"
                          stroke="var(--chart-1)"
                          strokeWidth={2}
                          dot={{ fill: 'var(--chart-1)', r: 3 }}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

export default GradingTrendAnalysisChart;
