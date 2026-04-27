/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';

import { User, RefreshCw, Plus } from 'lucide-react';
import { FilterBar } from '@/components/filter-bar';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { FarmerCard } from '@/components/people/FarmerCard';
import { useGetAllFarmers } from '@/services/store-admin/people/useGetAllFarmers';

export const Route = createFileRoute('/store-admin/_authenticated/people/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [search, setSearch] = useDebounceValue('', 500);
  const [sortBy, setSortBy] = useState('name-asc');
  const {
    data: farmers = [],
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAllFarmers();
  const trimmedSearch = search.trim().toLowerCase();
  const filteredFarmers = farmers.filter((farmer) => {
    if (!trimmedSearch) {
      return true;
    }

    const searchableText = [
      farmer.farmerId.name,
      farmer.farmerId.address,
      farmer.farmerId.mobileNumber,
      String(farmer.accountNumber),
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(trimmedSearch);
  });

  const sortedFarmers = [...filteredFarmers].sort((a, b) => {
    if (sortBy === 'account-number-asc') {
      return a.accountNumber - b.accountNumber;
    }

    if (sortBy === 'account-number-desc') {
      return b.accountNumber - a.accountNumber;
    }

    if (sortBy === 'name-desc') {
      return b.farmerId.name.localeCompare(a.farmerId.name);
    }

    return a.farmerId.name.localeCompare(b.farmerId.name);
  });

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
                {sortedFarmers.length} farmers
              </ItemTitle>
            </div>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                className="font-custom gap-2"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        <FilterBar
          searchPlaceholder="Search farmers..."
          searchValue=""
          onSearchChange={setSearch}
          debounceDelay={0}
          selectedSort={sortBy}
          onSortChange={setSortBy}
          sortOptions={[
            { label: 'Name (A-Z)', value: 'name-asc' },
            { label: 'Name (Z-A)', value: 'name-desc' },
            { label: 'Account Number (Low-High)', value: 'account-number-asc' },
            {
              label: 'Account Number (High-Low)',
              value: 'account-number-desc',
            },
          ]}
        >
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Button className="font-custom w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Farmer
            </Button>
          </div>
        </FilterBar>

        {sortedFarmers.length > 0 ? (
          <FarmerCard data={sortedFarmers} />
        ) : (
          <Empty className="bg-muted/10 rounded-xl border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <User />
              </EmptyMedia>
              <EmptyTitle className="font-custom">
                {isLoading
                  ? 'Loading farmers...'
                  : isError
                    ? 'Failed to load farmers'
                    : 'No farmers found'}
              </EmptyTitle>
              <EmptyDescription className="font-custom">
                {isLoading
                  ? 'Please wait while we fetch farmers.'
                  : isError
                    ? (error?.message ??
                      'Please refresh and try loading farmers again.')
                    : 'Try a different search term.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </main>
  );
}
