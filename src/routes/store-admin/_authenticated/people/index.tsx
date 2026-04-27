/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { User, RefreshCw } from 'lucide-react';
import { FilterBar } from '@/components/filter-bar';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { FarmerCard } from '@/components/people/FarmerCard';

export const Route = createFileRoute('/store-admin/_authenticated/people/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const mockFarmers = [
    {
      _id: '1',
      farmerId: {
        _id: 'f1',
        name: 'DEEPAK KUMAR S/O TIRATH RAM SHARMA',
        address: 'BANDA',
        mobileNumber: '9935361340',
      },
      accountNumber: 23,
      isActive: true,
    },
    {
      _id: '2',
      farmerId: {
        _id: 'f2',
        name: 'JASVINDER SINGH S/O MOHAN SINGH',
        address: 'PURANPUR',
        mobileNumber: '9759414199',
      },
      accountNumber: 11,
      isActive: true,
    },
    {
      _id: '3',
      farmerId: {
        _id: 'f3',
        name: 'JITENDAR SINGH S/O SUKHPAL SINGH',
        address: 'BANDA',
        mobileNumber: '8840732647',
      },
      accountNumber: 34,
      isActive: true,
    },
  ];

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
                <User className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                (add count here) 500 farmers
              </ItemTitle>
            </div>
            <ItemActions>
              {/* <Button
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => refetch()}
              className="font-custom h-8 gap-2 rounded-lg px-3"
            >
              <RefreshCw
                className={`h-4 w-4 shrink-0 ${
                  isFetching ? 'animate-spin' : ''
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button> */}
              <Button variant="outline" size="sm">
                <RefreshCw />
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        <FilterBar
          searchPlaceholder="Search farmers..."
          searchValue={search}
          onSearchChange={setSearch}
          selectedSort={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { label: 'Name', value: 'name' },
            { label: 'Account Number', value: 'account-number' },
          ]}
        >
          <Button
            size="sm"
            variant="default"
            className="font-custom rounded-lg"
          >
            Apply
          </Button>
        </FilterBar>

        <FarmerCard data={mockFarmers} />
      </div>
    </main>
  );
}
