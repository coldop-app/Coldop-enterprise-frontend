import {
  ArrowUpFromLine,
  ChevronDown,
  NotebookText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import { DispatchPostStorageVoucherCard } from '@/components/daybook/dispatch-post-storage-card';
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
import { useGetDispatchPostStorage } from '@/services/store-admin/dispatch-post-storage/useGetDispatchPostStorage';
import { usePermissionsStore } from '@/stores/usePermissionsStore';

const SORT_ORDER_OPTIONS = ['Latest first', 'Oldest first'] as const;
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_ITEMS_PER_PAGE = 10;

type SortOrder = (typeof SORT_ORDER_OPTIONS)[number];

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
        <ChevronDown data-icon="inline-end" />
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
        <ChevronDown data-icon="inline-end" />
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

const DispatchPostStorageTab = () => {
  const navigate = useNavigate();
  const hasPermission = usePermissionsStore((state) => state.hasPermission);
  const canReadDispatchPostStorage = hasPermission(
    'outgoing-gate-pass',
    'read'
  );
  const canCreateDispatchPostStorage = hasPermission(
    'outgoing-gate-pass',
    'create'
  );
  const canUpdateDispatchPostStorage = hasPermission(
    'outgoing-gate-pass',
    'update'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>('Latest first');
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: listResponse,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useGetDispatchPostStorage(
    {
      page: currentPage,
      limit: itemsPerPage,
      sortOrder: sortOrder === 'Latest first' ? 'desc' : 'asc',
    },
    {
      enabled: canReadDispatchPostStorage,
    }
  );

  const entries = listResponse?.data ?? [];
  const totalPages = listResponse?.pagination?.totalPages ?? 1;
  const totalCount = listResponse?.pagination?.total ?? 0;
  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage = currentPage >= totalPages || entries.length === 0;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setCurrentPage(1);
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

  const handlePrevPage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isOnFirstPage) setCurrentPage((page) => page - 1);
    },
    [isOnFirstPage]
  );

  const handleNextPage = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!isOnLastPage) setCurrentPage((page) => page + 1);
    },
    [isOnLastPage]
  );

  return (
    <main className="flex flex-col gap-5">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full">
          <div className="flex items-center gap-3">
            <ItemMedia variant="icon" className="rounded-lg">
              <NotebookText className="text-primary" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              {totalCount} Dispatch (Post Storage)
            </ItemTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="font-custom"
            onClick={() => {
              void refetch();
            }}
            disabled={isFetching || !canReadDispatchPostStorage}
          >
            <RefreshCw
              data-icon="inline-start"
              className={isFetching ? 'animate-spin' : undefined}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </ItemHeader>
      </Item>

      <Item
        variant="outline"
        size="sm"
        className="flex-col items-stretch gap-4 rounded-xl"
      >
        <div className="relative w-full">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Enter Dispatch (Post Storage) Number"
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>

        <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SortDropdown value={sortOrder} onChange={handleSortChange} />
          </div>

          {(canUpdateDispatchPostStorage || canCreateDispatchPostStorage) && (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
              {canUpdateDispatchPostStorage && (
                <Button
                  variant="secondary"
                  className="font-custom w-full cursor-pointer sm:w-auto"
                  onClick={() =>
                    navigate({
                      to: '/store-admin/dispatch-post-storage/history',
                    })
                  }
                >
                  Dispatch (Post Storage) History
                </Button>
              )}
              {canCreateDispatchPostStorage && (
                <Button
                  className="font-custom w-full cursor-pointer sm:w-auto"
                  onClick={() =>
                    navigate({ to: '/store-admin/dispatch-post-storage' })
                  }
                >
                  <ArrowUpFromLine data-icon="inline-start" />
                  Add Dispatch (Post Storage)
                </Button>
              )}
            </div>
          )}
        </ItemFooter>
      </Item>

      {!canReadDispatchPostStorage ? (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              Access restricted for Dispatch (Post Storage)
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              You do not have read permission for Dispatch (Post Storage).
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isLoading ? (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              Loading Dispatch (Post Storage)...
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              Please wait while we fetch the latest entries.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isError ? (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              Failed to load Dispatch (Post Storage)
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              {error?.message ??
                'Please refresh and try again to fetch dispatch entries.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : entries.length > 0 ? (
        <div className="flex flex-col gap-4">
          {entries.map((gatePass) => (
            <DispatchPostStorageVoucherCard
              key={gatePass._id}
              gatePass={gatePass}
            />
          ))}
        </div>
      ) : (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              No Dispatch (Post Storage) found
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              Create a dispatch to see it listed here.
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
                  aria-disabled={isOnFirstPage}
                  className={
                    isOnFirstPage ? 'pointer-events-none opacity-50' : ''
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
                  aria-disabled={isOnLastPage}
                  className={
                    isOnLastPage ? 'pointer-events-none opacity-50' : ''
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

export default DispatchPostStorageTab;
