import {
  ArrowUpFromLine,
  ChevronDown,
  NotebookText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IncomingVoucherCard } from '@/components/daybook/incoming-gate-pass-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
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
import {
  INCOMING_GATE_PASS_STATUS_NOT_GRADED,
  useGetIncomingGatePasses,
} from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { useSearchIncomingGatePassNumber } from '@/services/store-admin/incoming-gate-pass/useSearchIncomingGatePassNumber';
import { useNavigate } from '@tanstack/react-router';

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_ORDER_OPTIONS = ['Latest first', 'Oldest first'] as const;
const STATUS_OPTIONS = ['All', 'Graded', 'Ungraded'] as const;
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 500;

type SortOrder = (typeof SORT_ORDER_OPTIONS)[number];
type Status = (typeof STATUS_OPTIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toApiSortOrder(order: SortOrder): 'asc' | 'desc' {
  return order === 'Latest first' ? 'desc' : 'asc';
}

function toApiStatus(status: Status) {
  if (status === 'Graded') return 'GRADED';
  if (status === 'Ungraded') return INCOMING_GATE_PASS_STATUS_NOT_GRADED;
  return undefined;
}

// ─── Sub-components (extracted to prevent unnecessary re-renders) ─────────────

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

interface StatusDropdownProps {
  value: Status;
  onChange: (value: Status) => void;
}

const StatusDropdown = ({ value, onChange }: StatusDropdownProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="outline"
        className="font-custom focus-visible:ring-primary w-full rounded-lg sm:w-auto"
      >
        Status: {value}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {STATUS_OPTIONS.map((option) => (
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface IncomingTabProps {
  isActive?: boolean;
}

const IncomingTab = ({ isActive = true }: IncomingTabProps) => {
  const navigate = useNavigate();

  // Consolidated filter/pagination state to reduce cascading re-renders
  const [sortOrder, setSortOrder] = useState<SortOrder>('Latest first');
  const [status, setStatus] = useState<Status>('All');
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

  // Manual debounce via ref — avoids importing an extra hook
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const isSearching = debouncedSearch.length > 0;

  // Stable query params object — avoids recreating on every render
  const listQueryParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      sortOrder: toApiSortOrder(sortOrder),
      status: toApiStatus(status),
    }),
    [currentPage, itemsPerPage, sortOrder, status]
  );

  const {
    data,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
    isFetching: isListFetching,
  } = useGetIncomingGatePasses(listQueryParams, { enabled: isActive });

  const {
    data: searchData,
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchError,
    refetch: refetchSearch,
    isFetching: isSearchFetching,
  } = useSearchIncomingGatePassNumber(isSearching ? debouncedSearch : null, {
    enabled: isActive,
  });

  // Derived display values
  const incomingGatePasses = useMemo(
    () => (isSearching ? (searchData ?? []) : (data?.data ?? [])),
    [isSearching, searchData, data?.data]
  );

  const totalPages = isSearching ? 1 : (data?.pagination?.totalPages ?? 1);
  const totalCount = isSearching
    ? incomingGatePasses.length
    : (data?.pagination?.total ?? incomingGatePasses.length);
  const isLoading = isSearching ? isSearchLoading : isListLoading;
  const isError = isSearching ? isSearchError : isListError;
  const error = isSearching ? searchError : listError;
  const isFetching = isSearching ? isSearchFetching : isListFetching;
  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage = currentPage >= totalPages;

  // Stable callbacks for filter changes (reset page on any filter change)
  const handleSortChange = useCallback((value: SortOrder) => {
    setSortOrder(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: Status) => {
    setStatus(value);
    setCurrentPage(1);
  }, []);

  const handleItemsPerPageChange = useCallback((value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    if (isSearching) {
      void refetchSearch();
    } else {
      void refetchList();
    }
  }, [isSearching, refetchSearch, refetchList]);

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
    void navigate({ to: '/store-admin/incoming-gate-pass/history' });
  }, [navigate]);

  const handleNavigateAdd = useCallback(() => {
    void navigate({ to: '/store-admin/incoming-gate-pass' });
  }, [navigate]);

  // Empty state message
  const emptyTitle = useMemo(() => {
    if (isLoading) return 'Loading incoming gate passes...';
    if (isError) return 'Failed to load incoming gate passes';
    if (isSearching) return 'No matching gate pass found';
    return 'No Incoming Gate Passes yet';
  }, [isLoading, isError, isSearching]);

  const emptyDescription = useMemo(() => {
    if (isLoading) return 'Please wait while we fetch the latest entries.';
    if (isError)
      return (
        error?.message ??
        'Please try again, or refresh to fetch incoming gate passes.'
      );
    if (isSearching)
      return 'Try a different gate pass number to search incoming entries.';
    return 'Incoming entries will appear here once gate passes are created. Start by adding your first incoming gate pass.';
  }, [isLoading, isError, isSearching, error?.message]);

  return (
    <main className="space-y-5">
      {/* Summary bar */}
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full">
          <div className="flex items-center gap-3">
            <ItemMedia variant="icon" className="rounded-lg">
              <NotebookText className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              {totalCount} incoming gate passes
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

      {/* Search + filters */}
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
            placeholder="Enter Gate Pass Number"
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>

        <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SortDropdown value={sortOrder} onChange={handleSortChange} />
            <StatusDropdown value={status} onChange={handleStatusChange} />
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              className="font-custom w-full cursor-pointer sm:w-auto"
              onClick={handleNavigateHistory}
            >
              Incoming Edit History
            </Button>
            <Button
              className="font-custom w-full cursor-pointer sm:w-auto"
              onClick={handleNavigateAdd}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Add Incoming
            </Button>
          </div>
        </ItemFooter>
      </Item>

      {/* List or empty state */}
      {incomingGatePasses.length > 0 ? (
        <div className="space-y-4">
          {incomingGatePasses.map((gatePass) => (
            <IncomingVoucherCard key={gatePass._id} gatePass={gatePass} />
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

      {/* Pagination */}
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
                  aria-disabled={isOnFirstPage || isSearching}
                  className={
                    isOnFirstPage || isSearching
                      ? 'pointer-events-none opacity-50'
                      : ''
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <span className="font-custom text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={handleNextPage}
                  aria-disabled={isOnLastPage || isSearching}
                  className={
                    isOnLastPage || isSearching
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

export default IncomingTab;
