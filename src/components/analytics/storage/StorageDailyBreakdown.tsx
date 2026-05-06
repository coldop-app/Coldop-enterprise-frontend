import type { GetStorageSummaryParams } from '@/services/store-admin/storage-gate-pass/analytics/useGetStorageSummary';
import {
  useGetStorageDailyBreakdown,
  type GetStorageDailyBreakdownParams,
} from '@/services/store-admin/storage-gate-pass/analytics/useGetStorageDailyBreakdown';

interface StorageDailyBreakdownProps {
  dateParams: GetStorageSummaryParams;
}

const StorageDailyBreakdown = ({ dateParams }: StorageDailyBreakdownProps) => {
  const queryParams: GetStorageDailyBreakdownParams =
    dateParams.dateFrom && dateParams.dateTo
      ? { dateFrom: dateParams.dateFrom, dateTo: dateParams.dateTo }
      : {};

  const storageDailyBreakdownQuery = useGetStorageDailyBreakdown(queryParams);

  return (
    <pre className="font-custom bg-muted overflow-auto rounded-md p-4 text-sm">
      {JSON.stringify(
        {
          isLoading: storageDailyBreakdownQuery.isLoading,
          isFetching: storageDailyBreakdownQuery.isFetching,
          isError: storageDailyBreakdownQuery.isError,
          error: storageDailyBreakdownQuery.error?.message ?? null,
          data: storageDailyBreakdownQuery.data ?? null,
        },
        null,
        2
      )}
    </pre>
  );
};

export default StorageDailyBreakdown;
