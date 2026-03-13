import { memo } from 'react';
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
import { JUTE_BAG_WEIGHT } from '@/components/forms/grading/constants';

const DEFAULT_STORE = 'JICSPL-Bazpur';

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

    return (
      <Card className="overflow-hidden rounded-xl border shadow-sm">
        <CardHeader className="bg-muted/30 border-b py-4">
          <CardTitle className="font-custom text-lg font-semibold">
            Grading Gate Pass Details
          </CardTitle>
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
                  <TableHead className="font-custom border-border border-r px-4 py-3 text-right font-semibold last:border-r-0">
                    Grading GP no.
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="order [&_tr]:border-b [&_tr:last-child]:border-b">
                {gradingPasses.flatMap((pass) => {
                  const refs = getIncomingRefs(pass.incomingGatePassIds);
                  if (refs.length === 0) {
                    return (
                      <TableRow
                        key={pass._id}
                        className="border-border hover:bg-muted/50 transition-colors"
                      >
                        <TableCell
                          className="font-custom border-border border-r-primary/70 border-r-2 border-dotted px-4 py-3"
                          colSpan={18}
                        >
                          —
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium last:border-r-0">
                          {pass.gatePassNo ?? '—'}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  const totals = getIncomingTotals(refs);
                  return refs.map((ref, index) => {
                    const netKg = getNetWeightKg(ref.weightSlip);
                    const bardanaKg = getBardanaWeightKg(ref.bagsReceived);
                    const actualKg = getActualWeightKg(netKg, bardanaKg);
                    return (
                      <TableRow
                        key={`${pass._id}-${ref._id}-${index}`}
                        className="border-border hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right font-medium">
                          {ref.gatePassNo ? String(ref.gatePassNo) : '—'}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          {ref.manualGatePassNumber != null
                            ? String(ref.manualGatePassNumber)
                            : '—'}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          {ref.date ? formatDate(ref.date) : '—'}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          {DEFAULT_STORE}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          {ref.truckNumber ?? '—'}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          {ref.variety ?? '—'}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          {ref.bagsReceived != null
                            ? String(ref.bagsReceived)
                            : '—'}
                        </TableCell>
                        {index === 0 && (
                          <TableCell
                            className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                            rowSpan={refs.length}
                          >
                            {refs.length > 1 ? totals.totalBags : '—'}
                          </TableCell>
                        )}
                        <TableCell className="font-custom border-border border-r px-4 py-3">
                          {ref.weightSlip?.slipNumber ?? '—'}
                        </TableCell>
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          {formatWeightKg(ref.weightSlip?.grossWeightKg)}
                        </TableCell>
                        {index === 0 && (
                          <TableCell
                            className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                            rowSpan={refs.length}
                          >
                            {refs.length > 1
                              ? formatWeightKg(totals.totalGrossKg)
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          {formatWeightKg(ref.weightSlip?.tareWeightKg)}
                        </TableCell>
                        {index === 0 && (
                          <TableCell
                            className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                            rowSpan={refs.length}
                          >
                            {refs.length > 1
                              ? formatWeightKg(totals.totalTareKg)
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          {formatWeightKg(netKg)}
                        </TableCell>
                        {index === 0 && (
                          <TableCell
                            className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                            rowSpan={refs.length}
                          >
                            {refs.length > 1
                              ? formatWeightKg(totals.totalNetKg)
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell className="font-custom border-border border-r px-4 py-3 text-right">
                          {formatWeightKg(bardanaKg)}
                        </TableCell>
                        {index === 0 && (
                          <TableCell
                            className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium"
                            rowSpan={refs.length}
                          >
                            {refs.length > 1
                              ? formatWeightKg(totals.totalBardanaKg)
                              : '—'}
                          </TableCell>
                        )}
                        <TableCell className="font-custom border-border border-r-primary border-r-2 border-dashed px-4 py-3 text-right">
                          {formatWeightKg(actualKg)}
                        </TableCell>
                        {index === 0 && (
                          <TableCell
                            className="font-custom border-border border-r px-4 py-3 text-right align-top font-medium last:border-r-0"
                            rowSpan={refs.length}
                          >
                            {pass.gatePassNo ?? '—'}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }
);
