import { memo, useState, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { usePreferencesStore } from '@/stores/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  GradingGatePass,
  GradingGatePassEditRouterState,
} from '@/types/grading-gate-pass';
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Printer,
  User,
  Package,
  Layers,
  AlertTriangle,
  Calculator,
  ArrowDownToLine,
  Hash,
  FileText,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

import { CalculationsDialog } from './calculations-dialog';
import {
  calculateIncomingMetrics,
  calculateGradingMetrics,
  DEFAULT_BAG_WEIGHTS,
  formatNumber,
} from './grading-calculations';

function getFarmerStorageLink(pass: GradingGatePass) {
  const raw = pass.incomingGatePassIds?.[0]?.farmerStorageLinkId;
  if (!raw || typeof raw !== 'object') return undefined;
  return raw;
}

interface InfoBlockProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  valueClassName?: string;
}

const InfoBlock = ({
  label,
  value,
  icon: Icon,
  valueClassName,
}: InfoBlockProps) => (
  <div className="flex flex-col gap-1">
    <span className="text-muted-foreground font-custom flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase">
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
    <span
      className={`text-foreground font-custom truncate text-xs font-semibold sm:text-sm ${valueClassName ?? ''}`}
    >
      {value}
    </span>
  </div>
);

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export interface GradingVoucherCardProps {
  gradingGatePass: GradingGatePass;
}

function GradingVoucherCardComponent({
  gradingGatePass,
}: GradingVoucherCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const navigate = useNavigate();

  const handleEditClick = () => {
    const routerState = {
      gradingGatePass,
    } satisfies GradingGatePassEditRouterState;
    navigate({
      to: '/store-admin/grading-gate-pass/edit',
      search: { id: gradingGatePass._id },
      state: (prev) => ({ ...prev, ...routerState }),
    });
  };

  const jutePref = usePreferencesStore(
    (s) => s.preferences?.custom?.bagConfig?.juteBagWeight
  );
  const lenoPref = usePreferencesStore(
    (s) => s.preferences?.custom?.bagConfig?.lenoBagWeight
  );
  const bagWeights = useMemo((): Record<string, number> => {
    if (Number.isFinite(jutePref) && Number.isFinite(lenoPref)) {
      return { JUTE: jutePref!, LENO: lenoPref! };
    }
    return DEFAULT_BAG_WEIGHTS;
  }, [jutePref, lenoPref]);

  const { incoming, grading } = useMemo(() => {
    const inc = calculateIncomingMetrics(
      gradingGatePass.incomingGatePassIds ?? [],
      bagWeights
    );
    const grad = calculateGradingMetrics(
      gradingGatePass.orderDetails ?? [],
      inc.totals.totalNetProductKg,
      bagWeights
    );
    return { incoming: inc, grading: grad };
  }, [bagWeights, gradingGatePass]);

  const farmerLink = getFarmerStorageLink(gradingGatePass);
  const farmer = farmerLink?.farmerId;

  return (
    <>
      <Card className="border-border/40 bg-card hover:border-primary/40 relative overflow-hidden rounded-xl pt-0 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md">
        <div className="bg-muted/15 border-border/50 flex flex-col justify-between gap-3 border-b px-3 pt-2 pb-3 sm:flex-row sm:items-start sm:px-4 sm:pt-3 sm:pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
              <h3 className="text-foreground font-custom text-sm font-bold tracking-tight sm:text-base">
                GGP{' '}
                <span className="text-primary">
                  #{gradingGatePass.gatePassNo}
                </span>
              </h3>
              {gradingGatePass.manualGatePassNumber != null ? (
                <Badge
                  variant="secondary"
                  className="font-custom px-2 py-0.5 text-[10px] font-medium"
                >
                  Manual #{gradingGatePass.manualGatePassNumber}
                </Badge>
              ) : null}
            </div>
            <p className="text-muted-foreground font-custom mt-1 text-[11px] sm:text-xs">
              {formatDateTime(gradingGatePass.date)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              variant="outline"
              className="bg-background font-custom px-2 py-0.5 text-[10px] font-medium"
            >
              {formatNumber(grading.totals.totalInitial)} Bags
            </Badge>
          </div>
        </div>

        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            <InfoBlock label="Farmer" value={farmer?.name ?? '—'} icon={User} />
            <InfoBlock
              label="Account"
              value={
                farmerLink?.accountNumber != null
                  ? `#${farmerLink.accountNumber}`
                  : '—'
              }
              icon={Hash}
            />
            <InfoBlock
              label="Variety"
              value={gradingGatePass.variety}
              icon={Package}
            />
            <InfoBlock
              label="Grader"
              value={gradingGatePass.grader ?? '—'}
              icon={Layers}
            />
          </div>
        </div>

        <div className="bg-muted/10 border-border/50 flex items-center justify-between border-t px-3 py-2.5 sm:px-4">
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((p) => !p)}
              className="text-muted-foreground font-custom hover:text-foreground h-8 px-2 text-xs font-medium"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1.5 h-3.5 w-3.5" /> More
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalculationsOpen(true)}
              className="font-custom inline-flex h-8 gap-1 px-2 text-xs font-medium"
              aria-label="Open calculations explained"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Calculations</span>
            </Button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="font-custom h-8 w-8 p-0"
              onClick={handleEditClick}
              aria-label={`Edit grading gate pass ${gradingGatePass.gatePassNo}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-custom h-8 w-8 p-0"
              aria-label={`Print grading gate pass ${gradingGatePass.gatePassNo}`}
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-border/50 animate-in slide-in-from-top-2 fade-in border-t p-3 duration-200 sm:p-4">
            <div className="space-y-4">
              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <ArrowDownToLine className="text-primary h-4 w-4" />
                  Source: Incoming Gate Passes
                </h4>
                <div className="border-border/50 mt-2 overflow-hidden rounded-lg border">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
                      <thead className="bg-muted/50 text-muted-foreground font-custom text-[10px] font-semibold tracking-wide uppercase sm:text-xs">
                        <tr>
                          <th className="px-3 py-2 sm:px-4 sm:py-2.5">
                            Gate Pass No.
                          </th>
                          <th className="px-3 py-2 sm:px-4 sm:py-2.5">
                            Location
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Bags
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Gross (kg)
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Tare (kg)
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Net (kg)
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Bardana (kg)
                          </th>
                          <th className="bg-primary/5 text-primary px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Net Product
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-border/40 divide-y">
                        {incoming.rows.map((row) => (
                          <tr
                            key={row._id}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="text-foreground px-3 py-2 font-medium sm:px-4 sm:py-2.5">
                              #{row.gatePassNo}{' '}
                              {row.manualGatePassNumber != null ? (
                                <span className="text-muted-foreground font-normal">
                                  (M: {row.manualGatePassNumber})
                                </span>
                              ) : null}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 sm:px-4 sm:py-2.5">
                              {row.location ?? '—'}
                            </td>
                            <td className="text-foreground px-3 py-2 text-right font-medium sm:px-4 sm:py-2.5">
                              {formatNumber(row.bagsReceived ?? 0)}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 text-right sm:px-4 sm:py-2.5">
                              {formatNumber(row.weightSlip?.grossWeightKg ?? 0)}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 text-right sm:px-4 sm:py-2.5">
                              {formatNumber(row.weightSlip?.tareWeightKg ?? 0)}
                            </td>
                            <td className="text-foreground px-3 py-2 text-right font-medium sm:px-4 sm:py-2.5">
                              {formatNumber(row.baseNetKg)}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 text-right sm:px-4 sm:py-2.5">
                              {formatNumber(row.bardanaKg)}
                            </td>
                            <td className="bg-primary/5 text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                              {formatNumber(row.netProductKg)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-primary/5 border-primary/20 border-t-2">
                        <tr>
                          <td
                            className="text-primary px-3 py-2 font-bold sm:px-4 sm:py-2.5"
                            colSpan={2}
                          >
                            Totals
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(incoming.totals.totalBags)}
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(incoming.totals.totalGrossKg)}
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(incoming.totals.totalTareKg)}
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(incoming.totals.totalBaseNetKg)}
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(incoming.totals.totalBardanaKg)}
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(incoming.totals.totalNetProductKg)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                  <LayoutGrid className="text-primary h-4 w-4" />
                  Graded Output Details
                </h4>
                <div className="border-border/50 mt-2 overflow-hidden rounded-lg border">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
                      <thead className="bg-muted/50 text-muted-foreground font-custom text-[10px] font-semibold tracking-wide uppercase sm:text-xs">
                        <tr>
                          <th className="px-3 py-2 sm:px-4 sm:py-2.5">Size</th>
                          <th className="px-3 py-2 sm:px-4 sm:py-2.5">
                            Bag Type
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Wt/Bag (kg)
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Bag wt (kg)
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Deduction (kg)
                          </th>
                          <th className="px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Net (kg)
                          </th>
                          <th className="bg-primary/5 text-primary px-3 py-2 text-right sm:px-4 sm:py-2.5">
                            Weight %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-border/40 divide-y">
                        {grading.rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="text-foreground px-3 py-2 font-medium sm:px-4 sm:py-2.5">
                              {row.size}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 sm:px-4 sm:py-2.5">
                              {row.bagType}
                            </td>
                            <td className="text-foreground px-3 py-2 text-right font-medium sm:px-4 sm:py-2.5">
                              {formatNumber(row.initialQuantity)}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 text-right sm:px-4 sm:py-2.5">
                              {formatNumber(row.weightPerBagKg)}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 text-right sm:px-4 sm:py-2.5">
                              {formatNumber(row.bagWt)}
                            </td>
                            <td className="text-muted-foreground px-3 py-2 text-right sm:px-4 sm:py-2.5">
                              {formatNumber(row.deductionKg)}
                            </td>
                            <td className="text-foreground px-3 py-2 text-right font-medium sm:px-4 sm:py-2.5">
                              {formatNumber(row.netKg)}
                            </td>
                            <td className="bg-primary/5 text-primary px-3 py-2 text-right font-semibold sm:px-4 sm:py-2.5">
                              {formatNumber(row.weightPct)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-primary/5 border-primary/20 border-t-2">
                        <tr>
                          <td
                            className="text-primary px-3 py-2 font-bold sm:px-4 sm:py-2.5"
                            colSpan={2}
                          >
                            Totals
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(grading.totals.totalInitial)}
                          </td>
                          <td className="px-3 py-2 sm:px-4 sm:py-2.5" />
                          <td className="px-3 py-2 sm:px-4 sm:py-2.5" />
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(grading.totals.totalDeductionKg)}
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(grading.totals.totalNetKg)}
                          </td>
                          <td className="text-primary px-3 py-2 text-right font-bold sm:px-4 sm:py-2.5">
                            {formatNumber(grading.totals.totalGradedPct)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <section>
                  <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                    <Calculator className="text-primary h-4 w-4" />
                    Performance Metrics
                  </h4>
                  <div className="mt-2.5 space-y-2.5">
                    <div className="border-primary/20 bg-primary/5 flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="bg-primary/20 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                          <Package className="text-primary h-3.5 w-3.5" />
                        </div>
                        <span className="text-primary font-custom truncate text-xs font-medium">
                          Total Graded Weight
                        </span>
                      </div>
                      <span className="text-primary font-custom shrink-0 text-right text-xs font-bold sm:text-sm">
                        {formatNumber(grading.totals.totalNetKg)} kg
                        <span className="text-primary/70 ml-1.5 block text-[10px] font-normal sm:inline sm:text-xs">
                          ({formatNumber(grading.totals.totalGradedPct)}% of
                          net)
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/20">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <span className="font-custom truncate text-xs font-medium text-amber-700 dark:text-amber-500">
                          Grading Wastage
                        </span>
                      </div>
                      <span className="shrink-0 text-right text-xs font-bold text-amber-700 sm:text-sm dark:text-amber-500">
                        {formatNumber(grading.totals.wastageKg)} kg
                        <span className="ml-1.5 block text-[10px] font-normal text-amber-700/70 sm:inline sm:text-xs dark:text-amber-500/70">
                          ({formatNumber(grading.totals.wastagePct)}% of net)
                        </span>
                      </span>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="text-foreground font-custom flex items-center gap-2 text-xs font-semibold">
                    <FileText className="text-primary h-4 w-4" />
                    System Remarks
                  </h4>
                  <div className="bg-muted/30 mt-2.5 flex flex-col rounded-lg p-3">
                    <span className="text-muted-foreground font-custom text-[10px] font-medium tracking-wide uppercase">
                      Operator note
                    </span>
                    <p className="text-muted-foreground font-custom mt-1.5 text-xs leading-relaxed">
                      {gradingGatePass.remarks ?? '—'}
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </Card>
      <CalculationsDialog
        open={calculationsOpen}
        onOpenChange={setCalculationsOpen}
        bagWeights={bagWeights}
        summary={{
          incomingNetProductKg: incoming.totals.totalNetProductKg,
          totalGradedNetKg: grading.totals.totalNetKg,
          wastageKg: grading.totals.wastageKg,
          totalGradedPct: grading.totals.totalGradedPct,
          wastagePct: grading.totals.wastagePct,
        }}
      />
    </>
  );
}

export const GradingVoucherCard = memo(GradingVoucherCardComponent);
