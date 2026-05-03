import { memo, useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import FarmerSeedVoucherCard from '@/components/daybook/seed-gate-pass-card';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Item } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import type { FarmerSeedGatePass } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';
import {
  matchesSearchQuery,
  normalizeClientSearchQuery,
  sortByIsoDate,
  type ProfileSortOrder,
} from './helpers/-calculations';
import {
  ProfileGatePassesSummaryBar,
  ProfileSortOrderDropdown,
  ProfileTabFiltersFooter,
} from './-ProfileTabControls';

export interface ProfileSeedTabProps {
  entries: FarmerSeedGatePass[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRefresh: () => void;
  isRefetching: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

function ProfileSeedTab({
  entries,
  isLoading,
  isError,
  error,
  onRefresh,
  isRefetching,
}: ProfileSeedTabProps) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<ProfileSortOrder>('Latest first');

  const normalizedQuery = useMemo(
    () => normalizeClientSearchQuery(search),
    [search]
  );

  const afterSearch = useMemo(() => {
    if (normalizedQuery.length === 0) return entries;
    return entries.filter((entry) =>
      matchesSearchQuery(entry, normalizedQuery)
    );
  }, [entries, normalizedQuery]);

  const displayed = useMemo(
    () => sortByIsoDate(afterSearch, (e) => e.date ?? e.createdAt, sortOrder),
    [afterSearch, sortOrder]
  );

  const handleRefresh = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-18 w-full rounded-xl" />
        <Card className="overflow-hidden rounded-xl shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-5">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg sm:max-w-xs" />
            <div className="space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="overflow-hidden rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <Empty className="border-border/50 rounded-xl border py-10">
            <EmptyHeader>
              <EmptyTitle className="font-custom">
                Could not load seed vouchers
              </EmptyTitle>
              <EmptyDescription className="font-custom">
                {getErrorMessage(error)}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileGatePassesSummaryBar
        count={displayed.length}
        label="seed vouchers"
        onRefresh={handleRefresh}
        isRefetching={isRefetching}
      />

      <Item
        variant="outline"
        size="sm"
        className="flex-col items-stretch gap-4 rounded-xl shadow-sm"
      >
        <div className="relative w-full">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by gate pass no., variety, invoice, generation…"
            aria-label="Search seed vouchers"
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>

        <ProfileTabFiltersFooter>
          <ProfileSortOrderDropdown value={sortOrder} onChange={setSortOrder} />
        </ProfileTabFiltersFooter>
      </Item>

      {displayed.length === 0 ? (
        <Empty className="border-border/50 rounded-xl border py-12">
          <EmptyHeader>
            <EmptyMedia>
              <Search className="text-muted-foreground size-10" />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              {entries.length === 0
                ? 'No seed vouchers'
                : 'No matching seed vouchers'}
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              {entries.length === 0
                ? 'This farmer has no seed gate passes yet.'
                : 'Try a different search term or sort order.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {displayed.map((entry, index) => (
            <li key={entry._id ?? `seed-${entry.gatePassNo}-${index}`}>
              <FarmerSeedVoucherCard
                entry={entry as unknown as FarmerSeedEntryListItem}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default memo(ProfileSeedTab);
