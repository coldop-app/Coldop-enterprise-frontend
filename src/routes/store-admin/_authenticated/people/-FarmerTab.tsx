import { useMemo, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { User, RefreshCw } from 'lucide-react';

import { AddFarmerModal } from '@/components/forms/add-farmer-modal';
import { Skeleton } from '@/components/ui/skeleton';
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

const FarmerTab = () => {
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
  const sortedFarmers = useMemo(() => {
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

    return [...filteredFarmers].sort((a, b) => {
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
  }, [farmers, sortBy, trimmedSearch]);

  const shouldShowSkeleton = isLoading && sortedFarmers.length === 0;

  return (
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
          <AddFarmerModal
            links={farmers}
            onFarmerAdded={() => void refetch()}
          />
        </div>
      </FilterBar>

      {shouldShowSkeleton ? (
        <div className="space-y-4">
          <div className="rounded-xl border p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
          </div>
        </div>
      ) : sortedFarmers.length > 0 ? (
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
  );
};

export default FarmerTab;
