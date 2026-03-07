import { memo, useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  User,
  MapPin,
  Warehouse,
} from 'lucide-react';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { PassVoucherData } from './types';
import type { NikasiOrderDetailRow } from './types';
import {
  totalBagsFromOrderDetails,
  totalBagsFromNikasiBagSizes,
  type VoucherFarmerInfo,
} from './types';

export interface NikasiVoucherProps extends VoucherFarmerInfo {
  voucher: PassVoucherData;
  /** When "dispatch", uses red accent (dot, gate pass number) instead of green */
  variant?: 'default' | 'dispatch';
}

const NikasiVoucher = memo(function NikasiVoucher({
  voucher,
  farmerName,
  farmerAccount,
  variant = 'default',
}: NikasiVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDispatch = variant === 'dispatch';
  const dotClass = isDispatch ? 'bg-destructive' : 'bg-primary';
  const accentClass = isDispatch ? 'text-destructive' : 'text-primary';
  const borderHoverClass = isDispatch
    ? 'hover:border-destructive/30'
    : 'hover:border-primary/30';

  const hasBagSize =
    Array.isArray(voucher.bagSize) && voucher.bagSize.length > 0;
  const bags = hasBagSize
    ? totalBagsFromNikasiBagSizes(voucher.bagSize)
    : totalBagsFromOrderDetails(voucher.orderDetails);
  const snapshots = voucher.gradingGatePassSnapshots ?? [];
  const fallbackIds = voucher.gradingGatePassIds ?? [];
  const gradingCount =
    snapshots.length > 0 ? snapshots.length : fallbackIds.length;

  const { totalIssued, totalAvailable } = useMemo(() => {
    if (hasBagSize && voucher.bagSize) {
      const issued = voucher.bagSize.reduce(
        (s, b) => s + (b.quantityIssued ?? 0),
        0
      );
      return { totalIssued: issued, totalAvailable: 0 };
    }
    const details = (voucher.orderDetails ?? []) as NikasiOrderDetailRow[];
    let issued = 0;
    let available = 0;
    for (const od of details) {
      issued += od.quantityIssued ?? 0;
      available += od.quantityAvailable ?? 0;
    }
    return { totalIssued: issued, totalAvailable: available };
  }, [voucher.orderDetails, voucher.bagSize, hasBagSize]);

  const orderDetails = (voucher.orderDetails ?? []) as NikasiOrderDetailRow[];
  const bagSizeRows = voucher.bagSize ?? [];

  return (
    <Card
      className={`border-border/40 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md ${borderHoverClass}`}
    >
      <div className="px-4 pt-2 pb-4">
        <CardHeader className="px-0 pt-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
                />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  NGP{' '}
                  <span className={accentClass}>
                    #{voucher.gatePassNo ?? '—'}
                  </span>
                  {voucher.manualGatePassNumber != null && (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · Manual #{voucher.manualGatePassNumber}
                    </span>
                  )}
                </h3>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {formatVoucherDate(voucher.date)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Badge
                variant="secondary"
                className="px-2 py-0.5 text-[10px] font-medium"
              >
                {bags.toLocaleString('en-IN')} bags
              </Badge>
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {farmerName != null && (
            <DetailRow label="Farmer" value={farmerName} icon={User} />
          )}
          {farmerAccount != null && (
            <DetailRow label="Account" value={`#${farmerAccount}`} />
          )}
          {voucher.from != null && (
            <DetailRow label="From" value={voucher.from} icon={MapPin} />
          )}
          {voucher.toField != null && voucher.toField !== '' && (
            <DetailRow label="To" value={voucher.toField} />
          )}
          {!hasBagSize && (
            <DetailRow
              label="Grading refs"
              value={`${gradingCount} GGP(s)`}
              icon={Warehouse}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((p) => !p)}
            className="hover:bg-accent h-8 px-3 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                Less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                More
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="h-8 w-8 p-0"
            aria-label="Print gate pass"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isExpanded && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Detailed Breakdown
                </h4>
                <div className="bg-muted/30 overflow-x-auto rounded-lg p-3">
                  {hasBagSize ? (
                    <table className="font-custom w-full min-w-0 table-fixed text-sm">
                      <thead>
                        <tr className="text-muted-foreground/70 border-b text-left text-[10px] font-medium tracking-wider uppercase">
                          <th className="w-[30%] px-1 pb-2 sm:px-1 sm:pr-3">
                            Size
                          </th>
                          <th className="w-[35%] px-1 pb-2 sm:px-1 sm:pr-3">
                            Variety
                          </th>
                          <th className="w-[35%] px-1 pb-2 text-right sm:px-1 sm:pr-3">
                            Quantity Issued
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bagSizeRows.map((row, idx) => (
                          <tr
                            key={`${row.size}-${row.variety}-${idx}`}
                            className="border-border/40 border-b"
                          >
                            <td className="px-1 py-2 font-medium sm:pr-3">
                              {row.size ?? '—'}
                            </td>
                            <td className="px-1 py-2 sm:pr-3">
                              {row.variety ?? '—'}
                            </td>
                            <td className="text-destructive px-1 py-2 text-right font-medium sm:pr-3">
                              {(row.quantityIssued ?? 0).toLocaleString(
                                'en-IN'
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr
                          className={`border-border/60 bg-muted/50 border-t-2 font-semibold ${accentClass}`}
                        >
                          <td className="px-1 py-2.5 sm:pr-3" colSpan={2}>
                            Total
                          </td>
                          <td className="text-destructive px-1 py-2.5 text-right sm:pr-3">
                            {totalIssued.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="font-custom w-full min-w-0 table-fixed text-sm">
                      <thead>
                        <tr className="text-muted-foreground/70 border-b text-left text-[10px] font-medium tracking-wider uppercase">
                          <th
                            className="w-[20%] px-1 pb-2 sm:px-1 sm:pr-3"
                            title="Bag type / size"
                          >
                            Type
                          </th>
                          <th
                            className="w-[18%] px-1 pb-2 sm:px-1 sm:pr-3"
                            title="Receipt / reference voucher"
                          >
                            Ref
                          </th>
                          <th
                            className="w-[18%] px-1 pb-2 text-right sm:px-1 sm:pr-3"
                            title="Initial quantity"
                          >
                            Init
                          </th>
                          <th
                            className="w-[22%] px-1 pb-2 text-right sm:px-1 sm:pr-3"
                            title="Quantity issued"
                          >
                            Issued
                          </th>
                          <th
                            className="w-[22%] px-1 pb-2 text-right sm:px-1 sm:pr-2"
                            title="Available"
                          >
                            Avail
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderDetails.map((od, idx) => {
                          const initialQty =
                            (od.quantityAvailable ?? 0) +
                            (od.quantityIssued ?? 0);
                          const snapshot = snapshots.find(
                            (gp) => gp._id === od.gradingGatePassId
                          );
                          const rVoucher = snapshot?.gatePassNo ?? '—';
                          return (
                            <tr
                              key={`${od.size}-${od.gradingGatePassId}-${idx}`}
                              className="border-border/40 border-b"
                            >
                              <td className="px-1 py-2 font-medium sm:pr-3">
                                {od.size ?? '—'}
                              </td>
                              <td className="px-1 py-2 sm:pr-3">
                                <span className="inline-flex items-center gap-1 sm:gap-1.5">
                                  <span
                                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
                                  />
                                  {rVoucher}
                                </span>
                              </td>
                              <td className="px-1 py-2 text-right sm:pr-3">
                                {initialQty.toLocaleString('en-IN')}
                              </td>
                              <td className="text-destructive px-1 py-2 text-right font-medium sm:pr-3">
                                {(od.quantityIssued ?? 0).toLocaleString(
                                  'en-IN'
                                )}
                              </td>
                              <td
                                className={`px-1 py-2 text-right font-medium sm:px-1 sm:pr-2 ${accentClass}`}
                              >
                                {(od.quantityAvailable ?? 0).toLocaleString(
                                  'en-IN'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        <tr
                          className={`border-border/60 bg-muted/50 border-t-2 font-semibold ${accentClass}`}
                        >
                          <td className="px-1 py-2.5 sm:pr-3" colSpan={2}>
                            Total
                          </td>
                          <td className="px-1 py-2.5 text-right sm:pr-3">
                            {(totalAvailable + totalIssued).toLocaleString(
                              'en-IN'
                            )}
                          </td>
                          <td className="text-destructive px-1 py-2.5 text-right sm:pr-3">
                            {totalIssued.toLocaleString('en-IN')}
                          </td>
                          <td className="px-1 py-2.5 text-right sm:pr-2">
                            {totalAvailable.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

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

export { NikasiVoucher };
