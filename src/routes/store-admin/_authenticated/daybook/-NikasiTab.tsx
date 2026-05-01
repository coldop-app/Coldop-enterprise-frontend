import {
  ArrowUpFromLine,
  ChevronDown,
  NotebookText,
  Search,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { NikasiVoucherCard } from '@/components/daybook/nikasi-gate-pass-card';
import { useGetNikasiGatePasses } from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePasses';

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

const NikasiTab = () => {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState<SortOrder>('Latest first');
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: nikasiResponse,
    isLoading,
    isError,
    error,
  } = useGetNikasiGatePasses({
    page: currentPage,
    limit: itemsPerPage,
    sortOrder: sortOrder === 'Latest first' ? 'desc' : 'asc',
  });

  const nikasiGatePasses = nikasiResponse?.data ?? [];
  const filteredNikasiGatePasses = nikasiGatePasses.filter((item) =>
    searchQuery.trim()
      ? String(item.gatePassNo).includes(searchQuery.trim())
      : true
  );

  const totalPages = nikasiResponse?.pagination?.totalPages ?? 1;
  const totalCount = nikasiResponse?.pagination?.total ?? 0;
  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage =
    currentPage >= totalPages || filteredNikasiGatePasses.length === 0;

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
    <main className="space-y-5">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full">
          <div className="flex items-center gap-3">
            <ItemMedia variant="icon" className="rounded-lg">
              <NotebookText className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              {totalCount} nikasi gate passes
            </ItemTitle>
          </div>
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
            placeholder="Enter Nikasi Gate Pass Number"
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
            >
              Dispatch History
            </Button>
            <Button
              className="font-custom w-full cursor-pointer sm:w-auto"
              onClick={() => navigate({ to: '/store-admin/nikasi-gate-pass' })}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Add Dispatch
            </Button>
          </div>
        </ItemFooter>
      </Item>

      {isLoading ? (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              Loading nikasi gate passes...
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
              Failed to load nikasi gate passes
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              {error?.message ??
                'Please refresh and try again to fetch nikasi gate passes.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filteredNikasiGatePasses.length > 0 ? (
        <div className="space-y-4">
          {filteredNikasiGatePasses.map((gatePass) => (
            <NikasiVoucherCard key={gatePass._id} gatePass={gatePass} />
          ))}
        </div>
      ) : (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              No matching nikasi gate pass found
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              Try a different gate pass number to search nikasi entries.
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

export default NikasiTab;
