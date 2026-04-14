import { memo } from 'react';
import {
  Sprout,
  ArrowDownToLine,
  Scale,
  Warehouse,
  Truck,
  ArrowUpFromLine,
} from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  SeedTab,
  IncomingTab,
  GradingTab,
  StorageTab,
  DispatchTab,
  OutgoingTab,
} from './tabs';
import { DaybookEntryCard } from './DaybookEntryCard';

type DaybookTab =
  | 'seed'
  | 'incoming'
  | 'grading'
  | 'storage'
  | 'dispatch'
  | 'outgoing';

const DaybookPage = memo(function DaybookPage() {
  const [activeTab, setActiveTab] = useLocalStorage<DaybookTab>(
    'daybook-active-tab',
    'incoming'
  );

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DaybookTab)}
            className="w-full"
          >
            <TabsList className="font-custom mb-4 flex h-auto w-full flex-nowrap overflow-x-auto rounded-xl">
              <TabsTrigger
                value="seed"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                aria-label="Seed"
              >
                <Sprout className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Seed</span>
              </TabsTrigger>
              <TabsTrigger
                value="incoming"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                aria-label="Incoming"
              >
                <ArrowDownToLine className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Incoming</span>
              </TabsTrigger>
              <TabsTrigger
                value="grading"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                aria-label="Grading"
              >
                <Scale className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Grading</span>
              </TabsTrigger>
              <TabsTrigger
                value="storage"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                aria-label="Storage"
              >
                <Warehouse className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Storage</span>
              </TabsTrigger>
              <TabsTrigger
                value="dispatch"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                aria-label="Dispatch"
              >
                <Truck className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Dispatch</span>
              </TabsTrigger>
              <TabsTrigger
                value="outgoing"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
                aria-label="Outgoing"
              >
                <ArrowUpFromLine className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Outgoing</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="seed"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <SeedTab />
            </TabsContent>

            <TabsContent
              value="incoming"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <IncomingTab />
            </TabsContent>

            <TabsContent
              value="grading"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <GradingTab />
            </TabsContent>

            <TabsContent
              value="storage"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <StorageTab />
            </TabsContent>

            <TabsContent
              value="dispatch"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <DispatchTab />
            </TabsContent>

            <TabsContent
              value="outgoing"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <OutgoingTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
});

export default DaybookPage;
export { DaybookEntryCard };
