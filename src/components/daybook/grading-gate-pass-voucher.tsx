import { memo, useCallback, useMemo, useState } from 'react';
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
} from 'lucide-react';
import type { GradingGatePass } from '@/types/grading-gate-pass';

interface GradingGatePassVoucherProps {
  voucher: GradingGatePass;
}

const DetailRow = memo(function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="text-muted-foreground/60 mt-0.5 h-3.5 w-3.5" />}
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground/70 mb-0.5 text-[10px] font-medium tracking-wider uppercase">
          {label}
        </div>
        <div className="text-foreground truncate text-sm font-semibold">
          {value}
        </div>
      </div>
    </div>
  );
});

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function GradingGatePassVoucher({ voucher }: GradingGatePassVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const incoming = voucher.incomingGatePassId;
  const farmer = incoming.farmerStorageLinkId.farmerId;
  const gradedBy = voucher.gradedById;

  const formattedDate = useMemo(() => formatDate(voucher.date), [voucher.date]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const readableAllocationStatus = useMemo(
    () => voucher.allocationStatus.replace(/_/g, ' '),
    [voucher.allocationStatus]
  );

  const totalBags = useMemo(
    () => voucher.orderDetails.reduce((sum, od) => sum + od.currentQuantity, 0),
    [voucher.orderDetails]
  );

  const gradedBags = useMemo(
    () => voucher.orderDetails.reduce((sum, od) => sum + od.initialQuantity, 0),
    [voucher.orderDetails]
  );

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <div className="px-4 pt-2 pb-4">
        {/* Compact Header - card identity */}
        <CardHeader className="px-0 pt-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                  GGP{' '}
                  <span className="text-primary">#{voucher.gatePassNo}</span>
                </h3>
              </div>
              <p className="text-muted-foreground mt-2 text-xs">
                {formattedDate}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Badge
                variant="secondary"
                className="px-2 py-0.5 text-[10px] font-medium"
              >
                {totalBags.toLocaleString('en-IN')} bags
              </Badge>
              <Badge
                variant="outline"
                className="px-2 py-0.5 text-[10px] font-medium capitalize"
              >
                {readableAllocationStatus}
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Compact Grid */}
        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DetailRow label="Farmer" value={farmer.name} icon={User} />
          <DetailRow
            label="Account"
            value={`#${incoming.farmerStorageLinkId.accountNumber}`}
          />
          <DetailRow label="Variety" value={voucher.variety} icon={Package} />
          <DetailRow label="Graded By" value={gradedBy.name} icon={Layers} />
        </div>

        {/* Compact Actions */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpanded}
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
            onClick={handlePrint}
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
              {/* Farmer Details */}
              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Farmer Details
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow label="Name" value={farmer.name} />
                  <DetailRow label="Mobile" value={farmer.mobileNumber} />
                  <DetailRow
                    label="Account"
                    value={`${incoming.farmerStorageLinkId.accountNumber}`}
                  />
                </div>
              </section>

              <Separator />

              {/* Incoming Reference */}
              <section>
                <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                  Incoming Gate Pass
                </h4>
                <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                  <DetailRow
                    label="IGP Number"
                    value={`#${incoming.gatePassNo}`}
                  />
                  <DetailRow
                    label="Bags Received"
                    value={incoming.bagsReceived.toLocaleString('en-IN')}
                  />
                  <DetailRow
                    label="Graded Bags"
                    value={gradedBags.toLocaleString('en-IN')}
                  />
                </div>
              </section>

              <Separator />

              {/* Order Details */}
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
                        <th className="pb-2 text-right">Wt/Bag (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {voucher.orderDetails
                        .filter((od) => od.currentQuantity > 0)
                        .map((od, idx) => (
                          <tr
                            key={`${od.size}-${od.bagType}-${idx}`}
                            className="border-border/40 border-b last:border-0"
                          >
                            <td className="py-2 pr-3 font-medium">{od.size}</td>
                            <td className="py-2 pr-3">{od.bagType}</td>
                            <td className="py-2 pr-3 text-right font-medium">
                              {od.currentQuantity.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 pr-3 text-right">
                              {od.initialQuantity.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 text-right">
                              {od.weightPerBagKg.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Remarks */}
              {voucher.remarks && (
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
}

export default memo(GradingGatePassVoucher);
