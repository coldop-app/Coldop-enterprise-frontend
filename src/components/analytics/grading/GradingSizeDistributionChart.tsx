import { memo, useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { PieChart as PieChartIcon, RefreshCw } from 'lucide-react';
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  useGetGradingSizeDistribution,
  type GetGradingSizeDistributionParams,
} from '@/services/store-admin/grading-gate-pass/analytics/useGetGradingSizeDistribution';
import type { SizeDistributionSizeItem } from '@/types/analytics';

interface GradingSizeDistributionChartProps {
  dateParams?: GetGradingSizeDistributionParams;
}

type VarietyTab = string;

interface SizeSlice {
  name: string;
  bags: number;
  weightKg: number;
  percentage: number;
  fill: string;
}

interface VarietyChartData {
  variety: string;
  pieData: SizeSlice[];
  chartConfig: ChartConfig;
  totalBags: number;
  totalWeightKg: number;
}

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.627 0.265 303.9)',
  'oklch(0.645 0.246 16.439)',
  'oklch(0.58 0.22 265)',
  'oklch(0.72 0.19 145)',
  'oklch(0.69 0.2 330)',
  'oklch(0.74 0.17 95)',
] as const;

function orderSizeSlices(
  slices: SizeDistributionSizeItem[]
): SizeDistributionSizeItem[] {
  const knownOrder = [
    'Below 30',
    '30–40',
    '35–40',
    '40–45',
    '45–50',
    '50–55',
    'Above 50',
    'Above 55',
    'Cut',
  ];

  const byName = new Map(slices.map((slice) => [slice.name, slice]));
  const ordered: SizeDistributionSizeItem[] = [];

  for (const size of knownOrder) {
    const entry = byName.get(size);
    if (entry) ordered.push(entry);
  }

  const rest = slices
    .filter((slice) => !knownOrder.includes(slice.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...ordered, ...rest];
}

function buildVarietyChartData(
  chartData: { variety: string; sizes: SizeDistributionSizeItem[] }[]
): VarietyChartData[] {
  return chartData.map((item) => {
    const orderedSizes = orderSizeSlices(item.sizes ?? []);
    const totalWeightKg = orderedSizes.reduce(
      (sum, size) => sum + Number(size.weightExcludingBardanaKg ?? 0),
      0
    );
    const totalBags = orderedSizes.reduce(
      (sum, size) => sum + Number(size.value ?? 0),
      0
    );

    const pieData: SizeSlice[] = orderedSizes.map((size, index) => {
      const weightKg = Number(size.weightExcludingBardanaKg ?? 0);
      return {
        name: size.name,
        bags: Number(size.value ?? 0),
        weightKg,
        fill: CHART_COLORS[index % CHART_COLORS.length],
        percentage: totalWeightKg > 0 ? (weightKg / totalWeightKg) * 100 : 0,
      };
    });

    const chartConfig: ChartConfig = {};
    pieData.forEach((slice) => {
      chartConfig[slice.name] = {
        label: slice.name,
        color: slice.fill,
      };
    });

    return {
      variety: item.variety,
      pieData,
      chartConfig,
      totalBags,
      totalWeightKg,
    };
  });
}

const GradingSizeDistributionChart = memo(
  function GradingSizeDistributionChart({
    dateParams,
  }: GradingSizeDistributionChartProps) {
    const queryParams: GetGradingSizeDistributionParams = {
      ...(dateParams?.dateFrom ? { dateFrom: dateParams.dateFrom } : {}),
      ...(dateParams?.dateTo ? { dateTo: dateParams.dateTo } : {}),
    };
    const sizeDistributionQuery = useGetGradingSizeDistribution(queryParams);
    const varietyCharts = useMemo(
      () => buildVarietyChartData(sizeDistributionQuery.data?.chartData ?? []),
      [sizeDistributionQuery.data?.chartData]
    );
    const hasAnyData = varietyCharts.some((item) => item.pieData.length > 0);
    const defaultVarietyTab = varietyCharts[0]?.variety ?? '';
    const [varietyTab, setVarietyTab] = useState<VarietyTab>(defaultVarietyTab);

    useEffect(() => {
      setVarietyTab((currentTab) => {
        if (varietyCharts.some((item) => item.variety === currentTab))
          return currentTab;
        return defaultVarietyTab;
      });
    }, [defaultVarietyTab, varietyCharts]);

    if (sizeDistributionQuery.isLoading || sizeDistributionQuery.isFetching) {
      return (
        <Card className="font-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
              <PieChartIcon className="text-primary h-5 w-5" />
              Size-wise Distribution
            </CardTitle>
            <CardDescription>
              Percentage breakdown by grading size per variety (Excluding
              Bardana)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="min-h-[220px] w-full rounded-lg sm:h-[280px]" />
          </CardContent>
        </Card>
      );
    }

    if (sizeDistributionQuery.isError) {
      return (
        <Card className="font-custom border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">
              Failed to load size-wise distribution
            </CardTitle>
            <CardDescription>
              {sizeDistributionQuery.error instanceof Error
                ? sizeDistributionQuery.error.message
                : 'Something went wrong.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="default"
              onClick={() => sizeDistributionQuery.refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (varietyCharts.length === 0 || !hasAnyData) {
      return (
        <Card className="font-custom">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
              <PieChartIcon className="text-primary h-5 w-5" />
              Size-wise Distribution
            </CardTitle>
            <CardDescription>
              Percentage breakdown by grading size per variety (Excluding
              Bardana)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              No data for the selected date range.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="font-custom transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <PieChartIcon className="text-primary h-5 w-5 shrink-0" />
            Size-wise Distribution
          </CardTitle>
          <CardDescription>
            Percentage breakdown by grading size per variety (Excluding Bardana)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          <Tabs
            value={varietyTab}
            onValueChange={setVarietyTab}
            className="w-full"
          >
            <TabsList className="font-custom flex h-auto w-full flex-nowrap overflow-x-auto">
              {varietyCharts.map((item) => (
                <TabsTrigger
                  key={item.variety}
                  value={item.variety}
                  className="min-w-0 shrink-0 px-3 sm:px-4"
                >
                  {item.variety}
                </TabsTrigger>
              ))}
            </TabsList>

            {varietyCharts.map(
              ({ variety, pieData, chartConfig, totalBags, totalWeightKg }) => (
                <TabsContent
                  key={variety}
                  value={variety}
                  className="mt-4 space-y-4 outline-none"
                >
                  {pieData.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No size data for {variety}.
                    </p>
                  ) : (
                    <>
                      <div className="w-full min-w-0">
                        <ChartContainer
                          config={chartConfig}
                          className="mx-auto min-h-[260px] w-full max-w-[420px]"
                          initialDimension={{ width: 420, height: 340 }}
                        >
                          <PieChart accessibilityLayer>
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  nameKey="name"
                                  formatter={(value) =>
                                    `${Number(value).toLocaleString('en-IN', {
                                      maximumFractionDigits: 2,
                                    })} kg`
                                  }
                                />
                              }
                            />
                            <Pie
                              data={pieData}
                              dataKey="weightKg"
                              nameKey="name"
                              innerRadius={0}
                              strokeWidth={0}
                              label={({ name, percent }) =>
                                `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
                              }
                              labelLine={{ stroke: 'var(--border)' }}
                            >
                              {pieData.map((entry) => (
                                <Cell
                                  key={`${variety}-${entry.name}`}
                                  fill={entry.fill}
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-foreground text-sm font-semibold sm:text-base">
                          {variety} - Size Distribution & Insights (
                          {totalWeightKg.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                          })}{' '}
                          kg)
                        </h4>
                        <div className="border-border overflow-x-auto rounded-lg border">
                          <Table className="border-collapse">
                            <TableHeader>
                              <TableRow className="border-border bg-muted hover:bg-muted">
                                <TableHead className="font-custom border-border border px-3 py-2 text-xs font-bold sm:text-sm">
                                  Size
                                </TableHead>
                                <TableHead className="font-custom border-border border px-3 py-2 text-right text-xs font-bold sm:text-sm">
                                  Bags
                                </TableHead>
                                <TableHead className="font-custom border-border border px-3 py-2 text-right text-xs font-bold sm:text-sm">
                                  Weight (kg)
                                </TableHead>
                                <TableHead className="font-custom border-border border px-3 py-2 text-right text-xs font-bold sm:text-sm">
                                  % of variety
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pieData.map((item) => (
                                <TableRow
                                  key={`${variety}-row-${item.name}`}
                                  className="hover:bg-muted/50"
                                >
                                  <TableCell className="font-custom border-border border px-3 py-2 text-xs sm:text-sm">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: item.fill }}
                                        aria-hidden
                                      />
                                      <span>{item.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2 text-right text-xs tabular-nums sm:text-sm">
                                    {item.bags.toLocaleString('en-IN')}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2 text-right text-xs tabular-nums sm:text-sm">
                                    {item.weightKg.toLocaleString('en-IN', {
                                      maximumFractionDigits: 2,
                                    })}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2 text-right text-xs tabular-nums sm:text-sm">
                                    {item.percentage.toFixed(1)}%
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="font-custom bg-muted/60 border-border border px-3 py-2 text-xs font-bold sm:text-sm">
                                  Total
                                </TableHead>
                                <TableCell className="font-custom bg-muted/60 border-border border px-3 py-2 text-right text-xs font-bold tabular-nums sm:text-sm">
                                  {totalBags.toLocaleString('en-IN')}
                                </TableCell>
                                <TableCell className="font-custom bg-muted/60 border-border border px-3 py-2 text-right text-xs font-bold tabular-nums sm:text-sm">
                                  {totalWeightKg.toLocaleString('en-IN', {
                                    maximumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell className="font-custom bg-muted/60 border-border border px-3 py-2 text-right text-xs font-bold tabular-nums sm:text-sm">
                                  100.0%
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              )
            )}
          </Tabs>
        </CardContent>
      </Card>
    );
  }
);

export default GradingSizeDistributionChart;
