import { memo, useCallback, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useGetIncomingGatePasses } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { useGetGradingGatePasses } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
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
    data: incomingGatePassData,
    isLoading: incomingLoading,
    isError: incomingError,
    error: incomingErrorDetail,
  } = useGetIncomingGatePasses(incomingParams);

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

  const setLimitAndResetPage = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const incomingTotalPages = 1;
  const incomingHasPrev = false;
  const incomingHasNext = false;

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
              <StorageTab />
            </TabsContent>

            <TabsContent
              value="dispatch"
              className="mt-0 flex flex-col gap-4 outline-none"
            >
              <DispatchTab />
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
