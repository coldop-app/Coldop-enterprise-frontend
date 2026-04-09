import { memo, useCallback, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetIncomingGatePasses } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { useGetStorageGatePasses } from '@/services/store-admin/storage-gate-pass/useGetStorageGatePasses';
import { useGetNikasiGatePasses } from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePasses';
import {
  IncomingTab,
  GradingTab,
  StorageTab,
  DispatchTab,
  OutgoingTab,
  type IncomingStatusFilter,
} from './tabs';
import { DaybookEntryCard } from './DaybookEntryCard';

const DaybookPage = memo(function DaybookPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    data: incomingResult,
    isLoading: incomingLoading,
    isError: incomingError,
    error: incomingErrorDetail,
  } = useGetIncomingGatePasses(incomingParams);

  const incomingGatePassData = incomingResult?.data;
  const incomingPagination = incomingResult?.pagination;

  const gradingParams = useMemo(
    () => ({ page, limit, sortOrder }),
    [page, limit, sortOrder]
  );
  const {
    data: gradingResult,
    isLoading: gradingLoading,
    isError: gradingError,
    error: gradingErrorDetail,
  } = useGetGradingGatePasses(gradingParams);

  const gradingGatePassData = gradingResult?.data;
  const gradingPagination = gradingResult?.pagination;
  const gradingTotalPages = gradingPagination?.totalPages ?? 1;
  const gradingHasPrev = gradingPagination?.hasPreviousPage ?? false;
  const gradingHasNext = gradingPagination?.hasNextPage ?? false;

  const storageDateRange = useMemo(() => {
    const now = new Date();
    return {
      dateFrom: `${now.getFullYear()}-01-01`,
      dateTo: now.toISOString().slice(0, 10),
    };
  }, []);
  const storageParams = useMemo(
    () => ({
      page,
      limit,
      sortOrder,
      dateFrom: storageDateRange.dateFrom,
      dateTo: storageDateRange.dateTo,
    }),
    [page, limit, sortOrder, storageDateRange]
  );
  const {
    data: storageResult,
    isLoading: storageLoading,
    isError: storageError,
    error: storageErrorDetail,
  } = useGetStorageGatePasses(storageParams);

  const storageGatePassData = storageResult?.data;
  const storagePagination = storageResult?.pagination;
  const storageTotalPages = storagePagination?.totalPages ?? 1;
  const storageHasPrev = storagePagination?.hasPreviousPage ?? false;
  const storageHasNext = storagePagination?.hasNextPage ?? false;

  const dispatchDateRange = useMemo(() => {
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
      dateFrom: dispatchDateRange.dateFrom,
      dateTo: dispatchDateRange.dateTo,
    }),
    [page, limit, sortOrder, dispatchDateRange]
  );
  const {
    data: dispatchResult,
    isLoading: dispatchLoading,
    isError: dispatchError,
    error: dispatchErrorDetail,
  } = useGetNikasiGatePasses(dispatchParams);
  const dispatchGatePassData = dispatchResult?.data;
  const dispatchPagination = dispatchResult?.pagination;
  const dispatchTotalPages = dispatchPagination?.totalPages ?? 1;
  const dispatchHasPrev = dispatchPagination?.hasPreviousPage ?? false;
  const dispatchHasNext = dispatchPagination?.hasNextPage ?? false;

  const setLimitAndResetPage = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const incomingTotalPages = incomingPagination?.totalPages ?? 1;
  const incomingHasPrev = incomingPagination?.hasPreviousPage ?? false;
  const incomingHasNext = incomingPagination?.hasNextPage ?? false;

  return (
    <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <Tabs defaultValue="incoming" className="w-full">
            <TabsList className="font-custom mb-4 flex h-auto w-full flex-nowrap overflow-x-auto rounded-xl">
              <TabsTrigger
                value="incoming"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Incoming
              </TabsTrigger>
              <TabsTrigger
                value="grading"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Grading
              </TabsTrigger>
              <TabsTrigger
                value="storage"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Storage
              </TabsTrigger>
              <TabsTrigger
                value="dispatch"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Dispatch
              </TabsTrigger>
              <TabsTrigger
                value="outgoing"
                className="min-w-0 flex-1 shrink-0 px-3 sm:px-4"
              >
                Outgoing
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="incoming"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <IncomingTab
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                sortOrder={sortOrder}
                onSortOrderChange={(v) => {
                  setSortOrder(v);
                  setPage(1);
                }}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                page={page}
                onPageChange={setPage}
                limit={limit}
                onLimitChange={setLimitAndResetPage}
                data={incomingGatePassData}
                total={
                  incomingPagination?.total ?? incomingGatePassData?.length ?? 0
                }
                isLoading={incomingLoading}
                isError={incomingError}
                error={incomingErrorDetail}
                totalPages={incomingTotalPages}
                hasPrev={incomingHasPrev}
                hasNext={incomingHasNext}
              />
            </TabsContent>

            <TabsContent
              value="grading"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <GradingTab
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                sortOrder={sortOrder}
                onSortOrderChange={(v) => {
                  setSortOrder(v);
                  setPage(1);
                }}
                page={page}
                onPageChange={setPage}
                limit={limit}
                onLimitChange={setLimitAndResetPage}
                data={gradingGatePassData}
                total={gradingPagination?.total ?? 0}
                isLoading={gradingLoading}
                isError={gradingError}
                error={gradingErrorDetail}
                totalPages={gradingTotalPages}
                hasPrev={gradingHasPrev}
                hasNext={gradingHasNext}
              />
            </TabsContent>

            <TabsContent
              value="storage"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <StorageTab
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                sortOrder={sortOrder}
                onSortOrderChange={(v: 'asc' | 'desc') => {
                  setSortOrder(v);
                  setPage(1);
                }}
                page={page}
                onPageChange={setPage}
                limit={limit}
                onLimitChange={setLimitAndResetPage}
                data={storageGatePassData}
                total={storagePagination?.total ?? 0}
                isLoading={storageLoading}
                isError={storageError}
                error={storageErrorDetail}
                totalPages={storageTotalPages}
                hasPrev={storageHasPrev}
                hasNext={storageHasNext}
              />
            </TabsContent>

            <TabsContent
              value="dispatch"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <DispatchTab
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                sortOrder={sortOrder}
                onSortOrderChange={(v: 'asc' | 'desc') => {
                  setSortOrder(v);
                  setPage(1);
                }}
                page={page}
                onPageChange={setPage}
                limit={limit}
                onLimitChange={setLimitAndResetPage}
                data={dispatchGatePassData}
                total={dispatchPagination?.total ?? 0}
                isLoading={dispatchLoading}
                isError={dispatchError}
                error={dispatchErrorDetail}
                totalPages={dispatchTotalPages}
                hasPrev={dispatchHasPrev}
                hasNext={dispatchHasNext}
              />
            </TabsContent>

            <TabsContent
              value="outgoing"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <OutgoingTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
});

export default DaybookPage;
export { DaybookEntryCard };
