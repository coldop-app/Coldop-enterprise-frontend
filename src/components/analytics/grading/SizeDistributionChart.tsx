import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, PieChart as PieChartIcon } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  useGetGradingSizeWiseDistribution,
  type GradingSizeDistributionSizeItem,
  type GetGradingSizeWiseDistributionParams,
} from '@/services/store-admin/grading-gate-pass/useGetGradingSizeWiseDistribution';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.627 0.265 303.9)',
];

export interface SizeDistributionChartProps {
  dateParams: GetGradingSizeWiseDistributionParams;
}

interface SizeSlice {
  name: string;
  value: number;
  bags: number;
  fill: string;
  percentage: number;
}

interface VarietyChartData {
  variety: string;
  pieData: SizeSlice[];
  chartConfig: ChartConfig;
  totalWeightKg: number;
}

type SizeSliceInput = { name: string; value: number };

function orderSizeSlices(slices: SizeSliceInput[]): SizeSliceInput[] {
  const knownOrder: string[] = [
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
  const sliceMap = new Map(slices.map((s) => [s.name, s]));

  const ordered: SizeSliceInput[] = [];
  for (const size of knownOrder) {
    const slice = sliceMap.get(size);
    if (slice) {
      ordered.push(slice);
    }
  }

  const rest = slices
    .filter((s) => !knownOrder.includes(s.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...ordered, ...rest];
}

function buildVarietyChartData(
  chartData: { variety: string; sizes: GradingSizeDistributionSizeItem[] }[]
): VarietyChartData[] {
  return chartData.map((item) => {
    const raw = item.sizes ?? [];
    const total = raw.reduce((sum, s) => sum + s.value, 0);
    const ordered = orderSizeSlices(
      raw.map((s) => ({ name: s.name, value: s.value }))
    ).map((orderedSlice) => {
      const match = raw.find((s) => s.name === orderedSlice.name);
      return {
        name: orderedSlice.name,
        value: orderedSlice.value,
        bags: match?.bags ?? 0,
      };
    });
    const pieData: SizeSlice[] = ordered.map((s, i) => {
      return {
        name: s.name,
        value: s.value,
        bags: s.bags,
        fill: CHART_COLORS[i % CHART_COLORS.length],
        percentage: total > 0 ? (s.value / total) * 100 : 0,
      };
    });
    const chartConfig: ChartConfig = {};
    pieData.forEach((s, i) => {
      chartConfig[s.name] = {
        label: s.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return {
      variety: item.variety,
      pieData,
      chartConfig,
      totalWeightKg: total,
    };
  });
}

const SizeDistributionChart = memo(function SizeDistributionChart({
  dateParams,
}: SizeDistributionChartProps) {
  const { data, isLoading, isError, error, refetch } =
    useGetGradingSizeWiseDistribution(dateParams);

  const varietyCharts = useMemo(() => {
    const raw = data?.chartData ?? [];
    return buildVarietyChartData(raw);
  }, [data?.chartData]);

  const hasAnyData = varietyCharts.some((v) => v.pieData.length > 0);

  if (isLoading) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
            Size-wise Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Percentage breakdown by grading size per variety (Excluding Bardana)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="min-h-[220px] w-full rounded-lg sm:h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5 w-full min-w-0 overflow-hidden rounded-xl">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load size-wise distribution
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

  if (varietyCharts.length === 0 || !hasAnyData) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
            Size-wise Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Percentage breakdown by grading size per variety (Excluding Bardana)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-muted-foreground text-sm">
            No data for the selected date range.
          </p>
        </CardContent>
      </Card>
    );
  }

  const defaultTab = varietyCharts[0]?.variety ?? '';

  return (
    <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <PieChartIcon className="text-primary h-5 w-5" />
          Size-wise Distribution
        </CardTitle>
        <CardDescription className="font-custom text-muted-foreground text-xs sm:text-sm">
          Percentage breakdown by grading size per variety (Excluding Bardana)
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 sm:space-y-6">
        <Tabs defaultValue={defaultTab} className="font-custom w-full">
          <TabsList className="font-custom flex h-auto w-full flex-nowrap overflow-x-auto">
            {varietyCharts.map(({ variety }) => (
              <TabsTrigger
                key={variety}
                value={variety}
                className="min-w-0 shrink-0 px-3 sm:px-4"
              >
                {variety}
              </TabsTrigger>
            ))}
          </TabsList>
          {varietyCharts.map(
            ({ variety, pieData, chartConfig, totalWeightKg }) => (
              <TabsContent
                key={variety}
                value={variety}
                className="mt-4 space-y-4 outline-none sm:space-y-6"
              >
                {pieData.length === 0 ? (
                  <p className="font-custom text-muted-foreground py-8 text-center text-sm">
                    No size data for {variety}.
                  </p>
                ) : (
                  <>
                    <div className="min-h-[220px] w-full min-w-0 sm:h-[280px] md:mx-auto md:max-w-[420px]">
                      <ChartContainer
                        config={chartConfig}
                        className="h-full min-h-[220px] w-full min-w-0 sm:min-h-0 [&_.recharts-wrapper]:h-full! [&_.recharts-wrapper]:w-full!"
                      >
                        <PieChart
                          margin={{ top: 16, right: 110, bottom: 16, left: 60 }}
                        >
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
                            dataKey="value"
                            nameKey="name"
                            cx="55%"
                            cy="50%"
                            innerRadius={0}
                            strokeWidth={0}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(1)}%`
                            }
                            labelLine={{ stroke: 'var(--border)' }}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                    </div>

                    <div className="min-w-0 space-y-3">
                      <h4 className="font-custom text-foreground text-sm font-semibold sm:text-base">
                        {variety} – Size Distribution & Insights (
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
                                key={item.name}
                                className="border-border hover:bg-muted/50"
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
                                  {item.value.toLocaleString('en-IN', {
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
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="font-custom bg-muted/60 border-border border px-3 py-2 text-xs font-bold sm:text-sm">
                                Total
                              </TableHead>
                              <TableCell className="font-custom bg-muted/60 border-border border px-3 py-2 text-right text-xs font-bold tabular-nums sm:text-sm">
                                {pieData
                                  .reduce((sum, item) => sum + item.bags, 0)
                                  .toLocaleString('en-IN')}
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
});

export default SizeDistributionChart;
