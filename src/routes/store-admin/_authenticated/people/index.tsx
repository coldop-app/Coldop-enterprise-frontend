/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { prefetchAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';
import DispatchLedgerTab from './-DispatchLedgerTab';
import FarmerTab from './-FarmerTab';

export const Route = createFileRoute('/store-admin/_authenticated/people/')({
  loader: () => prefetchAllFarmers(),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div>
        <Tabs defaultValue="farmers" className="w-full">
          <TabsList>
            <TabsTrigger value="farmers">Farmers</TabsTrigger>
            <TabsTrigger value="dispatch-ledgers">Dispatch Ledgers</TabsTrigger>
          </TabsList>
          <TabsContent value="farmers">
            <FarmerTab />
          </TabsContent>
          <TabsContent value="dispatch-ledgers">
            <DispatchLedgerTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
