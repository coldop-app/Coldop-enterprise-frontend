import { memo, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useDebounceValue } from 'usehooks-ts';
import { Card, CardContent } from '@/components/ui/card';
import { Item, ItemFooter } from '@/components/ui/item';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Search, ChevronDown, Package } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { StorageVoucher } from '../vouchers';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import { storageGatePassesQueryOptions } from '@/services/store-admin/storage-gate-pass/useGetStorageGatePasses';
import { useSearchStorageGatePass } from '@/services/store-admin/storage-gate-pass/useSearchStorageGatePass';
import { TabSummaryBar, LIMIT_OPTIONS } from './shared';

export interface StorageTabProps {
  initialPage?: number;
}

const StorageTab = memo(function StorageTab({
  initialPage = 1,
}: StorageTabProps) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue('', 400);

  const isSearchActive = debouncedSearch.trim().length > 0;
  const searchTerm = debouncedSearch.trim();

  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      dateFrom: `${now.getFullYear()}-01-01`,
      dateTo: now.toISOString().slice(0, 10),
    };
  }, []);

  const storageParams = useMemo(
    () => ({
      page,
      limit,
      sortOrder,
      dateFrom: dateRange.dateFrom,
      dateTo: dateRange.dateTo,
    }),
    [page, limit, sortOrder, dateRange]
  );

  const {
    data: storageResult,
    isLoading: storageListLoading,
    isFetching: storageListFetching,
    isError: storageListError,
    error: storageListErrorDetail,
    refetch: refetchStorageList,
  } = useQuery({
    ...storageGatePassesQueryOptions(storageParams),
    enabled: !isSearchActive,
  });

  const {
    data: storageSearchRows,
    isLoading: storageSearchLoading,
    isFetching: storageSearchFetching,
    isError: storageSearchError,
    error: storageSearchErrorDetail,
    refetch: refetchStorageSearch,
  } = useSearchStorageGatePass(isSearchActive ? searchTerm : null);

  const processedStorageSearchRows = useMemo(() => {
    if (!storageSearchRows) {
      return [];
    }
    const rows = [...storageSearchRows];
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return rows;
  }, [storageSearchRows, sortOrder]);

  const paginatedStorageSearchRows = useMemo(() => {
    const start = (page - 1) * limit;
    return processedStorageSearchRows.slice(start, start + limit);
  }, [processedStorageSearchRows, page, limit]);

  const storageGatePassData: StorageGatePassWithLink[] | undefined =
    isSearchActive ? paginatedStorageSearchRows : storageResult?.data;

  const storagePagination = storageResult?.pagination;
  const storageSearchTotal = processedStorageSearchRows.length;
  const storageSearchTotalPages = Math.max(
    1,
    Math.ceil(storageSearchTotal / limit)
  );
  const total = isSearchActive
    ? storageSearchTotal
    : (storagePagination?.total ?? 0);

  const storageLoading = isSearchActive
    ? storageSearchLoading
    : storageListLoading;
  const storageError = isSearchActive ? storageSearchError : storageListError;
  const storageErrorDetail = isSearchActive
    ? storageSearchErrorDetail
    : storageListErrorDetail;

  const totalPages = isSearchActive
    ? storageSearchTotalPages
    : (storagePagination?.totalPages ?? 1);
  const hasPrev = isSearchActive
    ? page > 1
    : (storagePagination?.hasPreviousPage ?? false);
  const hasNext = isSearchActive
    ? page < storageSearchTotalPages
    : (storagePagination?.hasNextPage ?? false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setDebouncedSearch(value);
    setPage(1);
  };

  const handleSortChange = (value: 'asc' | 'desc') => {
    setSortOrder(value);
    setPage(1);
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const isRefreshing = isSearchActive
    ? storageSearchFetching
    : storageListFetching;

  const handleRefresh = () => {
    if (isSearchActive) {
      void refetchStorageSearch();
      return;
    }
    void refetchStorageList();
  };

  return (
    <>
      <TabSummaryBar
        count={storageLoading ? 0 : total}
        icon={<Package className="text-primary h-5 w-5" />}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <Item
        variant="outline"
        size="sm"
        className="flex-col items-stretch gap-4 rounded-xl"
      >
        <div className="relative w-full">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={
              isSearchActive
                ? 'Search by gate pass number'
                : 'Search by gate pass number, date, or farmer'
            }
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>
        <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
              >
                Sort Order:{' '}
                {sortOrder === 'desc' ? 'Latest first' : 'Oldest first'}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="font-custom">
              <DropdownMenuItem onClick={() => handleSortChange('asc')}>
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange('desc')}>
                Latest first
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="font-custom h-10 w-full shrink-0 gap-2 sm:w-auto"
            asChild
          >
            <Link to="/store-admin/storage">
              <Package className="h-4 w-4 shrink-0" />
              Add Storage
            </Link>
          </Button>
        </ItemFooter>
      </Item>

      <div className="mt-2 sm:mt-4">
        {storageLoading ? (
          <Card>
            <CardContent className="py-12">
              <p className="font-custom text-center text-sm text-gray-600">
                Loading storage gate passes…
              </p>
            </CardContent>
          </Card>
        ) : storageError ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyTitle>Failed to load storage gate passes</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <p className="font-custom text-sm text-red-600">
                    {storageErrorDetail instanceof Error
                      ? storageErrorDetail.message
                      : 'Something went wrong.'}
                  </p>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : !storageGatePassData?.length ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {isSearchActive
                      ? 'No storage gate passes match this number'
                      : 'No storage vouchers yet'}
                  </EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  {isSearchActive ? (
                    <p className="font-custom text-sm text-gray-600">
                      Try another gate pass number or clear the search to see
                      the full list.
                    </p>
                  ) : (
                    <Button
                      className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                      asChild
                    >
                      <Link to="/store-admin/storage">Add Storage voucher</Link>
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {storageGatePassData.map((pass) => (
              <StorageVoucher key={pass._id} voucher={pass} />
            ))}
          </div>
        )}

        {(storageGatePassData?.length ?? 0) > 0 && (
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
    </>
  );
});

export default StorageTab;
