/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { History, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  prefetchNikasiGatePassEditHistory,
  useGetNikasiGatePassEditHistory,
} from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePassEditHistory';
import { NikasiEditHistoryCard } from './-nikasi-edit-history-card';

const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute(
  '/store-admin/_authenticated/nikasi-gate-pass/history/'
)({
  loader: () =>
    prefetchNikasiGatePassEditHistory({ page: 1, limit: DEFAULT_PAGE_SIZE }),
  component: RouteComponent,
});

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetNikasiGatePassEditHistory({
      page: currentPage,
      limit: DEFAULT_PAGE_SIZE,
    });

  const records = data?.data ?? [];
  const pagination = data?.pagination;
  const totalRecords = pagination?.total ?? records.length;
  const totalPages = pagination?.totalPages ?? 1;
  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage = currentPage >= totalPages;
  const shouldShowSkeleton = isLoading && records.length === 0;

  useEffect(() => {
    if (!isLoading && !isError && pagination?.hasNextPage) {
      void prefetchNikasiGatePassEditHistory({
        page: currentPage + 1,
        limit: DEFAULT_PAGE_SIZE,
      });
    }
  }, [currentPage, isError, isLoading, pagination?.hasNextPage]);

  return (
    <main className="mx-auto max-w-4xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <History className="text-primary h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="font-custom text-foreground text-lg font-semibold">
                  Nikasi Edit History
                </CardTitle>
                <CardDescription className="font-custom text-muted-foreground text-xs">
                  {isLoading
                    ? 'Loading audit logs...'
                    : `${totalRecords} edit record${totalRecords === 1 ? '' : 's'} found`}
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="font-custom gap-2 self-start sm:self-auto"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </CardHeader>
        </Card>

        <div className="space-y-3">
          {shouldShowSkeleton && (
            <>
              <Card className="rounded-xl border shadow-sm">
                <CardHeader className="space-y-3 border-b pb-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-52" />
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <Skeleton className="mb-2 h-4 w-32" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <Skeleton className="mb-2 h-4 w-30" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {records.map((audit, index) => {
            const recordId = audit._id;
            const recordKey =
              (typeof recordId === 'string' && recordId) ||
              `${currentPage}-${index}`;

            return <NikasiEditHistoryCard key={recordKey} audit={audit} />;
          })}

          {!shouldShowSkeleton && records.length === 0 && (
            <Card className="rounded-xl border-dashed">
              <CardContent className="py-12 text-center">
                <History className="text-muted-foreground/40 mx-auto mb-3 h-8 w-8" />
                <p className="font-custom text-foreground text-sm font-medium">
                  {isLoading
                    ? 'Loading nikasi edit history...'
                    : isError
                      ? 'Failed to load nikasi edit history'
                      : 'No edit records found'}
                </p>
                <p className="font-custom text-muted-foreground mt-1 text-xs">
                  {isError
                    ? (error?.message ??
                      'Please try again in a moment or refresh the page.')
                    : 'Edit records will appear here once changes are made.'}
                </p>
                {isError && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-custom mt-4"
                    onClick={() => void refetch()}
                  >
                    Try again
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {!isLoading && totalPages > 1 && (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <p className="font-custom text-muted-foreground text-xs">
                  Page {currentPage} of {totalPages}
                </p>
                <Pagination className="mx-0 w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isOnFirstPage) setCurrentPage((p) => p - 1);
                        }}
                        aria-disabled={isOnFirstPage}
                        className={
                          isOnFirstPage ? 'pointer-events-none opacity-40' : ''
                        }
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (!isOnLastPage) setCurrentPage((p) => p + 1);
                        }}
                        aria-disabled={isOnLastPage}
                        className={
                          isOnLastPage ? 'pointer-events-none opacity-40' : ''
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
