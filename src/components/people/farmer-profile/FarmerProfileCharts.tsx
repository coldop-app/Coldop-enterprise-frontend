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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import {
  SIZE_ORDER,
  computeVarietyDistribution,
  computeSizeDistribution,
} from './farmerProfileChartsUtils';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.627 0.265 303.9)',
];

interface VarietySlice {
  name: string;
  value: number;
  fill: string;
  percentage: number;
}

interface FarmerProfileVarietyChartProps {
  chartData: { name: string; value: number }[];
  isLoading?: boolean;
}

const FarmerProfileVarietyChart = memo(function FarmerProfileVarietyChart({
  chartData,
  isLoading = false,
}: FarmerProfileVarietyChartProps) {
  const { pieData, chartConfig } = useMemo(() => {
    const raw = chartData;
    const total = raw.reduce((sum, item) => sum + item.value, 0);
    const slices: VarietySlice[] = raw.map((item, i) => ({
      name: item.name,
      value: item.value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
      percentage: total > 0 ? (item.value / total) * 100 : 0,
    }));
    const config: ChartConfig = {};
    slices.forEach((s, i) => {
      config[s.name] = {
        label: s.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return { pieData: slices, chartConfig: config };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
            Variety Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Percentage breakdown by potato variety for this farmer (Excluding
            Bardana)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 min-h-[220px] w-full rounded-lg sm:h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  if (pieData.length === 0) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
            Variety Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Percentage breakdown by potato variety for this farmer (Excluding
            Bardana)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-muted-foreground text-sm">
            No grading data yet. Variety distribution will appear after grading
            vouchers are added.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <PieChartIcon className="text-primary h-5 w-5" />
          Variety Distribution
        </CardTitle>
        <CardDescription className="font-custom text-muted-foreground text-xs sm:text-sm">
          Percentage breakdown by potato variety for this farmer (Excluding
          Bardana)
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 sm:space-y-6">
        <div className="min-h-[220px] w-full min-w-0 sm:h-[280px] md:mx-auto md:max-w-[400px]">
          <ChartContainer
            config={chartConfig}
            className="h-full min-h-[220px] w-full min-w-0 sm:min-h-0 [&_.recharts-wrapper]:h-full! [&_.recharts-wrapper]:w-full!"
          >
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
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
                cx="50%"
                cy="50%"
                innerRadius={0}
                strokeWidth={0}
                label={({ name, percent }) =>
                  `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
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
        <div className="min-w-0 space-y-2">
          <h4 className="font-custom text-foreground text-sm font-semibold sm:text-base">
            Variety Distribution & Insights
          </h4>
          <ul className="font-custom text-muted-foreground grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 sm:text-sm lg:grid-cols-3">
            {pieData.map((item) => (
              <li key={item.name} className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                  aria-hidden
                />
                <span className="text-foreground min-w-0">
                  {item.name}:{' '}
                  {item.value.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  kg ({item.percentage.toFixed(1)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
});

interface SizeSlice {
  name: string;
  value: number;
  fill: string;
  percentage: number;
}

interface VarietyChartData {
  variety: string;
  pieData: SizeSlice[];
  chartConfig: ChartConfig;
  totalWeightKg: number;
}

function orderSizeSlices(
  slices: { name: string; value: number }[]
): { name: string; value: number }[] {
  const sliceMap = new Map(slices.map((s) => [s.name, s]));
  const ordered: { name: string; value: number }[] = [];
  for (const size of SIZE_ORDER) {
    const slice = sliceMap.get(size);
    if (slice) ordered.push(slice);
  }
  const rest = slices
    .filter((s) => !SIZE_ORDER.includes(s.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...ordered, ...rest];
}

function buildVarietyChartData(
  chartData: { variety: string; sizes: { name: string; value: number }[] }[]
): VarietyChartData[] {
  return chartData.map((item) => {
    const raw = item.sizes ?? [];
    const total = raw.reduce((sum, s) => sum + s.value, 0);
    const ordered = orderSizeSlices(
      raw.map((s) => ({ name: s.name, value: s.value }))
    );
    const pieData: SizeSlice[] = ordered.map((s, i) => ({
      name: s.name,
      value: s.value,
      fill: CHART_COLORS[i % CHART_COLORS.length],
      percentage: total > 0 ? (s.value / total) * 100 : 0,
    }));
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

interface FarmerProfileSizeChartProps {
  chartData: { variety: string; sizes: { name: string; value: number }[] }[];
  isLoading?: boolean;
}

const FarmerProfileSizeChart = memo(function FarmerProfileSizeChart({
  chartData,
  isLoading = false,
}: FarmerProfileSizeChartProps) {
  const varietyCharts = useMemo(
    () => buildVarietyChartData(chartData),
    [chartData]
  );
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
            Percentage breakdown by grading size per variety for this farmer
            (Excluding Bardana)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 min-h-[220px] w-full rounded-lg sm:h-[280px]" />
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
            Percentage breakdown by grading size per variety for this farmer
            (Excluding Bardana)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-muted-foreground text-sm">
            No grading data yet. Size distribution will appear after grading
            vouchers are added.
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
          Percentage breakdown by grading size per variety for this farmer
          (Excluding Bardana)
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
                              `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
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

export interface FarmerProfileChartsProps {
  gradingPasses: GradingGatePass[];
  isLoading?: boolean;
}

const FarmerProfileCharts = memo(function FarmerProfileCharts({
  gradingPasses,
  isLoading = false,
}: FarmerProfileChartsProps) {
  const varietyChartData = useMemo(
    () => computeVarietyDistribution(gradingPasses),
    [gradingPasses]
  );
  const sizeChartData = useMemo(
    () => computeSizeDistribution(gradingPasses),
    [gradingPasses]
  );

  return (
    <div className="font-custom grid grid-cols-1 gap-6 lg:grid-cols-2">
      <FarmerProfileVarietyChart
        chartData={varietyChartData}
        isLoading={isLoading}
      />
      <FarmerProfileSizeChart chartData={sizeChartData} isLoading={isLoading} />
    </div>
  );
});

export default FarmerProfileCharts;
