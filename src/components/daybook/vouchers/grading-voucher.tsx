import { memo, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  User,
  Package,
  Layers,
  PackagePlus,
  Truck,
  AlertTriangle,
  Calculator,
} from 'lucide-react';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { PassVoucherData } from './types';
import type { GradingOrderDetailRow } from './types';
import { totalBagsFromOrderDetails, type VoucherFarmerInfo } from './types';
import {
  computeGradingOrderTotals,
  computeIncomingNetProductKg,
  computeTotalGradedWeightPercent,
  computeWastagePercentOfNetProduct,
  computeDiscrepancy,
} from './grading-voucher-calculations';
import { Spinner } from '@/components/ui/spinner';
import { GradingVoucherCalculationsDialog } from './grading-voucher-calculations-dialog';
import { useStore } from '@/stores/store';

export interface GradingVoucherProps extends VoucherFarmerInfo {
  voucher: PassVoucherData;
  farmerStorageLinkId?: string;
  wastageKg?: number;
  wastagePercent?: number;
  incomingNetKg?: number;
  incomingBagsCount?: number;
}

const GradingVoucher = memo(function GradingVoucher({
  voucher,
  farmerName,
  farmerAccount,
  farmerStorageLinkId,
  wastageKg,
  wastagePercent,
  incomingNetKg,
  incomingBagsCount,
}: GradingVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [calculationsOpen, setCalculationsOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const admin = useStore((s) => s.admin);
  const isAdmin = admin?.role === 'Admin';

  const bags = totalBagsFromOrderDetails(voucher.orderDetails);
  const allocationStatus = voucher.allocationStatus ?? '';
  const gradedBy = voucher.createdBy;

  const details = (voucher.orderDetails ?? []) as GradingOrderDetailRow[];
  const {
    totalQty,
    totalInitial,
    totalGradedWeightKg,
    totalGradedWeightGrossKg,
    totalBagWeightDeductionKg,
  } = useMemo(
    () => computeGradingOrderTotals(voucher.orderDetails),
    [voucher.orderDetails]
  );
  const allOrderDetails = details;

  const incomingNetProductKg = computeIncomingNetProductKg(
    incomingNetKg,
    incomingBagsCount
  );
  const totalGradedWeightPercent = computeTotalGradedWeightPercent(
    totalGradedWeightKg,
    incomingNetProductKg
  );
  const wastagePercentOfNetProduct = computeWastagePercentOfNetProduct(
    wastageKg,
    incomingNetProductKg
  );
  const { percentSum, hasDiscrepancy, discrepancyValue } = computeDiscrepancy(
    totalGradedWeightPercent,
    wastagePercentOfNetProduct
  );

  const handlePrint = async () => {
    // Open window synchronously so mobile popup blockers allow it
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsPrinting(true);
    try {
      const [{ pdf }, { GradingVoucherPdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/GradingVoucherPdf'),
      ]);

      const blob = await pdf(
        <GradingVoucherPdf
          voucher={voucher}
          farmerName={farmerName}
          farmerAccount={farmerAccount}
          orderDetails={allOrderDetails}
          totals={{
            totalQty,
            totalInitial,
            totalGradedWeightKg,
            totalGradedWeightGrossKg,
            totalBagWeightDeductionKg,
          }}
          totalGradedWeightPercent={totalGradedWeightPercent}
          wastageKg={wastageKg}
          wastagePercentOfNetProduct={wastagePercentOfNetProduct}
          hasDiscrepancy={hasDiscrepancy}
          discrepancyValue={discrepancyValue}
          percentSum={percentSum}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-4 pt-2 pb-4">
        <CardHeader className="px-0 pt-3 pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  GGP{' '}
                  <span className="text-primary">
                    #{voucher.gatePassNo ?? '—'}
                  </span>
                </h3>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {formatVoucherDate(voucher.date)}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="px-2 py-0.5 text-[10px] font-medium"
              >
                {bags.toLocaleString('en-IN')} bags
              </Badge>
              {allocationStatus && (
                <Badge
                  variant="outline"
                  className="px-2 py-0.5 text-[10px] font-medium capitalize"
                >
                  {allocationStatus.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailRow label="Farmer" value={farmerName ?? '—'} icon={User} />
          <DetailRow label="Account" value={`#${farmerAccount ?? '—'}`} />
          <DetailRow
            label="Variety"
            value={voucher.variety ?? '—'}
            icon={Package}
          />
          <DetailRow
            label="Graded By"
            value={gradedBy?.name ?? '—'}
            icon={Layers}
          />
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((p) => !p)}
              className="hover:bg-accent h-9 min-h-9 px-3 text-xs sm:h-8 sm:min-h-0"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  More
                </>
              )}
            </Button>
            {farmerStorageLinkId && voucher._id && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom h-9 min-h-9 gap-1.5 px-3 text-xs sm:h-8 sm:min-h-0"
                  asChild
                >
                  <Link
                    to="/store-admin/storage"
                    search={{
                      farmerStorageLinkId,
                      gradingPassId: voucher._id,
                    }}
                  >
                    <PackagePlus className="h-3.5 w-3.5 shrink-0" />
                    Store
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom h-9 min-h-9 gap-1.5 px-3 text-xs sm:h-8 sm:min-h-0"
                  asChild
                >
                  <Link
                    to="/store-admin/nikasi"
                    search={{
                      farmerStorageLinkId,
                      gradingPassId: voucher._id,
                    }}
                  >
                    <Truck className="h-3.5 w-3.5 shrink-0" />
                    Dispatch
                  </Link>
                </Button>
              </>
            )}
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalculationsOpen(true)}
                className="font-custom h-9 min-h-9 gap-1.5 px-3 text-xs sm:h-8 sm:min-h-0"
                aria-label="Show calculations"
              >
                <Calculator className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Show calculations</span>
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePrint()}
            disabled={isPrinting}
            className="h-9 w-9 shrink-0 p-0 sm:h-8 sm:w-8"
            aria-label={isPrinting ? 'Generating PDF…' : 'Print gate pass'}
          >
            {isPrinting ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <Printer className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <GradingVoucherCalculationsDialog
          open={calculationsOpen}
          onOpenChange={setCalculationsOpen}
          gatePassNo={voucher.gatePassNo}
          allOrderDetails={allOrderDetails}
          totalQty={totalQty}
          totalInitial={totalInitial}
          totalGradedWeightKg={totalGradedWeightKg}
          totalGradedWeightGrossKg={totalGradedWeightGrossKg}
          totalBagWeightDeductionKg={totalBagWeightDeductionKg}
          incomingNetKg={incomingNetKg}
          incomingBagsCount={incomingBagsCount}
          incomingNetProductKg={incomingNetProductKg}
          totalGradedWeightPercent={totalGradedWeightPercent}
          wastageKg={wastageKg}
          wastagePercent={wastagePercentOfNetProduct}
          percentSum={percentSum}
          hasDiscrepancy={hasDiscrepancy}
          discrepancyValue={discrepancyValue}
        />

        {isExpanded && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Order Details
                </h4>
                <div className="bg-muted/30 overflow-x-auto rounded-lg p-3">
                  <table className="font-custom w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="text-muted-foreground/70 border-b text-left text-[10px] font-medium tracking-wider uppercase">
                        <th className="pr-3 pb-2">Size</th>
                        <th className="pr-3 pb-2">Bag Type</th>
                        <th className="pr-3 pb-2 text-right">Qty</th>
                        <th className="pr-3 pb-2 text-right">Initial</th>
                        <th className="pr-3 pb-2 text-right">Weight %</th>
                        <th className="pb-2 text-right">Wt/Bag (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Total graded weight = sum of (initial qty × weight per bag) — used as denominator so row % sum to 100%
                        const totalGradedWeight =
                          totalGradedWeightGrossKg > 0
                            ? totalGradedWeightGrossKg
                            : 0;
                        return (
                          <>
                            {allOrderDetails.map((od, idx) => {
                              const qty = od.initialQuantity ?? 0;
                              const wt = od.weightPerBagKg ?? 0;
                              const rowWeight = qty * wt;
                              const weightPct =
                                totalGradedWeight > 0
                                  ? (rowWeight / totalGradedWeight) * 100
                                  : 0;
                              return (
                                <tr
                                  key={`${od.size}-${od.bagType}-${idx}`}
                                  className="border-border/40 border-b"
                                >
                                  <td className="py-2 pr-3 font-medium">
                                    {od.size ?? '—'}
                                  </td>
                                  <td className="py-2 pr-3">
                                    {od.bagType ?? '—'}
                                  </td>
                                  <td className="py-2 pr-3 text-right font-medium">
                                    {(od.currentQuantity ?? 0).toLocaleString(
                                      'en-IN'
                                    )}
                                  </td>
                                  <td className="py-2 pr-3 text-right">
                                    {qty.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2 pr-3 text-right tabular-nums">
                                    {weightPct.toLocaleString('en-IN', {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}
                                    %
                                  </td>
                                  <td className="py-2 text-right">
                                    {wt.toLocaleString('en-IN')}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="border-border/60 bg-muted/50 text-primary border-t-2 font-semibold">
                              <td className="py-2.5 pr-3" colSpan={2}>
                                Total
                              </td>
                              <td className="py-2.5 pr-3 text-right">
                                {totalQty.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 pr-3 text-right">
                                {totalInitial.toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 pr-3 text-right tabular-nums">
                                {totalGradedWeight > 0
                                  ? (100).toLocaleString('en-IN', {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    }) + '%'
                                  : '—'}
                              </td>
                              <td className="py-2.5 text-right font-medium">
                                {totalGradedWeightGrossKg.toLocaleString(
                                  'en-IN'
                                )}
                              </td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </section>

              <Separator />
              <section>
                <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                  Total graded weight
                </h4>
                <div className="border-primary/30 bg-primary/5 flex items-center gap-2 rounded-lg border px-3 py-2.5">
                  <Package
                    className="text-primary h-4 w-4 shrink-0"
                    aria-hidden
                  />
                  <span className="text-primary font-custom text-sm font-medium tabular-nums">
                    {totalGradedWeightKg.toLocaleString('en-IN')} kg
                    {totalGradedWeightPercent !== undefined && (
                      <>
                        {' '}
                        <span className="text-primary/90">
                          (
                          {totalGradedWeightPercent.toLocaleString('en-IN', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          % of net)
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </section>

              {wastageKg !== undefined && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                      Wastage
                    </h4>
                    <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-lg border px-3 py-2.5">
                      <AlertTriangle
                        className="text-destructive h-4 w-4 shrink-0"
                        aria-hidden
                      />
                      <span className="text-destructive font-custom text-sm font-medium tabular-nums">
                        {wastageKg.toLocaleString('en-IN')} kg
                        {wastagePercent !== undefined && (
                          <>
                            {' '}
                            <span className="text-destructive/90">
                              (
                              {wastagePercent.toLocaleString('en-IN', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                              % of net)
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </section>
                </>
              )}

              {hasDiscrepancy &&
                discrepancyValue !== undefined &&
                percentSum != null && (
                  <>
                    <Separator />
                    <section>
                      <h4 className="text-destructive mb-2 text-xs font-semibold tracking-wider uppercase">
                        Discrepancy
                      </h4>
                      <div className="border-destructive bg-destructive/10 flex items-center gap-2 rounded-lg border-2 px-3 py-2.5">
                        <AlertTriangle
                          className="text-destructive h-4 w-4 shrink-0"
                          aria-hidden
                        />
                        <span className="text-destructive font-custom text-sm font-semibold tabular-nums">
                          Graded + Wastage ={' '}
                          {percentSum.toLocaleString('en-IN', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          % (expected 100%). Discrepancy:{' '}
                          {discrepancyValue >= 0 ? '+' : ''}
                          {discrepancyValue.toLocaleString('en-IN', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                          %
                        </span>
                      </div>
                    </section>
                  </>
                )}

              {voucher.remarks != null && voucher.remarks !== '' && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Remarks
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground text-sm font-medium">
                        {voucher.remarks}
                      </p>
                    </div>
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
});

export { GradingVoucher };
