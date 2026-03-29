import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.627 0.265 303.9)',
];

export interface FarmerWiseShareChartProps {
  /** Per farmer: bag count, value = net potato weight (kg), bardana excluded */
  data: { name: string; bags: number; value: number }[];
}

interface FarmerSlice {
  name: string;
  value: number;
  bags: number;
  fill: string;
  percentage: number;
}

const FarmerWiseShareChart = memo(function FarmerWiseShareChart({
  data,
}: FarmerWiseShareChartProps) {
  const { pieData, chartConfig, totalWeightKg } = useMemo(() => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const slices: FarmerSlice[] = data.map((d, i) => ({
      name: d.name,
      value: d.value,
      bags: d.bags,
      fill: CHART_COLORS[i % CHART_COLORS.length],
      percentage: total > 0 ? (d.value / total) * 100 : 0,
    }));
    const config: ChartConfig = {};
    slices.forEach((s, i) => {
      config[s.name] = {
        label: s.name,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
    return { pieData: slices, chartConfig: config, totalWeightKg: total };
  }, [data]);

  const topFarmer = pieData[0];

  if (pieData.length === 0) {
    return (
      <Card className="border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <h3 className="font-custom text-foreground text-base font-semibold sm:text-lg">
            Farmer-wise Share
          </h3>
          <p className="font-custom text-muted-foreground text-xs sm:text-sm">
            Net weight breakdown by farmer (bardana excluded)
          </p>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-muted-foreground text-sm">
            No farmer data for this selection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <h3 className="font-custom text-foreground text-base font-semibold sm:text-lg">
          Farmer-wise Share
        </h3>
        <p className="font-custom text-muted-foreground text-xs sm:text-sm">
          Net weight breakdown by farmer (bardana excluded). Percentages are by
          weight, not bag count.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 sm:space-y-6">
        <div className="min-h-[220px] w-full min-w-0 sm:h-[280px] md:mx-auto md:max-w-[320px]">
          <ChartContainer
            config={chartConfig}
            className="h-full min-h-[220px] w-full min-w-0 sm:min-h-0 [&_.recharts-wrapper]:h-full! [&_.recharts-wrapper]:w-full!"
          >
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="name"
                    formatter={(val) =>
                      `${Number(val).toLocaleString('en-IN', {
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
                innerRadius="60%"
                outerRadius="90%"
                strokeWidth={0}
                paddingAngle={1}
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
            Farmer share & insights (
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
                    Farmer
                  </TableHead>
                  <TableHead className="font-custom border-border border px-3 py-2 text-right text-xs font-bold sm:text-sm">
                    Bags
                  </TableHead>
                  <TableHead className="font-custom border-border border px-3 py-2 text-right text-xs font-bold sm:text-sm">
                    Weight (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border px-3 py-2 text-right text-xs font-bold sm:text-sm">
                    % of total
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
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.fill }}
                          aria-hidden
                        />
                        <span className="min-w-0 truncate">{item.name}</span>
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
          <div className="min-w-0 space-y-1">
            {topFarmer && (
              <p className="font-custom text-muted-foreground text-xs sm:text-sm">
                • {topFarmer.name} is the top contributor with{' '}
                {topFarmer.percentage.toFixed(1)}% of total net weight
              </p>
            )}
            <p className="font-custom text-muted-foreground text-xs sm:text-sm">
              • Total farmers: {pieData.length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default FarmerWiseShareChart;
