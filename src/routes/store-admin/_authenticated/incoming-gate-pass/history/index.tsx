/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router';
import { Clock3, Globe, Monitor, RefreshCw, UserPen } from 'lucide-react';
import { useState } from 'react';
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
import { useGetIncomingEditHistory } from '@/services/store-admin/incoming-gate-pass/useGetIncomingEditHistory';

export const Route = createFileRoute(
  '/store-admin/_authenticated/incoming-gate-pass/history/'
)({
  component: RouteComponent,
});

const DEFAULT_PAGE_SIZE = 20;

function formatDateTime(value: string | undefined): string {
  if (!value) return 'N/A';
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

function RouteComponent() {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetIncomingEditHistory({
      page: currentPage,
      limit: DEFAULT_PAGE_SIZE,
    });

  const records = data?.data ?? [];
  const pagination = data?.pagination;
  const totalRecords = pagination?.total ?? records.length;
  const totalPages = pagination?.totalPages ?? 1;
  const isOnFirstPage = currentPage <= 1;
  const isOnLastPage = currentPage >= totalPages;

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-custom text-xl font-bold text-[#333]">
                Incoming Edit History
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
          {records.map((audit) => (
            <Card key={audit._id} className="rounded-xl border shadow-sm">
              <CardHeader className="space-y-2 border-b pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="font-custom text-base font-semibold text-[#333]">
                    Gate Pass #{audit.incomingGatePassId?.gatePassNo ?? 'N/A'}
                  </CardTitle>
                  <span className="font-custom bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                    {renderFieldValue(audit.incomingGatePassId?.status)}
                  </span>
                </div>

                <div className="text-muted-foreground flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-custom inline-flex items-center gap-1">
                    <UserPen className="h-4 w-4" />
                    {renderFieldValue(audit.editedById?.name)}
                  </span>
                  <span className="font-custom inline-flex items-center gap-1">
                    <Clock3 className="h-4 w-4" />
                    {formatDateTime(audit.createdAt)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-5">
                <p className="font-custom text-sm text-[#333]">
                  <span className="font-semibold">Reason:</span>{' '}
                  {renderFieldValue(audit.reason)}
                </p>
                <div className="font-custom text-muted-foreground space-y-1 text-sm">
                  <p className="inline-flex items-start gap-2 break-all">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="font-semibold text-[#333]">IP:</span>{' '}
                      {renderFieldValue(audit.ipAddress)}
                    </span>
                  </p>
                  <p className="inline-flex items-start gap-2 break-all">
                    <Monitor className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="font-semibold text-[#333]">
                        User Agent:
                      </span>{' '}
                      {renderFieldValue(audit.userAgent)}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="bg-muted/40 rounded-lg border p-3">
                    <p className="font-custom mb-2 text-sm font-semibold text-[#333]">
                      Previous State
                    </p>
                    <div className="font-custom space-y-1 text-sm text-[#6f6f6f]">
                      <p>
                        Manual GP No:{' '}
                        {renderFieldValue(
                          audit.previousState?.manualGatePassNumber
                        )}
                      </p>
                      <p>
                        Variety:{' '}
                        {renderFieldValue(audit.previousState?.variety)}
                      </p>
                      <p>
                        Bags Received:{' '}
                        {renderFieldValue(audit.previousState?.bagsReceived)}
                      </p>
                      <p>
                        Remarks:{' '}
                        {renderFieldValue(audit.previousState?.remarks)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/40 rounded-lg border p-3">
                    <p className="font-custom mb-2 text-sm font-semibold text-[#333]">
                      Updated State
                    </p>
                    <div className="font-custom space-y-1 text-sm text-[#6f6f6f]">
                      <p>
                        Manual GP No:{' '}
                        {renderFieldValue(
                          audit.updatedState?.manualGatePassNumber
                        )}
                      </p>
                      <p>
                        Variety: {renderFieldValue(audit.updatedState?.variety)}
                      </p>
                      <p>
                        Bags Received:{' '}
                        {renderFieldValue(audit.updatedState?.bagsReceived)}
                      </p>
                      <p>
                        Remarks: {renderFieldValue(audit.updatedState?.remarks)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {records.length === 0 && (
            <Card className="rounded-xl border-dashed">
              <CardContent className="py-10 text-center">
                <p className="font-custom text-base font-medium text-[#333]">
                  {isLoading
                    ? 'Loading incoming edit history...'
                    : isError
                      ? 'Failed to load incoming edit history'
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
