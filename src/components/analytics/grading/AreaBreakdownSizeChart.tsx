import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  buildSizeDistributionSlices,
  formatBreakdownNumber,
  type SizeDistributionSlice,
} from './area-breakdown-utils';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'oklch(0.627 0.265 303.9)',
  'oklch(0.645 0.246 16.439)',
  'oklch(0.58 0.22 265)',
] as const;

type AreaBreakdownSizeChartProps = {
  sizeKeys: string[];
  sizeTotals: Record<string, number>;
  selectedSizeKey?: string;
  variety?: string;
  area: string;
};

const AreaBreakdownSizeChart = ({
  sizeKeys,
  sizeTotals,
  selectedSizeKey,
  variety,
  area,
}: AreaBreakdownSizeChartProps) => {
  const { pieData, chartConfig, totalBags } = useMemo(() => {
    const slices = buildSizeDistributionSlices(
      sizeTotals,
      sizeKeys,
      CHART_COLORS
    );

    const config: ChartConfig = {};
    slices.forEach((slice) => {
      config[slice.name] = {
        label: slice.name,
        color: slice.fill,
      };
    });

    return {
      pieData: slices,
      chartConfig: config,
      totalBags: slices.reduce((sum, slice) => sum + slice.value, 0),
    };
  }, [sizeKeys, sizeTotals]);

  if (pieData.length === 0) {
    return (
      <Card className="border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <h2 className="font-custom text-foreground text-base font-semibold sm:text-lg">
            Size Distribution
          </h2>
          <p className="font-custom text-muted-foreground text-xs sm:text-sm">
            Grading stock by size for {area}
            {variety ? ` · ${variety}` : ''}.
          </p>
        </CardHeader>
        <CardContent>
          <p className="font-custom text-muted-foreground text-sm">
            No size data for this selection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <h2 className="font-custom text-foreground text-base font-semibold sm:text-lg">
          Size Distribution
        </h2>
        <p className="font-custom text-muted-foreground text-xs sm:text-sm">
          Percentage breakdown by grading size for {area}
          {variety ? ` · ${variety}` : ''}.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 sm:space-y-6">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-auto h-[280px] w-full max-w-[420px] min-w-0"
        >
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="name"
                  formatter={(value) => [
                    `${Number(value).toLocaleString('en-IN')} bags`,
                    undefined,
                  ]}
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

        <div className="min-w-0 space-y-2">
          <h3 className="font-custom text-foreground text-sm font-semibold sm:text-base">
            Size Distribution & Insights
          </h3>
          <div className="border-border overflow-x-auto rounded-lg border">
            <SizeInsightsTable
              pieData={pieData}
              totalBags={totalBags}
              selectedSizeKey={selectedSizeKey}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

type SizeInsightsTableProps = {
  pieData: SizeDistributionSlice[];
  totalBags: number;
  selectedSizeKey?: string;
};

function SizeInsightsTable({
  pieData,
  totalBags,
  selectedSizeKey,
}: SizeInsightsTableProps) {
  return (
    <Table className="border-collapse">
      <TableHeader>
        <TableRow className="border-border bg-muted hover:bg-muted">
          <TableHead className="font-custom border-border border px-4 py-2 font-bold">
            Size
          </TableHead>
          <TableHead className="font-custom border-border border px-4 py-2 text-right font-bold">
            Bags
          </TableHead>
          <TableHead className="font-custom border-border border px-4 py-2 text-right font-bold">
            Share
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pieData.map((item) => (
          <TableRow
            key={item.name}
            className={cn(
              'border-border hover:bg-transparent',
              selectedSizeKey === item.name && 'bg-primary/5'
            )}
          >
            <TableCell className="font-custom border-border border px-4 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                  aria-hidden
                />
                <span className="truncate font-medium">{item.name}</span>
              </div>
            </TableCell>
            <TableCell className="font-custom border-border border px-4 py-2 text-right font-medium tabular-nums">
              {formatBreakdownNumber(item.value)}
            </TableCell>
            <TableCell className="font-custom text-primary border-border border px-4 py-2 text-right font-semibold tabular-nums">
              {item.percentage.toFixed(1)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
            Total
          </TableHead>
          <TableCell className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums">
            {formatBreakdownNumber(totalBags)}
          </TableCell>
          <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 text-right font-bold tabular-nums">
            100.0%
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export default memo(AreaBreakdownSizeChart);
