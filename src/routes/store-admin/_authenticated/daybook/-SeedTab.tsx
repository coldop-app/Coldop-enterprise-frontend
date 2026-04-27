import {
  ArrowUpFromLine,
  ChevronDown,
  NotebookText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Item,
  ItemActions,
  ItemFooter,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import FarmerSeedVoucherCard from '@/components/daybook/seed-gate-pass-card';
import { useGetAllFarmerSeedEntries } from '@/services/store-admin/farmer-seed/useGetAllFarmerSeedEntries';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';

const SORT_ORDER_OPTIONS = ['Latest first', 'Oldest first'] as const;
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 500;

type SortOrder = (typeof SORT_ORDER_OPTIONS)[number];

function toComparableString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toComparableString(item)).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => toComparableString(item))
      .join(' ');
  }
  return '';
}

function getCreatedAtTimestamp(entry: FarmerSeedEntryListItem): number {
  const createdAt = entry.createdAt;
  if (typeof createdAt !== 'string') return 0;
  const timestamp = new Date(createdAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getEntryId(entry: FarmerSeedEntryListItem, index: number): string {
  const id = entry._id;
  if (typeof id === 'string' && id.length > 0) return id;

  const gatePassNo = entry.gatePassNo;
  if (typeof gatePassNo === 'string' || typeof gatePassNo === 'number') {
    return `seed-${String(gatePassNo)}`;
  }

  return `seed-entry-${index}`;
}

interface SortDropdownProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

const SortDropdown = ({ value, onChange }: SortDropdownProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className="font-custom focus-visible:ring-primary w-full rounded-lg sm:w-auto"
      >
        Sort Order: {value}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {SORT_ORDER_OPTIONS.map((option) => (
        <DropdownMenuItem key={option} onClick={() => onChange(option)}>
          {option}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

interface ItemsPerPageDropdownProps {
  value: number;
  onChange: (value: number) => void;
}

const ItemsPerPageDropdown = ({
  value,
  onChange,
}: ItemsPerPageDropdownProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        className="font-custom w-full justify-between rounded-md sm:w-auto sm:min-w-28"
      >
        {value} per page
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {ITEMS_PER_PAGE_OPTIONS.map((size) => (
        <DropdownMenuItem key={size} onClick={() => onChange(size)}>
          {size} per page
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

interface SeedTabProps {
  isActive?: boolean;
}

const SeedTab = ({ isActive = true }: SeedTabProps) => {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<SortOrder>('Latest first');
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    data: farmerSeedEntriesResult,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useGetAllFarmerSeedEntries(
    { page: currentPage, limit: itemsPerPage },
    { enabled: isActive }
  );

  const farmerSeedEntries = useMemo(
    () => farmerSeedEntriesResult?.data ?? [],
    [farmerSeedEntriesResult?.data]
  );

  const normalizedSearchQuery = debouncedSearch.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedSearchQuery) return farmerSeedEntries;
    return farmerSeedEntries.filter((entry) =>
      toComparableString(entry).includes(normalizedSearchQuery)
    );
  }, [farmerSeedEntries, normalizedSearchQuery]);

  const sortedEntries = useMemo(() => {
    const next = [...filteredEntries];
    next.sort((a, b) => {
      const aTimestamp = getCreatedAtTimestamp(a);
      const bTimestamp = getCreatedAtTimestamp(b);
      return sortOrder === 'Latest first'
        ? bTimestamp - aTimestamp
        : aTimestamp - bTimestamp;
    });
    return next;
  }, [filteredEntries, sortOrder]);

  const totalCount = normalizedSearchQuery
    ? sortedEntries.length
    : (farmerSeedEntriesResult?.pagination?.total ?? sortedEntries.length);
  const totalPages = normalizedSearchQuery
    ? 1
    : (farmerSeedEntriesResult?.pagination?.totalPages ?? 1);
  const effectiveCurrentPage = normalizedSearchQuery
    ? 1
    : Math.min(currentPage, totalPages);
  const paginatedEntries = sortedEntries;
  const isOnFirstPage = effectiveCurrentPage <= 1;
  const isOnLastPage = normalizedSearchQuery
    ? true
    : effectiveCurrentPage >= totalPages;

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        setDebouncedSearch(value.trim());
        setCurrentPage(1);
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  const handleSortChange = useCallback((value: SortOrder) => {
    setSortOrder(value);
    setCurrentPage(1);
  }, []);

  const handleItemsPerPageChange = useCallback((value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handlePrevPage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isOnFirstPage) setCurrentPage((p) => p - 1);
    },
    [isOnFirstPage]
  );

  const handleNextPage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isOnLastPage) setCurrentPage((p) => p + 1);
    },
    [isOnLastPage]
  );

  const handleNavigateHistory = useCallback(() => {
    void navigate({ to: '/store-admin/farmer-seed-gate-pass/history' });
  }, [navigate]);

  const handleNavigateAdd = useCallback(() => {
    void navigate({ to: '/store-admin/farmer-seed-gate-pass' });
  }, [navigate]);

  const emptyTitle = useMemo(() => {
    if (isLoading) return 'Loading farmer seed gate passes...';
    if (isError) return 'Failed to load farmer seed gate passes';
    if (normalizedSearchQuery) return 'No matching seed gate pass found';
    return 'No farmer seed gate passes yet';
  }, [isLoading, isError, normalizedSearchQuery]);

  const emptyDescription = useMemo(() => {
    if (isLoading) return 'Please wait while we fetch the latest entries.';
    if (isError)
      return (
        error?.message ??
        'Please try again, or refresh to fetch farmer seed gate passes.'
      );
    if (normalizedSearchQuery)
      return 'Try a different gate pass number to search seed entries.';
    return 'Seed entries will appear here once gate passes are created.';
  }, [isLoading, isError, normalizedSearchQuery, error?.message]);

  return (
    <main className="space-y-5">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full">
          <div className="flex items-center gap-3">
            <ItemMedia variant="icon" className="rounded-lg">
              <NotebookText className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              {totalCount} farmer seed gate passes
            </ItemTitle>
          </div>
          <ItemActions>
            <Button
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

      <Item
        variant="outline"
        size="sm"
        className="flex-col items-stretch gap-4 rounded-xl"
      >
        <div className="relative w-full">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Enter Farmer Seed Gate Pass Number"
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>

        <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SortDropdown value={sortOrder} onChange={handleSortChange} />
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="font-custom w-full cursor-pointer sm:w-auto"
              onClick={handleNavigateHistory}
            >
              Seed Edit History
            </Button>
            <Button
              className="font-custom w-full cursor-pointer sm:w-auto"
              onClick={handleNavigateAdd}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Add Farmer Seed
            </Button>
          </div>
        </ItemFooter>
      </Item>

      {paginatedEntries.length > 0 ? (
        <div className="w-full space-y-4">
          {paginatedEntries.map((entry, index) => (
            <FarmerSeedVoucherCard
              key={getEntryId(entry, index)}
              entry={entry}
            />
          ))}
        </div>
      ) : (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">{emptyTitle}</EmptyTitle>
            <EmptyDescription className="font-custom">
              {emptyDescription}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <Item
        variant="outline"
        size="sm"
        className="rounded-xl px-4 py-3 sm:px-5 sm:py-4"
      >
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ItemsPerPageDropdown
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
          />

          <Pagination className="mx-0 w-full sm:w-auto sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={handlePrevPage}
                  aria-disabled={
                    isOnFirstPage || Boolean(normalizedSearchQuery)
                  }
                  className={
                    isOnFirstPage || normalizedSearchQuery
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <span className="font-custom text-sm font-medium">
                  {effectiveCurrentPage} / {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={handleNextPage}
                  aria-disabled={isOnLastPage || Boolean(normalizedSearchQuery)}
                  className={
                    isOnLastPage || normalizedSearchQuery
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Item>
    </main>
  );
};

export default SeedTab;
