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
import { Search, ChevronDown, ArrowUpFromLine, Receipt } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { IncomingVoucher } from '../vouchers';
import type { IncomingVoucherData } from '../vouchers';
import type {
  IncomingGatePassByFarmerStorageLinkItem,
  IncomingGatePassWithLink,
} from '@/types/incoming-gate-pass';
import { incomingGatePassesQueryOptions } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { useSearchIncomingGatePassNumber } from '@/services/store-admin/incoming-gate-pass/useSearchIncomingGatePassNumber';
import {
  TabSummaryBar,
  LIMIT_OPTIONS,
  type IncomingStatusFilter,
} from './shared';

type IncomingTabListItem =
  | IncomingGatePassWithLink
  | IncomingGatePassByFarmerStorageLinkItem;

/** Map API incoming gate pass to IncomingVoucher props (voucher + farmer info) */
function toIncomingVoucherProps(pass: IncomingTabListItem) {
  const link = pass.farmerStorageLinkId;
  const farmer = link?.farmerId;
  const bagsReceived =
    pass.bagsReceived ??
    ('bagSizes' in pass
      ? pass.bagSizes.reduce((s, b) => s + (b.initialQuantity ?? 0), 0)
      : undefined) ??
    0;
  const voucher: IncomingVoucherData = {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    location: pass.location,
    truckNumber: pass.truckNumber,
    bagsReceived,
    status: pass.status,
    weightSlip: pass.weightSlip,
    remarks: pass.remarks,
    gradingSummary: 'gradingSummary' in pass ? pass.gradingSummary : undefined,
    createdBy:
      typeof pass.createdBy === 'object' &&
      pass.createdBy != null &&
      'name' in pass.createdBy
        ? { name: (pass.createdBy as { name?: string }).name }
        : undefined,
  };
  return {
    voucher,
    farmerName: farmer?.name,
    farmerAccount: link?.accountNumber,
    farmerAddress: farmer?.address,
    farmerMobile: farmer?.mobileNumber,
  };
}

export interface IncomingTabProps {
  initialPage?: number;
}

const IncomingTab = memo(function IncomingTab({
  initialPage = 1,
}: IncomingTabProps) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue('', 400);

  const isSearchActive = debouncedSearch.trim().length > 0;
  const searchTerm = debouncedSearch.trim();

  const incomingParams = useMemo(
    () => ({
      page,
      limit,
      sortOrder,
      status:
        statusFilter === 'ungraded'
          ? 'NOT_GRADED'
          : statusFilter === 'graded'
            ? 'GRADED'
            : undefined,
    }),
    [page, limit, sortOrder, statusFilter]
  );

  const {
    data: incomingListResult,
    isLoading: incomingListLoading,
    isFetching: incomingListFetching,
    isError: incomingListError,
    error: incomingListErrorDetail,
    refetch: refetchIncomingList,
  } = useQuery({
    ...incomingGatePassesQueryOptions(incomingParams),
    enabled: !isSearchActive,
  });

  const {
    data: incomingSearchRows,
    isLoading: incomingSearchLoading,
    isFetching: incomingSearchFetching,
    isError: incomingSearchError,
    error: incomingSearchErrorDetail,
    refetch: refetchIncomingSearch,
  } = useSearchIncomingGatePassNumber(isSearchActive ? searchTerm : null);

  const processedIncomingSearchRows = useMemo(() => {
    if (!incomingSearchRows) {
      return [];
    }
    const rows = incomingSearchRows.filter((pass) => {
      if (statusFilter === 'graded') return pass.status === 'GRADED';
      if (statusFilter === 'ungraded') return pass.status === 'NOT_GRADED';
      return true;
    });
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return rows;
  }, [incomingSearchRows, statusFilter, sortOrder]);

  const paginatedIncomingSearchRows = useMemo(() => {
    const start = (page - 1) * limit;
    return processedIncomingSearchRows.slice(start, start + limit);
  }, [processedIncomingSearchRows, page, limit]);

  const incomingGatePassData: IncomingTabListItem[] | undefined = isSearchActive
    ? paginatedIncomingSearchRows
    : incomingListResult?.data;

  const incomingPagination = incomingListResult?.pagination;
  const incomingSearchTotal = processedIncomingSearchRows.length;
  const incomingSearchTotalPages = Math.max(
    1,
    Math.ceil(incomingSearchTotal / limit)
  );
  const total = isSearchActive
    ? incomingSearchTotal
    : (incomingPagination?.total ?? incomingGatePassData?.length ?? 0);

  const incomingLoading = isSearchActive
    ? incomingSearchLoading
    : incomingListLoading;
  const incomingError = isSearchActive
    ? incomingSearchError
    : incomingListError;
  const incomingErrorDetail = isSearchActive
    ? incomingSearchErrorDetail
    : incomingListErrorDetail;

  const totalPages = isSearchActive
    ? incomingSearchTotalPages
    : (incomingPagination?.totalPages ?? 1);
  const hasPrev = isSearchActive
    ? page > 1
    : (incomingPagination?.hasPreviousPage ?? false);
  const hasNext = isSearchActive
    ? page < incomingSearchTotalPages
    : (incomingPagination?.hasNextPage ?? false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setDebouncedSearch(value);
    setPage(1);
  };

  const handleSortChange = (value: 'asc' | 'desc') => {
    setSortOrder(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value: IncomingStatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleLimitChange = (value: number) => {
    setLimit(value);
    setPage(1);
  };

  const isRefreshing = isSearchActive
    ? incomingSearchFetching
    : incomingListFetching;

  const handleRefresh = () => {
    if (isSearchActive) {
      void refetchIncomingSearch();
      return;
    }
    void refetchIncomingList();
  };

  return (
    <>
      <TabSummaryBar
        count={incomingLoading ? 0 : total}
        icon={<Receipt className="text-primary h-5 w-5" />}
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
            placeholder="Search by gate pass number"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>
        <ItemFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-custom focus-visible:ring-primary w-full min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto sm:min-w-40"
                >
                  Status:{' '}
                  {statusFilter === 'all'
                    ? 'All'
                    : statusFilter === 'graded'
                      ? 'Graded'
                      : 'Ungraded'}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="font-custom">
                <DropdownMenuItem
                  onClick={() => handleStatusFilterChange('all')}
                >
                  All
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusFilterChange('graded')}
                >
                  Graded
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusFilterChange('ungraded')}
                >
                  Ungraded
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end sm:gap-2">
            <Button
              className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              asChild
            >
              <Link to="/store-admin/incoming">
                <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                Add Incoming
              </Link>
            </Button>
          </div>
        </ItemFooter>
      </Item>

      <div className="mt-2 sm:mt-4">
        {incomingLoading ? (
          <Card>
            <CardContent className="py-12">
              <p className="font-custom text-center text-sm text-gray-600">
                Loading incoming gate passes…
              </p>
            </CardContent>
          </Card>
        ) : incomingError ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyTitle>Failed to load incoming gate passes</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <p className="font-custom text-sm text-red-600">
                    {incomingErrorDetail instanceof Error
                      ? incomingErrorDetail.message
                      : 'Something went wrong.'}
                  </p>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : !incomingGatePassData?.length ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ArrowUpFromLine className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {isSearchActive
                      ? 'No gate passes match this number'
                      : 'No incoming vouchers yet'}
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
                      <Link to="/store-admin/incoming">
                        Add Incoming voucher
                      </Link>
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {incomingGatePassData.map((pass) => {
              const props = toIncomingVoucherProps(pass);
              return (
                <IncomingVoucher
                  key={pass._id}
                  voucher={props.voucher}
                  farmerName={props.farmerName}
                  farmerAccount={props.farmerAccount}
                  farmerAddress={props.farmerAddress}
                  farmerMobile={props.farmerMobile}
                />
              );
            })}
          </div>
        )}

        {(incomingGatePassData?.length ?? 0) > 0 && (
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

export default IncomingTab;
