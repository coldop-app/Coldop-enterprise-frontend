import { memo, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useGetTopFarmers } from '@/services/store-admin/analytics/incoming/useGetTopFarmers';
import type { GetTopFarmersByBagsParams } from '@/services/store-admin/analytics/incoming/useGetTopFarmers';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export interface TopFarmersChartProps {
  dateParams: GetTopFarmersByBagsParams;
}

const TopFarmersChart = memo(function TopFarmersChart({
  dateParams,
}: TopFarmersChartProps) {
  const { data, isLoading, isError, error, refetch } =
    useGetTopFarmers(dateParams);

  const seriesData = useMemo(() => {
    const raw = data?.chartData ?? [];
    return raw.slice(0, 5).map((row) => ({
      name: row.name,
      bags: row.bags,
      farmerId: row.farmerId,
      accountNumber: row.accountNumber,
    }));
  }, [data?.chartData]);

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {
      name: { label: 'Farmer', color: 'var(--foreground)' },
      bags: { label: 'Bags', color: 'var(--chart-1)' },
    };
    seriesData.forEach((point, i) => {
      config[point.name] = {
        label: point.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return config;
  }, [seriesData]);

  if (isLoading) {
    return (
      <Card className="font-custom border-border min-w-0 w-full overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Top Farmers
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Top 5 farmers by current quantity in storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="mx-auto h-[260px] w-full rounded-lg sm:h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-border min-w-0 w-full overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Top Farmers
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Top 5 farmers by current quantity in storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-destructive text-sm">
            {error instanceof Error ? error.message : 'Failed to load top farmers.'}
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={() => refetch()}
            className="font-custom mt-2 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (seriesData.length === 0) {
    return (
      <Card className="font-custom border-border min-w-0 w-full overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold sm:text-lg">
            Top Farmers
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Top 5 farmers by current quantity in storage
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
    <Card className="font-custom border-border min-w-0 w-full overflow-hidden rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold sm:text-lg">
          Top Farmers
        </CardTitle>
        <CardDescription className="font-custom text-muted-foreground text-xs sm:text-sm">
          Top 5 farmers by current quantity in storage
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mx-auto h-[260px] w-full sm:h-[280px]">
          <ChartContainer
            config={chartConfig}
            className="h-full w-full [&_.recharts-wrapper]:h-full! [&_.recharts-wrapper]:w-full!"
          >
            <BarChart
              data={seriesData}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                className="stroke-border/50"
              />
              <XAxis
                type="number"
                dataKey="bags"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => Number(v).toLocaleString('en-IN')}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  value && value.length > 18 ? `${value.slice(0, 18)}…` : value
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="name"
                    formatter={(value) =>
                      `${Number(value).toLocaleString('en-IN')} bags`
                    }
                  />
                }
              />
              <Bar
                dataKey="bags"
                fill="var(--chart-1)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
});

export default TopFarmersChart;
