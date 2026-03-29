import { useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import {
  Item,
  ItemHeader,
  ItemMedia,
  ItemTitle,
  ItemActions,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Package, RefreshCw } from 'lucide-react';
import { useGetAreaBreakdown } from '@/services/store-admin/grading-gate-pass/useGetAreaBreakdown';
import { GRADING_SIZES } from '@/components/forms/grading/constants';
import type {
  FarmersStockByFiltersData,
  AreaBreakdownFarmerEntry,
  AreaBreakdownVarietyItem,
  AreaBreakdownSizeStock,
} from '@/types/analytics';
import { netPotatoKgFromBagsForGradingSize } from '@/utils/areaBreakdownGradingWeight';
import SizeWiseDistributionChart from './-SizeWiseDistributionChart';
import FarmerWiseShareChart from './-FarmerWiseShareChart';
import FarmerQuantityTable, {
  type FarmerQuantityRow,
  type FarmerQuantityRowAllSizes,
} from './-FarmerQuantityTable';

export const Route = createFileRoute(
  '/store-admin/_authenticated/area-breakdown/'
)({
  validateSearch: (
    search: Record<string, unknown>
  ): { area?: string; size?: string; variety?: string } => ({
    area: typeof search.area === 'string' ? search.area : undefined,
    size: typeof search.size === 'string' ? search.size : undefined,
    variety: typeof search.variety === 'string' ? search.variety : undefined,
  }),
  component: AreaBreakdownPage,
});

const TAB_VALUE_ALL = 'all';

/** Collect unique sizes from API data, ordered by GRADING_SIZES */
function getSizesFromData(
  data: FarmersStockByFiltersData | undefined
): string[] {
  if (!data?.farmers) return [];
  const set = new Set<string>();
  for (const entry of data.farmers) {
    for (const v of entry.varieties ?? []) {
      for (const s of v.sizes ?? []) {
        const size = (s.size ?? '').trim();
        if (size) set.add(size);
      }
    }
  }
  const list = Array.from(set);
  const order = new Map<string, number>(
    GRADING_SIZES.map((s, i) => [s, i] as [string, number])
  );
  list.sort((a, b) => {
    const ai = order.get(a) ?? 999;
    const bi = order.get(b) ?? 999;
    return ai - bi;
  });
  return list;
}

/** Sum stock for a single size entry */
function getStock(sizeStock: AreaBreakdownSizeStock): number {
  return sizeStock.stock ?? 0;
}

/**
 * Net potato kg for one size line (bardana excluded). Uses API `weightExcludingBardanaKg` when
 * present; otherwise same rule as analytics size distribution / farmer profile: bags × (gross − jute tare).
 */
function getSizeLineNetWeightKg(sizeStock: AreaBreakdownSizeStock): number {
  const bags = getStock(sizeStock);
  const api = sizeStock.weightExcludingBardanaKg;
  if (api != null && !Number.isNaN(api) && api > 0) {
    return api;
  }
  if (bags <= 0) return 0;
  return netPotatoKgFromBagsForGradingSize(bags, sizeStock.size ?? '');
}

/** Sum stock across all sizes in a variety item, optionally filtered by size */
function sumVarietyStocks(
  variety: AreaBreakdownVarietyItem,
  filterSize: string | null
): number {
  let sum = 0;
  for (const s of variety.sizes ?? []) {
    const sizeKey = (s.size ?? '').trim();
    if (filterSize === null || sizeKey === filterSize) {
      sum += getStock(s);
    }
  }
  return sum;
}

/** Sum stock for a farmer entry, optionally filtered by size */
function sumFarmerStock(
  entry: AreaBreakdownFarmerEntry,
  filterSize: string | null
): number {
  let sum = 0;
  for (const v of entry.varieties ?? []) {
    sum += sumVarietyStocks(v, filterSize);
  }
  return sum;
}

function AreaBreakdownPage() {
  const search = Route.useSearch();
  const { area, size: sizeFromUrl, variety } = search;

  const params = useMemo(
    () => ({
      area: area ?? undefined,
      variety: variety ?? undefined,
    }),
    [area, variety]
  );

  const { data, isLoading, error, refetch, isFetching } =
    useGetAreaBreakdown(params);

  const preferenceSizes = useMemo(() => getSizesFromData(data), [data]);

  const [selectedBagSize, setSelectedBagSize] = useState<string>(
    () => sizeFromUrl ?? TAB_VALUE_ALL
  );

  const effectiveSelectedSize =
    selectedBagSize === TAB_VALUE_ALL ||
    preferenceSizes.includes(selectedBagSize)
      ? selectedBagSize
      : TAB_VALUE_ALL;

  const sizeLabelForTitle =
    effectiveSelectedSize === TAB_VALUE_ALL ? 'All' : effectiveSelectedSize;
  const titleParts: string[] = [];
  if (area) titleParts.push(`Area: ${area}`);
  if (variety) titleParts.push(`Variety: ${variety}`);
  titleParts.push(sizeLabelForTitle);
  const title =
    titleParts.length > 0 ? titleParts.join(' · ') : 'Area breakdown';

  const sizeToCount = useMemo(() => {
    const map = new Map<string, number>();
    if (!data?.farmers) return map;
    for (const entry of data.farmers) {
      for (const v of entry.varieties ?? []) {
        for (const s of v.sizes ?? []) {
          const key = (s.size ?? '').trim();
          if (key) {
            map.set(key, (map.get(key) ?? 0) + getStock(s));
          }
        }
      }
    }
    return map;
  }, [data]);

  const tabTriggers = useMemo(() => {
    const list: { value: string; label: string }[] = [
      { value: TAB_VALUE_ALL, label: 'All' },
    ];
    for (const size of preferenceSizes) {
      const trimmed = size?.trim();
      if (trimmed) {
        const count = sizeToCount.get(trimmed) ?? 0;
        list.push({
          value: trimmed,
          label: count > 0 ? `${trimmed} (${count})` : trimmed,
        });
      }
    }
    return list;
  }, [preferenceSizes, sizeToCount]);

  const filterSize =
    effectiveSelectedSize === TAB_VALUE_ALL ? null : effectiveSelectedSize;

  const farmerAggregate = useMemo(() => {
    if (!data?.farmers) return [];
    const byName = new Map<string, number>();
    for (const entry of data.farmers) {
      const name = (entry.farmer?.name ?? '').trim() || '—';
      const q = sumFarmerStock(entry, filterSize);
      if (q <= 0) continue;
      byName.set(name, (byName.get(name) ?? 0) + q);
    }
    return Array.from(byName.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data, filterSize]);

  const totalQuantity = useMemo(
    () => farmerAggregate.reduce((sum, d) => sum + d.value, 0),
    [farmerAggregate]
  );

  const sizeWiseChartData = useMemo(() => {
    if (!data?.farmers) return [];
    const bySize = new Map<string, number>();
    for (const entry of data.farmers) {
      for (const v of entry.varieties ?? []) {
        for (const s of v.sizes ?? []) {
          const key = (s.size ?? '').trim() || '—';
          if (filterSize !== null && key !== filterSize) continue;
          const q = getStock(s);
          if (q <= 0) continue;
          bySize.set(key, (bySize.get(key) ?? 0) + q);
        }
      }
    }
    const list = Array.from(bySize.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [data, filterSize]);

  const farmerWiseChartData = useMemo(() => {
    if (!data?.farmers) return [];
    const byName = new Map<string, { bags: number; weightKg: number }>();
    for (const entry of data.farmers) {
      const name = (entry.farmer?.name ?? '').trim() || '—';
      let bags = 0;
      let weightKg = 0;
      for (const v of entry.varieties ?? []) {
        for (const s of v.sizes ?? []) {
          const sizeKey = (s.size ?? '').trim();
          if (filterSize !== null && sizeKey !== filterSize) continue;
          const b = getStock(s);
          if (b <= 0) continue;
          bags += b;
          weightKg += getSizeLineNetWeightKg(s);
        }
      }
      if (bags <= 0) continue;
      const prev = byName.get(name);
      if (prev) {
        byName.set(name, {
          bags: prev.bags + bags,
          weightKg: prev.weightKg + weightKg,
        });
      } else {
        byName.set(name, { bags, weightKg });
      }
    }
    return Array.from(byName.entries())
      .map(([name, agg]) => ({
        name,
        bags: agg.bags,
        value: agg.weightKg,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, filterSize]);

  const tableRows = useMemo((): FarmerQuantityRow[] => {
    if (totalQuantity <= 0)
      return farmerAggregate.map((d) => ({
        farmerName: d.name,
        quantity: d.value,
        percentage: 0,
      }));
    return farmerAggregate.map((d) => ({
      farmerName: d.name,
      quantity: d.value,
      percentage: (d.value / totalQuantity) * 100,
    }));
  }, [farmerAggregate, totalQuantity]);

  const sizeColumnsForTable = useMemo(() => {
    if (effectiveSelectedSize !== TAB_VALUE_ALL) return [];
    return preferenceSizes.filter((s) => (s ?? '').trim());
  }, [effectiveSelectedSize, preferenceSizes]);

  const tableRowsAllSizes = useMemo((): FarmerQuantityRowAllSizes[] => {
    if (effectiveSelectedSize !== TAB_VALUE_ALL || !data?.farmers) return [];
    const byFarmer = new Map<string, Record<string, number>>();
    for (const entry of data.farmers) {
      const name = (entry.farmer?.name ?? '').trim() || '—';
      if (!byFarmer.has(name)) byFarmer.set(name, {});
      const row = byFarmer.get(name)!;
      for (const v of entry.varieties ?? []) {
        for (const s of v.sizes ?? []) {
          const sizeKey = (s.size ?? '').trim();
          if (!sizeKey) continue;
          const q = getStock(s);
          if (q <= 0) continue;
          row[sizeKey] = (row[sizeKey] ?? 0) + q;
        }
      }
    }
    const totalAll = Array.from(byFarmer.values()).reduce(
      (sum, qtyBySize) =>
        sum + Object.values(qtyBySize).reduce((a, b) => a + b, 0),
      0
    );
    return Array.from(byFarmer.entries())
      .map(([farmerName, quantitiesBySize]) => {
        const total = Object.values(quantitiesBySize).reduce(
          (a, b) => a + b,
          0
        );
        const percentage = totalAll > 0 ? (total / totalAll) * 100 : 0;
        return { farmerName, quantitiesBySize, total, percentage };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data, effectiveSelectedSize]);

  const sizeLabel =
    effectiveSelectedSize === TAB_VALUE_ALL
      ? 'All sizes'
      : effectiveSelectedSize;

  const hasFilters =
    (params.area?.trim()?.length ?? 0) > 0 ||
    (params.variety?.trim()?.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <BarChart3 className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                {title}
              </ItemTitle>
            </div>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                className="font-custom focus-visible:ring-primary h-8 gap-2 rounded-lg px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                aria-label="Refresh area breakdown"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-busy={isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 shrink-0 ${
                    isFetching ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        {!hasFilters && (
          <p className="font-custom text-muted-foreground text-sm">
            No filters selected. Navigate from Analytics → Grading → Area-wise
            table and click an area/variety to see breakdown.
          </p>
        )}

        {hasFilters && isLoading && (
          <p className="text-muted-foreground font-custom text-sm">Loading…</p>
        )}
        {hasFilters && error && (
          <p className="font-custom text-destructive text-sm">
            Failed to load area breakdown.
          </p>
        )}

        {hasFilters && data && (
          <>
            {preferenceSizes.length > 0 && (
              <Tabs
                value={effectiveSelectedSize}
                onValueChange={(v) => setSelectedBagSize(v)}
                className="w-full"
              >
                <TabsList className="font-custom flex h-9 w-full flex-wrap items-center">
                  {tabTriggers.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(area || variety) && (
                <Card className="border-border rounded-xl shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="font-custom text-muted-foreground text-sm font-medium">
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-custom flex flex-wrap gap-2 text-sm">
                      {area && (
                        <span className="border-border bg-muted/50 text-foreground inline-flex items-center rounded-full border px-3 py-1 font-medium">
                          Area: {area}
                        </span>
                      )}
                      {variety && (
                        <span className="border-border bg-muted/50 text-foreground inline-flex items-center rounded-full border px-3 py-1 font-medium">
                          Variety: {variety}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card className="border-border rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="font-custom text-muted-foreground text-sm font-medium">
                    Total quantity
                  </CardTitle>
                  <Package className="text-primary h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <p className="font-custom text-primary text-2xl font-bold tabular-nums">
                    {totalQuantity.toLocaleString('en-IN')}
                  </p>
                  <p className="font-custom text-muted-foreground text-xs">
                    bags
                  </p>
                </CardContent>
              </Card>
            </div>

            <FarmerQuantityTable
              rows={tableRows}
              sizeLabel={sizeLabel}
              sizeColumns={
                sizeColumnsForTable.length > 0 ? sizeColumnsForTable : undefined
              }
              rowsAllSizes={
                sizeColumnsForTable.length > 0 ? tableRowsAllSizes : undefined
              }
              quantityColumnLabel={
                effectiveSelectedSize !== TAB_VALUE_ALL
                  ? effectiveSelectedSize
                  : undefined
              }
            />

            <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              <SizeWiseDistributionChart data={sizeWiseChartData} />
              <FarmerWiseShareChart data={farmerWiseChartData} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
