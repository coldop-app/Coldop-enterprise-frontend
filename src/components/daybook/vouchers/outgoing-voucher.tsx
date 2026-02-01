import { memo, useState } from 'react';
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
  Receipt,
} from 'lucide-react';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { PassVoucherData } from './types';
import { totalBagsFromOrderDetails, type VoucherFarmerInfo } from './types';

export interface OutgoingVoucherProps extends VoucherFarmerInfo {
  voucher: PassVoucherData;
}

const OutgoingVoucher = memo(function OutgoingVoucher({
  voucher,
  farmerName,
  farmerAccount,
}: OutgoingVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const bags = totalBagsFromOrderDetails(voucher.orderDetails);

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-4 pt-2 pb-4">
        <CardHeader className="px-0 pt-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  OGP{' '}
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
              {bags > 0 && (
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-[10px] font-medium"
                >
                  {bags.toLocaleString('en-IN')} bags
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DetailRow label="Farmer" value={farmerName ?? '—'} icon={User} />
          <DetailRow
            label="Account"
            value={farmerAccount != null ? `#${farmerAccount}` : '—'}
            icon={Receipt}
          />
          <DetailRow
            label="Variety"
            value={voucher.variety ?? '—'}
            icon={Package}
          />
          {voucher.from != null && (
            <DetailRow
              label="From → To"
              value={`${voucher.from} → ${voucher.toField ?? '—'}`}
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
                  Farmer Details
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow label="Name" value={farmerName ?? '—'} />
                  <DetailRow
                    label="Account"
                    value={farmerAccount != null ? `#${farmerAccount}` : '—'}
                  />
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

export { OutgoingVoucher };
