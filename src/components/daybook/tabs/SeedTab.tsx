import { memo, useCallback, useMemo, useState } from 'react';
import { useGetAllFarmerSeedEntries } from '@/services/store-admin/farmer-seed/useGetAllFarmerSeedEntries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
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
import { ChevronDown, RefreshCw, Search, Sprout } from 'lucide-react';
import { FarmerSeedVoucher } from '../vouchers';
import { FarmerSeedEditSheet } from '../vouchers/farmer-seed-edit-sheet';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';
import { LIMIT_OPTIONS } from './shared';

const SeedTab = memo(function SeedTab() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const {
    data: farmerSeedEntries,
    isLoading: isFarmerSeedLoading,
    isError: isFarmerSeedError,
    error: farmerSeedError,
    isFetching: isFarmerSeedFetching,
    refetch: refetchFarmerSeedEntries,
  } = useGetAllFarmerSeedEntries({ page, limit });
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
    const entries = farmerSeedEntries?.data ?? [];
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

  const sortedFarmerSeedEntries = useMemo(
    () =>
      filteredFarmerSeedEntries
        .slice()
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
    [filteredFarmerSeedEntries]
  );

  const pagination = farmerSeedEntries?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const hasPrev = pagination?.hasPreviousPage ?? page > 1;
  const hasNext = pagination?.hasNextPage ?? page < totalPages;

  const isRefreshing = isFarmerSeedFetching;

  const handleRefreshSeedTab = useCallback(async () => {
    await refetchFarmerSeedEntries();
  }, [refetchFarmerSeedEntries]);

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value);
    setPage(1);
  }, []);

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
          ) : sortedFarmerSeedEntries.length === 0 ? (
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
            <div className="space-y-4">
              {sortedFarmerSeedEntries.map((entry) => {
                const storageLink = entry.farmerStorageLinkId;
                const farmer = storageLink?.farmerId;
                return (
                  <FarmerSeedVoucher
                    key={entry._id}
                    entry={entry}
                    farmerName={farmer?.name ?? 'Unknown Farmer'}
                    farmerAddress={farmer?.address ?? ''}
                    farmerAccount={storageLink?.accountNumber ?? 0}
                    onEdit={() => openSeedEdit(entry)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {(sortedFarmerSeedEntries.length > 0 ||
          (pagination?.total ?? 0) > 0) && (
          <Item
            variant="outline"
            size="sm"
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 sm:mt-8"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom focus-visible:ring-primary rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  {limit} per page
                  <ChevronDown className="ml-1.5 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {LIMIT_OPTIONS.map((n) => (
                  <DropdownMenuItem
                    key={n}
                    onClick={() => handleLimitChange(n)}
                  >
                    {n} per page
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Pagination>
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                    aria-disabled={!hasPrev}
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasPrev) setPage(Math.max(1, page - 1));
                    }}
                    style={
                      !hasPrev
                        ? { pointerEvents: 'none', opacity: 0.5 }
                        : undefined
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink
                    isActive
                    href="#"
                    className="font-custom cursor-default"
                    onClick={(e) => e.preventDefault()}
                  >
                    {page} / {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className="font-custom focus-visible:ring-primary cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2"
                    aria-disabled={!hasNext}
                    onClick={(e) => {
                      e.preventDefault();
                      if (hasNext) setPage(Math.min(totalPages, page + 1));
                    }}
                    style={
                      !hasNext
                        ? { pointerEvents: 'none', opacity: 0.5 }
                        : undefined
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </Item>
        )}
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
