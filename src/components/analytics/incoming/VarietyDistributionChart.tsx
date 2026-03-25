import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, PieChart as PieChartIcon } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useGetIncomingVarietyBreakdown } from '@/services/store-admin/analytics/incoming/useGetIncomingVarietyBreakdown';
import type { GetVarietyDistributionParams } from '@/services/store-admin/analytics/incoming/useGetIncomingVarietyBreakdown';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.627 0.265 303.9)',
];

export interface VarietyDistributionChartProps {
  dateParams: GetVarietyDistributionParams;
}

interface VarietySlice {
  name: string;
  value: number;
  fill: string;
  percentage: number;
}

const VarietyDistributionChart = memo(function VarietyDistributionChart({
  dateParams,
}: VarietyDistributionChartProps) {
  const { data, isLoading, isError, error, refetch } =
    useGetIncomingVarietyBreakdown(dateParams);

  const { pieData, chartConfig } = useMemo(() => {
    const raw = data?.chartData ?? [];
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
  }, [data?.chartData]);

  if (isLoading) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
            Variety Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Percentage breakdown by potato variety (Excluding Bardana)
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
            Failed to load variety distribution
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

  if (pieData.length === 0) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
            Variety Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Percentage breakdown by potato variety (Excluding Bardana)
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

  return (
    <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <PieChartIcon className="text-primary h-5 w-5" />
          Variety Distribution
        </CardTitle>
        <CardDescription className="font-custom text-muted-foreground text-xs sm:text-sm">
          Percentage breakdown by potato variety (Excluding Bardana)
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

export default VarietyDistributionChart;
