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
  Package,
  MapPin,
  Warehouse,
} from 'lucide-react';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { PassVoucherData } from './types';
import type { NikasiOrderDetailRow } from './types';
import { totalBagsFromOrderDetails, type VoucherFarmerInfo } from './types';

export interface NikasiVoucherProps extends VoucherFarmerInfo {
  voucher: PassVoucherData;
}

const NikasiVoucher = memo(function NikasiVoucher({
  voucher,
  farmerName,
  farmerAccount,
}: NikasiVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const bags = totalBagsFromOrderDetails(voucher.orderDetails);
  const snapshots = voucher.gradingGatePassSnapshots ?? [];
  const fallbackIds = voucher.gradingGatePassIds ?? [];
  const gradingCount =
    snapshots.length > 0 ? snapshots.length : fallbackIds.length;

  const { totalIssued, totalAvailable } = useMemo(() => {
    const details = (voucher.orderDetails ?? []) as NikasiOrderDetailRow[];
    let issued = 0;
    let available = 0;
    for (const od of details) {
      issued += od.quantityIssued ?? 0;
      available += od.quantityAvailable ?? 0;
    }
    return { totalIssued: issued, totalAvailable: available };
  }, [voucher.orderDetails]);

  const orderDetails = (voucher.orderDetails ?? []) as NikasiOrderDetailRow[];

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-4 pt-2 pb-4">
        <CardHeader className="px-0 pt-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  NGP{' '}
                  <span className="text-primary">
                    #{voucher.gatePassNo ?? '—'}
                  </span>
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
          <DetailRow
            label="Variety"
            value={voucher.variety ?? '—'}
            icon={Package}
          />
          {voucher.from != null && (
            <DetailRow
              label="From → To"
              value={`${voucher.from} → ${voucher.toField ?? '—'}`}
              icon={MapPin}
            />
          )}
          <DetailRow
            label="Grading refs"
            value={`${gradingCount} GGP(s)`}
            icon={Warehouse}
          />
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
              {(farmerName != null || farmerAccount != null) && (
                <section>
                  <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                    Farmer Details
                  </h4>
                  <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {farmerName != null && (
                      <DetailRow label="Name" value={farmerName} />
                    )}
                    {farmerAccount != null && (
                      <DetailRow label="Account" value={`${farmerAccount}`} />
                    )}
                  </div>
                </section>
              )}

              {gradingCount > 0 && (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Grading Gate Passes
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {snapshots.length > 0
                        ? snapshots.map((gp) => {
                            const totalBags = (
                              gp.incomingBagSizes ?? []
                            ).reduce((s, b) => s + (b.currentQuantity ?? 0), 0);
                            return (
                              <div
                                key={gp._id ?? gp.gatePassNo ?? ''}
                                className="bg-muted/30 border-border/50 rounded-lg border p-3"
                              >
                                <p className="text-muted-foreground font-custom text-xs font-medium">
                                  GGP #{gp.gatePassNo ?? '—'}
                                </p>
                                <p className="text-foreground font-custom mt-1 text-sm font-semibold">
                                  #{gp.gatePassNo ?? '—'}
                                </p>
                                {totalBags > 0 && (
                                  <p className="text-muted-foreground font-custom mt-1 text-[10px]">
                                    {totalBags.toLocaleString('en-IN')} bags
                                  </p>
                                )}
                              </div>
                            );
                          })
                        : fallbackIds.map((gp) => (
                            <div
                              key={gp._id ?? gp.gatePassNo ?? ''}
                              className="bg-muted/30 border-border/50 rounded-lg border p-3"
                            >
                              <p className="text-muted-foreground font-custom text-xs font-medium">
                                GGP #{gp.gatePassNo ?? '—'}
                              </p>
                              <p className="text-foreground font-custom mt-1 text-sm font-semibold">
                                #{gp.gatePassNo ?? '—'}
                              </p>
                            </div>
                          ))}
                    </div>
                  </section>
                </>
              )}

              <Separator />

              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Order Details
                </h4>
                <div className="bg-muted/30 overflow-x-auto rounded-lg p-3">
                  <table className="font-custom w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="text-muted-foreground/70 border-b text-left text-[10px] font-medium tracking-wider uppercase">
                        <th className="pr-3 pb-2">Size</th>
                        <th className="pr-3 pb-2 text-right">Qty Available</th>
                        <th className="pb-2 text-right">Qty Issued</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails.map((od, idx) => (
                        <tr
                          key={`${od.size}-${od.gradingGatePassId}-${idx}`}
                          className="border-border/40 border-b"
                        >
                          <td className="py-2 pr-3 font-medium">
                            {od.size ?? '—'}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            {(od.quantityAvailable ?? 0).toLocaleString(
                              'en-IN'
                            )}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {(od.quantityIssued ?? 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-border/60 bg-muted/50 text-primary border-t-2 font-semibold">
                        <td className="py-2.5 pr-3">Total</td>
                        <td className="py-2.5 pr-3 text-right">
                          {totalAvailable.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-right">
                          {totalIssued.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
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
