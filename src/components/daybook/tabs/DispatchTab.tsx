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
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { Search, ChevronDown, Truck } from 'lucide-react';
import { NikasiVoucher } from '../vouchers';
import type { NikasiGatePassWithLink } from '@/types/nikasi-gate-pass';
import type { PassVoucherData } from '../vouchers/types';
import { nikasiGatePassesQueryOptions } from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePasses';
import { useSearchNikasiGatePass } from '@/services/store-admin/nikasi-gate-pass/useSearchNikasiGatePass';
import { TabSummaryBar, LIMIT_OPTIONS } from './shared';

export interface DispatchTabProps {
  initialPage?: number;
}

const DispatchTab = memo(function DispatchTab({
  initialPage = 1,
}: DispatchTabProps) {
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

  const dispatchParams = useMemo(
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
    data: dispatchResult,
    isLoading: dispatchListLoading,
    isFetching: dispatchListFetching,
    isError: dispatchListError,
    error: dispatchListErrorDetail,
    refetch: refetchDispatchList,
  } = useQuery({
    ...nikasiGatePassesQueryOptions(dispatchParams),
    enabled: !isSearchActive,
  });

  const {
    data: dispatchSearchRows,
    isLoading: dispatchSearchLoading,
    isFetching: dispatchSearchFetching,
    isError: dispatchSearchError,
    error: dispatchSearchErrorDetail,
    refetch: refetchDispatchSearch,
  } = useSearchNikasiGatePass(isSearchActive ? searchTerm : null);

  const processedDispatchSearchRows = useMemo(() => {
    if (!dispatchSearchRows) {
      return [];
    }
    const rows = [...dispatchSearchRows];
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return rows;
  }, [dispatchSearchRows, sortOrder]);

  const paginatedDispatchSearchRows = useMemo(() => {
    const start = (page - 1) * limit;
    return processedDispatchSearchRows.slice(start, start + limit);
  }, [processedDispatchSearchRows, page, limit]);

  const dispatchGatePassData: NikasiGatePassWithLink[] | undefined =
    isSearchActive ? paginatedDispatchSearchRows : dispatchResult?.data;

  const dispatchPagination = dispatchResult?.pagination;
  const dispatchSearchTotal = processedDispatchSearchRows.length;
  const dispatchSearchTotalPages = Math.max(
    1,
    Math.ceil(dispatchSearchTotal / limit)
  );
  const total = isSearchActive
    ? dispatchSearchTotal
    : (dispatchPagination?.total ?? 0);

  const dispatchLoading = isSearchActive
    ? dispatchSearchLoading
    : dispatchListLoading;
  const dispatchError = isSearchActive
    ? dispatchSearchError
    : dispatchListError;
  const dispatchErrorDetail = isSearchActive
    ? dispatchSearchErrorDetail
    : dispatchListErrorDetail;

  const totalPages = isSearchActive
    ? dispatchSearchTotalPages
    : (dispatchPagination?.totalPages ?? 1);
  const hasPrev = isSearchActive
    ? page > 1
    : (dispatchPagination?.hasPreviousPage ?? false);
  const hasNext = isSearchActive
    ? page < dispatchSearchTotalPages
    : (dispatchPagination?.hasNextPage ?? false);

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
    ? dispatchSearchFetching
    : dispatchListFetching;

  const handleRefresh = () => {
    if (isSearchActive) {
      void refetchDispatchSearch();
      return;
    }
    void refetchDispatchList();
  };

  return (
    <>
      <TabSummaryBar
        count={dispatchLoading ? 0 : total}
        icon={<Truck className="text-primary h-5 w-5" />}
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
            <Link to="/store-admin/nikasi">
              <Truck className="h-4 w-4 shrink-0" />
              Add Dispatch
            </Link>
          </Button>
        </ItemFooter>
      </Item>

      <div className="mt-2 sm:mt-4">
        {dispatchLoading ? (
          <Card>
            <CardContent className="py-12">
              <p className="font-custom text-center text-sm text-gray-600">
                Loading dispatch vouchers...
              </p>
            </CardContent>
          </Card>
        ) : dispatchError ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyTitle>Failed to load dispatch vouchers</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <p className="font-custom text-sm text-red-600">
                    {dispatchErrorDetail instanceof Error
                      ? dispatchErrorDetail.message
                      : 'Something went wrong.'}
                  </p>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : !dispatchGatePassData?.length ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Truck className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {isSearchActive
                      ? 'No dispatch gate passes match this number'
                      : 'No dispatch vouchers yet'}
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
                      <Link to="/store-admin/nikasi">Add Dispatch voucher</Link>
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {dispatchGatePassData.map((pass) => {
              const voucher: PassVoucherData = {
                ...pass,
                createdBy: undefined,
              };
              return (
                <NikasiVoucher
                  key={pass._id}
                  voucher={voucher}
                  variant="dispatch"
                  farmerName={pass.farmerStorageLinkId?.farmerId?.name}
                  farmerAccount={pass.farmerStorageLinkId?.accountNumber}
                />
              );
            })}
          </div>
        )}

        {(dispatchGatePassData?.length ?? 0) > 0 && (
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

export default DispatchTab;
