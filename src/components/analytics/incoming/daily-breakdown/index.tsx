import { useMemo } from 'react';
import { Link, useSearch } from '@tanstack/react-router';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import {
  Item,
  ItemHeader,
  ItemMedia,
  ItemTitle,
  ItemActions,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetIncomingDailyBreakdown } from '@/services/store-admin/analytics/incoming/useGetIncomingDailyBreakdown';
import { formatDisplayDate } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

function netWeightKg(
  pass: IncomingGatePassByFarmerStorageLinkItem
): number | null {
  const g = pass.weightSlip?.grossWeightKg;
  const t = pass.weightSlip?.tareWeightKg;
  if (typeof g === 'number' && typeof t === 'number') return g - t;
  return null;
}

export default function IncomingDailyBreakdownPage() {
  const { date } = useSearch({
    from: '/store-admin/_authenticated/analytics/incoming-daily-breakdown/',
  });

  const { data, isPending, isError, error, refetch, isFetching } =
    useGetIncomingDailyBreakdown(date ? { date } : {});

  const grandTotals = useMemo(() => {
    if (!data?.groups?.length) {
      return { locations: 0, gatePasses: 0, bags: 0 };
    }
    let gatePasses = 0;
    let bags = 0;
    for (const g of data.groups) {
      gatePasses += g.totals.gatePassCount;
      bags += g.totals.bagsReceived;
    }
    return {
      locations: data.groups.length,
      gatePasses,
      bags,
    };
  }, [data]);

  return (
    <main className="font-custom mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
          <ItemHeader className="h-full">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <Button variant="outline" size="icon-sm" asChild>
                <Link
                  to="/store-admin/analytics"
                  className="focus-visible:ring-primary shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  aria-label="Back to Analytics"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <ItemMedia variant="icon" className="rounded-lg">
                <Calendar className="text-primary h-5 w-5" />
              </ItemMedia>
              <div className="min-w-0">
                <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                  Incoming daily breakdown
                </ItemTitle>
                <p className="font-custom text-muted-foreground mt-0.5 text-xs leading-relaxed sm:text-sm">
                  Gate passes received on the selected day, grouped by location.
                </p>
              </div>
            </div>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                disabled={!date || isPending}
                onClick={() => refetch()}
                className="font-custom h-8 gap-2 rounded-lg px-3"
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

        {!date && (
          <Card className="rounded-xl border-dashed">
            <CardHeader>
              <CardTitle className="font-custom text-base font-semibold sm:text-lg">
                No day selected
              </CardTitle>
              <CardDescription className="font-custom text-sm leading-relaxed">
                Open{' '}
                <Link
                  to="/store-admin/analytics"
                  className="font-custom text-primary focus-visible:ring-primary font-medium underline-offset-4 transition-colors duration-200 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  Analytics
                </Link>
                , go to the Incoming tab, and choose a date in the daily
                activity table to see the breakdown for that day.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {date && (
          <div className="bg-secondary/40 border-border flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 sm:gap-3">
            <Calendar className="text-primary h-4 w-4 shrink-0" aria-hidden />
            <span className="font-custom text-foreground text-sm font-medium sm:text-base">
              {formatDisplayDate(date)}
            </span>
            <span className="font-custom text-muted-foreground text-xs sm:text-sm">
              ({date})
            </span>
          </div>
        )}

        {date && isPending && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton
                  key={i}
                  className="h-24 w-full rounded-xl"
                  aria-hidden
                />
              ))}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" aria-hidden />
          </div>
        )}

        {date && isError && (
          <Card className="border-destructive/30 rounded-xl">
            <CardHeader>
              <CardTitle className="font-custom text-destructive text-base font-semibold">
                Could not load breakdown
              </CardTitle>
              <CardDescription className="font-custom text-sm">
                {error instanceof Error
                  ? error.message
                  : 'Something went wrong.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="font-custom gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {date && !isPending && !isError && data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="font-custom flex items-center gap-2 text-xs font-medium">
                    <MapPin className="text-primary h-3.5 w-3.5" />
                    Locations
                  </CardDescription>
                  <CardTitle className="font-custom text-2xl font-bold tabular-nums">
                    {formatNumber(grandTotals.locations)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="font-custom flex items-center gap-2 text-xs font-medium">
                    <Package className="text-primary h-3.5 w-3.5" />
                    Gate passes
                  </CardDescription>
                  <CardTitle className="font-custom text-2xl font-bold tabular-nums">
                    {formatNumber(grandTotals.gatePasses)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="rounded-xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardDescription className="font-custom flex items-center gap-2 text-xs font-medium">
                    <Truck className="text-primary h-3.5 w-3.5" />
                    Bags received
                  </CardDescription>
                  <CardTitle className="font-custom text-2xl font-bold tabular-nums">
                    {formatNumber(grandTotals.bags)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {data.groups.length === 0 ? (
              <Card className="rounded-xl border-dashed">
                <CardContent className="font-custom text-muted-foreground py-10 text-center text-sm">
                  No incoming gate passes for this day.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {data.groups.map((group) => (
                  <Card
                    key={group.location}
                    className="overflow-hidden rounded-xl shadow-sm"
                  >
                    <CardHeader className="bg-muted/30 border-border border-b">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="font-custom text-base font-semibold sm:text-lg">
                            {group.location}
                          </CardTitle>
                          <CardDescription className="font-custom mt-1 text-xs sm:text-sm">
                            {formatNumber(group.totals.gatePassCount)} passes ·{' '}
                            {formatNumber(group.totals.bagsReceived)} bags
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table className="border-collapse">
                          <TableHeader>
                            <TableRow className="border-border bg-muted/50 hover:bg-muted/50">
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-xs font-semibold whitespace-nowrap sm:px-4">
                                GP #
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-xs font-semibold whitespace-nowrap sm:px-4">
                                Manual #
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-xs font-semibold whitespace-nowrap sm:min-w-40 sm:px-4">
                                Farmer
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap sm:px-4">
                                Acct
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-xs font-semibold whitespace-nowrap sm:px-4">
                                Variety
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap sm:px-4">
                                Bags
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-xs font-semibold whitespace-nowrap sm:px-4">
                                Slip
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-right text-xs font-semibold whitespace-nowrap sm:px-4">
                                Net kg
                              </TableHead>
                              <TableHead className="font-custom border-border border px-3 py-2.5 text-xs font-semibold whitespace-nowrap sm:px-4">
                                Status
                              </TableHead>
                              <TableHead className="font-custom border-border min-w-32 border px-3 py-2.5 text-xs font-semibold sm:min-w-48 sm:px-4">
                                Remarks
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.gatePasses.map((pass) => {
                              const farmer = pass.farmerStorageLinkId?.farmerId;
                              const acct =
                                pass.farmerStorageLinkId?.accountNumber;
                              const net = netWeightKg(pass);
                              return (
                                <TableRow
                                  key={pass._id}
                                  className="border-border hover:bg-muted/30"
                                >
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-sm tabular-nums sm:px-4">
                                    {formatNumber(pass.gatePassNo)}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-sm tabular-nums sm:px-4">
                                    {formatNumber(pass.manualGatePassNumber)}
                                  </TableCell>
                                  <TableCell className="font-custom border-border max-w-56 border px-3 py-2.5 text-sm sm:px-4">
                                    <span className="line-clamp-2">
                                      {farmer?.name ?? '—'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-right text-sm tabular-nums sm:px-4">
                                    {acct != null ? formatNumber(acct) : '—'}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-sm whitespace-nowrap sm:px-4">
                                    {pass.variety ?? '—'}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-right text-sm font-medium tabular-nums sm:px-4">
                                    {formatNumber(pass.bagsReceived ?? 0)}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-sm tabular-nums sm:px-4">
                                    {pass.weightSlip?.slipNumber ?? '—'}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-right text-sm tabular-nums sm:px-4">
                                    {net != null ? formatNumber(net) : '—'}
                                  </TableCell>
                                  <TableCell className="font-custom border-border border px-3 py-2.5 text-sm whitespace-nowrap sm:px-4">
                                    {pass.status ?? '—'}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      'font-custom border-border max-w-56 border px-3 py-2.5 text-sm text-gray-600 sm:max-w-72 sm:px-4'
                                    )}
                                  >
                                    <span className="line-clamp-2 sm:line-clamp-3">
                                      {pass.remarks?.trim() || '—'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
