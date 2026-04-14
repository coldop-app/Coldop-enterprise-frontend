import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import debounce from 'lodash/debounce';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { incomingGatePassesQueryOptions } from '@/services/store-admin/incoming-gate-pass/useGetIncomingGatePasses';
import { useSearchIncomingGatePassNumber } from '@/services/store-admin/incoming-gate-pass/useSearchIncomingGatePassNumber';
import { gradingGatePassesQueryOptions } from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import { useSearchGradingGatePassNumber } from '@/services/store-admin/grading-gate-pass/useSearchGradingGatePassNumber';
import { storageGatePassesQueryOptions } from '@/services/store-admin/storage-gate-pass/useGetStorageGatePasses';
import { useSearchStorageGatePass } from '@/services/store-admin/storage-gate-pass/useSearchStorageGatePass';
import { nikasiGatePassesQueryOptions } from '@/services/store-admin/nikasi-gate-pass/useGetNikasiGatePasses';
import { useSearchNikasiGatePass } from '@/services/store-admin/nikasi-gate-pass/useSearchNikasiGatePass';
import {
  IncomingTab,
  GradingTab,
  StorageTab,
  DispatchTab,
  OutgoingTab,
  type IncomingStatusFilter,
} from './tabs';
import { DaybookEntryCard } from './DaybookEntryCard';

/** Gate-pass search syncs debounced query state via lodash + effects; pagination resets when debounced values change. */
/* eslint-disable react-hooks/set-state-in-effect -- controlled debounce + immediate clear pattern */

const DaybookPage = memo(function DaybookPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<IncomingStatusFilter>('all');
  const [incomingSearchQuery, setIncomingSearchQuery] = useState('');
  const [debouncedIncomingSearch, setDebouncedIncomingSearch] = useState('');
  const [gradingSearchQuery, setGradingSearchQuery] = useState('');
  const [debouncedGradingSearch, setDebouncedGradingSearch] = useState('');
  const [storageSearchQuery, setStorageSearchQuery] = useState('');
  const [debouncedStorageSearch, setDebouncedStorageSearch] = useState('');
  const [dispatchSearchQuery, setDispatchSearchQuery] = useState('');
  const [debouncedDispatchSearch, setDebouncedDispatchSearch] = useState('');

  const debouncedSetIncomingSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedIncomingSearch(value);
      }, 400),
    []
  );

  useEffect(() => {
    const trimmed = incomingSearchQuery.trim();
    if (trimmed === '') {
      debouncedSetIncomingSearch.cancel();
      setDebouncedIncomingSearch('');
      return;
    }
    debouncedSetIncomingSearch(incomingSearchQuery);
  }, [incomingSearchQuery, debouncedSetIncomingSearch]);

  useEffect(() => {
    return () => {
      debouncedSetIncomingSearch.cancel();
    };
  }, [debouncedSetIncomingSearch]);

  const debouncedSetGradingSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedGradingSearch(value);
      }, 400),
    []
  );

  useEffect(() => {
    const trimmed = gradingSearchQuery.trim();
    if (trimmed === '') {
      debouncedSetGradingSearch.cancel();
      setDebouncedGradingSearch('');
      return;
    }
    debouncedSetGradingSearch(gradingSearchQuery);
  }, [gradingSearchQuery, debouncedSetGradingSearch]);

  useEffect(() => {
    return () => {
      debouncedSetGradingSearch.cancel();
    };
  }, [debouncedSetGradingSearch]);

  const debouncedSetStorageSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedStorageSearch(value);
      }, 400),
    []
  );

  useEffect(() => {
    const trimmed = storageSearchQuery.trim();
    if (trimmed === '') {
      debouncedSetStorageSearch.cancel();
      setDebouncedStorageSearch('');
      return;
    }
    debouncedSetStorageSearch(storageSearchQuery);
  }, [storageSearchQuery, debouncedSetStorageSearch]);

  useEffect(() => {
    return () => {
      debouncedSetStorageSearch.cancel();
    };
  }, [debouncedSetStorageSearch]);

  const debouncedSetDispatchSearch = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedDispatchSearch(value);
      }, 400),
    []
  );

  useEffect(() => {
    const trimmed = dispatchSearchQuery.trim();
    if (trimmed === '') {
      debouncedSetDispatchSearch.cancel();
      setDebouncedDispatchSearch('');
      return;
    }
    debouncedSetDispatchSearch(dispatchSearchQuery);
  }, [dispatchSearchQuery, debouncedSetDispatchSearch]);

  useEffect(() => {
    return () => {
      debouncedSetDispatchSearch.cancel();
    };
  }, [debouncedSetDispatchSearch]);

  const isIncomingSearchMode = debouncedIncomingSearch.trim().length > 0;
  const isGradingSearchMode = debouncedGradingSearch.trim().length > 0;
  const isStorageSearchMode = debouncedStorageSearch.trim().length > 0;
  const isDispatchSearchMode = debouncedDispatchSearch.trim().length > 0;

  // Reset shared pagination when any tab’s debounced gate-pass search changes
  useEffect(() => {
    setPage(1);
  }, [
    debouncedIncomingSearch,
    debouncedGradingSearch,
    debouncedStorageSearch,
    debouncedDispatchSearch,
  ]);

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
    data: incomingListResult,
    isLoading: incomingListLoading,
    isError: incomingListError,
    error: incomingListErrorDetail,
  } = useQuery({
    ...incomingGatePassesQueryOptions(incomingParams),
    enabled: !isIncomingSearchMode,
  });

  const {
    data: incomingSearchRows,
    isLoading: incomingSearchLoading,
    isError: incomingSearchError,
    error: incomingSearchErrorDetail,
  } = useSearchIncomingGatePassNumber(
    isIncomingSearchMode ? debouncedIncomingSearch.trim() : null
  );

  const processedIncomingSearchRows = useMemo(() => {
    if (!incomingSearchRows) {
      return undefined;
    }
    let rows = [...incomingSearchRows];
    if (statusFilter === 'graded') {
      rows = rows.filter((p) => p.status === 'GRADED');
    } else if (statusFilter === 'ungraded') {
      rows = rows.filter((p) => p.status === 'NOT_GRADED');
    }
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return rows;
  }, [incomingSearchRows, statusFilter, sortOrder]);

  const paginatedIncomingSearchRows = useMemo(() => {
    if (!processedIncomingSearchRows) {
      return undefined;
    }
    const start = (page - 1) * limit;
    return processedIncomingSearchRows.slice(start, start + limit);
  }, [processedIncomingSearchRows, page, limit]);

  const incomingGatePassData = isIncomingSearchMode
    ? paginatedIncomingSearchRows
    : incomingListResult?.data;

  const incomingSearchTotal = processedIncomingSearchRows?.length ?? 0;
  const incomingSearchTotalPages = Math.max(
    1,
    Math.ceil(incomingSearchTotal / limit)
  );

  const incomingPagination = incomingListResult?.pagination;

  const incomingLoading = isIncomingSearchMode
    ? incomingSearchLoading
    : incomingListLoading;
  const incomingError = isIncomingSearchMode
    ? incomingSearchError
    : incomingListError;
  const incomingErrorDetail = isIncomingSearchMode
    ? incomingSearchErrorDetail
    : incomingListErrorDetail;

  const gradingParams = useMemo(
    () => ({ page, limit, sortOrder }),
    [page, limit, sortOrder]
  );

  const {
    data: gradingListResult,
    isLoading: gradingListLoading,
    isError: gradingListError,
    error: gradingListErrorDetail,
  } = useQuery({
    ...gradingGatePassesQueryOptions(gradingParams),
    enabled: !isGradingSearchMode,
  });

  const {
    data: gradingSearchRows,
    isLoading: gradingSearchLoading,
    isError: gradingSearchError,
    error: gradingSearchErrorDetail,
  } = useSearchGradingGatePassNumber(
    isGradingSearchMode ? debouncedGradingSearch.trim() : null
  );

  const processedGradingSearchRows = useMemo(() => {
    if (!gradingSearchRows) {
      return undefined;
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
    if (!processedGradingSearchRows) {
      return undefined;
    }
    const start = (page - 1) * limit;
    return processedGradingSearchRows.slice(start, start + limit);
  }, [processedGradingSearchRows, page, limit]);

  const gradingGatePassData = isGradingSearchMode
    ? paginatedGradingSearchRows
    : gradingListResult?.data;

  const gradingSearchTotal = processedGradingSearchRows?.length ?? 0;
  const gradingSearchTotalPages = Math.max(
    1,
    Math.ceil(gradingSearchTotal / limit)
  );

  const gradingPagination = gradingListResult?.pagination;

  const gradingLoading = isGradingSearchMode
    ? gradingSearchLoading
    : gradingListLoading;
  const gradingError = isGradingSearchMode
    ? gradingSearchError
    : gradingListError;
  const gradingErrorDetail = isGradingSearchMode
    ? gradingSearchErrorDetail
    : gradingListErrorDetail;

  const gradingTotalPages = isGradingSearchMode
    ? gradingSearchTotalPages
    : (gradingPagination?.totalPages ?? 1);
  const gradingHasPrev = isGradingSearchMode
    ? page > 1
    : (gradingPagination?.hasPreviousPage ?? false);
  const gradingHasNext = isGradingSearchMode
    ? page < gradingSearchTotalPages
    : (gradingPagination?.hasNextPage ?? false);

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
    isLoading: storageListLoading,
    isError: storageListError,
    error: storageListErrorDetail,
  } = useQuery({
    ...storageGatePassesQueryOptions(storageParams),
    enabled: !isStorageSearchMode,
  });

  const {
    data: storageSearchRows,
    isLoading: storageSearchLoading,
    isError: storageSearchError,
    error: storageSearchErrorDetail,
  } = useSearchStorageGatePass(
    isStorageSearchMode ? debouncedStorageSearch.trim() : null
  );

  const processedStorageSearchRows = useMemo(() => {
    if (!storageSearchRows) {
      return undefined;
    }
    const rows = [...storageSearchRows];
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return rows;
  }, [storageSearchRows, sortOrder]);

  const paginatedStorageSearchRows = useMemo(() => {
    if (!processedStorageSearchRows) {
      return undefined;
    }
    const start = (page - 1) * limit;
    return processedStorageSearchRows.slice(start, start + limit);
  }, [processedStorageSearchRows, page, limit]);

  const storageGatePassData = isStorageSearchMode
    ? paginatedStorageSearchRows
    : storageResult?.data;

  const storageSearchTotal = processedStorageSearchRows?.length ?? 0;
  const storageSearchTotalPages = Math.max(
    1,
    Math.ceil(storageSearchTotal / limit)
  );

  const storagePagination = storageResult?.pagination;

  const storageLoading = isStorageSearchMode
    ? storageSearchLoading
    : storageListLoading;
  const storageError = isStorageSearchMode
    ? storageSearchError
    : storageListError;
  const storageErrorDetail = isStorageSearchMode
    ? storageSearchErrorDetail
    : storageListErrorDetail;

  const storageTotalPages = isStorageSearchMode
    ? storageSearchTotalPages
    : (storagePagination?.totalPages ?? 1);
  const storageHasPrev = isStorageSearchMode
    ? page > 1
    : (storagePagination?.hasPreviousPage ?? false);
  const storageHasNext = isStorageSearchMode
    ? page < storageSearchTotalPages
    : (storagePagination?.hasNextPage ?? false);

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
    isLoading: dispatchListLoading,
    isError: dispatchListError,
    error: dispatchListErrorDetail,
  } = useQuery({
    ...nikasiGatePassesQueryOptions(dispatchParams),
    enabled: !isDispatchSearchMode,
  });

  const {
    data: dispatchSearchRows,
    isLoading: dispatchSearchLoading,
    isError: dispatchSearchError,
    error: dispatchSearchErrorDetail,
  } = useSearchNikasiGatePass(
    isDispatchSearchMode ? debouncedDispatchSearch.trim() : null
  );

  const processedDispatchSearchRows = useMemo(() => {
    if (!dispatchSearchRows) {
      return undefined;
    }
    const rows = [...dispatchSearchRows];
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === 'desc' ? db - da : da - db;
    });
    return rows;
  }, [dispatchSearchRows, sortOrder]);

  const paginatedDispatchSearchRows = useMemo(() => {
    if (!processedDispatchSearchRows) {
      return undefined;
    }
    const start = (page - 1) * limit;
    return processedDispatchSearchRows.slice(start, start + limit);
  }, [processedDispatchSearchRows, page, limit]);

  const dispatchGatePassData = isDispatchSearchMode
    ? paginatedDispatchSearchRows
    : dispatchResult?.data;

  const dispatchSearchTotal = processedDispatchSearchRows?.length ?? 0;
  const dispatchSearchTotalPages = Math.max(
    1,
    Math.ceil(dispatchSearchTotal / limit)
  );

  const dispatchPagination = dispatchResult?.pagination;

  const dispatchLoading = isDispatchSearchMode
    ? dispatchSearchLoading
    : dispatchListLoading;
  const dispatchError = isDispatchSearchMode
    ? dispatchSearchError
    : dispatchListError;
  const dispatchErrorDetail = isDispatchSearchMode
    ? dispatchSearchErrorDetail
    : dispatchListErrorDetail;

  const dispatchTotalPages = isDispatchSearchMode
    ? dispatchSearchTotalPages
    : (dispatchPagination?.totalPages ?? 1);
  const dispatchHasPrev = isDispatchSearchMode
    ? page > 1
    : (dispatchPagination?.hasPreviousPage ?? false);
  const dispatchHasNext = isDispatchSearchMode
    ? page < dispatchSearchTotalPages
    : (dispatchPagination?.hasNextPage ?? false);

  const setLimitAndResetPage = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const incomingTotalPages = isIncomingSearchMode
    ? incomingSearchTotalPages
    : (incomingPagination?.totalPages ?? 1);
  const incomingHasPrev = isIncomingSearchMode
    ? page > 1
    : (incomingPagination?.hasPreviousPage ?? false);
  const incomingHasNext = isIncomingSearchMode
    ? page < incomingSearchTotalPages
    : (incomingPagination?.hasNextPage ?? false);

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
                searchQuery={incomingSearchQuery}
                onSearchQueryChange={setIncomingSearchQuery}
                isSearchActive={isIncomingSearchMode}
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
                  isIncomingSearchMode
                    ? incomingSearchTotal
                    : (incomingPagination?.total ??
                      incomingGatePassData?.length ??
                      0)
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
                searchQuery={gradingSearchQuery}
                onSearchQueryChange={setGradingSearchQuery}
                isSearchActive={isGradingSearchMode}
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
                total={
                  isGradingSearchMode
                    ? gradingSearchTotal
                    : (gradingPagination?.total ?? 0)
                }
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
                searchQuery={storageSearchQuery}
                onSearchQueryChange={setStorageSearchQuery}
                isSearchActive={isStorageSearchMode}
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
                total={
                  isStorageSearchMode
                    ? storageSearchTotal
                    : (storagePagination?.total ?? 0)
                }
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
                searchQuery={dispatchSearchQuery}
                onSearchQueryChange={setDispatchSearchQuery}
                isSearchActive={isDispatchSearchMode}
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
                total={
                  isDispatchSearchMode
                    ? dispatchSearchTotal
                    : (dispatchPagination?.total ?? 0)
                }
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
