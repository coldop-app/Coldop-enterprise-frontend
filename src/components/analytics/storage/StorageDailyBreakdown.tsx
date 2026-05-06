import { useMemo, useState } from 'react';
import { Calendar, RefreshCw, TrendingUp } from 'lucide-react';
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
  useGetStorageDailyBreakdown,
  type GetStorageDailyBreakdownParams,
} from '@/services/store-admin/storage-gate-pass/analytics/useGetStorageDailyBreakdown';
import type { GetStorageSummaryParams } from '@/services/store-admin/storage-gate-pass/analytics/useGetStorageSummary';
import type {
  MonthlyTrendChartItem,
  StorageTrendData,
} from '@/types/analytics';

interface StorageDailyBreakdownProps {
  dateParams: GetStorageSummaryParams;
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

const StorageDailyBreakdown = ({ dateParams }: StorageDailyBreakdownProps) => {
  const [tab, setTab] = useState<TrendTab>('daily');
  const queryParams: GetStorageDailyBreakdownParams =
    dateParams.dateFrom && dateParams.dateTo
      ? { dateFrom: dateParams.dateFrom, dateTo: dateParams.dateTo }
      : {};

  const storageDailyBreakdownQuery = useGetStorageDailyBreakdown(queryParams);
  const trendData = (storageDailyBreakdownQuery.data ??
    {}) as Partial<StorageTrendData>;
  const dailySeries = trendData.daily?.chartData ?? [];
  const monthlySeries = trendData.monthly?.chartData ?? [];

  const dailyVarieties = useMemo(
    () => dailySeries.map((series) => series.variety),
    [dailySeries]
  );

  const dailyRows = useMemo(() => {
    const allDates = new Set<string>();
    for (const series of dailySeries) {
      for (const point of series.dataPoints) allDates.add(point.date);
    }

    const sortedDates = [...allDates].sort();
    return sortedDates.map((date) => {
      const perVariety: Record<string, number> = {};
      let total = 0;
      for (const series of dailySeries) {
        const match = series.dataPoints.find((point) => point.date === date);
        const bags = Number(match?.bags ?? 0);
        perVariety[series.variety] = bags;
        total += bags;
      }

      return {
        date,
        perVariety,
        total,
      };
    });
  }, [dailySeries]);

  const monthlyVarieties = useMemo(
    () => monthlySeries.map((series) => series.variety),
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
      const perVariety: Record<string, number> = {};
      let total = 0;
      for (const series of monthlySeries) {
        const match = series.dataPoints.find((point) => point.month === month);
        const bags = Number(match?.bags ?? 0);
        perVariety[series.variety] = bags;
        total += bags;
      }

      return {
        month,
        monthLabel,
        perVariety,
        total,
      };
    });
  }, [monthlySeries]);

  const dailyTotals = useMemo(() => {
    const perVariety: Record<string, number> = {};
    for (const variety of dailyVarieties) {
      perVariety[variety] = dailyRows.reduce(
        (sum, row) => sum + Number(row.perVariety[variety] ?? 0),
        0
      );
    }
    const grandTotal = dailyRows.reduce((sum, row) => sum + row.total, 0);
    return { perVariety, grandTotal };
  }, [dailyRows, dailyVarieties]);

  const monthlyTotals = useMemo(() => {
    const perVariety: Record<string, number> = {};
    for (const variety of monthlyVarieties) {
      perVariety[variety] = monthlyRows.reduce(
        (sum, row) => sum + Number(row.perVariety[variety] ?? 0),
        0
      );
    }
    const grandTotal = monthlyRows.reduce((sum, row) => sum + row.total, 0);
    return { perVariety, grandTotal };
  }, [monthlyRows, monthlyVarieties]);

  if (
    storageDailyBreakdownQuery.isLoading ||
    storageDailyBreakdownQuery.isFetching
  ) {
    return (
      <Card className="font-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <TrendingUp className="text-primary h-5 w-5" />
            Storage Daily Breakdown
          </CardTitle>
          <CardDescription>
            Bags in storage over time (daily and monthly)
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

  if (storageDailyBreakdownQuery.isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load storage daily breakdown
          </CardTitle>
          <CardDescription>
            {storageDailyBreakdownQuery.error instanceof Error
              ? storageDailyBreakdownQuery.error.message
              : 'Something went wrong.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => storageDailyBreakdownQuery.refetch()}
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
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <TrendingUp className="text-primary h-5 w-5 shrink-0" />
          Storage Daily Breakdown
        </CardTitle>
        <CardDescription>
          Bags in storage over time (daily and monthly)
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
                        {dailyVarieties.map((variety) => (
                          <TableHead
                            key={variety}
                            className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap"
                          >
                            {variety}
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
                          {dailyVarieties.map((variety) => (
                            <TableCell
                              key={`${row.date}-${variety}`}
                              className="font-custom border-border border px-4 py-2 text-right tabular-nums"
                            >
                              {formatNumber(
                                Number(row.perVariety[variety] ?? 0)
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
                        {dailyVarieties.map((variety) => (
                          <TableCell
                            key={`daily-total-${variety}`}
                            className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums"
                          >
                            {formatNumber(dailyTotals.perVariety[variety] ?? 0)}
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
                        {monthlyVarieties.map((variety) => (
                          <TableHead
                            key={variety}
                            className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap"
                          >
                            {variety}
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
                          {monthlyVarieties.map((variety) => (
                            <TableCell
                              key={`${row.month}-${variety}`}
                              className="font-custom border-border border px-4 py-2 text-right tabular-nums"
                            >
                              {formatNumber(
                                Number(row.perVariety[variety] ?? 0)
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
                        {monthlyVarieties.map((variety) => (
                          <TableCell
                            key={`monthly-total-${variety}`}
                            className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums"
                          >
                            {formatNumber(
                              monthlyTotals.perVariety[variety] ?? 0
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

export default StorageDailyBreakdown;
