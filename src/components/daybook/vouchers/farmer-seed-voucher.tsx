import { memo, useMemo, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DetailRow } from './detail-row';
import { formatVoucherDate } from './format-date';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';
import {
  ChevronDown,
  ChevronUp,
  ReceiptText,
  Sprout,
  User,
} from 'lucide-react';

export interface FarmerSeedVoucherProps {
  entry: FarmerSeedEntryListItem;
  farmerName?: string;
  farmerAccount?: number;
  farmerAddress?: string;
}

const FarmerSeedVoucher = memo(function FarmerSeedVoucher({
  entry,
  farmerName,
  farmerAccount,
  farmerAddress,
}: FarmerSeedVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const totals = useMemo(() => {
    return entry.bagSizes.reduce(
      (acc, bag) => {
        const qty = bag.quantity ?? 0;
        const rate = bag.rate ?? 0;
        const lineAmount = qty * rate;
        return {
          totalBags: acc.totalBags + qty,
          totalAmount: acc.totalAmount + lineAmount,
          totalReceived: acc.totalReceived + (bag.amountReceived ?? 0),
        };
      },
      { totalBags: 0, totalAmount: 0, totalReceived: 0 }
    );
  }, [entry.bagSizes]);

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-4 pt-2 pb-4">
        <CardHeader className="px-0 pt-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  FSP{' '}
                  <span className="text-primary">
                    #{entry.gatePassNo ?? '—'}
                  </span>
                  {entry.invoiceNumber ? (
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · Inv #{entry.invoiceNumber}
                    </span>
                  ) : null}
                </h3>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {formatVoucherDate(entry.date)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Badge
                variant="secondary"
                className="px-2 py-0.5 text-[10px] font-medium"
              >
                {totals.totalBags.toLocaleString('en-IN')} bags
              </Badge>
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DetailRow label="Farmer" value={farmerName ?? '—'} icon={User} />
          <DetailRow label="Account" value={`#${farmerAccount ?? '—'}`} />
          <DetailRow
            label="Variety"
            value={entry.variety ?? '—'}
            icon={Sprout}
          />
          <DetailRow
            label="Generation"
            value={entry.generation || '—'}
            icon={ReceiptText}
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
        </div>

        {isExpanded && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <section>
                <h4 className="text-muted-foreground/70 mb-2 text-xs font-semibold tracking-wider uppercase">
                  Farmer Details
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-2 rounded-lg p-2 sm:grid-cols-2">
                  <DetailRow label="Name" value={farmerName ?? '—'} />
                  <DetailRow
                    label="Account"
                    value={`${farmerAccount ?? '—'}`}
                  />
                  <DetailRow label="Address" value={farmerAddress ?? '—'} />
                </div>
              </section>

              <Separator />

              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Seed Details
                </h4>
                <div className="bg-muted/30 overflow-x-auto rounded-lg p-3">
                  <table className="font-custom w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-muted-foreground/70 border-b text-left text-[10px] font-medium tracking-wider uppercase">
                        <th className="pr-3 pb-2">Size</th>
                        <th className="pr-3 pb-2 text-right">Qty</th>
                        <th className="pr-3 pb-2 text-right">Rate</th>
                        <th className="pr-3 pb-2 text-right">Amount</th>
                        <th className="pb-2 text-right">Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.bagSizes.map((row, idx) => {
                        const quantity = row.quantity ?? 0;
                        const rate = row.rate ?? 0;
                        const amount = quantity * rate;
                        return (
                          <tr
                            key={`${row.name}-${idx}`}
                            className="border-border/40 border-b"
                          >
                            <td className="py-2 pr-3 font-medium">
                              {row.name || '—'}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {quantity.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {rate.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 text-right">
                              {(row.amountReceived ?? 0).toLocaleString(
                                'en-IN'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-border/60 bg-muted/50 text-primary border-t-2 font-semibold">
                        <td className="py-2.5 pr-3">Total</td>
                        <td className="py-2.5 pr-3 text-right">
                          {totals.totalBags.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 pr-3 text-right">—</td>
                        <td className="py-2.5 pr-3 text-right">
                          {totals.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-right">
                          {totals.totalReceived.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {entry.remarks ? (
                <>
                  <Separator />
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Remarks
                    </h4>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-foreground font-custom text-sm font-medium">
                        {entry.remarks}
                      </p>
                    </div>
                  </section>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </Card>
  );
});

export { FarmerSeedVoucher };
