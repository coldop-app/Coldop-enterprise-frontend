import {
  ArrowUpFromLine,
  ChevronDown,
  NotebookText,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { IncomingVoucherCard } from '@/components/daybook/incoming-gate-pass-card';
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

const SORT_ORDER_OPTIONS = ['Latest first', 'Oldest first'] as const;
const STATUS_OPTIONS = ['All', 'Graded', 'Ungraded'] as const;

const IncomingTab = () => {
  const [selectedSortOrder, setSelectedSortOrder] =
    useState<(typeof SORT_ORDER_OPTIONS)[number]>('Latest first');
  const [selectedStatus, setSelectedStatus] =
    useState<(typeof STATUS_OPTIONS)[number]>('All');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const hasIncomingGatePasses = false;
  const totalPages = 65;

  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage = currentPage >= totalPages;

  return (
    <main className="space-y-5">
      <Item variant="outline" size="sm" className="rounded-xl shadow-sm">
        <ItemHeader className="h-full">
          <div className="flex items-center gap-3">
            <ItemMedia variant="icon" className="rounded-lg">
              <NotebookText className="text-primary h-5 w-5" />
            </ItemMedia>
            <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
              500 incoming gate passes
            </ItemTitle>
          </div>
          <ItemActions>
            <Button variant="outline" size="sm" className="font-custom gap-2">
              <RefreshCw className="h-4 w-4" />
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
            defaultValue=""
            placeholder="Enter Gate Pass Number"
            className="font-custom focus-visible:ring-primary w-full pl-10 focus-visible:ring-2 focus-visible:ring-offset-2"
          />
        </div>

        <ItemFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-custom focus-visible:ring-primary w-full rounded-lg sm:w-auto"
                >
                  Sort Order: {selectedSortOrder}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                {SORT_ORDER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => setSelectedSortOrder(option)}
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="font-custom focus-visible:ring-primary w-full rounded-lg sm:w-auto"
                >
                  Status: {selectedStatus}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => setSelectedStatus(option)}
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <Button className="font-custom w-full sm:w-auto">
              <ArrowUpFromLine className="h-4 w-4" />
              Add Incoming
            </Button>
          </div>
        </ItemFooter>
      </Item>

      {hasIncomingGatePasses ? (
        <IncomingVoucherCard />
      ) : (
        <Empty className="bg-muted/10 rounded-xl border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <NotebookText />
            </EmptyMedia>
            <EmptyTitle className="font-custom">
              No Incoming Gate Passes yet
            </EmptyTitle>
            <EmptyDescription className="font-custom">
              Incoming entries will appear here once gate passes are created.
              Start by adding your first incoming gate pass.
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="font-custom w-full justify-between rounded-md sm:w-auto sm:min-w-28"
              >
                {itemsPerPage} per page
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {[10, 20, 50, 100].map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                >
                  {size} per page
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Pagination className="mx-0 w-full sm:w-auto sm:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (!isOnFirstPage) {
                      setCurrentPage((page) => page - 1);
                    }
                  }}
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
                  onClick={(event) => {
                    event.preventDefault();
                    if (!isOnLastPage) {
                      setCurrentPage((page) => page + 1);
                    }
                  }}
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

export default IncomingTab;
