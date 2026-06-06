import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { FileText, Layers, MapPin, RefreshCw } from 'lucide-react';
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
import { useStore } from '@/stores/store';
import {
  canonicalSizeLabel,
  sortSizeLabels,
} from '@/components/analytics/shed/shed-report-utils';
import { cn } from '@/lib/utils';
import type { AreaWiseChartAreaItem } from '@/types/analytics';

interface GradingAreaWiseDistributionProps {
  dateParams?: GetGradingSizeDistributionParams;
}

type AreaRow = {
  area: string;
  sizeValues: Record<string, number>;
  total: number;
};

type AreaBreakdownNavigationParams = {
  area?: string;
  variety: string;
  size?: string;
};

const clickableCellButtonClassName =
  'font-custom block w-full rounded px-0 py-0 text-inherit transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const clickableDataCellClassName =
  'cursor-pointer transition-colors duration-200 hover:bg-primary/5 hover:text-primary';

function navigateToAreaBreakdown(
  navigate: ReturnType<typeof useNavigate>,
  params: AreaBreakdownNavigationParams
) {
  void navigate({
    to: '/store-admin/analytics/area-breakdown/',
    search: {
      ...(params.area ? { area: params.area } : {}),
      variety: params.variety,
      ...(params.size ? { size: params.size } : {}),
    },
  });
}

type ClickableBreakdownCellProps = {
  className?: string;
  ariaLabel: string;
  onNavigate: () => void;
  children: ReactNode;
};

function ClickableBreakdownCell({
  className,
  ariaLabel,
  onNavigate,
  children,
}: ClickableBreakdownCellProps) {
  return (
    <TableCell
      className={cn(
        'font-custom border-border border px-4 py-2',
        clickableDataCellClassName,
        className
      )}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onNavigate}
        className={clickableCellButtonClassName}
      >
        {children}
      </button>
    </TableCell>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatDateLabel(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  const rawLabels: string[] = [];

  for (const area of chartData) {
    for (const variety of area.varieties ?? []) {
      for (const bagType of variety.bagTypes ?? []) {
        for (const size of bagType.sizes ?? []) {
          if (size.name) rawLabels.push(size.name);
        }
      }
    }
  }

  return sortSizeLabels(rawLabels);
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
          const canonicalKey = canonicalSizeLabel(size.name);
          sizeValues[canonicalKey] =
            Number(sizeValues[canonicalKey] ?? 0) + Number(size.value ?? 0);
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
  const navigate = useNavigate();
  const [varietyTab, setVarietyTab] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
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

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleShowPdf = async () => {
    if (isGeneratingPdf) return;

    const previewTab = window.open('', '_blank');
    if (!previewTab) {
      window.alert(
        'Popup blocked by your browser. Please allow popups and try again.'
      );
      return;
    }

    previewTab.opener = null;
    previewTab.document.write(
      '<!doctype html><html><head><meta charset="utf-8" /><title>Generating PDF...</title></head><body style="font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;background:#f8fafc">Generating PDF...</body></html>'
    );
    previewTab.document.close();
    setIsGeneratingPdf(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const generatedAt = new Date().toLocaleString('en-IN');
      const dateRangeLabel =
        dateParams?.dateFrom && dateParams?.dateTo
          ? `${formatDateLabel(dateParams.dateFrom)} - ${formatDateLabel(dateParams.dateTo)}`
          : undefined;

      const [{ pdf }, ReactModule, { default: GradingAreaBreakdownPdf }] =
        await Promise.all([
          import('@react-pdf/renderer'),
          import('react'),
          import('./pdfs/grading-area-breakdown-pdf'),
        ]);

      const document = ReactModule.createElement(GradingAreaBreakdownPdf, {
        generatedAt,
        coldStorageName,
        chartData,
        dateRangeLabel,
      });

      const blob = await pdf(document as Parameters<typeof pdf>[0]).toBlob();
      const nextUrl = URL.createObjectURL(blob);

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = nextUrl;

      if (!previewTab.closed) {
        previewTab.location.replace(nextUrl);
      } else {
        window.open(nextUrl, '_blank');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      window.alert(`Failed to generate PDF: ${message}`);
      if (!previewTab.closed) {
        previewTab.close();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="text-primary h-5 w-5 shrink-0" />
            Area-wise Size Distribution
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleShowPdf}
            aria-label="Show pdf"
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </Button>
        </div>
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
                          <ClickableBreakdownCell
                            className="font-medium whitespace-nowrap"
                            ariaLabel={`View area breakdown for ${row.area}, ${variety}`}
                            onNavigate={() =>
                              navigateToAreaBreakdown(navigate, {
                                area: row.area,
                                variety,
                              })
                            }
                          >
                            {row.area}
                          </ClickableBreakdownCell>
                          {sizeKeys.map((sizeKey) => (
                            <ClickableBreakdownCell
                              key={`${variety}-${row.area}-${sizeKey}`}
                              className="text-right tabular-nums"
                              ariaLabel={`View area breakdown for ${row.area}, ${variety}, ${sizeKey}`}
                              onNavigate={() =>
                                navigateToAreaBreakdown(navigate, {
                                  area: row.area,
                                  variety,
                                  size: sizeKey,
                                })
                              }
                            >
                              {formatNumber(
                                Number(row.sizeValues[sizeKey] ?? 0)
                              )}
                            </ClickableBreakdownCell>
                          ))}
                          <ClickableBreakdownCell
                            className="text-primary bg-primary/10 text-right font-bold tabular-nums"
                            ariaLabel={`View area breakdown for ${row.area}, ${variety}`}
                            onNavigate={() =>
                              navigateToAreaBreakdown(navigate, {
                                area: row.area,
                                variety,
                              })
                            }
                          >
                            {formatNumber(row.total)}
                          </ClickableBreakdownCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold whitespace-nowrap">
                          Bag Total
                        </TableHead>
                        {sizeKeys.map((sizeKey) => (
                          <ClickableBreakdownCell
                            key={`${variety}-footer-${sizeKey}`}
                            className="bg-muted/50 text-right font-bold tabular-nums"
                            ariaLabel={`View area breakdown for ${variety}, ${sizeKey}`}
                            onNavigate={() =>
                              navigateToAreaBreakdown(navigate, {
                                variety,
                                size: sizeKey,
                              })
                            }
                          >
                            {formatNumber(tabFooterTotals[sizeKey] ?? 0)}
                          </ClickableBreakdownCell>
                        ))}
                        <ClickableBreakdownCell
                          className="text-primary bg-primary/10 text-right font-bold tabular-nums"
                          ariaLabel={`View area breakdown for ${variety}`}
                          onNavigate={() =>
                            navigateToAreaBreakdown(navigate, { variety })
                          }
                        >
                          {formatNumber(tabTotalBags)}
                        </ClickableBreakdownCell>
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
