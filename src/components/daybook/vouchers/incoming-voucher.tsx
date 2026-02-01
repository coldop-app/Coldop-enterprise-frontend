import { memo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  MapPin,
  User,
  Truck,
  Package,
} from 'lucide-react';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { IncomingVoucherData } from './types';
import type { VoucherFarmerInfo } from './types';

export interface IncomingVoucherProps extends VoucherFarmerInfo {
  voucher: IncomingVoucherData;
  farmerAddress?: string;
  farmerMobile?: string;
}

const IncomingVoucher = memo(function IncomingVoucher({
  voucher,
  farmerName,
  farmerAccount,
  farmerAddress,
  farmerMobile,
}: IncomingVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const bags = voucher.bagsReceived ?? 0;
  const status = voucher.status ?? '—';
  const linkedBy = voucher.createdBy;

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-3 pt-2 pb-3 sm:px-4 sm:pb-4">
        <CardHeader className="px-0 pt-2 pb-2 sm:pt-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  IGP{' '}
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
              <Badge
                variant="outline"
                className="px-2 py-0.5 text-[10px] font-medium capitalize"
              >
                {(status as string).replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DetailRow label="Farmer" value={farmerName ?? '—'} icon={User} />
          <DetailRow label="Account" value={`#${farmerAccount ?? '—'}`} />
          <DetailRow
            label="Truck"
            value={voucher.truckNumber ?? '—'}
            icon={Truck}
          />
          <DetailRow
            label="Variety"
            value={voucher.variety ?? '—'}
            icon={Package}
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
              <section>
                <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                  Farmer Details
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-2 rounded-lg p-2 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow label="Name" value={farmerName ?? '—'} />
                  <DetailRow label="Mobile" value={farmerMobile ?? '—'} />
                  <DetailRow
                    label="Account"
                    value={`${farmerAccount ?? '—'}`}
                  />
                  <DetailRow
                    label="Address"
                    value={farmerAddress ?? '—'}
                    icon={MapPin}
                  />
                </div>
              </section>

              <Separator />

              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Gate Pass Details
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow
                    label="Pass Number"
                    value={`#${voucher.gatePassNo ?? '—'}`}
                  />
                  <DetailRow
                    label="Status"
                    value={(voucher.status ?? '—').replace(/_/g, ' ')}
                  />
                  <DetailRow
                    label="Bags Received"
                    value={(voucher.bagsReceived ?? 0).toLocaleString('en-IN')}
                  />
                  <DetailRow
                    label="Graded Bags"
                    value={(
                      voucher.gradingSummary?.totalGradedBags ?? 0
                    ).toLocaleString('en-IN')}
                  />
                  <DetailRow label="Created By" value={linkedBy?.name ?? '—'} />
                </div>

                {voucher.weightSlip != null && (
                  <div className="border-primary/20 bg-primary/5 mt-4 rounded-lg border p-3">
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Weight Slip
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <DetailRow
                        label="Slip No"
                        value={voucher.weightSlip.slipNumber ?? '—'}
                      />
                      <DetailRow
                        label="Gross (kg)"
                        value={(
                          voucher.weightSlip.grossWeightKg ?? 0
                        ).toLocaleString('en-IN')}
                      />
                      <DetailRow
                        label="Tare (kg)"
                        value={(
                          voucher.weightSlip.tareWeightKg ?? 0
                        ).toLocaleString('en-IN')}
                      />
                    </div>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Net weight:{' '}
                      <span className="text-foreground font-semibold">
                        {(
                          (voucher.weightSlip.grossWeightKg ?? 0) -
                          (voucher.weightSlip.tareWeightKg ?? 0)
                        ).toLocaleString('en-IN')}{' '}
                        kg
                      </span>
                    </p>
                  </div>
                )}

                {voucher.remarks != null && voucher.remarks !== '' && (
                  <div className="mt-4">
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Remarks
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground text-sm font-medium">
                        {voucher.remarks}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </Card>
  );
});

export { IncomingVoucher };
