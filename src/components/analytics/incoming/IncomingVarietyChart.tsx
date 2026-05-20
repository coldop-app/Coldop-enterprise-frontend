import { useMemo } from 'react';
import { AlertCircle, Loader2, PieChartIcon } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  useGetIncomingVarietyBreakdown,
  type GetVarietyDistributionParams,
} from '@/services/store-admin/incoming-gate-pass/analytics/useGetIncomingVarietyBreakdown';
import type { VarietyDistributionChartItem } from '@/types/analytics';

interface IncomingVarietyChartProps {
  dateParams?: GetVarietyDistributionParams;
}

const LIGHT_PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.64 0.19 250)',
  'oklch(0.66 0.2 335)',
  'oklch(0.68 0.18 70)',
  'oklch(0.62 0.22 25)',
  'oklch(0.7 0.18 140)',
] as const;

const DARK_PIE_COLORS = [
  'oklch(0.78 0.16 220)',
  'oklch(0.82 0.14 165)',
  'oklch(0.8 0.16 290)',
  'oklch(0.84 0.13 120)',
  'oklch(0.79 0.18 30)',
  'oklch(0.83 0.12 85)',
  'oklch(0.77 0.15 260)',
  'oklch(0.81 0.14 345)',
  'oklch(0.8 0.15 190)',
  'oklch(0.82 0.13 55)',
] as const;

const toSafeKey = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'variety';

const IncomingVarietyChart = ({ dateParams }: IncomingVarietyChartProps) => {
  const { theme } = useTheme();
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const palette = isDarkMode ? DARK_PIE_COLORS : LIGHT_PIE_COLORS;

  const queryParams: GetVarietyDistributionParams = {
    ...(dateParams?.dateFrom ? { dateFrom: dateParams.dateFrom } : {}),
    ...(dateParams?.dateTo ? { dateTo: dateParams.dateTo } : {}),
  };

  const varietyBreakdownQuery = useGetIncomingVarietyBreakdown(queryParams);
  const chartData = varietyBreakdownQuery.data?.chartData ?? [];
  const sanitizedChartData = useMemo(
    () =>
      chartData
        .filter(
          (item): item is VarietyDistributionChartItem =>
            typeof item.name === 'string' && Number.isFinite(item.value)
        )
        .map((item, index) => ({
          key: `${toSafeKey(item.name)}-${index}`,
          color: palette[index % palette.length],
          ...item,
          value: Math.max(item.value, 0),
        })),
    [chartData, palette]
  );

  const totalValue = sanitizedChartData.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const hasData = sanitizedChartData.length > 0 && totalValue > 0;
  const chartConfig = sanitizedChartData.reduce<ChartConfig>((acc, item) => {
    acc[item.key] = {
      label: item.name,
      color: item.color,
    };
    return acc;
  }, {});

  if (varietyBreakdownQuery.isLoading || varietyBreakdownQuery.isFetching) {
    return (
      <Card>
        <CardContent className="flex min-h-88 items-center justify-center">
          <div className="font-custom text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading variety distribution...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (varietyBreakdownQuery.isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="font-custom text-destructive flex items-center gap-2 py-6 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>
            {varietyBreakdownQuery.error?.message ??
              'Something went wrong while fetching variety data.'}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-custom flex items-center gap-2 text-lg">
            <PieChartIcon className="text-primary h-5 w-5" />
            Variety Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="font-custom text-muted-foreground text-sm">
          No variety distribution data available for the selected period.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-custom flex items-center gap-2 text-lg">
          <PieChartIcon className="text-primary h-5 w-5" />
          Variety Distribution
        </CardTitle>
        <p className="font-custom text-muted-foreground text-sm">
          Percentage breakdown by potato variety (Excluding Bardana)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer
          config={chartConfig}
          className="mx-auto min-h-[260px] w-full max-w-[420px]"
          initialDimension={{ width: 420, height: 340 }}
        >
          <PieChart accessibilityLayer>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    const numericValue = Number(value ?? 0);
                    const percentage =
                      totalValue > 0
                        ? ((numericValue / totalValue) * 100).toFixed(1)
                        : '0.0';
                    return (
                      <div className="font-custom flex items-center justify-between gap-3">
                        <span>{String(name)}</span>
                        <span className="font-medium">{`${numericValue.toLocaleString()} (${percentage}%)`}</span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={sanitizedChartData}
              dataKey="value"
              nameKey="name"
              outerRadius={120}
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`
              }
            >
              {sanitizedChartData.map((entry) => (
                <Cell
                  key={`incoming-variety-slice-${entry.key}`}
                  fill={entry.color}
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="space-y-3">
          <h3 className="font-custom text-base font-semibold">
            Variety Distribution & Insights
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {sanitizedChartData.map((item) => {
              const percentage =
                totalValue > 0 ? (item.value / totalValue) * 100 : 0;

              return (
                <div
                  key={`insight-${item.key}`}
                  className="font-custom flex items-center gap-2 text-sm"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden
                  />
                  <span className="text-foreground">
                    {item.name}:{' '}
                    {item.value.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{' '}
                    bags ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IncomingVarietyChart;
