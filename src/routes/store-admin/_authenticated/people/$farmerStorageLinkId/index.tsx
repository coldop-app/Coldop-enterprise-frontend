/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { Inbox, Scale, Sprout } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FarmerProfileOverview } from '@/components/people/FarmerProfileOverview';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GatePassesTotals } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import {
  prefetchAllGatePassesOfFarmer,
  useGetAllGatePassesOfFarmer,
} from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import { buildFarmerProfileAggregates } from './helpers/-calculations';
import ProfileGradingTab from './-ProfileGradingTab';
import ProfileIncomingTab from './-ProfileIncomingTab';
import ProfileSeedTab from './-ProfileSeedTab';

const EMPTY_TOTALS: GatePassesTotals = {
  incoming: 0,
  grading: 0,
  dispatch: 0,
  storage: 0,
  outgoing: 0,
  totalUngraded: 0,
  totalSeedBags: 0,
};

const PROFILE_TABS = ['seed', 'incoming', 'grading'] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

export const Route = createFileRoute(
  '/store-admin/_authenticated/people/$farmerStorageLinkId/'
)({
  loader: ({ params }) =>
    prefetchAllGatePassesOfFarmer(params.farmerStorageLinkId),
  component: RouteComponent,
});

function RouteComponent() {
  const { farmerStorageLinkId } = Route.useParams();
  const gatePassesResponse = useGetAllGatePassesOfFarmer(farmerStorageLinkId);
  const isLoading = gatePassesResponse.incoming.isLoading;
  const isError = gatePassesResponse.incoming.isError;
  const queryError = gatePassesResponse.incoming.error;
  const isRefetching = gatePassesResponse.isFetching && !isLoading;

  const handleRefreshGatePasses = () => {
    void gatePassesResponse.refetch();
  };

  const [activeTab, setActiveTab] = useState<ProfileTab>('seed');
  const handleValueChange = (value: string) => {
    if ((PROFILE_TABS as readonly string[]).includes(value)) {
      setActiveTab(value as ProfileTab);
    }
  };

  const aggregates = useMemo(() => {
    if (isLoading || isError) {
      return buildFarmerProfileAggregates(undefined);
    }
    return buildFarmerProfileAggregates({
      incoming: gatePassesResponse.incoming.data,
      grading: gatePassesResponse.grading.data,
      dispatch: gatePassesResponse.nikasi.data,
      storage: gatePassesResponse.storage.data,
      outgoing: gatePassesResponse.outgoing.data,
      farmerSeeds: gatePassesResponse.farmerSeeds.data,
      totals: gatePassesResponse.totals ?? EMPTY_TOTALS,
    });
  }, [
    gatePassesResponse.farmerSeeds.data,
    gatePassesResponse.grading.data,
    gatePassesResponse.incoming.data,
    gatePassesResponse.nikasi.data,
    gatePassesResponse.outgoing.data,
    gatePassesResponse.storage.data,
    gatePassesResponse.totals,
    isError,
    isLoading,
  ]);

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Card className="overflow-hidden rounded-xl shadow-sm">
          <CardContent className="p-4 sm:p-5">
            {isLoading ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-6 w-44" />
                  <Skeleton className="h-4 w-60" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              </div>
            ) : (
              <FarmerProfileOverview
                name={gatePassesResponse.farmerStorageLink?.name}
                accountNumber={gatePassesResponse.farmerStorageLink?.accountNumber?.toString()}
                address={gatePassesResponse.farmerStorageLink?.address}
                farmerStorageLinkId={farmerStorageLinkId}
                aggregates={aggregates}
              />
            )}
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={handleValueChange}
          className="font-custom w-full space-y-4"
        >
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="seed">
              <Sprout aria-hidden="true" className="size-4 sm:hidden" />
              <span className="sr-only sm:not-sr-only">Seed</span>
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="incoming">
              <Inbox aria-hidden="true" className="size-4 sm:hidden" />
              <span className="sr-only sm:not-sr-only">Incoming</span>
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="grading">
              <Scale aria-hidden="true" className="size-4 sm:hidden" />
              <span className="sr-only sm:not-sr-only">Grading</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="seed" className="mt-0">
            <ProfileSeedTab
              entries={gatePassesResponse.farmerSeeds.data}
              isLoading={isLoading}
              isError={isError}
              error={queryError}
              onRefresh={handleRefreshGatePasses}
              isRefetching={isRefetching}
            />
          </TabsContent>
          <TabsContent value="incoming" className="mt-0">
            <ProfileIncomingTab
              gatePasses={gatePassesResponse.incoming.data}
              isLoading={isLoading}
              isError={isError}
              error={queryError}
              onRefresh={handleRefreshGatePasses}
              isRefetching={isRefetching}
            />
          </TabsContent>
          <TabsContent value="grading" className="mt-0">
            <ProfileGradingTab
              gradingPasses={gatePassesResponse.grading.data}
              isLoading={isLoading}
              isError={isError}
              error={queryError}
              onRefresh={handleRefreshGatePasses}
              isRefetching={isRefetching}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
