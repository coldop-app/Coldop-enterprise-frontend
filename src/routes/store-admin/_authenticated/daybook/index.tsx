/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRightFromLine,
  ArrowRightLeft,
  Inbox,
  PackageCheck,
  Scale,
  Sprout,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/stores/store';
import SeedTab from './SeedTab';
import IncomingTab from './IncomingTab';
import GradingTab from './GradingTab';
import StorageTab from './StorageTab';
import NikasiTab from './NikasiTab';
import OutgoingTab from './OutgoingTab';

const DAYBOOK_TABS = [
  'seed',
  'incoming',
  'grading',
  'storage',
  'dispatch-pre-outgoing',
  'dispatch-outgoing',
] as const;

type DaybookTab = (typeof DAYBOOK_TABS)[number];

export const Route = createFileRoute('/store-admin/_authenticated/daybook/')({
  component: RouteComponent,
});

function RouteComponent() {
  const activeTab = useStore((state) => state.daybookActiveTab);
  const setActiveTab = useStore((state) => state.setDaybookActiveTab);
  const handleValueChange = (value: string) => {
    if ((DAYBOOK_TABS as readonly string[]).includes(value)) {
      setActiveTab(value as DaybookTab);
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <Tabs
        value={activeTab}
        onValueChange={handleValueChange}
        className="w-full space-y-4"
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
          <TabsTrigger className="flex-1" value="storage">
            <PackageCheck aria-hidden="true" className="size-4 sm:hidden" />
            <span className="sr-only sm:not-sr-only">Storage</span>
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="dispatch-pre-outgoing">
            <ArrowRightLeft aria-hidden="true" className="size-4 sm:hidden" />
            <span className="sr-only sm:not-sr-only">
              Dispatch (Pre outgoing)
            </span>
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="dispatch-outgoing">
            <ArrowRightFromLine
              aria-hidden="true"
              className="size-4 sm:hidden"
            />
            <span className="sr-only sm:not-sr-only">Dispatch (Outgoing)</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="seed">
          <SeedTab />
        </TabsContent>
        <TabsContent value="incoming">
          <IncomingTab />
        </TabsContent>
        <TabsContent value="grading">
          <GradingTab />
        </TabsContent>
        <TabsContent value="storage">
          <StorageTab />
        </TabsContent>
        <TabsContent value="dispatch-pre-outgoing">
          <NikasiTab />
        </TabsContent>
        <TabsContent value="dispatch-outgoing">
          <OutgoingTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}
