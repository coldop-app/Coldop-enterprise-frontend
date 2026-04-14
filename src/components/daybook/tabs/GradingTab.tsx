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
import { Search, ChevronDown, ClipboardList } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { GradingVoucher } from '../vouchers';
import type { GradingVoucherProps } from '../vouchers';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import { gradingGatePassesQueryOptions } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { useSearchGradingGatePassNumber } from '@/services/store-admin/grading-gate-pass/useSearchGradingGatePassNumber';
import { TabSummaryBar, LIMIT_OPTIONS } from './shared';

/** Map API grading gate pass to GradingVoucher props */
function toGradingVoucherProps(pass: GradingGatePass): GradingVoucherProps {
  const firstIncoming = pass.incomingGatePassIds?.[0];
  const link =
    firstIncoming &&
    typeof firstIncoming.farmerStorageLinkId === 'object' &&
    firstIncoming.farmerStorageLinkId != null
      ? firstIncoming.farmerStorageLinkId
      : null;
  const farmerName = link?.farmerId?.name;
  const farmerAccount = link?.accountNumber;

  const incomingBagsCount =
    pass.incomingGatePassIds?.reduce(
      (sum, inc) => sum + (inc.bagsReceived ?? 0),
      0
    ) ?? 0;

  let incomingNetKg: number | undefined;
  const firstWithSlip = pass.incomingGatePassIds?.find(
    (inc) => inc.weightSlip != null
  );
  if (firstWithSlip?.weightSlip) {
    const { grossWeightKg = 0, tareWeightKg = 0 } = firstWithSlip.weightSlip;
    incomingNetKg = grossWeightKg - tareWeightKg;
  }

  const voucher = {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    orderDetails: pass.orderDetails,
    allocationStatus: pass.allocationStatus,
    grader: pass.grader,
    remarks: pass.remarks,
    createdBy:
      pass.createdBy != null && typeof pass.createdBy === 'object'
        ? { name: (pass.createdBy as { name?: string }).name }
        : undefined,
  };

  return {
    voucher,
    farmerName,
    farmerAccount,
    farmerStorageLinkId: pass.farmerStorageLinkId,
    incomingNetKg,
    incomingBagsCount,
    incomingGatePassIds: pass.incomingGatePassIds ?? [],
  };
}

export interface GradingTabProps {
  initialPage?: number;
}

const GradingTab = memo(function GradingTab({
  initialPage = 1,
}: GradingTabProps) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounceValue('', 400);

  const isSearchActive = debouncedSearch.trim().length > 0;
  const searchTerm = debouncedSearch.trim();

  const gradingParams = useMemo(
    () => ({ page, limit, sortOrder }),
    [page, limit, sortOrder]
  );

  const {
    data: gradingListResult,
    isLoading: gradingListLoading,
    isFetching: gradingListFetching,
    isError: gradingListError,
    error: gradingListErrorDetail,
    refetch: refetchGradingList,
  } = useQuery({
    ...gradingGatePassesQueryOptions(gradingParams),
    enabled: !isSearchActive,
  });

  const {
    data: gradingSearchRows,
    isLoading: gradingSearchLoading,
    isFetching: gradingSearchFetching,
    isError: gradingSearchError,
    error: gradingSearchErrorDetail,
    refetch: refetchGradingSearch,
  } = useSearchGradingGatePassNumber(isSearchActive ? searchTerm : null);

  const processedGradingSearchRows = useMemo(() => {
    if (!gradingSearchRows) {
      return [];
    }
    const rows = [...gradingSearchRows];
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return rows;
  }, [gradingSearchRows, sortOrder]);

  const paginatedGradingSearchRows = useMemo(() => {
    const start = (page - 1) * limit;
    return processedGradingSearchRows.slice(start, start + limit);
  }, [processedGradingSearchRows, page, limit]);

  const gradingGatePassData: GradingGatePass[] | undefined = isSearchActive
    ? paginatedGradingSearchRows
    : gradingListResult?.data;

  const gradingPagination = gradingListResult?.pagination;
  const gradingSearchTotal = processedGradingSearchRows.length;
  const gradingSearchTotalPages = Math.max(
    1,
    Math.ceil(gradingSearchTotal / limit)
  );
  const total = isSearchActive
    ? gradingSearchTotal
    : (gradingPagination?.total ?? 0);

  const gradingLoading = isSearchActive
    ? gradingSearchLoading
    : gradingListLoading;
  const gradingError = isSearchActive ? gradingSearchError : gradingListError;
  const gradingErrorDetail = isSearchActive
    ? gradingSearchErrorDetail
    : gradingListErrorDetail;

  const totalPages = isSearchActive
    ? gradingSearchTotalPages
    : (gradingPagination?.totalPages ?? 1);
  const hasPrev = isSearchActive
    ? page > 1
    : (gradingPagination?.hasPreviousPage ?? false);
  const hasNext = isSearchActive
    ? page < gradingSearchTotalPages
    : (gradingPagination?.hasNextPage ?? false);

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
    ? gradingSearchFetching
    : gradingListFetching;

  const handleRefresh = () => {
    if (isSearchActive) {
      void refetchGradingSearch();
      return;
    }
    void refetchGradingList();
  };
  return (
    <>
      <TabSummaryBar
        count={gradingLoading ? 0 : total}
        icon={<ClipboardList className="text-primary h-5 w-5" />}
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
            <Link to="/store-admin/grading">
              <ClipboardList className="h-4 w-4 shrink-0" />
              Add Grading
            </Link>
          </Button>
        </ItemFooter>
      </Item>

      <div className="mt-2 sm:mt-4">
        {gradingLoading ? (
          <Card>
            <CardContent className="py-12">
              <p className="font-custom text-center text-sm text-gray-600">
                Loading grading gate passes…
              </p>
            </CardContent>
          </Card>
        ) : gradingError ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyTitle>Failed to load grading gate passes</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <p className="font-custom text-sm text-red-600">
                    {gradingErrorDetail instanceof Error
                      ? gradingErrorDetail.message
                      : 'Something went wrong.'}
                  </p>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : !gradingGatePassData?.length ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardList className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>
                    {isSearchActive
                      ? 'No grading gate passes match this number'
                      : 'No grading vouchers yet'}
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
                      <Link to="/store-admin/grading">Add Grading voucher</Link>
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {gradingGatePassData.map((pass) => {
              const props = toGradingVoucherProps(pass);
              return (
                <GradingVoucher
                  key={pass._id}
                  voucher={props.voucher}
                  farmerName={props.farmerName}
                  farmerAccount={props.farmerAccount}
                  farmerStorageLinkId={props.farmerStorageLinkId}
                  wastageKg={props.wastageKg}
                  wastagePercent={props.wastagePercent}
                  incomingNetKg={props.incomingNetKg}
                  incomingBagsCount={props.incomingBagsCount}
                  incomingGatePassIds={props.incomingGatePassIds}
                />
              );
            })}
          </div>
        )}

        {(gradingGatePassData?.length ?? 0) > 0 && (
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

export default GradingTab;
