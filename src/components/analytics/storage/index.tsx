import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useGetStorageSummary } from '@/services/store-admin/analytics/storage/useGetStorageSummary';
import type {
  VarietyStockSummary,
  SizeQuantity,
} from '@/services/store-admin/analytics/storage/useGetStorageSummary';
import type { GetStorageTrendParams } from '@/services/store-admin/analytics/storage/useGetStorageTrendAnalysis';
import { StorageSummaryTable } from './StorageSummaryTable';
import StorageTrendAnalysisChart from './StorageTrendAnalysisChart';
import type { StorageSummaryVarietyItem } from '@/types/analytics';

/** Preferred column order for size names (others appended) */
const SIZE_ORDER = [
  'Below 25',
  '25–30',
  'Below 30',
  '30–35',
  '35–40',
  '30–40',
  '40–45',
  '45–50',
  '50–55',
  'Above 50',
  'Above 55',
  'Cut',
];

function orderedSizes(varieties: StorageSummaryVarietyItem[]): string[] {
  const set = new Set<string>();
  varieties.forEach((v) => v.sizes.forEach((s) => set.add(s.size)));
  const rest = [...set].filter((s) => !SIZE_ORDER.includes(s)).sort();
  return [...SIZE_ORDER.filter((s) => set.has(s)), ...rest];
}

/** Map API response to VarietyStockSummary[] and ordered sizes for StorageSummaryTable */
function toStockSummary(varieties: StorageSummaryVarietyItem[]): {
  stockSummary: VarietyStockSummary[];
  sizes: string[];
} {
  const sizes = orderedSizes(varieties);
  const stockSummary: VarietyStockSummary[] = varieties.map((v) => ({
    variety: v.variety,
    sizes: v.sizes.map(
      (s): SizeQuantity => ({
        size: s.size,
        initialQuantity: s.initialQuantity,
        currentQuantity: s.currentQuantity,
      })
    ),
  }));
  return { stockSummary, sizes };
}

export interface StorageAnalyticsScreenProps {
  dateParams?: GetStorageTrendParams;
}

export default function StorageAnalyticsScreen({
  dateParams = {},
}: StorageAnalyticsScreenProps) {
  const { data, isLoading, isError, error, refetch } =
    useGetStorageSummary(dateParams);

  const { stockSummary, sizes } = useMemo(() => {
    const varieties = data ?? [];
    if (varieties.length === 0) return { stockSummary: [], sizes: [] };
    return toStockSummary(varieties);
  }, [data]);

  if (isLoading) {
    return (
      <div className="font-custom space-y-6">
        <Card className="font-custom border-border overflow-hidden rounded-xl shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="font-custom border-border overflow-hidden rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="font-custom text-destructive text-sm font-semibold">
            {error?.message ?? 'Failed to load storage summary'}
          </p>
          <Button
            variant="outline"
            size="default"
            onClick={() => refetch()}
            className="font-custom mt-3 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (stockSummary.length === 0) {
    return (
      <div className="font-custom space-y-6">
        <Card className="font-custom border-border rounded-xl shadow-sm">
          <CardContent className="p-4 py-8 sm:p-5">
            <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
              Stock Summary
            </h2>
            <p className="font-custom text-muted-foreground mt-2 text-sm">
              No storage data yet. Bags will appear here once they are stored.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="font-custom space-y-6">
      <StorageSummaryTable
        stockSummary={stockSummary}
        sizes={sizes}
        onCellClick={undefined}
      />
      <StorageTrendAnalysisChart dateParams={dateParams} />
    </div>
  );
}
