import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useNavigate } from '@tanstack/react-router';
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
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  MapPin,
  Layers,
  BarChart3,
  Users,
  FileDown,
} from 'lucide-react';
import {
  useGetAreaWiseAnalytics,
  type GetAreaWiseAnalyticsParams,
} from '@/services/store-admin/grading-gate-pass/useGetAreaWiseAnalytics';
import type {
  AreaWiseBagTypeItem,
  AreaWiseBagTypeSizeItem,
  AreaWiseChartAreaItem,
  AreaWiseVarietyItem,
} from '@/types/analytics';
import { cn } from '@/lib/utils';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';

/** Preferred column order for size names (others appended alphabetically) */
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
];

interface VarietyAreaRow {
  area: string;
  areaTotalNetWeightKg: number;
  yieldNetWeightKg: number;
  yieldPercentageOfArea: number;
  bagTypes: AreaWiseBagTypeItem[];
  sizes: AreaWiseBagTypeSizeItem[];
}

interface VarietyTabData {
  variety: string;
  areas: VarietyAreaRow[];
}

function orderedSizeNames(areas: VarietyAreaRow[]): string[] {
  const set = new Set<string>();
  areas.forEach((a) => a.sizes.forEach((s) => set.add(s.name)));
  const rest = [...set].filter((s) => !SIZE_ORDER.includes(s)).sort();
  return [...SIZE_ORDER.filter((s) => set.has(s)), ...rest];
}

function sizeMap(
  sizes: { name: string; value: number }[]
): Map<string, number> {
  const m = new Map<string, number>();
  sizes.forEach((s) => m.set(s.name, s.value));
  return m;
}

interface AreaWiseMatrixForPdf {
  sizeNames: string[];
  rows: Array<{
    area: string;
    bags: number[];
    total: number;
  }>;
  totals: Record<string, number>;
  varietyTotal: number;
}

/** Shared by the on-screen table and PDF export. */
function getAreaWiseMatrixForVariety(
  item: VarietyTabData
): AreaWiseMatrixForPdf {
  const sizeNames = orderedSizeNames(item.areas);
  const totals: Record<string, number> = {};
  for (const size of sizeNames) {
    totals[size] = 0;
  }
  const rows = item.areas.map((a) => {
    const bySize = sizeMap(a.sizes);
    const values: Record<string, number> = {};
    for (const size of sizeNames) {
      const v = bySize.get(size) ?? 0;
      values[size] = v;
      totals[size] = (totals[size] ?? 0) + v;
    }
    const total = a.sizes.reduce((sum, s) => sum + s.value, 0);
    return {
      area: a.area,
      bags: sizeNames.map((s) => values[s] ?? 0),
      total,
    };
  });
  const varietyTotal = rows.reduce((sum, r) => sum + r.total, 0);
  return { sizeNames, rows, totals, varietyTotal };
}

function aggregateVarietySizes(varietyItem: AreaWiseVarietyItem) {
  const totals = new Map<string, AreaWiseBagTypeSizeItem>();

  varietyItem.bagTypes.forEach((bagType) => {
    bagType.sizes.forEach((size) => {
      const existing = totals.get(size.name);
      if (existing) {
        totals.set(size.name, {
          ...existing,
          value: existing.value + size.value,
          netWeightKg: existing.netWeightKg + size.netWeightKg,
          percentageOfAreaNetWeight:
            existing.percentageOfAreaNetWeight + size.percentageOfAreaNetWeight,
        });
        return;
      }

      totals.set(size.name, { ...size });
    });
  });

  return [...totals.values()];
}

interface TableRowData {
  area: string;
  values: Record<string, number>;
  total: number;
}

/** Match StorageSummaryTable: light grey background + subtle ring on hover */
const cellClickClass =
  'font-custom border-border border px-4 py-2 cursor-pointer hover:bg-muted hover:ring-1 hover:ring-primary/20 transition-all duration-150';

export interface AreaWiseAnalyticsProps {
  dateParams: GetAreaWiseAnalyticsParams;
}

const AreaWiseAnalytics = memo(function AreaWiseAnalytics({
  dateParams,
}: AreaWiseAnalyticsProps) {
  const { data, isLoading, isError, error, refetch } =
    useGetAreaWiseAnalytics(dateParams);

  const chartData = useMemo(() => data?.chartData ?? [], [data?.chartData]);
  const varietyData = useMemo<VarietyTabData[]>(() => {
    const byVariety = new Map<string, VarietyTabData>();

    chartData.forEach((areaItem: AreaWiseChartAreaItem) => {
      areaItem.varieties.forEach((varietyItem: AreaWiseVarietyItem) => {
        const existing = byVariety.get(varietyItem.variety);
        const areaRow: VarietyAreaRow = {
          area: areaItem.area,
          areaTotalNetWeightKg: areaItem.totalNetWeightKg,
          yieldNetWeightKg: varietyItem.yieldNetWeightKg,
          yieldPercentageOfArea: varietyItem.yieldPercentageOfArea,
          bagTypes: varietyItem.bagTypes,
          sizes: aggregateVarietySizes(varietyItem),
        };

        if (existing) {
          existing.areas.push(areaRow);
          return;
        }

        byVariety.set(varietyItem.variety, {
          variety: varietyItem.variety,
          areas: [areaRow],
        });
      });
    });

    return [...byVariety.values()].filter((item) => item.areas.length > 0);
  }, [chartData]);
  const hasData = varietyData.length > 0;

  const coldStorage = useStore((s) => s.coldStorage);
  const defaultVarietyTab = varietyData[0]?.variety ?? '';
  const [varietyTab, setVarietyTab] = useState(defaultVarietyTab);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    setVarietyTab((t) => {
      if (varietyData.some((v) => v.variety === t)) return t;
      return defaultVarietyTab;
    });
  }, [defaultVarietyTab, varietyData]);

  const getDateRangeLabel = useCallback(() => {
    if (dateParams.dateFrom && dateParams.dateTo) {
      return `${dateParams.dateFrom} to ${dateParams.dateTo}`;
    }
    if (dateParams.dateFrom) return `From ${dateParams.dateFrom}`;
    if (dateParams.dateTo) return `To ${dateParams.dateTo}`;
    return 'All dates';
  }, [dateParams.dateFrom, dateParams.dateTo]);

  const currentVarietyItem = useMemo(
    () => varietyData.find((v) => v.variety === varietyTab),
    [varietyData, varietyTab]
  );

  const canExportAreaPdf =
    !!currentVarietyItem &&
    getAreaWiseMatrixForVariety(currentVarietyItem).sizeNames.length > 0;

  const handleDownloadAreaPdf = useCallback(async () => {
    if (!currentVarietyItem || !canExportAreaPdf) {
      toast.error('Nothing to export', {
        description: 'Select a variety with area data.',
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
      const [{ pdf }, { GradingAreaWiseTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/grading-area-wise-table-pdf'),
      ]);
      const { sizeNames, rows, totals, varietyTotal } =
        getAreaWiseMatrixForVariety(currentVarietyItem);
      const footerBags = sizeNames.map((s) => totals[s] ?? 0);
      const blob = await pdf(
        <GradingAreaWiseTablePdf
          companyName={coldStorage?.name ?? 'Cold Storage'}
          dateRangeLabel={getDateRangeLabel()}
          variety={currentVarietyItem.variety}
          sizeNames={sizeNames}
          rows={rows}
          footer={{ bags: footerBags, total: varietyTotal }}
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
        description: 'Area-wise distribution is ready to view or print.',
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
    canExportAreaPdf,
    coldStorage?.name,
    currentVarietyItem,
    getDateRangeLabel,
  ]);

  if (isLoading) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="text-primary h-5 w-5" />
            Area-wise Size Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Bags by area and size for each variety
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="min-h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-destructive/30 bg-destructive/5 w-full min-w-0 overflow-hidden rounded-xl">
        <CardHeader>
          <CardTitle className="text-destructive">
            Failed to load area-wise analytics
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

  if (!hasData) {
    return (
      <Card className="font-custom border-border w-full min-w-0 overflow-hidden rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <MapPin className="text-primary h-5 w-5" />
            Area-wise Size Distribution
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Bags by area and size for each variety
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
              <MapPin className="text-primary h-5 w-5 shrink-0" />
              Area-wise Size Distribution
            </CardTitle>
            <CardDescription className="font-custom text-muted-foreground text-xs sm:text-sm">
              Bags by area and size for each variety. Click a cell to view area
              breakdown.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canExportAreaPdf || isGeneratingPdf}
            onClick={handleDownloadAreaPdf}
            className="font-custom focus-visible:ring-primary h-8 shrink-0 gap-2 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label="Download area-wise table as PDF"
          >
            <FileDown
              className={`h-4 w-4 shrink-0 ${isGeneratingPdf ? 'animate-pulse' : ''}`}
            />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <Tabs
          value={varietyTab}
          onValueChange={setVarietyTab}
          className="font-custom w-full"
        >
          <TabsList className="font-custom mb-4 flex h-auto w-full flex-nowrap overflow-x-auto">
            {varietyData.map(({ variety }) => (
              <TabsTrigger
                key={variety}
                value={variety}
                className="min-w-0 shrink-0 px-3 sm:px-4"
              >
                {variety}
              </TabsTrigger>
            ))}
          </TabsList>
          {varietyData.map((item) => (
            <TabsContent
              key={item.variety}
              value={item.variety}
              className="mt-0 outline-none"
            >
              <VarietyAreaTable varietyItem={item} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
});

interface VarietyAreaTableProps {
  varietyItem: VarietyTabData;
}

function orderedSizesForDisplay(sizes: AreaWiseBagTypeSizeItem[]) {
  return [...sizes].sort((a, b) => {
    const aIndex = SIZE_ORDER.indexOf(a.name);
    const bIndex = SIZE_ORDER.indexOf(b.name);

    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

function toPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

const VarietyAreaTable = memo(function VarietyAreaTable({
  varietyItem,
}: VarietyAreaTableProps) {
  const navigate = useNavigate();
  const { variety, areas } = varietyItem;
  const [selectedArea, setSelectedArea] = useState<string>(
    areas[0]?.area ?? ''
  );

  useEffect(() => {
    if (!areas.some((area) => area.area === selectedArea)) {
      setSelectedArea(areas[0]?.area ?? '');
    }
  }, [areas, selectedArea]);

  const { sizeNames, rows, totals, varietyTotal } = useMemo(() => {
    const m = getAreaWiseMatrixForVariety(varietyItem);
    const rowsData: TableRowData[] = m.rows.map((r) => ({
      area: r.area,
      values: Object.fromEntries(
        m.sizeNames.map((s, i) => [s, r.bags[i] ?? 0])
      ),
      total: r.total,
    }));
    return {
      sizeNames: m.sizeNames,
      rows: rowsData,
      totals: m.totals,
      varietyTotal: m.varietyTotal,
    };
  }, [varietyItem]);

  const columns = useMemo<ColumnDef<TableRowData>[]>(() => {
    const cols: ColumnDef<TableRowData>[] = [
      {
        accessorKey: 'area',
        header: () => <span className="font-custom font-bold">Area</span>,
        cell: ({ getValue }) => (
          <span className="font-custom font-medium">
            {getValue() as string}
          </span>
        ),
      },
    ];
    for (const size of sizeNames) {
      cols.push({
        id: size,
        accessorFn: (row) => row.values[size] ?? 0,
        header: () => <span className="font-custom font-bold">{size}</span>,
        cell: ({ getValue }) => (
          <span className="font-custom font-medium tabular-nums">
            {Number(getValue()).toLocaleString('en-IN')}
          </span>
        ),
      });
    }
    cols.push({
      accessorKey: 'total',
      header: () => <span className="font-custom font-bold">Total</span>,
      cell: ({ getValue }) => (
        <span className="font-custom text-primary font-bold tabular-nums">
          {Number(getValue()).toLocaleString('en-IN')}
        </span>
      ),
    });
    return cols;
  }, [sizeNames]);

  const selectedAreaData = useMemo(
    () => areas.find((area) => area.area === selectedArea) ?? areas[0],
    [areas, selectedArea]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleFarmerBreakdown = () => {
    if (!selectedAreaData) return;

    navigate({
      to: '/store-admin/area-breakdown',
      search: {
        area: selectedAreaData.area,
        size: 'total',
        variety,
      },
    });
  };

  if (sizeNames.length === 0) {
    return (
      <div className="font-custom text-muted-foreground border-border rounded-lg border p-6 text-center text-sm">
        No size data for this variety.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="font-custom text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <Layers className="h-4 w-4 shrink-0" />
        <span>
          {areas.length} area{areas.length !== 1 ? 's' : ''} ·{' '}
          {varietyTotal.toLocaleString('en-IN')} total bags
        </span>
      </div>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table className="border-collapse">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-border bg-muted hover:bg-muted"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="font-custom border-border border px-4 py-2 font-bold"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'border-border hover:bg-muted/40 cursor-pointer',
                    selectedArea === row.original.area && 'bg-primary/5'
                  )}
                  onClick={() => setSelectedArea(row.original.area)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id;
                    const isSelected = selectedArea === row.original.area;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'font-custom border-border border px-4 py-2',
                          colId !== 'area' && cellClickClass,
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="font-custom text-muted-foreground border-border h-24 border px-4 py-2 text-center"
                >
                  No area data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold">
                  Bag Total
                </TableHead>
                {sizeNames.map((size) => (
                  <TableCell
                    key={size}
                    className="font-custom bg-muted/50 border-border border px-4 py-2 font-bold tabular-nums"
                  >
                    {(totals[size] ?? 0).toLocaleString('en-IN')}
                  </TableCell>
                ))}
                <TableCell className="font-custom text-primary bg-primary/10 border-border border px-4 py-2 font-bold tabular-nums">
                  {varietyTotal.toLocaleString('en-IN')}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
      {selectedAreaData ? (
        <Card className="border-border bg-muted/20 w-full rounded-lg border">
          <CardHeader className="pb-3">
            <CardTitle className="font-custom flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="text-primary h-4 w-4" />
              Detailed Analytics - {selectedAreaData.area}
            </CardTitle>
            <CardDescription className="font-custom text-xs sm:text-sm">
              Variety: {variety} · Yield{' '}
              {selectedAreaData.yieldNetWeightKg.toLocaleString('en-IN')} kg (
              {selectedAreaData.yieldPercentageOfArea.toFixed(2)}% of area net
              weight)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleFarmerBreakdown}
                className="font-custom gap-2"
              >
                <Users className="h-4 w-4" />
                View Farmer-wise Area Breakdown
              </Button>
            </div>
            {selectedAreaData.bagTypes.map((bagType) => {
              const bagTypeNetWeight = bagType.sizes.reduce(
                (sum, size) => sum + size.netWeightKg,
                0
              );
              const bagTypePercent = selectedAreaData.areaTotalNetWeightKg
                ? (bagTypeNetWeight / selectedAreaData.areaTotalNetWeightKg) *
                  100
                : 0;

              return (
                <div
                  key={bagType.bagType}
                  className="border-border bg-background rounded-lg border p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-custom text-sm font-semibold">
                      {bagType.bagType}
                    </p>
                    <p className="font-custom text-muted-foreground text-xs sm:text-sm">
                      {bagTypeNetWeight.toLocaleString('en-IN')} kg ·{' '}
                      {bagTypePercent.toFixed(2)}%
                    </p>
                  </div>
                  <Progress
                    value={toPercent(bagTypePercent)}
                    className="h-2.5"
                  />

                  <div className="mt-4 space-y-2">
                    {orderedSizesForDisplay(bagType.sizes).map((size) => (
                      <div
                        key={`${bagType.bagType}-${size.name}`}
                        className="border-border rounded-md border p-3"
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <p className="font-custom text-sm font-medium">
                            {size.name}
                          </p>
                          <p className="font-custom text-muted-foreground text-xs sm:text-sm">
                            {size.value.toLocaleString('en-IN')} bags ·{' '}
                            {size.netWeightKg.toLocaleString('en-IN')} kg
                          </p>
                        </div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-custom text-muted-foreground text-xs">
                            Area share
                          </span>
                          <span className="font-custom text-xs font-semibold">
                            {size.percentageOfAreaNetWeight.toFixed(2)}%
                          </span>
                        </div>
                        <Progress
                          value={toPercent(size.percentageOfAreaNetWeight)}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
});

export default AreaWiseAnalytics;
