import { memo, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { ClipboardList } from 'lucide-react';
import type { DaybookEntry } from '@/types/daybook';
import {
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import EntrySummariesBar from './EntrySummariesBar';
import {
  IncomingVoucher,
  GradingVoucher,
  totalBagsFromOrderDetails,
  type IncomingVoucherData,
  type PassVoucherData,
} from './vouchers';

export interface DaybookEntryCardProps {
  entry: DaybookEntry;
  /** When parent tab is Incoming vs Grading, card opens on that sub-tab */
  defaultSubTab?: 'incoming' | 'grading';
}

/** Get farmerStorageLinkId from incoming (id string or populated object with _id) */
function getFarmerStorageLinkId(
  incoming: Record<string, unknown>
): string | undefined {
  const link = incoming.farmerStorageLinkId;
  if (typeof link === 'string') return link;
  if (link != null && typeof link === 'object' && '_id' in link)
    return (link as { _id: string })._id;
  return undefined;
}

const DaybookEntryCard = memo(function DaybookEntryCard({
  entry,
  defaultSubTab = 'incoming',
}: DaybookEntryCardProps) {
  const incoming = entry.incoming as IncomingVoucherData | undefined;
  const farmer = entry.farmer;
  const farmerName = farmer?.name;
  const farmerAccount = farmer?.accountNumber;
  const farmerAddress = farmer?.address;
  const farmerMobile = farmer?.mobileNumber;

  const summariesWithNikasi = useMemo(() => {
    const base = entry.summaries ?? {
      totalBagsIncoming: 0,
      totalBagsGraded: 0,
      totalBagsStored: 0,
      totalBagsNikasi: 0,
      totalBagsOutgoing: 0,
    };
    const nikasiTotal = (entry.nikasiPasses ?? []).reduce<number>(
      (sum, pass) =>
        sum + totalBagsFromOrderDetails((pass as PassVoucherData).orderDetails),
      0
    );

    let wastageKg: number | undefined;
    let incomingNetKg: number | undefined;
    const slip = incoming?.weightSlip;
    const incomingBags =
      (incoming as { bagsReceived?: number })?.bagsReceived ?? 0;
    if (slip && typeof slip === 'object') {
      const gross =
        Number((slip as { grossWeightKg?: number }).grossWeightKg) || 0;
      const tare =
        Number((slip as { tareWeightKg?: number }).tareWeightKg) || 0;
      incomingNetKg = gross - tare;
      let gradingWeightKg = 0;
      let bagWeightDeductionKg = 0;
      for (const pass of entry.gradingPasses ?? []) {
        const details = (pass as PassVoucherData).orderDetails ?? [];
        for (const od of details) {
          const qty = (od as { initialQuantity?: number }).initialQuantity ?? 0;
          const wt = (od as { weightPerBagKg?: number }).weightPerBagKg ?? 0;
          const bagType = (od as { bagType?: string }).bagType?.toUpperCase();
          gradingWeightKg += qty * wt;
          const bagWt = bagType === 'JUTE' ? JUTE_BAG_WEIGHT : LENO_BAG_WEIGHT;
          bagWeightDeductionKg += qty * bagWt;
        }
      }
      const part1 = incomingNetKg - incomingBags * JUTE_BAG_WEIGHT;
      const part2 = gradingWeightKg - bagWeightDeductionKg;
      wastageKg = part1 - part2;
    }
    let wastagePercent: number | undefined;
    if (wastageKg !== undefined && slip && typeof slip === 'object') {
      const gross =
        Number((slip as { grossWeightKg?: number }).grossWeightKg) || 0;
      const tare =
        Number((slip as { tareWeightKg?: number }).tareWeightKg) || 0;
      const netKg = gross - tare;
      wastagePercent = netKg > 0 ? (wastageKg / netKg) * 100 : undefined;
    }

    return {
      ...base,
      totalBagsNikasi: nikasiTotal,
      ...(wastageKg !== undefined && { wastageKg }),
      ...(wastagePercent !== undefined && { wastagePercent }),
      ...(incomingNetKg !== undefined && { incomingNetKg }),
      incomingBagsCount: incomingBags,
    };
  }, [
    entry.summaries,
    entry.nikasiPasses,
    entry.gradingPasses,
    entry.incoming,
    incoming?.weightSlip,
  ]);

  const farmerStorageLinkId = getFarmerStorageLinkId(entry.incoming);
  const incomingGatePassId = incoming?._id;
  const variety = incoming?.variety;

  const gradingSearch =
    farmerStorageLinkId && incomingGatePassId && variety
      ? {
          farmerStorageLinkId,
          incomingGatePassId,
          variety,
        }
      : undefined;

  return (
    <Card className="overflow-hidden p-0">
      <EntrySummariesBar summaries={summariesWithNikasi} />
      <Tabs defaultValue={defaultSubTab} className="w-full">
        <TabsList className="font-custom flex h-auto w-full flex-nowrap overflow-x-auto">
          <TabsTrigger
            value="incoming"
            className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
          >
            <span className="sm:hidden">Inc</span>
            <span className="hidden sm:inline">Incoming</span>
          </TabsTrigger>
          <TabsTrigger
            value="grading"
            className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
          >
            <span className="sm:hidden">Gra</span>
            <span className="hidden sm:inline">Grading</span>
          </TabsTrigger>
        </TabsList>
        <div className="p-0">
          <TabsContent value="incoming" className="mt-0 outline-none">
            {incoming ? (
              <IncomingVoucher
                voucher={incoming}
                farmerName={farmerName}
                farmerAccount={farmerAccount}
                farmerAddress={farmerAddress}
                farmerMobile={farmerMobile}
              />
            ) : (
              <p className="text-muted-foreground font-custom py-6 text-center text-sm">
                No incoming voucher.
              </p>
            )}
          </TabsContent>
          <TabsContent value="grading" className="mt-0 outline-none">
            {entry.gradingPasses.length > 0 ? (
              <div className="space-y-4">
                {(entry.gradingPasses as PassVoucherData[]).map((pass) => (
                  <GradingVoucher
                    key={pass._id ?? String(pass.gatePassNo)}
                    voucher={pass}
                    farmerName={farmerName}
                    farmerAccount={farmerAccount}
                    farmerStorageLinkId={farmerStorageLinkId}
                    wastageKg={summariesWithNikasi.wastageKg}
                    wastagePercent={summariesWithNikasi.wastagePercent}
                    incomingNetKg={summariesWithNikasi.incomingNetKg}
                    incomingBagsCount={summariesWithNikasi.incomingBagsCount}
                  />
                ))}
              </div>
            ) : (
              <Empty className="font-custom py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardList className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No Grading voucher is present</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link to="/store-admin/grading" search={gradingSearch}>
                      Add Grading voucher
                    </Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
});

export { DaybookEntryCard };
