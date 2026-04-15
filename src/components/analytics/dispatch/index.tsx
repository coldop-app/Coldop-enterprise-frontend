import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useGetNikasiGatePassSummary } from '@/services/store-admin/analytics/nikasi/useGetNikasiGatePassSummary';
import type { NikasiSummaryVarietyItem } from '@/types/analytics';
import { DispatchSummaryTable } from './DispatchSummaryTable';

/** Preferred column order for size names (others appended alphabetically) — aligned with storage summary */
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

function orderedSizes(varieties: NikasiSummaryVarietyItem[]): string[] {
  const set = new Set<string>();
  varieties.forEach((v) => v.sizes.forEach((s) => set.add(s.size)));
  const rest = [...set].filter((s) => !SIZE_ORDER.includes(s)).sort();
  return [...SIZE_ORDER.filter((s) => set.has(s)), ...rest];
}

export interface DispatchDateParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface DispatchAnalyticsScreenProps {
  dateParams?: DispatchDateParams;
}

export default function DispatchAnalyticsScreen({
  dateParams = {},
}: DispatchAnalyticsScreenProps) {
  const { data, isLoading, isError, error, refetch } =
    useGetNikasiGatePassSummary({
      dateFrom: dateParams.dateFrom,
      dateTo: dateParams.dateTo,
    });

  const varieties = data ?? [];
  const sizes = useMemo(
    () => (varieties.length > 0 ? orderedSizes(varieties) : []),
    [varieties]
  );

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
            {error?.message ?? 'Failed to load dispatch summary'}
          </p>
          <Button
            variant="outline"
            size="default"
            onClick={() => void refetch()}
            className="font-custom mt-3 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (varieties.length === 0) {
    return (
      <div className="font-custom space-y-6">
        <Card className="font-custom border-border rounded-xl shadow-sm">
          <CardContent className="p-4 py-8 sm:p-5">
            <h2 className="font-custom text-xl font-bold tracking-tight sm:text-2xl">
              Dispatch summary
            </h2>
            <p className="font-custom text-muted-foreground mt-2 text-sm leading-relaxed">
              No dispatch data for the selected filters.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="font-custom space-y-6">
      <DispatchSummaryTable
        varieties={varieties}
        sizes={sizes}
        tableTitle="Dispatch summary"
      />
    </div>
  );
}
