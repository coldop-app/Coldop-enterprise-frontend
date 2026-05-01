/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { Clock3, Globe, Monitor, RefreshCw, UserPen } from 'lucide-react';
import type { ReactNode } from 'react';
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

const DEFAULT_PAGE_SIZE = 20;

export const Route = createFileRoute(
  '/store-admin/_authenticated/nikasi-gate-pass/history/'
)({
  loader: () =>
    prefetchNikasiGatePassEditHistory({ page: 1, limit: DEFAULT_PAGE_SIZE }),
  component: RouteComponent,
});

function formatDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'N/A';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
}

function renderFieldValue(value: unknown): string {
  if (value == null) return 'N/A';
  if (typeof value === 'string') return value.trim() || 'N/A';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'N/A';
}

function formatScalarValue(value: unknown): string {
  if (value == null) return 'N/A';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'N/A';

    const parsedDate = new Date(trimmed);
    if (
      !Number.isNaN(parsedDate.getTime()) &&
      /^\d{4}-\d{2}-\d{2}T/.test(trimmed)
    ) {
      return formatDateTime(trimmed);
    }

    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'N/A';
}

function formatKeyLabel(rawKey: string): string {
  return rawKey
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

function renderNestedValue(value: unknown, level = 0): ReactNode {
  if (
    value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return (
      <span className="font-custom text-sm text-[#6f6f6f]">
        {formatScalarValue(value)}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="font-custom text-sm text-[#6f6f6f]">[]</span>;
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div
            key={`${level}-arr-item-${index}`}
            className="rounded-md border border-dashed p-2"
          >
            <p className="font-custom mb-1 text-xs font-medium text-[#333]">
              Item {index + 1}
            </p>
            {renderNestedValue(item, level + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="font-custom text-sm text-[#6f6f6f]">{'{}'}</span>;
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, nestedValue]) => (
          <div key={`${level}-${key}`} className="space-y-1">
            <p className="font-custom text-sm font-semibold text-[#333]">
              {formatKeyLabel(key)}
            </p>
            <div className="ml-2">
              {renderNestedValue(nestedValue, level + 1)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="font-custom text-sm text-[#6f6f6f]">N/A</span>;
}

function renderKeyValueBlock(
  data: Record<string, unknown> | undefined
): ReactNode {
  if (!data || Object.keys(data).length === 0) {
    return <p className="font-custom text-sm text-[#6f6f6f]">N/A</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <p className="font-custom text-sm font-semibold text-[#333]">
            {formatKeyLabel(key)}
          </p>
          <div className="ml-2">{renderNestedValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

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
  const totalPages = pagination?.totalPages ?? currentPage;
  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage = pagination
    ? currentPage >= totalPages
    : records.length < DEFAULT_PAGE_SIZE;
  const shouldShowSkeleton = isLoading && totalRecords === 0;

  useEffect(() => {
    if (!isLoading && !isError && pagination?.hasNextPage) {
      void prefetchNikasiGatePassEditHistory({
        page: currentPage + 1,
        limit: DEFAULT_PAGE_SIZE,
      });
    }
  }, [currentPage, isError, isLoading, pagination?.hasNextPage]);

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-custom text-xl font-bold text-[#333]">
                Nikasi Edit History
              </CardTitle>
              <CardDescription className="font-custom text-sm text-[#6f6f6f]">
                {isLoading
                  ? 'Loading audit logs...'
                  : `${totalRecords} edit record${totalRecords === 1 ? '' : 's'} found`}
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="font-custom gap-2"
              onClick={() => {
                void refetch();
                void prefetchNikasiGatePassEditHistory({
                  page: currentPage,
                  limit: DEFAULT_PAGE_SIZE,
                });
              }}
              disabled={isFetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </CardHeader>
        </Card>

        <div className="space-y-4">
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
            const item = audit;
            const previousState = item.previousState as
              | Record<string, unknown>
              | undefined;
            const updatedState = item.updatedState as
              | Record<string, unknown>
              | undefined;
            const editedBy = item.editedById as
              | Record<string, unknown>
              | undefined;
            const nikasiGatePass = item.nikasiGatePassId as
              | Record<string, unknown>
              | undefined;
            const isInternalTransfer =
              updatedState?.isInternalTransfer ??
              nikasiGatePass?.isInternalTransfer;
            const gatePassNumber =
              nikasiGatePass?.gatePassNo ?? updatedState?.gatePassNo;

            const recordId = item._id;
            const recordKey =
              (typeof recordId === 'string' && recordId) ||
              `${currentPage}-${index}-${renderFieldValue(item.createdAt)}`;

            return (
              <Card key={recordKey} className="rounded-xl border shadow-sm">
                <CardHeader className="space-y-2 border-b pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-custom text-base font-semibold text-[#333]">
                      Gate Pass #{renderFieldValue(gatePassNumber)}
                    </CardTitle>
                    <span className="font-custom bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                      {isInternalTransfer === true
                        ? 'Internal Transfer'
                        : 'External Transfer'}
                    </span>
                  </div>

                  <div className="text-muted-foreground flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-4">
                    <span className="font-custom inline-flex items-center gap-1">
                      <UserPen className="h-4 w-4" />
                      {renderFieldValue(editedBy?.name)}
                    </span>
                    <span className="font-custom inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-5">
                  <p className="font-custom text-sm text-[#333]">
                    <span className="font-semibold">Reason:</span>{' '}
                    {renderFieldValue(item.reason)}
                  </p>

                  <div className="font-custom text-muted-foreground space-y-1 text-sm">
                    <p className="inline-flex items-start gap-2 break-all">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <span className="font-semibold text-[#333]">IP:</span>{' '}
                        {renderFieldValue(item.ipAddress)}
                      </span>
                    </p>
                    <p className="inline-flex items-start gap-2 break-all">
                      <Monitor className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        <span className="font-semibold text-[#333]">
                          User Agent:
                        </span>{' '}
                        {renderFieldValue(item.userAgent)}
                      </span>
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded-lg border p-3">
                    <p className="font-custom mb-2 text-sm font-semibold text-[#333]">
                      Audit Metadata
                    </p>
                    {renderKeyValueBlock({
                      _id: item._id,
                      nikasiGatePassId: item.nikasiGatePassId as unknown,
                      editedById: item.editedById as unknown,
                      ipAddress: item.ipAddress,
                      userAgent: item.userAgent,
                      createdAt: item.createdAt,
                      __v: item.__v,
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="bg-muted/40 rounded-lg border p-3">
                      <p className="font-custom mb-2 text-sm font-semibold text-[#333]">
                        Previous State
                      </p>
                      {renderKeyValueBlock(previousState)}
                    </div>

                    <div className="bg-muted/40 rounded-lg border p-3">
                      <p className="font-custom mb-2 text-sm font-semibold text-[#333]">
                        Updated State
                      </p>
                      {renderKeyValueBlock(updatedState)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!shouldShowSkeleton && records.length === 0 && (
            <Card className="rounded-xl border-dashed">
              <CardContent className="py-10 text-center">
                <p className="font-custom text-base font-medium text-[#333]">
                  {isLoading
                    ? 'Loading nikasi edit history...'
                    : isError
                      ? 'Failed to load nikasi edit history'
                      : 'No edit records found'}
                </p>
                <p className="font-custom text-muted-foreground mt-2 text-sm">
                  {isError
                    ? (error?.message ??
                      'Please try again in a moment or refresh the page.')
                    : 'No edit records found yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="rounded-xl shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-end">
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
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
