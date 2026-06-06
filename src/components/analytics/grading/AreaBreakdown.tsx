import { memo, useMemo } from 'react';
import { MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAreaBreakdown } from '@/services/store-admin/grading-gate-pass/analytics/useGetAreaBreakdown';
import AreaBreakdownFarmersTable from './AreaBreakdownFarmersTable';
import AreaBreakdownSizeChart from './AreaBreakdownSizeChart';
import {
  aggregateSizeTotals,
  buildFarmerRows,
  buildSizeDistributionSlices,
  collectSizeKeys,
  formatBreakdownNumber,
  resolveSizeFilterKey,
} from './area-breakdown-utils';

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

type AreaBreakdownPageProps = {
  area?: string;
  variety?: string;
  size?: string;
};

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/50 bg-card/95 rounded-xl shadow-sm">
      <CardContent className="space-y-1 p-4">
        <p className="font-custom text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="font-custom text-foreground text-2xl font-bold tabular-nums">
          {value}
        </p>
        {hint ? (
          <p className="font-custom text-muted-foreground text-xs">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

const AreaBreakdownPage = ({ area, variety, size }: AreaBreakdownPageProps) => {
  const { data, isLoading, isError, error } = useGetAreaBreakdown({
    area,
    variety,
  });

  const farmers = useMemo(() => data?.farmers ?? [], [data?.farmers]);

  const sizeKeys = useMemo(() => collectSizeKeys(farmers), [farmers]);
  const selectedSizeKey = useMemo(
    () => resolveSizeFilterKey(sizeKeys, size),
    [size, sizeKeys]
  );
  const farmerRows = useMemo(
    () => buildFarmerRows(farmers, sizeKeys),
    [farmers, sizeKeys]
  );
  const sizeTotals = useMemo(
    () => aggregateSizeTotals(farmerRows, sizeKeys),
    [farmerRows, sizeKeys]
  );
  const totalBags = useMemo(
    () => farmerRows.reduce((sum, row) => sum + row.total, 0),
    [farmerRows]
  );
  const dominantSize = useMemo(() => {
    const slices = buildSizeDistributionSlices(
      sizeTotals,
      sizeKeys,
      CHART_COLORS
    );
    return slices.sort((a, b) => b.value - a.value)[0];
  }, [sizeKeys, sizeTotals]);

  const filterSummary = [area, variety, selectedSizeKey ?? size]
    .filter(Boolean)
    .join(' · ');

  if (!area?.trim()) {
    return (
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <p className="font-custom rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Area is required. Open this page from the area-wise distribution
          table.
        </p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <p className="font-custom rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : 'Failed to load area breakdown'}
        </p>
      </main>
    );
  }

  if (farmers.length === 0) {
    return (
      <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
        <div className="space-y-4">
          <PageHeader filterSummary={filterSummary} />
          <Card className="border-border rounded-xl shadow-sm">
            <CardContent className="p-6">
              <p className="font-custom text-muted-foreground text-sm">
                No farmers found for this area
                {variety ? ` and variety (${variety})` : ''}.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        <PageHeader filterSummary={filterSummary} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Farmers"
            value={formatBreakdownNumber(farmers.length)}
            hint={`In ${area}`}
          />
          <SummaryCard
            label="Total Bags"
            value={formatBreakdownNumber(totalBags)}
            hint={variety ? variety : 'All varieties'}
          />
          <SummaryCard
            label="Dominant Size"
            value={dominantSize?.name ?? '-'}
            hint={
              dominantSize
                ? `${formatBreakdownNumber(dominantSize.value)} bags · ${dominantSize.percentage.toFixed(1)}%`
                : undefined
            }
          />
          {selectedSizeKey ? (
            <SummaryCard
              label="Selected Size"
              value={selectedSizeKey}
              hint={`${formatBreakdownNumber(sizeTotals[selectedSizeKey] ?? 0)} bags in ${area}`}
            />
          ) : (
            <SummaryCard
              label="Size Columns"
              value={formatBreakdownNumber(sizeKeys.length)}
              hint="Grading size buckets"
            />
          )}
        </div>

        <AreaBreakdownSizeChart
          area={area}
          variety={variety}
          sizeKeys={sizeKeys}
          sizeTotals={sizeTotals}
          selectedSizeKey={selectedSizeKey}
        />

        <AreaBreakdownFarmersTable
          area={area}
          variety={variety}
          farmers={farmerRows}
          sizeKeys={sizeKeys}
          sizeTotals={sizeTotals}
          selectedSizeKey={selectedSizeKey}
        />
      </div>
    </main>
  );
};

function PageHeader({ filterSummary }: { filterSummary: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="font-custom text-2xl font-bold text-[#333]">
            Area Breakdown
          </h1>
          <p className="font-custom text-muted-foreground text-sm">
            {filterSummary}
          </p>
        </div>
      </div>
      <div className="font-custom text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
        <Users className="h-4 w-4" />
        <span>Farmer-level grading stock by size</span>
      </div>
    </div>
  );
}

export default memo(AreaBreakdownPage);
