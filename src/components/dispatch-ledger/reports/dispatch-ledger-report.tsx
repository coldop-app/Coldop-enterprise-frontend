import { getRouteApi } from '@tanstack/react-router';
import {
  Building2,
  CalendarDays,
  FileText,
  MapPin,
  Package,
  Phone,
  Truck,
  UserRound,
} from 'lucide-react';
import { memo, useMemo } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
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
import { sizeLabelsWithAnyQuantity } from '@/components/people/reports/helpers/grading-prepare';
import { useGetAllGatePassesOfDispatchLedger } from '@/services/store-admin/dispatch-ledger/useGetAllGatePassesOfDispatchLedger';
import { usePermissionsStore } from '@/stores/usePermissionsStore';
import { useStore } from '@/stores/store';
import { DispatchLedgerReportExcelButton } from './dispatch-ledger-report-excel-button';
import {
  allocatedNetKgForVariety,
  bagsForVarietyOnPass,
  buildDispatchVarietySizeLabelsOrdered,
  computeDispatchVarietyTotals,
  dispatchReportVarietyKeys,
  EMPTY_BAG_LINES_KEY,
  formatDateRangeLabel,
  formatDisplayDate,
  gatePassesForDispatchVariety,
  sizeQuantitiesForPassAndVariety,
  sortGatePassesNewestFirst,
  varietySectionTitle,
} from './dispatch-ledger-report-helpers';

const routeApi = getRouteApi(
  '/store-admin/_authenticated/people/dispatch-ledger/$id/dispatch-ledger-report/'
);

function formatIndianInteger(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatWeightKg(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function fetchErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}

const DispatchLedgerReport = () => {
  const { id } = routeApi.useParams();
  const coldStorageName = useStore(
    (state) => state.coldStorage?.name?.trim() || 'Cold Storage'
  );
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const canReadFarmerProfile = hasPermission('farmer-profile', 'read');

  const { data, isLoading, isError, error } =
    useGetAllGatePassesOfDispatchLedger({
      dispatchLedgerId: id,
      enabled: canReadFarmerProfile,
    });

  const ledger = data?.dispatchLedger ?? null;
  const summary = data?.summary;

  const sortedPasses = useMemo(() => {
    const passes = data?.nikasiGatePasses ?? [];
    return sortGatePassesNewestFirst(passes);
  }, [data?.nikasiGatePasses]);

  const reportGeneratedOn = useMemo(() => formatDisplayDate(new Date()), []);
  const reportPeriodLabel = useMemo(
    () => formatDateRangeLabel(sortedPasses.map((row) => row.date)),
    [sortedPasses]
  );

  const totals = useMemo(() => {
    let netWeight = 0;
    for (const gp of sortedPasses) {
      if (Number.isFinite(gp.netWeight)) netWeight += gp.netWeight;
    }
    return { netWeight };
  }, [sortedPasses]);

  const dispatchVarietyKeys = useMemo(
    () => dispatchReportVarietyKeys(sortedPasses),
    [sortedPasses]
  );

  const permissionDenied = !canReadFarmerProfile;

  return (
    <main className="from-background via-muted/20 to-background mx-auto max-w-7xl bg-linear-to-b p-3 sm:p-4 lg:p-6">
      <Card className="border-border/50 ring-primary/5 overflow-hidden rounded-2xl border py-0 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_10px_28px_rgba(0,0,0,0.06)] ring-1">
        <CardContent className="p-0">
          <div className="from-primary/10 via-primary/5 to-background border-border/40 border-b bg-linear-to-r px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="font-custom text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
                  Dispatch report
                </p>
                <h1 className="font-custom text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                  {coldStorageName}
                </h1>
                <p className="font-custom text-muted-foreground text-sm">
                  Nikasi gate passes for this dispatch ledger
                </p>
              </div>

              <div className="border-border/50 bg-card/90 rounded-xl border px-3 py-2 text-right">
                <p className="font-custom text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Powered by
                </p>
                <p className="font-custom text-primary text-base font-bold tracking-wide">
                  COLDOP
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8 px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Generated on
                </p>
                <p className="font-custom text-foreground text-sm font-semibold">
                  {reportGeneratedOn}
                </p>
              </div>
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <FileText className="h-3.5 w-3.5" />
                  Report period
                </p>
                <p className="font-custom text-foreground text-sm font-semibold">
                  {reportPeriodLabel}
                </p>
              </div>
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <Package className="h-3.5 w-3.5" />
                  Gate passes
                </p>
                <p className="font-custom text-foreground text-sm font-semibold">
                  {summary?.gatePassCount ?? sortedPasses.length}
                </p>
              </div>
              <div className="border-border/50 bg-card rounded-xl border p-3">
                <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                  <Building2 className="h-3.5 w-3.5" />
                  Total bags dispatched
                </p>
                <p className="font-custom text-foreground text-sm font-semibold">
                  {(summary?.totalBagsDispatched ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {ledger ? (
              <section className="border-border/40 space-y-3 rounded-xl border p-3 sm:p-4">
                <h2 className="font-custom text-foreground text-lg font-semibold sm:text-xl">
                  Dispatch ledger
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                      <UserRound className="h-3.5 w-3.5" />
                      Name
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      {ledger.name}
                    </p>
                  </div>
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                      <Phone className="h-3.5 w-3.5" />
                      Mobile
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      {ledger.mobileNumber || '—'}
                    </p>
                  </div>
                  <div className="border-border/50 bg-card rounded-xl border p-3">
                    <p className="font-custom text-muted-foreground mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                      <MapPin className="h-3.5 w-3.5" />
                      Address
                    </p>
                    <p className="font-custom text-foreground text-sm font-semibold">
                      {ledger.address || '—'}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="border-border/40 overflow-hidden rounded-xl border">
              <CardHeader className="border-border/40 bg-secondary/50 border-b px-3 py-3 sm:px-4 sm:py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="font-custom text-foreground text-lg font-semibold sm:text-xl">
                      Dispatch (nikasi)
                    </CardTitle>
                    <CardDescription className="font-custom text-muted-foreground leading-relaxed">
                      Gate passes grouped by variety. Bag counts use the same
                      size columns as the accounting grading report; net weight
                      is split by bag count when a pass lists multiple
                      varieties.
                    </CardDescription>
                  </div>
                  <DispatchLedgerReportExcelButton
                    coldStorageName={coldStorageName}
                    ledger={ledger}
                    sortedPasses={sortedPasses}
                    dispatchVarietyKeys={dispatchVarietyKeys}
                    totalsNetKg={totals.netWeight}
                    totalBagsSummary={summary?.totalBagsDispatched ?? 0}
                    reportPeriodLabel={reportPeriodLabel}
                    reportGeneratedOn={reportGeneratedOn}
                    disabled={
                      permissionDenied ||
                      isLoading ||
                      isError ||
                      sortedPasses.length === 0
                    }
                  />
                </div>
              </CardHeader>

              <div className="p-0">
                {permissionDenied ? (
                  <div className="p-4">
                    <Empty className="border-border/50 rounded-xl border py-12">
                      <EmptyHeader>
                        <EmptyTitle className="font-custom">
                          No access
                        </EmptyTitle>
                        <EmptyDescription className="font-custom">
                          You do not have permission to view this report.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : isLoading ? (
                  <div className="space-y-4 p-4">
                    <Skeleton className="font-custom text-muted-foreground h-[320px] w-full rounded-2xl" />
                  </div>
                ) : isError ? (
                  <div className="p-4">
                    <Empty className="border-border/50 rounded-xl border py-12">
                      <EmptyHeader>
                        <EmptyTitle className="font-custom">
                          Could not load dispatch data
                        </EmptyTitle>
                        <EmptyDescription className="font-custom">
                          {fetchErrorMessage(error)}
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : sortedPasses.length === 0 ? (
                  <div className="p-4">
                    <Empty className="border-border/50 rounded-xl border py-12">
                      <EmptyHeader>
                        <EmptyTitle className="font-custom">
                          No nikasi gate passes
                        </EmptyTitle>
                        <EmptyDescription className="font-custom">
                          This dispatch ledger has no nikasi gate passes yet.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </div>
                ) : (
                  <div className="space-y-10 px-3 py-4 sm:px-4 sm:py-5">
                    {dispatchVarietyKeys.map((varietyKey) => {
                      const passes = gatePassesForDispatchVariety(
                        sortedPasses,
                        varietyKey
                      );
                      const sizeLabelsOrdered =
                        buildDispatchVarietySizeLabelsOrdered(
                          passes,
                          varietyKey
                        );
                      const varietyTotals = computeDispatchVarietyTotals(
                        passes,
                        varietyKey,
                        sizeLabelsOrdered
                      );
                      const visibleSizeLabels =
                        varietyKey === EMPTY_BAG_LINES_KEY
                          ? []
                          : sizeLabelsWithAnyQuantity(
                              sizeLabelsOrdered,
                              varietyTotals
                            );
                      const footerAvgKgPerBag =
                        varietyKey === EMPTY_BAG_LINES_KEY
                          ? Number.NaN
                          : varietyTotals.totalBags > 0
                            ? varietyTotals.totalKg / varietyTotals.totalBags
                            : Number.NaN;

                      return (
                        <div key={varietyKey} className="space-y-2">
                          <h3 className="font-custom text-foreground text-base font-semibold tracking-tight sm:text-lg">
                            {varietySectionTitle(varietyKey)}
                          </h3>
                          <div className="border-border/50 overflow-x-auto rounded-xl border">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                  <TableHead className="font-custom w-[1%] pl-3 whitespace-nowrap sm:pl-4">
                                    Manual #
                                  </TableHead>
                                  <TableHead className="font-custom whitespace-nowrap">
                                    Date
                                  </TableHead>
                                  <TableHead className="font-custom">
                                    To
                                  </TableHead>
                                  <TableHead className="font-custom whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1">
                                      <Truck className="text-muted-foreground h-3.5 w-3.5" />
                                      Truck
                                    </span>
                                  </TableHead>
                                  {visibleSizeLabels.map((label) => (
                                    <TableHead
                                      key={label}
                                      className="font-custom text-foreground/75 min-w-22 text-right text-[11px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase"
                                    >
                                      <div className="w-full text-right">
                                        {label}{' '}
                                        <span className="font-custom tracking-normal normal-case">
                                          (mm)
                                        </span>
                                      </div>
                                    </TableHead>
                                  ))}
                                  <TableHead className="font-custom text-right whitespace-nowrap">
                                    Net (kg)
                                  </TableHead>
                                  <TableHead className="font-custom text-right whitespace-nowrap">
                                    Avg / bag
                                  </TableHead>
                                  <TableHead className="font-custom max-w-56 min-w-32 pr-3 whitespace-normal sm:pr-4">
                                    Remarks
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {passes.map((gp) => {
                                  const sizeQty =
                                    varietyKey === EMPTY_BAG_LINES_KEY
                                      ? {}
                                      : sizeQuantitiesForPassAndVariety(
                                          gp,
                                          varietyKey
                                        );
                                  const rowBags = bagsForVarietyOnPass(
                                    gp,
                                    varietyKey
                                  );
                                  const rowNet = allocatedNetKgForVariety(
                                    gp,
                                    varietyKey
                                  );
                                  const rowAvg =
                                    varietyKey === EMPTY_BAG_LINES_KEY
                                      ? gp.averageWeightPerBag
                                      : rowBags > 0
                                        ? rowNet / rowBags
                                        : Number.NaN;

                                  return (
                                    <TableRow key={`${varietyKey}__${gp._id}`}>
                                      <TableCell className="font-custom text-muted-foreground pl-3 sm:pl-4">
                                        {gp.manualGatePassNumber != null
                                          ? gp.manualGatePassNumber
                                          : '—'}
                                      </TableCell>
                                      <TableCell className="font-custom whitespace-nowrap">
                                        {formatDisplayDate(new Date(gp.date))}
                                      </TableCell>
                                      <TableCell className="font-custom max-w-40 whitespace-normal">
                                        {gp.to || '—'}
                                      </TableCell>
                                      <TableCell className="font-custom whitespace-nowrap">
                                        {gp.truckNumber || '—'}
                                      </TableCell>
                                      {visibleSizeLabels.map((label) => {
                                        const n = sizeQty[label] ?? 0;
                                        return (
                                          <TableCell
                                            key={label}
                                            className="font-custom text-right font-medium tabular-nums"
                                          >
                                            {n === 0
                                              ? ''
                                              : formatIndianInteger(n)}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="font-custom text-right font-medium tabular-nums">
                                        {formatWeightKg(rowNet)}
                                      </TableCell>
                                      <TableCell className="font-custom text-muted-foreground text-right tabular-nums">
                                        {Number.isFinite(rowAvg)
                                          ? formatWeightKg(rowAvg)
                                          : '—'}
                                      </TableCell>
                                      <TableCell
                                        className="font-custom text-muted-foreground max-w-56 truncate pr-3 sm:pr-4"
                                        title={gp.remarks?.trim() || undefined}
                                      >
                                        {gp.remarks?.trim() || '—'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                              <TableFooter>
                                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                                  <TableCell
                                    className="font-custom pl-3 font-semibold sm:pl-4"
                                    colSpan={4}
                                  >
                                    Totals ({passes.length} passes)
                                  </TableCell>
                                  {visibleSizeLabels.map((label) => {
                                    const n =
                                      varietyTotals.bySize[label]?.bags ?? 0;
                                    return (
                                      <TableCell
                                        key={label}
                                        className="font-custom text-right font-semibold tabular-nums"
                                      >
                                        {n === 0 ? '' : formatIndianInteger(n)}
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="font-custom text-right font-semibold tabular-nums">
                                    {formatWeightKg(varietyTotals.totalKg)}
                                  </TableCell>
                                  <TableCell className="font-custom text-right font-semibold tabular-nums">
                                    {Number.isFinite(footerAvgKgPerBag)
                                      ? formatWeightKg(footerAvgKgPerBag)
                                      : '—'}
                                  </TableCell>
                                  <TableCell className="font-custom text-muted-foreground pr-3 text-xs sm:pr-4">
                                    {varietyKey === EMPTY_BAG_LINES_KEY
                                      ? '—'
                                      : `Total bags (this variety): ${formatIndianInteger(varietyTotals.totalBags)}`}
                                  </TableCell>
                                </TableRow>
                              </TableFooter>
                            </Table>
                          </div>
                        </div>
                      );
                    })}

                    <div className="border-border/50 bg-secondary/30 font-custom text-muted-foreground rounded-xl border px-3 py-3 text-sm sm:px-4">
                      <span className="text-foreground font-semibold">
                        Ledger overall
                      </span>
                      <span className="text-border mx-2">·</span>
                      Net (kg):{' '}
                      <span className="text-foreground font-medium tabular-nums">
                        {formatWeightKg(totals.netWeight)}
                      </span>
                      <span className="text-border mx-2">·</span>
                      Total bags (summary):{' '}
                      <span className="text-foreground font-medium tabular-nums">
                        {(summary?.totalBagsDispatched ?? 0).toLocaleString(
                          'en-IN'
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default memo(DispatchLedgerReport);
