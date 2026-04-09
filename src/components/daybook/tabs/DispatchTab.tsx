import { memo, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
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
import { TabSummaryBar, LIMIT_OPTIONS } from './shared';

export interface DispatchTabProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  page: number;
  onPageChange: (page: number) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  data: NikasiGatePassWithLink[] | undefined;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

const DispatchTab = memo(function DispatchTab({
  searchQuery,
  onSearchQueryChange,
  sortOrder,
  onSortOrderChange,
  page,
  onPageChange,
  limit,
  onLimitChange,
  data: dispatchGatePassData,
  total,
  isLoading: dispatchLoading,
  isError: dispatchError,
  error: dispatchErrorDetail,
  totalPages,
  hasPrev,
  hasNext,
}: DispatchTabProps) {
  const filteredBySearch = useMemo(() => {
    if (!dispatchGatePassData?.length) return dispatchGatePassData ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dispatchGatePassData;
    return dispatchGatePassData.filter((pass) => {
      const no = String(pass.gatePassNo ?? '');
      const dateStr = pass.date
        ? new Date(pass.date).toLocaleDateString('en-IN')
        : '';
      const farmerName =
        pass.farmerStorageLinkId?.farmerId?.name?.toLowerCase() ?? '';
      return (
        no.toLowerCase().includes(q) ||
        dateStr.toLowerCase().includes(q) ||
        farmerName.includes(q)
      );
    });
  }, [dispatchGatePassData, searchQuery]);

  return (
    <>
      <TabSummaryBar
        count={dispatchLoading ? 0 : total}
        icon={<Truck className="text-primary h-5 w-5" />}
      />
      <Item
        variant="outline"
        size="sm"
        className="flex-col items-stretch gap-4 rounded-xl"
      >
        <div className="relative w-full">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by gate pass number, date, or farmer"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
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
              <DropdownMenuItem onClick={() => onSortOrderChange('asc')}>
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortOrderChange('desc')}>
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
        ) : !filteredBySearch?.length ? (
          <Card>
            <CardContent className="py-8 pt-6">
              <Empty className="font-custom">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Truck className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No dispatch vouchers yet</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    className="font-custom focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2"
                    asChild
                  >
                    <Link to="/store-admin/nikasi">Add Dispatch voucher</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredBySearch.map((pass) => {
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

        {(filteredBySearch?.length ?? 0) > 0 && (
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
                  <DropdownMenuItem key={n} onClick={() => onLimitChange(n)}>
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
                      if (hasPrev) onPageChange(Math.max(1, page - 1));
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
                      if (hasNext) onPageChange(Math.min(totalPages, page + 1));
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
