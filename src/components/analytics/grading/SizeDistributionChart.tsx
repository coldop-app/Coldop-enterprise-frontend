import { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
import { RefreshCw, PieChart as PieChartIcon, FileDown } from 'lucide-react';
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
import { useStore } from '@/stores/store';
import { toast } from 'sonner';

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
  const coldStorage = useStore((s) => s.coldStorage);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { data, isLoading, isError, error, refetch } =
    useGetGradingSizeWiseDistribution(dateParams);

  const varietyCharts = useMemo(() => {
    const raw = data?.chartData ?? [];
    return buildVarietyChartData(raw);
  }, [data?.chartData]);

  const hasAnyData = varietyCharts.some((v) => v.pieData.length > 0);
  const defaultVarietyTab = varietyCharts[0]?.variety ?? '';
  const [varietyTab, setVarietyTab] = useState(defaultVarietyTab);

  useEffect(() => {
    setVarietyTab((t) => {
      if (varietyCharts.some((v) => v.variety === t)) return t;
      return defaultVarietyTab;
    });
  }, [defaultVarietyTab, varietyCharts]);

  const getDateRangeLabel = useCallback(() => {
    if (dateParams.dateFrom && dateParams.dateTo) {
      return `${dateParams.dateFrom} to ${dateParams.dateTo}`;
    }
    if (dateParams.dateFrom) return `From ${dateParams.dateFrom}`;
    if (dateParams.dateTo) return `To ${dateParams.dateTo}`;
    return 'All dates';
  }, [dateParams.dateFrom, dateParams.dateTo]);

  const activeVarietyChart = useMemo(
    () => varietyCharts.find((v) => v.variety === varietyTab),
    [varietyCharts, varietyTab]
  );

  const canExportSizePdf =
    !!activeVarietyChart && activeVarietyChart.pieData.length > 0;

  const handleDownloadSizePdf = useCallback(async () => {
    if (!activeVarietyChart || !canExportSizePdf) {
      toast.error('Nothing to export', {
        description: 'Select a variety with size data.',
      });
      return;
    }
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingPdf(true);
    try {
      const [{ pdf }, { GradingSizeDistributionTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/grading-size-distribution-table-pdf'),
      ]);
      const { pieData, variety, totalWeightKg } = activeVarietyChart;
      const totalBags = pieData.reduce((sum, s) => sum + s.bags, 0);
      const rows = pieData.map((s) => ({
        sizeName: s.name,
        bags: s.bags,
        weightKg: s.value,
        pctVariety: s.percentage,
      }));
      const blob = await pdf(
        <GradingSizeDistributionTablePdf
          companyName={coldStorage?.name ?? 'Cold Storage'}
          dateRangeLabel={getDateRangeLabel()}
          variety={variety}
          rows={rows}
          totalBags={totalBags}
          totalWeightKg={totalWeightKg}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('PDF opened in new tab', {
        description: 'Size-wise distribution is ready to view or print.',
      });
    } catch {
      printWindow?.close();
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [
    activeVarietyChart,
    canExportSizePdf,
    coldStorage?.name,
    getDateRangeLabel,
  ]);

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

  return (
    <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
              <PieChartIcon className="text-primary h-5 w-5 shrink-0" />
              Size-wise Distribution
            </CardTitle>
            <CardDescription className="font-custom text-muted-foreground text-xs sm:text-sm">
              Percentage breakdown by grading size per variety (Excluding
              Bardana)
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canExportSizePdf || isGeneratingPdf}
            onClick={handleDownloadSizePdf}
            className="font-custom focus-visible:ring-primary h-8 shrink-0 gap-2 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label="Download size-wise distribution table as PDF"
          >
            <FileDown
              className={`h-4 w-4 shrink-0 ${isGeneratingPdf ? 'animate-pulse' : ''}`}
            />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 sm:space-y-6">
        <Tabs
          value={varietyTab}
          onValueChange={setVarietyTab}
          className="font-custom w-full"
        >
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
