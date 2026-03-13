import { memo, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import type {
  GradingGatePass,
  GradingGatePassIncomingRef,
} from '@/types/grading-gate-pass';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ClipboardList } from 'lucide-react';
import {
  BAG_TYPES,
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD, parseDateToTimestamp } from '@/lib/helpers';
import { toast } from 'sonner';

const DEFAULT_STORE = 'JICSPL-Bazpur';

/** Bag size column order: 30, 30-40, 35-40, 40-45, 45-50, 50-55, above 50, above 55, cut. */
const BAG_SIZE_ORDER: string[] = [
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

/** Short labels for bag size columns in BAG_SIZE_ORDER (e.g. B25, B30, A50). */
const BAG_SIZE_ORDER_LABELS: Record<string, string> = {
  'Below 30': 'B30',
  '30–40': '30-40',
  '35–40': '35-40',
  '40–45': '40-45',
  '45–50': '45-50',
  '50–55': '50-55',
  'Above 50': 'A50',
  'Above 55': 'A55',
  Cut: 'CUT',
};

/** Sizes that have at least one non-zero quantity across all passes. */
function getVisibleBagSizes(gradingPasses: GradingGatePass[]): string[] {
  const hasQty = new Set<string>();
  for (const pass of gradingPasses) {
    for (const d of pass.orderDetails ?? []) {
      if ((d.initialQuantity ?? 0) > 0 && d.size) hasQty.add(d.size);
    }
  }
  return BAG_SIZE_ORDER.filter((size) => hasQty.has(size));
}

/** Unique bag types present in orderDetails, in BAG_TYPES order. */
function getBagTypesForPass(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): string[] {
  if (!orderDetails?.length) return [];
  const set = new Set(orderDetails.map((d) => d.bagType).filter(Boolean));
  return BAG_TYPES.filter((t) => set.has(t));
}

/** Per-size qty and weight for a given bag type from orderDetails. */
function getSizeMapForBagType(
  orderDetails: GradingGatePass['orderDetails'] | undefined,
  bagType: string
): Map<string, { qty: number; weight: number }> {
  const map = new Map<string, { qty: number; weight: number }>();
  for (const d of orderDetails ?? []) {
    if (d.bagType !== bagType) continue;
    const size = d.size;
    const qty = d.initialQuantity ?? 0;
    const weight = d.weightPerBagKg ?? 0;
    const existing = map.get(size);
    if (existing) {
      existing.qty += qty;
      if (d.weightPerBagKg != null) existing.weight = d.weightPerBagKg;
    } else {
      map.set(size, { qty, weight });
    }
  }
  return map;
}

/** Sum of (qty × weight) for all bag sizes in the map = weight received after grading (kg). */
function getWeightReceivedAfterGrading(
  sizeMap: Map<string, { qty: number; weight: number }>
): number {
  let total = 0;
  for (const { qty, weight } of sizeMap.values()) {
    total += qty * weight;
  }
  return total;
}

/** Bardana weight for grading: total bags for this type × weight per bag (JUTE or LENO). */
function getLessBardanaForGrading(
  sizeMap: Map<string, { qty: number; weight: number }>,
  bagType: string | null | undefined
): number {
  let totalBags = 0;
  for (const { qty } of sizeMap.values()) {
    totalBags += qty;
  }
  const weightPerBag = bagType === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
  return Math.round(totalBags * weightPerBag * 10) / 10;
}

/** Sum over all bag types of (Weight Received After Grading − Less bardana for grading). */
function getActualWeightOfPotato(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number {
  const bagTypes = getBagTypesForPass(orderDetails);
  let total = 0;
  for (const bagType of bagTypes) {
    const sizeMap = getSizeMapForBagType(orderDetails, bagType);
    total +=
      getWeightReceivedAfterGrading(sizeMap) -
      getLessBardanaForGrading(sizeMap, bagType);
  }
  return Math.round(total * 10) / 10;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'do MMM yyyy');
  } catch {
    return iso;
  }
}

function formatWeightKg(value: number | undefined): string {
  if (value == null) return '—';
  return String(Math.round(value * 10) / 10);
}

function getNetWeightKg(
  weightSlip: GradingGatePassIncomingRef['weightSlip'] | undefined
): number | undefined {
  if (!weightSlip) return undefined;
  const gross = weightSlip.grossWeightKg;
  const tare = weightSlip.tareWeightKg;
  if (gross != null && tare != null) return gross - tare;
  return undefined;
}

/** Less bardana = bags received × JUTE bag weight (kg). */
function getBardanaWeightKg(
  bagsReceived: number | undefined
): number | undefined {
  if (bagsReceived == null) return undefined;
  return Math.round(bagsReceived * JUTE_BAG_WEIGHT * 10) / 10;
}

/** Actual weight = net weight − bardana weight. */
function getActualWeightKg(
  netWeightKg: number | undefined,
  bardanaWeightKg: number | undefined
): number | undefined {
  if (netWeightKg == null || bardanaWeightKg == null) return undefined;
  return Math.round((netWeightKg - bardanaWeightKg) * 10) / 10;
}

/** Totals across all incoming refs for one grading pass. */
function getIncomingTotals(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>
): {
  totalBags: number;
  totalGrossKg: number;
  totalTareKg: number;
  totalNetKg: number;
  totalBardanaKg: number;
} {
  let totalBags = 0;
  let totalGrossKg = 0;
  let totalTareKg = 0;
  let totalNetKg = 0;
  let totalBardanaKg = 0;
  for (const ref of refs) {
    totalBags += ref.bagsReceived ?? 0;
    const gross = ref.weightSlip?.grossWeightKg ?? 0;
    const tare = ref.weightSlip?.tareWeightKg ?? 0;
    totalGrossKg += gross;
    totalTareKg += tare;
    const net = getNetWeightKg(ref.weightSlip) ?? 0;
    totalNetKg += net;
    const bardana = getBardanaWeightKg(ref.bagsReceived) ?? 0;
    totalBardanaKg += bardana;
  }
  return {
    totalBags,
    totalGrossKg,
    totalTareKg,
    totalNetKg,
    totalBardanaKg,
  };
}

/** Sum of actual weight (net − bardana) across all incoming refs for a pass. */
function getIncomingActualWeightTotal(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>
): number {
  let total = 0;
  for (const ref of refs) {
    const netKg = getNetWeightKg(ref.weightSlip);
    const bardanaKg = getBardanaWeightKg(ref.bagsReceived);
    const actual = getActualWeightKg(netKg, bardanaKg);
    if (actual != null) total += actual;
  }
  return Math.round(total * 10) / 10;
}

/** Wastage = actual weight of potato (incoming) − actual weight of potato (grading). */
function getWastage(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>,
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number {
  const incoming = getIncomingActualWeightTotal(refs);
  const grading = getActualWeightOfPotato(orderDetails);
  return Math.round((incoming - grading) * 10) / 10;
}

/** Wastage as percentage of actual weight of potato (incoming). Returns undefined when incoming is 0. */
function getWastagePercent(
  refs: Array<GradingGatePassIncomingRef & { _id: string }>,
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number | undefined {
  const incoming = getIncomingActualWeightTotal(refs);
  if (incoming === 0) return undefined;
  const wastage = getWastage(refs, orderDetails);
  return Math.round((wastage / incoming) * 1000) / 10;
}

/** Total bags across all order details (sizes) for a grading gate pass. */
function getPostGradingBags(
  orderDetails: GradingGatePass['orderDetails'] | undefined
): number {
  if (!orderDetails?.length) return 0;
  return orderDetails.reduce((sum, d) => sum + (d.initialQuantity ?? 0), 0);
}

/** Normalize to array of ref objects; legacy string IDs become a minimal ref. */
function getIncomingRefs(
  ids: GradingGatePass['incomingGatePassIds'] | undefined
): Array<GradingGatePassIncomingRef & { _id: string }> {
  if (!ids?.length) return [];
  return ids.map((item) =>
    typeof item === 'string'
      ? { _id: item, gatePassNo: 0, date: '', manualGatePassNumber: undefined }
      : { ...item, _id: item._id ?? '' }
  ) as Array<GradingGatePassIncomingRef & { _id: string }>;
}

export interface FarmerProfileGradingGatePassTableProps {
  gradingPasses: GradingGatePass[];
  isLoading?: boolean;
}

export const FarmerProfileGradingGatePassTable = memo(
  function FarmerProfileGradingGatePassTable({
    gradingPasses,
    isLoading = false,
  }: FarmerProfileGradingGatePassTableProps) {
    const [fromDate, setFromDate] = useState<string | undefined>();
    const [toDate, setToDate] = useState<string | undefined>();
    const [appliedRange, setAppliedRange] = useState<{
      dateFrom?: string;
      dateTo?: string;
    }>({});

    const handleApplyDates = () => {
      if (!fromDate && !toDate) {
        setAppliedRange({});
        return;
      }
      if (fromDate && toDate) {
        const fromStr = formatDateToYYYYMMDD(fromDate);
        const toStr = formatDateToYYYYMMDD(toDate);
        if (toStr < fromStr) {
          toast.error('Invalid date range', {
            description: '"To" date must not be before "From" date.',
          });
          return;
        }
        setAppliedRange({ dateFrom: fromStr, dateTo: toStr });
        toast.success('Date filter applied.', {
          description: `${fromDate} to ${toDate}`,
        });
        return;
      }
      setAppliedRange({
        dateFrom: fromDate ? formatDateToYYYYMMDD(fromDate) : undefined,
        dateTo: toDate ? formatDateToYYYYMMDD(toDate) : undefined,
      });
      const rangeDesc = fromDate
        ? `From ${fromDate}`
        : toDate
          ? `To ${toDate}`
          : '';
      toast.success('Date filter applied.', {
        description: rangeDesc || undefined,
      });
    };

    const handleClearDates = () => {
      setFromDate(undefined);
      setToDate(undefined);
      setAppliedRange({});
      toast.success('Date filters cleared.');
    };

    const filteredGradingPasses = useMemo(() => {
      if (!appliedRange.dateFrom && !appliedRange.dateTo) return gradingPasses;

      const fromTs =
        appliedRange.dateFrom != null
          ? parseDateToTimestamp(appliedRange.dateFrom)
          : undefined;
      const toTs =
        appliedRange.dateTo != null
          ? parseDateToTimestamp(appliedRange.dateTo)
          : undefined;

      return gradingPasses.filter((pass) => {
        if (!pass.date) return false;
        const ts = parseDateToTimestamp(pass.date);
        if (Number.isNaN(ts)) return false;
        if (fromTs != null && !Number.isNaN(fromTs) && ts < fromTs) {
          return false;
        }
        if (toTs != null && !Number.isNaN(toTs) && ts > toTs) {
          return false;
        }
        return true;
      });
    }, [appliedRange.dateFrom, appliedRange.dateTo, gradingPasses]);

    if (isLoading) {
      return (
        <Card className="overflow-hidden rounded-xl border shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-4">
            <CardTitle className="font-custom text-lg font-semibold">
              Grading Gate Pass Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="font-custom text-muted-foreground py-8 text-center text-sm">
              Loading…
            </p>
          </CardContent>
        </Card>
      );
    }

    if (!gradingPasses.length) {
      return (
        <Card className="overflow-hidden rounded-xl border shadow-sm">
          <CardHeader className="bg-muted/30 border-b py-4">
            <CardTitle className="font-custom text-lg font-semibold">
              Grading Gate Pass Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <Empty className="font-custom">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No grading gate passes</EmptyTitle>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      );
    }

    const visibleBagSizes = getVisibleBagSizes(filteredGradingPasses);

    const {
      totalIncomingBags,
      totalIncomingGrossKg,
      totalIncomingTareKg,
      totalIncomingNetKg,
      totalIncomingBardanaKg,
      totalIncomingActualKg,
      totalPostGradingBags,
      totalWeightReceivedAfterGradingKg,
      totalLessBardanaForGradingKg,
      totalActualPotatoKg,
      totalWastageKg,
      perSizeTotals,
    } = filteredGradingPasses.reduce(
      (acc, pass) => {
        const refs = getIncomingRefs(pass.incomingGatePassIds);
        const incomingTotals = getIncomingTotals(refs);

        acc.totalIncomingBags += incomingTotals.totalBags;
        acc.totalIncomingGrossKg += incomingTotals.totalGrossKg;
        acc.totalIncomingTareKg += incomingTotals.totalTareKg;
        acc.totalIncomingNetKg += incomingTotals.totalNetKg;
        acc.totalIncomingBardanaKg += incomingTotals.totalBardanaKg;
        acc.totalIncomingActualKg += getIncomingActualWeightTotal(refs);

        acc.totalPostGradingBags += getPostGradingBags(pass.orderDetails);

        const bagTypes = getBagTypesForPass(pass.orderDetails);
        for (const bagType of bagTypes) {
          const sizeMap = getSizeMapForBagType(pass.orderDetails, bagType);
          for (const size of visibleBagSizes) {
            const data = sizeMap.get(size);
            if (data && data.qty > 0) {
              acc.perSizeTotals.set(
                size,
                (acc.perSizeTotals.get(size) ?? 0) + data.qty
              );
            }
          }

          acc.totalWeightReceivedAfterGradingKg +=
            getWeightReceivedAfterGrading(sizeMap);
          acc.totalLessBardanaForGradingKg += getLessBardanaForGrading(
            sizeMap,
            bagType
          );
        }

        const actualPotato = getActualWeightOfPotato(pass.orderDetails);
        acc.totalActualPotatoKg += actualPotato;

        const wastage = getWastage(refs, pass.orderDetails);
        acc.totalWastageKg += wastage;

        return acc;
      },
      {
        totalIncomingBags: 0,
        totalIncomingGrossKg: 0,
        totalIncomingTareKg: 0,
        totalIncomingNetKg: 0,
        totalIncomingBardanaKg: 0,
        totalIncomingActualKg: 0,
        totalPostGradingBags: 0,
        totalWeightReceivedAfterGradingKg: 0,
        totalLessBardanaForGradingKg: 0,
        totalActualPotatoKg: 0,
        totalWastageKg: 0,
        perSizeTotals: new Map<string, number>(),
      }
    );

    const totalWastagePercent =
      totalIncomingActualKg === 0
        ? undefined
        : Math.round((totalWastageKg / totalIncomingActualKg) * 1000) / 10;

    return (
      <Card className="overflow-hidden rounded-xl border shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-4">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <DatePicker
              id="farmer-profile-grading-from"
              label="From"
              value={fromDate}
              onChange={setFromDate}
              compact
            />
            <DatePicker
              id="farmer-profile-grading-to"
              label="To"
              value={toDate}
              onChange={setToDate}
              compact
            />
            <div className="flex h-10 items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="font-custom focus-visible:ring-primary h-10 min-h-10 rounded-lg px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                onClick={handleApplyDates}
                disabled={!fromDate && !toDate}
              >
                Apply
              </Button>
              {(fromDate ||
                toDate ||
                appliedRange.dateFrom ||
                appliedRange.dateTo) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom focus-visible:ring-primary h-10 min-h-10 rounded-lg px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={handleClearDates}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-border bg-card font-custom overflow-x-auto text-sm shadow-sm">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="border-border bg-muted/60 hover:bg-muted/60 border-b-2">
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    System incoming no.
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Manual incoming no.
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                    Incoming date
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                    Store
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                    Truck number
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                    Variety
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Bags received
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Total bags received
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                    Weight slip no.
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Gross weight (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Total gross (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Tare weight (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Total tare (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Net weight (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Total net (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Less bardana (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Total less bardana (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r-primary border-r-2 border-dashed px-4 py-3 text-right font-semibold">
                    Actual weight (kg)
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Grading GP no.
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Grading manual no.
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                    Grading date
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Post grading bags
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 font-semibold">
                    Type
                  </TableHead>
                  {visibleBagSizes.map((size) => (
                    <TableHead
                      key={size}
                      className="font-custom border-border border-r px-4 py-3 text-right font-semibold"
                    >
                      {BAG_SIZE_ORDER_LABELS[size] ?? size}
                    </TableHead>
                  ))}
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Weight Received After Grading
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Less bardana for grading
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Actual weight of potato
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold">
                    Wastage
                  </TableHead>
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold last:border-r-0">
                    Wastage %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="order [&_tr]:border-b [&_tr:last-child]:border-b">
                {filteredGradingPasses.flatMap((pass) => {
                  const refs = getIncomingRefs(pass.incomingGatePassIds);
                  if (refs.length === 0) {
                    const bagTypes = getBagTypesForPass(pass.orderDetails);
                    const rowsCount = Math.max(1, bagTypes.length);
                    return Array.from({ length: rowsCount }, (_, typeIndex) => {
                      const bagType = bagTypes[typeIndex];
                      const sizeMap =
                        bagType != null
                          ? getSizeMapForBagType(pass.orderDetails, bagType)
                          : new Map<string, { qty: number; weight: number }>();
                      return (
                        <TableRow
                          key={`${pass._id}-empty-${typeIndex}`}
                          className="border-border hover:bg-muted/50 transition-colors"
                        >
                          <TableCell
                            className="font-custom border-border border-r-primary/70 border-r-2 border-dotted px-4 py-3"
                            colSpan={18}
                          >
                            —
                          </TableCell>
                          {typeIndex === 0 && (
                            <>
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right font-medium"
                                rowSpan={rowsCount}
                              >
                                {pass.gatePassNo ?? '—'}
                              </TableCell>
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right font-medium"
                                rowSpan={rowsCount}
                              >
                                {pass.manualGatePassNumber != null
                                  ? String(pass.manualGatePassNumber)
                                  : '—'}
                              </TableCell>
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3"
                                rowSpan={rowsCount}
                              >
                                {formatDate(pass.date)}
                              </TableCell>
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right font-medium"
                                rowSpan={rowsCount}
                              >
                                {getPostGradingBags(pass.orderDetails)}
                              </TableCell>
                            </>
                          )}
                          <TableCell className="font-custom border-border border-r px-4 py-3">
                            {bagType ?? '—'}
                          </TableCell>
                          {visibleBagSizes.map((size) => {
                            const data = sizeMap.get(size);
                            const isEmpty = !data || data.qty === 0;
                            return (
                              <TableCell
                                key={size}
                                className="font-custom border-border border-r px-4 py-3 text-right"
                              >
                                {isEmpty ? (
                                  ''
                                ) : (
                                  <span className="flex flex-col items-end">
                                    <span className="font-medium">
                                      {data.qty}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      ({formatWeightKg(data.weight)})
                                    </span>
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                            {formatWeightKg(
                              getWeightReceivedAfterGrading(sizeMap)
                            )}
                          </TableCell>
                          <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                            {formatWeightKg(
                              getLessBardanaForGrading(sizeMap, bagType)
                            )}
                          </TableCell>
                          {typeIndex === 0 && (
                            <>
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                                rowSpan={rowsCount}
                              >
                                {formatWeightKg(
                                  getActualWeightOfPotato(pass.orderDetails)
                                )}
                              </TableCell>
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                                rowSpan={rowsCount}
                              >
                                {formatWeightKg(
                                  getWastage(refs, pass.orderDetails)
                                )}
                              </TableCell>
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium last:border-r-0"
                                rowSpan={rowsCount}
                              >
                                {(() => {
                                  const pct = getWastagePercent(
                                    refs,
                                    pass.orderDetails
                                  );
                                  return pct !== undefined ? `${pct}%` : '—';
                                })()}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    });
                  }
                  const totals = getIncomingTotals(refs);
                  const bagTypes = getBagTypesForPass(pass.orderDetails);
                  const rowsPerPass = Math.max(refs.length, bagTypes.length);
                  const incomingRowSpan =
                    refs.length === 1 && rowsPerPass > 1 ? rowsPerPass : 1;
                  return Array.from({ length: rowsPerPass }, (_, rowIndex) => {
                    const ref = refs[rowIndex] ?? null;
                    const bagType = bagTypes[rowIndex] ?? null;
                    const sizeMap =
                      bagType != null
                        ? getSizeMapForBagType(pass.orderDetails, bagType)
                        : new Map<
                            string,
                            {
                              qty: number;
                              weight: number;
                            }
                          >();
                    const netKg = ref
                      ? getNetWeightKg(ref.weightSlip)
                      : undefined;
                    const bardanaKg = ref
                      ? getBardanaWeightKg(ref.bagsReceived)
                      : undefined;
                    const actualKg = getActualWeightKg(netKg, bardanaKg);
                    const isIncomingSpannedRow =
                      incomingRowSpan > 1 && rowIndex > 0;
                    const showIncomingCells =
                      ref != null
                        ? !isIncomingSpannedRow
                        : incomingRowSpan === 1;
                    return (
                      <TableRow
                        key={`${pass._id}-${rowIndex}`}
                        className="border-border hover:bg-muted/50 transition-colors"
                      >
                        {showIncomingCells && ref ? (
                          <>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                              rowSpan={incomingRowSpan}
                            >
                              {ref.gatePassNo ? String(ref.gatePassNo) : '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {ref.manualGatePassNumber != null
                                ? String(ref.manualGatePassNumber)
                                : '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {ref.date ? formatDate(ref.date) : '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {DEFAULT_STORE}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {ref.truckNumber ?? '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {ref.variety ?? '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {ref.bagsReceived != null
                                ? String(ref.bagsReceived)
                                : '—'}
                            </TableCell>
                            {rowIndex === 0 && (
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                                rowSpan={refs.length}
                              >
                                {refs.length > 1 ? totals.totalBags : '—'}
                              </TableCell>
                            )}
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {ref.weightSlip?.slipNumber ?? '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {formatWeightKg(ref.weightSlip?.grossWeightKg)}
                            </TableCell>
                            {rowIndex === 0 && (
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                                rowSpan={refs.length}
                              >
                                {refs.length > 1
                                  ? formatWeightKg(totals.totalGrossKg)
                                  : '—'}
                              </TableCell>
                            )}
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {formatWeightKg(ref.weightSlip?.tareWeightKg)}
                            </TableCell>
                            {rowIndex === 0 && (
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                                rowSpan={refs.length}
                              >
                                {refs.length > 1
                                  ? formatWeightKg(totals.totalTareKg)
                                  : '—'}
                              </TableCell>
                            )}
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {formatWeightKg(netKg)}
                            </TableCell>
                            {rowIndex === 0 && (
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                                rowSpan={refs.length}
                              >
                                {refs.length > 1
                                  ? formatWeightKg(totals.totalNetKg)
                                  : '—'}
                              </TableCell>
                            )}
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {formatWeightKg(bardanaKg)}
                            </TableCell>
                            {rowIndex === 0 && (
                              <TableCell
                                className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                                rowSpan={refs.length}
                              >
                                {refs.length > 1
                                  ? formatWeightKg(totals.totalBardanaKg)
                                  : '—'}
                              </TableCell>
                            )}
                            <TableCell
                              className="font-custom border-border border-r-primary border-r-2 border-dashed px-4 py-3 text-right align-top"
                              rowSpan={incomingRowSpan}
                            >
                              {formatWeightKg(actualKg)}
                            </TableCell>
                          </>
                        ) : showIncomingCells && ref == null ? (
                          <TableCell
                            className="font-custom border-border border-r-primary/70 border-r-2 border-dotted px-4 py-3"
                            colSpan={18}
                          >
                            —
                          </TableCell>
                        ) : null}
                        {isIncomingSpannedRow &&
                          Array.from({ length: 5 }, (_, i) => (
                            <TableCell
                              key={`placeholder-total-${i}`}
                              className="font-custom border-border border-r px-4 py-3 text-right align-top"
                            >
                              —
                            </TableCell>
                          ))}
                        {rowIndex === 0 && (
                          <>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                              rowSpan={rowsPerPass}
                            >
                              {pass.gatePassNo ?? '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                              rowSpan={rowsPerPass}
                            >
                              {pass.manualGatePassNumber != null
                                ? String(pass.manualGatePassNumber)
                                : '—'}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 align-top"
                              rowSpan={rowsPerPass}
                            >
                              {formatDate(pass.date)}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                              rowSpan={rowsPerPass}
                            >
                              {getPostGradingBags(pass.orderDetails)}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          {bagType ?? '—'}
                        </TableCell>
                        {visibleBagSizes.map((size) => {
                          const data = sizeMap.get(size);
                          const isEmpty = !data || data.qty === 0;
                          return (
                            <TableCell
                              key={size}
                              className="font-custom border-border border-r px-4 py-3 text-right"
                            >
                              {isEmpty ? (
                                ''
                              ) : (
                                <span className="flex flex-col items-end">
                                  <span className="font-medium">
                                    {data.qty}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    ({formatWeightKg(data.weight)})
                                  </span>
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                          {formatWeightKg(
                            getWeightReceivedAfterGrading(sizeMap)
                          )}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                          {formatWeightKg(
                            getLessBardanaForGrading(sizeMap, bagType)
                          )}
                        </TableCell>
                        {rowIndex === 0 && (
                          <>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                              rowSpan={rowsPerPass}
                            >
                              {formatWeightKg(
                                getActualWeightOfPotato(pass.orderDetails)
                              )}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                              rowSpan={rowsPerPass}
                            >
                              {formatWeightKg(
                                getWastage(refs, pass.orderDetails)
                              )}
                            </TableCell>
                            <TableCell
                              className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium last:border-r-0"
                              rowSpan={rowsPerPass}
                            >
                              {(() => {
                                const pct = getWastagePercent(
                                  refs,
                                  pass.orderDetails
                                );
                                return pct !== undefined ? `${pct}%` : '—';
                              })()}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  });
                })}
                {filteredGradingPasses.length > 0 && (
                  <TableRow className="border-border bg-muted/40 text-primary font-semibold">
                    <TableCell
                      className="font-custom border-border border-r px-4 py-3 text-right font-bold"
                      colSpan={7}
                    >
                      Total
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {totalIncomingBags}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalIncomingGrossKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalIncomingTareKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalIncomingNetKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalIncomingBardanaKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r-primary border-r-2 border-dashed px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalIncomingActualKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3">
                      —
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {totalPostGradingBags}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3">
                      —
                    </TableCell>
                    {visibleBagSizes.map((size) => (
                      <TableCell
                        key={`total-${size}`}
                        className="font-custom border-border border-r px-4 py-3 text-right font-bold"
                      >
                        {perSizeTotals.get(size) ?? 0}
                      </TableCell>
                    ))}
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalWeightReceivedAfterGradingKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalLessBardanaForGradingKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalActualPotatoKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold">
                      {formatWeightKg(totalWastageKg)}
                    </TableCell>
                    <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-bold last:border-r-0">
                      {totalWastagePercent !== undefined
                        ? `${totalWastagePercent}%`
                        : '—'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }
);
