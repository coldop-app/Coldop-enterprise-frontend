import { memo, useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronDown,
  ChevronUp,
  Printer,
  MapPin,
  User,
  Truck,
  Package,
} from 'lucide-react';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';

interface IncomingGatePassVoucherProps {
  voucher: IncomingGatePassWithLink;
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

function IncomingGatePassVoucher({ voucher }: IncomingGatePassVoucherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const farmer = voucher.farmerStorageLinkId.farmerId;
  const linkedBy = voucher.farmerStorageLinkId.linkedById;

  const formattedDate = useMemo(() => formatDate(voucher.date), [voucher.date]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const readableStatus = useMemo(
    () => voucher.status.replace(/_/g, ' '),
    [voucher.status]
  );

  return (
    <Card className="border-border/40 hover:border-primary/30 overflow-hidden pt-0 shadow-sm transition-all duration-200 hover:shadow-md">
      <Tabs defaultValue="incoming" className="w-full">
        {/* Tabs at top - full width on mobile, flush with card edges */}
        <div className="overflow-x-auto px-0 [-webkit-overflow-scrolling:touch] sm:px-4">
          <TabsList className="font-custom bg-muted flex h-9 w-full flex-nowrap gap-1 rounded-none p-1 text-xs sm:rounded-lg sm:text-sm">
            <TabsTrigger
              value="incoming"
              className="min-w-0 flex-1 shrink-0 px-2 sm:px-3"
            >
              <span className="sm:hidden">Inc</span>
              <span className="hidden sm:inline">Incoming</span>
            </TabsTrigger>
            <TabsTrigger
              value="grading"
              className="min-w-0 flex-1 shrink-0 px-2 sm:px-3"
            >
              <span className="sm:hidden">Gra</span>
              <span className="hidden sm:inline">Grading</span>
            </TabsTrigger>
            <TabsTrigger
              value="storage"
              className="min-w-0 flex-1 shrink-0 px-2 sm:px-3"
            >
              <span className="sm:hidden">Sto</span>
              <span className="hidden sm:inline">Storage</span>
            </TabsTrigger>
            <TabsTrigger
              value="nikasi"
              className="min-w-0 flex-1 shrink-0 px-2 sm:px-3"
            >
              <span className="sm:hidden">Nik</span>
              <span className="hidden sm:inline">Nikasi</span>
            </TabsTrigger>
            <TabsTrigger
              value="outgoing"
              className="min-w-0 flex-1 shrink-0 px-2 sm:px-3"
            >
              <span className="sm:hidden">Out</span>
              <span className="hidden sm:inline">Outgoing</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="incoming" className="mt-0 outline-none">
          <div className="px-4 pt-2 pb-4">
            {/* Compact Header - card identity */}
            <CardHeader className="px-0 pt-3 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                    <h3 className="text-foreground font-custom text-base font-bold tracking-tight">
                      IGP{' '}
                      <span className="text-primary">
                        #{voucher.gatePassNo}
                      </span>
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
                    {voucher.bagsReceived.toLocaleString('en-IN')} bags
                  </Badge>
                  <Badge
                    variant="outline"
                    className="px-2 py-0.5 text-[10px] font-medium capitalize"
                  >
                    {readableStatus}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {/* Compact Grid */}
            <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <DetailRow label="Farmer" value={farmer.name} icon={User} />
              <DetailRow
                label="Account"
                value={`#${voucher.farmerStorageLinkId.accountNumber}`}
              />
              <DetailRow
                label="Truck"
                value={voucher.truckNumber}
                icon={Truck}
              />
              <DetailRow
                label="Variety"
                value={voucher.variety}
                icon={Package}
              />
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
                        value={`${voucher.farmerStorageLinkId.accountNumber}`}
                      />
                      <DetailRow
                        label="Address"
                        value={farmer.address}
                        icon={MapPin}
                      />
                    </div>
                  </section>

                  <Separator />

                  {/* Gate Pass Info */}
                  <section>
                    <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                      Gate Pass Details
                    </h4>
                    <div className="bg-muted/30 grid grid-cols-1 gap-3 rounded-lg p-3 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailRow
                        label="Pass Number"
                        value={`#${voucher.gatePassNo}`}
                      />
                      <DetailRow label="Status" value={readableStatus} />
                      <DetailRow
                        label="Bags Received"
                        value={voucher.bagsReceived.toLocaleString('en-IN')}
                      />
                      <DetailRow
                        label="Graded Bags"
                        value={voucher.gradingSummary.totalGradedBags.toLocaleString(
                          'en-IN'
                        )}
                      />
                      <DetailRow label="Created By" value={linkedBy.name} />
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="grading" className="mt-0 outline-none">
          <CardContent className="font-custom text-muted-foreground px-4 py-6 text-center text-sm">
            Grading details will appear here.
          </CardContent>
        </TabsContent>

        <TabsContent value="storage" className="mt-0 outline-none">
          <CardContent className="font-custom text-muted-foreground px-4 py-6 text-center text-sm">
            Storage details will appear here.
          </CardContent>
        </TabsContent>

        <TabsContent value="nikasi" className="mt-0 outline-none">
          <CardContent className="font-custom text-muted-foreground px-4 py-6 text-center text-sm">
            Nikasi details will appear here.
          </CardContent>
        </TabsContent>

        <TabsContent value="outgoing" className="mt-0 outline-none">
          <CardContent className="font-custom text-muted-foreground px-4 py-6 text-center text-sm">
            Outgoing details will appear here.
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

export default memo(IncomingGatePassVoucher);
