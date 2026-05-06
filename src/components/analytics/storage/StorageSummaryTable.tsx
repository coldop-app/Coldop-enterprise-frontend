import {
  useGetStorageSummary,
  type GetStorageSummaryParams,
} from '@/services/store-admin/storage-gate-pass/analytics/useGetStorageSummary';

interface StorageSummaryTableProps {
  dateParams?: GetStorageSummaryParams;
}

const StorageSummaryTable = ({ dateParams }: StorageSummaryTableProps) => {
  const queryParams: GetStorageSummaryParams = {
    ...(dateParams?.dateFrom ? { dateFrom: dateParams.dateFrom } : {}),
    ...(dateParams?.dateTo ? { dateTo: dateParams.dateTo } : {}),
  };

  const storageSummaryQuery = useGetStorageSummary(queryParams);

  return (
    <pre className="font-custom bg-muted overflow-auto rounded-md p-4 text-sm">
      {JSON.stringify(
        {
          isLoading: storageSummaryQuery.isLoading,
          isFetching: storageSummaryQuery.isFetching,
          isError: storageSummaryQuery.isError,
          error: storageSummaryQuery.error?.message ?? null,
          data: storageSummaryQuery.data ?? null,
        },
        null,
        2
      )}
    </pre>
  );
};

export default StorageSummaryTable;
