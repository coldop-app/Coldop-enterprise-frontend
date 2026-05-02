import {
  ArrowUpFromLine,
  ChevronDown,
  NotebookText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { GradingVoucherCard } from '@/components/daybook/grading-gate-pass-card';
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
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { useSearchGradingGatePassNumber } from '@/services/store-admin/grading-gate-pass/useSearchGradingGatePass';

const SORT_ORDER_OPTIONS = ['Latest first', 'Oldest first'] as const;
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 500;

type SortOrder = (typeof SORT_ORDER_OPTIONS)[number];

function toApiSortOrder(order: SortOrder): 'asc' | 'desc' {
  return order === 'Latest first' ? 'desc' : 'asc';
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

interface GradingTabProps {
  isActive?: boolean;
}

const GradingTab = ({ isActive = true }: GradingTabProps) => {
  const navigate = useNavigate();

  const [sortOrder, setSortOrder] = useState<SortOrder>('Latest first');
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const isSearching = debouncedSearch.length > 0;

  const listQueryParams = useMemo(
    () => ({
      page: currentPage,
      limit: itemsPerPage,
      sortOrder: toApiSortOrder(sortOrder),
    }),
    [currentPage, itemsPerPage, sortOrder]
  );

  const {
    data,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
    isFetching: isListFetching,
  } = useGetGradingGatePasses(listQueryParams, { enabled: isActive });

  const {
    data: searchData,
    isLoading: isSearchLoading,
    isError: isSearchError,
    error: searchError,
    refetch: refetchSearch,
    isFetching: isSearchFetching,
  } = useSearchGradingGatePassNumber(isSearching ? debouncedSearch : null, {
    enabled: isActive,
  });

  const gradingGatePasses = useMemo(
    () => (isSearching ? (searchData ?? []) : (data?.data ?? [])),
    [isSearching, searchData, data?.data]
  );

  const totalPages = isSearching ? 1 : (data?.pagination?.totalPages ?? 1);
  const totalCount = isSearching
    ? gradingGatePasses.length
    : (data?.pagination?.total ?? gradingGatePasses.length);
  const isLoading = isSearching ? isSearchLoading : isListLoading;
  const isError = isSearching ? isSearchError : isListError;
  const error = isSearching ? searchError : listError;
  const isFetching = isSearching ? isSearchFetching : isListFetching;
  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage = currentPage >= totalPages;

  const handleSortChange = useCallback((value: SortOrder) => {
    setSortOrder(value);
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
    void navigate({ to: '/store-admin/grading-gate-pass/history' });
  }, [navigate]);

  const handleNavigateAdd = useCallback(() => {
    void navigate({ to: '/store-admin/grading-gate-pass/edit' });
  }, [navigate]);

  const emptyTitle = useMemo(() => {
    if (isLoading) return 'Loading grading gate passes...';
    if (isError) return 'Failed to load grading gate passes';
    if (isSearching) return 'No matching grading gate pass found';
    return 'No grading gate passes yet';
  }, [isLoading, isError, isSearching]);

  const emptyDescription = useMemo(() => {
    if (isLoading) return 'Please wait while we fetch the latest entries.';
    if (isError)
      return (
        error?.message ??
        'Please try again, or refresh to fetch grading gate passes.'
      );
    if (isSearching)
      return 'Try a different gate pass number to search grading entries.';
    return 'Grading entries will appear here once gate passes are created.';
  }, [isLoading, isError, isSearching, error?.message]);

  return (
    <main className="space-y-5">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full">
          <div className="flex items-center gap-3">
            <ItemMedia variant="icon" className="rounded-lg">
              <NotebookText className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              {totalCount} grading gate passes
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
            placeholder="Enter Grading Gate Pass Number"
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
              Grading History
            </Button>
            <Button
              className="font-custom w-full cursor-pointer sm:w-auto"
              onClick={handleNavigateAdd}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Add Grading
            </Button>
          </div>
        </ItemFooter>
      </Item>

      {gradingGatePasses.length > 0 ? (
        <div className="space-y-4">
          {gradingGatePasses.map((pass) => (
            <GradingVoucherCard key={pass._id} gradingGatePass={pass} />
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

export default GradingTab;
