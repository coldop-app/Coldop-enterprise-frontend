import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
  FilePlus,
} from 'lucide-react';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { useGetStorageGatePasses } from '@/services/store-admin/storage-gate-pass/useGetStorageGatePasses';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import GradingGatePassVoucher from './grading-gate-pass-voucher';
import StorageGatePassVoucher from './storage-gate-pass-voucher';

type VoucherTabType = 'grading' | 'storage' | 'nikasi' | 'outgoing';

interface IncomingGatePassVoucherProps {
  voucher: IncomingGatePassWithLink;
  onCreateVoucher?: (type: VoucherTabType) => void;
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

const EMPTY_VOUCHER_LABELS: Record<
  VoucherTabType,
  { title: string; description: string; buttonText: string }
> = {
  grading: {
    title: 'No Grading vouchers yet',
    description:
      "You haven't created any grading vouchers yet. Get started by creating your first grading voucher.",
    buttonText: 'Create Grading voucher',
  },
  storage: {
    title: 'No Storage vouchers yet',
    description:
      "You haven't created any storage vouchers yet. Get started by creating your first storage voucher.",
    buttonText: 'Create Storage voucher',
  },
  nikasi: {
    title: 'No Nikasi vouchers yet',
    description:
      "You haven't created any nikasi vouchers yet. Get started by creating your first nikasi voucher.",
    buttonText: 'Create Nikasi voucher',
  },
  outgoing: {
    title: 'No Outgoing vouchers yet',
    description:
      "You haven't created any outgoing vouchers yet. Get started by creating your first outgoing voucher.",
    buttonText: 'Create Outgoing voucher',
  },
};

function EmptyVoucherState({
  voucherType,
  onCreateVoucher,
}: {
  voucherType: VoucherTabType;
  onCreateVoucher?: (type: VoucherTabType) => void;
}) {
  const { title, description, buttonText } = EMPTY_VOUCHER_LABELS[voucherType];
  return (
    <Empty className="font-custom py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FilePlus className="size-6" />
        </EmptyMedia>
        <EmptyTitle className="font-semibold">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="default"
          size="lg"
          className="font-custom font-bold"
          onClick={() => onCreateVoucher?.(voucherType)}
        >
          {buttonText}
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function IncomingGatePassVoucher({
  voucher,
  onCreateVoucher,
}: IncomingGatePassVoucherProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: gradingPasses } = useGetGradingGatePasses();
  const { data: storagePasses } = useGetStorageGatePasses();

  const gradingPassesForThisIncoming = useMemo(() => {
    const list = gradingPasses ?? [];
    return list.filter((gp) => gp.incomingGatePassId._id === voucher._id);
  }, [gradingPasses, voucher._id]);

  const storagePassesForThisIncoming = useMemo(() => {
    const list = storagePasses ?? [];
    return list.filter((sp) =>
      sp.gradingGatePassIds?.some(
        (gp) => gp.incomingGatePassId?._id === voucher._id
      )
    );
  }, [storagePasses, voucher._id]);

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

            {/* Compact Grid - no weight slip or remarks here */}
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

                    {/* Weight Slip - last, with focus on weights */}
                    {voucher.weightSlip && (
                      <div className="border-primary/20 bg-primary/5 mt-4 rounded-lg border p-3">
                        <h4 className="text-muted-foreground/70 mb-2.5 text-xs font-semibold tracking-wider uppercase">
                          Weight Slip
                        </h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <DetailRow
                            label="Slip No"
                            value={voucher.weightSlip.slipNumber}
                          />
                          <DetailRow
                            label="Gross (kg)"
                            value={voucher.weightSlip.grossWeightKg.toLocaleString(
                              'en-IN'
                            )}
                          />
                          <DetailRow
                            label="Tare (kg)"
                            value={voucher.weightSlip.tareWeightKg.toLocaleString(
                              'en-IN'
                            )}
                          />
                        </div>
                        <p className="text-muted-foreground mt-2 text-xs">
                          Net weight:{' '}
                          <span className="text-foreground font-semibold">
                            {(
                              voucher.weightSlip.grossWeightKg -
                              voucher.weightSlip.tareWeightKg
                            ).toLocaleString('en-IN')}{' '}
                            kg
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Remarks - last */}
                    {voucher.remarks && (
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
        </TabsContent>

        <TabsContent value="grading" className="mt-0 outline-none">
          <CardContent className="px-4 py-6">
            {gradingPassesForThisIncoming.length === 0 ? (
              <EmptyVoucherState
                voucherType="grading"
                onCreateVoucher={(type) => {
                  if (type === 'grading') {
                    navigate({
                      to: '/store-admin/grading',
                      search: {
                        incomingGatePassId: voucher._id,
                        variety: voucher.variety,
                      },
                    });
                  }
                  onCreateVoucher?.(type);
                }}
              />
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {gradingPassesForThisIncoming.map((gp) => (
                  <GradingGatePassVoucher key={gp._id} voucher={gp} />
                ))}
              </div>
            )}
          </CardContent>
        </TabsContent>

        <TabsContent value="storage" className="mt-0 outline-none">
          <CardContent className="px-4 py-6">
            {storagePassesForThisIncoming.length === 0 ? (
              <EmptyVoucherState
                voucherType="storage"
                onCreateVoucher={(type) => {
                  if (type === 'storage') {
                    navigate({ to: '/store-admin/storage' });
                  }
                  onCreateVoucher?.(type);
                }}
              />
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {storagePassesForThisIncoming.map((sp) => (
                  <StorageGatePassVoucher key={sp._id} voucher={sp} />
                ))}
              </div>
            )}
          </CardContent>
        </TabsContent>

        <TabsContent value="nikasi" className="mt-0 outline-none">
          <CardContent className="px-4 py-6">
            <EmptyVoucherState
              voucherType="nikasi"
              onCreateVoucher={(type) => {
                if (type === 'nikasi') {
                  navigate({ to: '/store-admin/nikasi' });
                }
                onCreateVoucher?.(type);
              }}
            />
          </CardContent>
        </TabsContent>

        <TabsContent value="outgoing" className="mt-0 outline-none">
          <CardContent className="px-4 py-6">
            <EmptyVoucherState
              voucherType="outgoing"
              onCreateVoucher={(type) => {
                if (type === 'outgoing') {
                  navigate({ to: '/store-admin/outgoing' });
                }
                onCreateVoucher?.(type);
              }}
            />
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

export default memo(IncomingGatePassVoucher);
