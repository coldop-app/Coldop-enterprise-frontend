/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import {
  ArrowRightFromLine,
  ArrowRightLeft,
  BarChart3,
  Inbox,
  PackageCheck,
  RefreshCw,
  Scale,
  Sprout,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import Overview from './-Overview';
import AnalyticsSeedTab from './seed-tab/-AnalyticsSeedTab';
import AnalyticsIncomingTab from './incoming-tab/-AnalyticsIncomingTab';
import AnalyticsStorageTab from './storage-tab/-AnalyticsStorageTab';
import AnalayticsGradingTab from './grading-tab/-AnalayticsGradingTab';
import AnalyticsNikasiTab from './nikasi-tab/-AnalyticsNikasiTab';
import AnalyticsOutgoingTab from './outgoing-tab/-AnalyticsOutgoingTab';

export const Route = createFileRoute('/store-admin/_authenticated/analytics/')({
  component: RouteComponent,
});

const ANALYTICS_TABS = [
  'seed',
  'incoming',
  'grading',
  'storage',
  'dispatch-pre-outgoing',
  'dispatch-outgoing',
] as const;

type AnalyticsTab = (typeof ANALYTICS_TABS)[number];

export interface AnalyticsDateRange {
  fromDate: string;
  toDate: string;
}

function toApiDate(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') return '';

  const [day, month, year] = trimmed.split('.');
  if (!day || !month || !year) return '';

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  const normalizedYear = year.padStart(4, '0');

  return `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
}

function RouteComponent() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState<AnalyticsDateRange>({
    fromDate: '',
    toDate: '',
  });
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('seed');

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setAppliedDateRange({ fromDate: '', toDate: '' });
  };

  const handleApplyFilters = () => {
    setAppliedDateRange({
      fromDate: toApiDate(fromDate),
      toDate: toApiDate(toDate),
    });
  };

  const handleValueChange = (value: string) => {
    if ((ANALYTICS_TABS as readonly string[]).includes(value)) {
      setActiveTab(value as AnalyticsTab);
    }
  };

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Item
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-xl shadow-sm"
        >
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <BarChart3 className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                Analytics
              </ItemTitle>
            </div>

            <ItemActions>
              <Button variant="outline" size="sm" className="font-custom gap-2">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        <Item
          variant="outline"
          size="sm"
          className="border-border/70 rounded-2xl p-2 shadow-sm sm:p-3"
        >
          <div className="flex w-full flex-nowrap items-end gap-4 overflow-x-auto px-1 py-1">
            <div className="min-w-max">
              <DatePicker
                id="analytics-from-date"
                label="From"
                compact
                value={fromDate}
                onChange={setFromDate}
              />
            </div>

            <div className="min-w-max">
              <DatePicker
                id="analytics-to-date"
                label="To"
                compact
                value={toDate}
                onChange={setToDate}
              />
            </div>

            <Button
              className="font-custom rounded-lg px-5 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md"
              disabled={!fromDate || !toDate}
              onClick={handleApplyFilters}
            >
              Apply
            </Button>
            <Button
              variant="secondary"
              className="font-custom border-border/70 bg-background/80 hover:bg-secondary rounded-lg border px-5 text-[#333] transition-colors duration-200 ease-in-out"
              onClick={handleResetFilters}
            >
              Reset
            </Button>
          </div>
        </Item>

        <Overview dateRange={appliedDateRange} />
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
            <AnalyticsSeedTab />
          </TabsContent>
          <TabsContent value="incoming">
            <AnalyticsIncomingTab dateRange={appliedDateRange} />
          </TabsContent>
          <TabsContent value="grading">
            <AnalayticsGradingTab dateRange={appliedDateRange} />
          </TabsContent>
          <TabsContent value="storage">
            <AnalyticsStorageTab />
          </TabsContent>
          <TabsContent value="dispatch-pre-outgoing">
            <AnalyticsNikasiTab />
          </TabsContent>
          <TabsContent value="dispatch-outgoing">
            <AnalyticsOutgoingTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
