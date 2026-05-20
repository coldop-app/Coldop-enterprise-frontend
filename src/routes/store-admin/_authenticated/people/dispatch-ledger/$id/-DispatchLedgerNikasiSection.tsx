import { memo, useCallback, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { NikasiVoucherCard } from '@/components/daybook/nikasi-gate-pass-card';
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
import type {
  DispatchLedgerNikasiGatePass,
  DispatchLedgerNikasiGatePassesLedger,
} from '@/types/dispatch-ledger';
import {
  matchesSearchQuery,
  normalizeClientSearchQuery,
  sortByIsoDate,
  type ProfileSortOrder,
} from '../../$farmerStorageLinkId/helpers/-calculations';
import {
  ProfileGatePassesSummaryBar,
  ProfileSortOrderDropdown,
  ProfileTabFiltersFooter,
} from '../../$farmerStorageLinkId/-ProfileTabControls';
import { toNikasiGatePassItem } from './-to-nikasi-card-item';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export interface DispatchLedgerNikasiSectionProps {
  gatePasses: DispatchLedgerNikasiGatePass[];
  dispatchLedger: DispatchLedgerNikasiGatePassesLedger | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRefresh: () => void;
  isRefetching: boolean;
}

const DispatchLedgerNikasiSection = memo(function DispatchLedgerNikasiSection({
  gatePasses,
  dispatchLedger,
  isLoading,
  isError,
  error,
  onRefresh,
  isRefetching,
}: DispatchLedgerNikasiSectionProps) {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<ProfileSortOrder>('Latest first');

  const normalizedQuery = useMemo(
    () => normalizeClientSearchQuery(search),
    [search]
  );

  const afterSearch = useMemo(() => {
    if (normalizedQuery.length === 0) return gatePasses;
    return gatePasses.filter((gp) => matchesSearchQuery(gp, normalizedQuery));
  }, [gatePasses, normalizedQuery]);

  const displayed = useMemo(
    () => sortByIsoDate(afterSearch, (gp) => gp.date, sortOrder),
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Skeleton className="h-10 w-full rounded-lg sm:max-w-56" />
            </div>
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
                Could not load nikasi gate passes
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
        label="nikasi gate passes"
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
            placeholder="Search by gate pass no., truck, destination, remarks…"
            aria-label="Search nikasi gate passes"
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
              {gatePasses.length === 0
                ? 'No nikasi gate passes'
                : 'No matching nikasi gate passes'}
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              {gatePasses.length === 0
                ? 'This dispatch ledger has no nikasi gate passes yet.'
                : 'Try a different search term or sort order.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {displayed.map((gp) => (
            <li key={gp._id}>
              <NikasiVoucherCard
                gatePass={toNikasiGatePassItem(gp, dispatchLedger)}
                variant="dispatch"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default DispatchLedgerNikasiSection;
