/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';

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

export const Route = createFileRoute('/store-admin/_authenticated/analytics/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
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
              onClick={() => undefined}
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

        <Overview />
      </div>
    </main>
  );
}
