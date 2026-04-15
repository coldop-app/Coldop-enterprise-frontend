import { memo, useCallback, useMemo, useState } from 'react';
import { useGetAllFarmerSeedEntries } from '@/services/store-admin/farmer-seed/useGetAllFarmerSeedEntries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from '@/components/ui/empty';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, Search, Sprout, User } from 'lucide-react';
import { FarmerSeedVoucher } from '../vouchers';
import { FarmerSeedEditSheet } from '../vouchers/farmer-seed-edit-sheet';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';

const SeedTab = memo(function SeedTab() {
  const {
    data: farmerSeedEntries,
    isLoading: isFarmerSeedLoading,
    isError: isFarmerSeedError,
    error: farmerSeedError,
    isFetching: isFarmerSeedFetching,
    refetch: refetchFarmerSeedEntries,
  } = useGetAllFarmerSeedEntries();
  const [searchQuery, setSearchQuery] = useState('');
  const [seedEditEntry, setSeedEditEntry] =
    useState<FarmerSeedEntryListItem | null>(null);
  const [isSeedEditOpen, setIsSeedEditOpen] = useState(false);

  const openSeedEdit = useCallback((entry: FarmerSeedEntryListItem) => {
    setSeedEditEntry(entry);
    setIsSeedEditOpen(true);
  }, []);

  const handleSeedEditOpenChange = useCallback((open: boolean) => {
    setIsSeedEditOpen(open);
    if (!open) {
      window.setTimeout(() => setSeedEditEntry(null), 280);
    }
  }, []);

  const filteredFarmerSeedEntries = useMemo(() => {
    const entries = farmerSeedEntries ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const farmer = entry.farmerStorageLinkId?.farmerId;
      return (
        farmer?.name?.toLowerCase().includes(query) ||
        farmer?.address?.toLowerCase().includes(query) ||
        entry.variety?.toLowerCase().includes(query) ||
        entry.generation?.toLowerCase().includes(query) ||
        String(entry.gatePassNo ?? '').includes(query) ||
        entry.invoiceNumber?.toLowerCase().includes(query)
      );
    });
  }, [farmerSeedEntries, searchQuery]);

  const groupedFarmerSeedEntries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        farmerName: string;
        farmerAddress: string;
        farmerAccount: number;
        entries: typeof filteredFarmerSeedEntries;
      }
    >();

    for (const entry of filteredFarmerSeedEntries) {
      const storageLink = entry.farmerStorageLinkId;
      const farmer = storageLink?.farmerId;
      const farmerId = farmer?._id ?? storageLink?._id ?? 'unknown-farmer';
      const existing = grouped.get(farmerId);

      if (existing) {
        existing.entries.push(entry);
        continue;
      }

      grouped.set(farmerId, {
        farmerName: farmer?.name ?? 'Unknown Farmer',
        farmerAddress: farmer?.address ?? '',
        farmerAccount: storageLink?.accountNumber ?? 0,
        entries: [entry],
      });
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.farmerName.localeCompare(b.farmerName)
    );
  }, [filteredFarmerSeedEntries]);

  const isRefreshing = isFarmerSeedFetching;

  const handleRefreshSeedTab = useCallback(async () => {
    await refetchFarmerSeedEntries();
  }, [refetchFarmerSeedEntries]);

  return (
    <>
      <div className="w-full space-y-4">
        <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
          <ItemHeader className="h-full">
            <div className="flex items-center gap-3">
              <ItemMedia variant="icon" className="rounded-lg">
                <Sprout className="text-primary h-5 w-5" />
              </ItemMedia>
              <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                Seed Vouchers
              </ItemTitle>
            </div>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                onClick={() => void handleRefreshSeedTab()}
                className="font-custom h-8 gap-2 rounded-lg px-3"
              >
                <RefreshCw
                  className={`h-4 w-4 shrink-0 ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </ItemActions>
          </ItemHeader>
        </Item>

        <Item
          variant="outline"
          size="sm"
          className="flex-col items-stretch gap-4 rounded-xl"
        >
          <div className="relative w-full">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search vouchers by farmer name, address, or variety..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
            />
          </div>
        </Item>

        <div className="space-y-4">
          {isFarmerSeedLoading ? (
            <Card>
              <CardContent className="py-10">
                <p className="font-custom text-center text-sm text-gray-600">
                  Loading seed vouchers...
                </p>
              </CardContent>
            </Card>
          ) : isFarmerSeedError ? (
            <Card>
              <CardContent className="py-8 pt-6">
                <Empty className="font-custom">
                  <EmptyHeader>
                    <EmptyTitle>Failed to load seed vouchers</EmptyTitle>
                  </EmptyHeader>
                  <EmptyContent>
                    <p className="font-custom text-sm text-red-600">
                      {farmerSeedError instanceof Error
                        ? farmerSeedError.message
                        : 'Something went wrong.'}
                    </p>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          ) : groupedFarmerSeedEntries.length === 0 ? (
            <Card>
              <CardContent className="py-8 pt-6">
                <Empty className="font-custom">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Sprout className="size-6" />
                    </EmptyMedia>
                    <EmptyTitle>No seed vouchers found</EmptyTitle>
                  </EmptyHeader>
                  <EmptyContent>
                    <p className="font-custom text-sm text-gray-600">
                      Try adjusting your search or add a new seed entry.
                    </p>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            groupedFarmerSeedEntries.map((group) => (
              <section
                key={`${group.farmerName}-${group.farmerAccount}`}
                className="space-y-3"
              >
                <div className="bg-muted/40 border-border/50 flex items-center gap-2 rounded-lg border px-3 py-2">
                  <User className="text-primary h-4 w-4" />
                  <p className="font-custom text-sm font-semibold text-[#333] dark:text-white">
                    {group.farmerName}
                  </p>
                  <p className="font-custom text-muted-foreground text-xs dark:text-white/80">
                    A/C #{group.farmerAccount}
                  </p>
                  <p className="font-custom text-muted-foreground text-xs dark:text-white/80">
                    · {group.entries.length}{' '}
                    {group.entries.length === 1 ? 'voucher' : 'vouchers'}
                  </p>
                </div>

                <div className="space-y-4">
                  {group.entries
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((entry) => (
                      <FarmerSeedVoucher
                        key={entry._id}
                        entry={entry}
                        farmerName={group.farmerName}
                        farmerAddress={group.farmerAddress}
                        farmerAccount={group.farmerAccount}
                        onEdit={() => openSeedEdit(entry)}
                      />
                    ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      <FarmerSeedEditSheet
        open={isSeedEditOpen}
        onOpenChange={handleSeedEditOpenChange}
        entry={seedEditEntry}
      />
    </>
  );
});

export default SeedTab;
