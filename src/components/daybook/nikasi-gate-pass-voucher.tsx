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
  MapPin,
  Warehouse,
} from 'lucide-react';
import type { NikasiGatePass } from '@/types/nikasi-gate-pass';

interface NikasiGatePassVoucherProps {
  voucher: NikasiGatePass;
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

function NikasiGatePassVoucher({ voucher }: NikasiGatePassVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const firstGrading = voucher.gradingGatePassIds?.[0];
  const farmer =
    firstGrading?.incomingGatePassId?.farmerStorageLinkId?.farmerId;
  const accountNumber =
    firstGrading?.incomingGatePassId?.farmerStorageLinkId?.accountNumber;

  const formattedDate = useMemo(() => formatDate(voucher.date), [voucher.date]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const totalBags = useMemo(
    () => voucher.orderDetails.reduce((sum, od) => sum + od.quantityIssued, 0),
    [voucher.orderDetails]
  );

  const orderDetailsTotals = useMemo(
    () => ({
      issued: voucher.orderDetails.reduce(
        (sum, od) => sum + od.quantityIssued,
        0
      ),
      available: voucher.orderDetails.reduce(
        (sum, od) => sum + od.quantityAvailable,
        0
      ),
    }),
    [voucher.orderDetails]
  );

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
            </div>
          </div>
        </CardHeader>

        <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {farmer && (
            <DetailRow label="Farmer" value={farmer.name} icon={User} />
          )}
          {accountNumber != null && (
            <DetailRow label="Account" value={`#${accountNumber}`} />
          )}
          <DetailRow label="Variety" value={voucher.variety} icon={Package} />
          <DetailRow
            label="From → To"
            value={`${voucher.from} → ${voucher.toField}`}
            icon={MapPin}
          />
          <DetailRow
            label="Grading refs"
            value={`${voucher.gradingGatePassIds?.length ?? 0} GGP(s)`}
            icon={Warehouse}
          />
        </div>

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
              {farmer && (
                <section>
                  <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                    Farmer Details
                  </h4>
                  <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailRow label="Name" value={farmer.name} />
                    <DetailRow label="Mobile" value={farmer.mobileNumber} />
                    {accountNumber != null && (
                      <DetailRow label="Account" value={`${accountNumber}`} />
                    )}
                    {farmer.address && (
                      <DetailRow
                        label="Address"
                        value={farmer.address}
                        icon={MapPin}
                      />
                    )}
                  </div>
                </section>
              )}

              {voucher.gradingGatePassIds != null &&
                voucher.gradingGatePassIds.length > 0 && (
                  <>
                    <Separator />
                    <section>
                      <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                        Grading Gate Passes
                      </h4>
                      <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                        {voucher.gradingGatePassIds.map((gp) => (
                          <DetailRow
                            key={gp._id}
                            label={`GGP #${gp.gatePassNo}`}
                            value={`IGP #${gp.incomingGatePassId?.gatePassNo ?? '—'}`}
                          />
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
                      {voucher.orderDetails.map((od, idx) => (
                        <tr
                          key={`${od.size}-${od.gradingGatePassId}-${idx}`}
                          className="border-border/40 border-b"
                        >
                          <td className="py-2 pr-3 font-medium">{od.size}</td>
                          <td className="py-2 pr-3 text-right">
                            {od.quantityAvailable.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {od.quantityIssued.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-border/60 bg-muted/50 text-primary border-t-2 font-semibold">
                        <td className="py-2.5 pr-3">Total</td>
                        <td className="py-2.5 pr-3 text-right">
                          {orderDetailsTotals.available.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-right">
                          {orderDetailsTotals.issued.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

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

export default memo(NikasiGatePassVoucher);
