import { useMemo, useState } from 'react';
import { Layers, MapPin, RefreshCw } from 'lucide-react';
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
import type { GetGradingSizeDistributionParams } from '@/services/store-admin/grading-gate-pass/analytics/useGetGradingSizeDistribution';
import {
  useGetGradingAreaDistribution,
  type GetGradingAreaDistributionParams,
} from '@/services/store-admin/grading-gate-pass/analytics/useGetGradingAreaDistribution';
import type { AreaWiseChartAreaItem } from '@/types/analytics';

interface GradingAreaWiseDistributionProps {
  dateParams?: GetGradingSizeDistributionParams;
}

type AreaRow = {
  area: string;
  sizeValues: Record<string, number>;
  total: number;
};

const SIZE_ORDER = [
  'Below 30',
  '30–40',
  '35–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function getVarieties(chartData: AreaWiseChartAreaItem[]): string[] {
  const set = new Set<string>();
  for (const area of chartData) {
    for (const variety of area.varieties ?? []) {
      set.add(variety.variety);
    }
  }
  const preferredOrder = ['Himalini', 'B101', 'Jyoti'];
  const values = [...set];
  return values.sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

function getSizeKeys(chartData: AreaWiseChartAreaItem[]): string[] {
  const set = new Set<string>();
  for (const area of chartData) {
    for (const variety of area.varieties ?? []) {
      for (const bagType of variety.bagTypes ?? []) {
        for (const size of bagType.sizes ?? []) {
          set.add(size.name);
        }
      }
    }
  }

  const known = SIZE_ORDER.filter((size) => set.has(size));
  const rest = [...set]
    .filter((size) => !known.includes(size as (typeof SIZE_ORDER)[number]))
    .sort((a, b) => a.localeCompare(b));
  return [...known, ...rest];
}

function buildRowsByVariety(
  chartData: AreaWiseChartAreaItem[],
  variety: string,
  sizeKeys: string[]
): AreaRow[] {
  return chartData.map((area) => {
    const selectedVariety = area.varieties.find(
      (item) => item.variety === variety
    );
    const sizeValues = Object.fromEntries(
      sizeKeys.map((key) => [key, 0])
    ) as Record<string, number>;

    if (selectedVariety) {
      for (const bagType of selectedVariety.bagTypes ?? []) {
        for (const size of bagType.sizes ?? []) {
          sizeValues[size.name] =
            Number(sizeValues[size.name] ?? 0) + Number(size.value ?? 0);
        }
      }
    }

    const total = sizeKeys.reduce(
      (sum, key) => sum + Number(sizeValues[key] ?? 0),
      0
    );
    return {
      area: area.area,
      sizeValues,
      total,
    };
  });
}

const GradingAreaWiseDistribution = ({
  dateParams,
}: GradingAreaWiseDistributionProps) => {
  const [varietyTab, setVarietyTab] = useState<string>('');
  const queryParams: GetGradingAreaDistributionParams = {
    ...(dateParams?.dateFrom ? { dateFrom: dateParams.dateFrom } : {}),
    ...(dateParams?.dateTo ? { dateTo: dateParams.dateTo } : {}),
  };

  const areaWiseDistributionQuery = useGetGradingAreaDistribution(queryParams);
  const chartData = areaWiseDistributionQuery.data?.chartData ?? [];

  const varieties = useMemo(() => getVarieties(chartData), [chartData]);
  const sizeKeys = useMemo(() => getSizeKeys(chartData), [chartData]);
  const activeVariety = varietyTab || varieties[0] || '';
  const rows = useMemo(
    () =>
      activeVariety
        ? buildRowsByVariety(chartData, activeVariety, sizeKeys)
        : ([] as AreaRow[]),
    [activeVariety, chartData, sizeKeys]
  );

  if (
    areaWiseDistributionQuery.isLoading ||
    areaWiseDistributionQuery.isFetching
  ) {
    return (
      <Card className="font-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="text-primary h-5 w-5" />
            Area-wise Size Distribution
          </CardTitle>
          <CardDescription>
            Bags by area and size for each variety.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (areaWiseDistributionQuery.isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load area-wise size distribution
          </CardTitle>
          <CardDescription>
            {areaWiseDistributionQuery.error instanceof Error
              ? areaWiseDistributionQuery.error.message
              : 'Something went wrong.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => areaWiseDistributionQuery.refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0 || varieties.length === 0) {
    return (
      <Card className="font-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="text-primary h-5 w-5" />
            Area-wise Size Distribution
          </CardTitle>
          <CardDescription>
            Bags by area and size for each variety.
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <MapPin className="text-primary h-5 w-5 shrink-0" />
          Area-wise Size Distribution
        </CardTitle>
        <CardDescription>
          Bags by area and size for each variety. Click a cell to view area
          breakdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs
          value={activeVariety}
          onValueChange={setVarietyTab}
          className="w-full"
        >
          <TabsList className="font-custom flex h-auto w-full flex-nowrap overflow-x-auto">
            {varieties.map((variety) => (
              <TabsTrigger
                key={variety}
                value={variety}
                className="min-w-0 shrink-0 px-3 sm:px-4"
              >
                {variety}
              </TabsTrigger>
            ))}
          </TabsList>

          {varieties.map((variety) => {
            const tabRows =
              variety === activeVariety
                ? rows
                : buildRowsByVariety(chartData, variety, sizeKeys);
            const tabAreaCount = tabRows.length;
            const tabTotalBags = tabRows.reduce(
              (sum, row) => sum + row.total,
              0
            );

            const tabFooterTotals = sizeKeys.reduce<Record<string, number>>(
              (acc, key) => {
                acc[key] = tabRows.reduce(
                  (sum, row) => sum + Number(row.sizeValues[key] ?? 0),
                  0
                );
                return acc;
              },
              {}
            );

            return (
              <TabsContent
                key={variety}
                value={variety}
                className="mt-4 space-y-3 outline-none"
              >
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4" />
                  <span>
                    {formatNumber(tabAreaCount)} areas -{' '}
                    {formatNumber(tabTotalBags)} total bags
                  </span>
                </div>

                <div className="border-border overflow-x-auto overflow-y-auto rounded-lg border sm:max-h-[540px]">
                  <Table className="border-collapse">
                    <TableHeader>
                      <TableRow className="border-border bg-muted hover:bg-muted">
                        <TableHead className="font-custom border-border border px-4 py-2 font-bold whitespace-nowrap">
                          Area
                        </TableHead>
                        {sizeKeys.map((sizeKey) => (
                          <TableHead
                            key={`${variety}-head-${sizeKey}`}
                            className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap"
                          >
                            {sizeKey}
                          </TableHead>
                        ))}
                        <TableHead className="font-custom border-border border px-4 py-2 text-right font-bold whitespace-nowrap">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabRows.map((row) => (
                        <TableRow
                          key={`${variety}-${row.area}`}
                          className="border-border hover:bg-transparent"
                        >
                          <TableCell className="font-custom border-border border px-4 py-2 font-medium whitespace-nowrap">
                            {row.area}
                          </TableCell>
                          {sizeKeys.map((sizeKey) => (
                            <TableCell
                              key={`${variety}-${row.area}-${sizeKey}`}
                              className="font-custom border-border border px-4 py-2 text-right tabular-nums"
                            >
                              {formatNumber(
                                Number(row.sizeValues[sizeKey] ?? 0)
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
                        <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold whitespace-nowrap">
                          Bag Total
                        </TableHead>
                        {sizeKeys.map((sizeKey) => (
                          <TableCell
                            key={`${variety}-footer-${sizeKey}`}
                            className="font-custom bg-muted/50 border-border border px-4 py-2 text-right font-bold tabular-nums"
                          >
                            {formatNumber(tabFooterTotals[sizeKey] ?? 0)}
                          </TableCell>
                        ))}
                        <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 text-right font-bold tabular-nums">
                          {formatNumber(tabTotalBags)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GradingAreaWiseDistribution;
