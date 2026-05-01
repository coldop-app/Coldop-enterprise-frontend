import { useMemo, useState } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { RefreshCw, User } from 'lucide-react';

import { AddDispatchLedgerModal } from '@/components/forms/add-dispatch-ledger-modal';
import { FilterBar } from '@/components/filter-bar';
import { FarmerCard } from '@/components/people/FarmerCard';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { useGetDispatchLedgers } from '@/services/store-admin/dispatch-ledger/useGetDispatchLedgers';

const DispatchLedgerTab = () => {
  const [search, setSearch] = useDebounceValue('', 500);
  const [sortBy, setSortBy] = useState('name-asc');
  const {
    data: dispatchLedgersResponse,
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetDispatchLedgers();

  const handleRefresh = () => {
    void refetch();
  };
  const trimmedSearch = search.trim().toLowerCase();

  const sortedDispatchLedgers = useMemo(() => {
    const dispatchLedgers = dispatchLedgersResponse?.data ?? [];

    const filteredLedgers = dispatchLedgers.filter((ledger) => {
      if (!trimmedSearch) {
        return true;
      }

      const searchableText = [
        ledger.name,
        ledger.address,
        ledger.mobileNumber,
        ledger._id,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(trimmedSearch);
    });

    return [...filteredLedgers].sort((a, b) => {
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [dispatchLedgersResponse?.data, sortBy, trimmedSearch]);

  const dispatchLedgerCardsData = useMemo(
    () =>
      sortedDispatchLedgers.map((ledger, index) => ({
        _id: ledger._id,
        farmerId: {
          _id: ledger._id,
          name: ledger.name,
          address: ledger.address,
          mobileNumber: ledger.mobileNumber,
        },
        accountNumber: index + 1,
        isActive: true,
        dispatchLedger: ledger,
      })),
    [sortedDispatchLedgers]
  );

  const shouldShowSkeleton = isLoading && sortedDispatchLedgers.length === 0;

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
              {sortedDispatchLedgers.length} dispatch ledgers
            </ItemTitle>
          </div>
          <ItemActions>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-custom gap-2"
              onClick={handleRefresh}
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
        searchPlaceholder="Search dispatch ledgers..."
        searchValue=""
        onSearchChange={setSearch}
        debounceDelay={0}
        selectedSort={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { label: 'Name (A-Z)', value: 'name-asc' },
          { label: 'Name (Z-A)', value: 'name-desc' },
        ]}
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <AddDispatchLedgerModal />
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
      ) : dispatchLedgerCardsData.length > 0 ? (
        <FarmerCard
          data={dispatchLedgerCardsData}
          navigationType="dispatch-ledger"
        />
      ) : (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              {isLoading
                ? 'Loading dispatch ledgers...'
                : isError
                  ? 'Failed to load dispatch ledgers'
                  : 'No dispatch ledgers found'}
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              {isLoading
                ? 'Please wait while we fetch dispatch ledgers.'
                : isError
                  ? (error?.message ??
                    'Please refresh and try loading dispatch ledgers again.')
                  : 'Try a different search term.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
};

export default DispatchLedgerTab;
