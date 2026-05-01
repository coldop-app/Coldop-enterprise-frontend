/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { Suspense } from 'react';
import {
  ArrowRightFromLine,
  ArrowRightLeft,
  Inbox,
  PackageCheck,
  Scale,
  Sprout,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useStore } from '@/stores/store';
import SeedTab from './-SeedTab';
import IncomingTab from './-IncomingTab';
import GradingTab from './-GradingTab';
import StorageTab from './-StorageTab';
import NikasiTab from './-NikasiTab';
import OutgoingTab from './-OutgoingTab';

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
              Dispatch (Pre Storage)
            </span>
          </TabsTrigger>
          <TabsTrigger className="flex-1" value="dispatch-outgoing">
            <ArrowRightFromLine
              aria-hidden="true"
              className="size-4 sm:hidden"
            />
            <span className="sr-only sm:not-sr-only">
              Dispatch (Post Storage)
            </span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="seed">
          <Suspense fallback={<DaybookTabSkeleton />}>
            <SeedTab isActive={activeTab === 'seed'} />
          </Suspense>
        </TabsContent>
        <TabsContent value="incoming">
          <Suspense fallback={<DaybookTabSkeleton />}>
            <IncomingTab isActive={activeTab === 'incoming'} />
          </Suspense>
        </TabsContent>
        <TabsContent value="grading">
          <Suspense fallback={<DaybookTabSkeleton />}>
            <GradingTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="storage">
          <Suspense fallback={<DaybookTabSkeleton />}>
            <StorageTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="dispatch-pre-outgoing">
          <Suspense fallback={<DaybookTabSkeleton />}>
            <NikasiTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="dispatch-outgoing">
          <Suspense fallback={<DaybookTabSkeleton />}>
            <OutgoingTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function DaybookTabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-56" />
      <div className="rounded-xl border p-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </div>
  );
}
