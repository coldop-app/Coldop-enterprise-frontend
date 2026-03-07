'use client';

import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useGetStorageGatePassReports,
  storageGatePassReportQueryOptions,
} from '@/services/store-admin/analytics/storage/useGetStorageGatePassReports';
import type {
  StorageGatePassReportData,
  StorageGatePassReportItem,
} from '@/types/analytics';
import { columns, type StorageReportRow } from './columns';
import { DataTable } from './data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'yyyy-MM-dd');
  } catch {
    return iso;
  }
}

/** Per-pass total bags from orderDetails */
function getPassTotalBags(pass: StorageGatePassReportItem): number {
  return (pass.orderDetails ?? []).reduce(
    (sum, od) => sum + (od.currentQuantity ?? od.initialQuantity ?? 0),
    0
  );
}

/** Check if API returned flat list (no grouping) */
function isFlatStorageData(
  data: StorageGatePassReportData
): data is StorageGatePassReportItem[] {
  if (!Array.isArray(data) || data.length === 0) return true;
  const first = data[0];
  return first != null && typeof first === 'object' && !('gatePasses' in first);
}

/** Map flat API response (storage gate passes) to table rows */
function mapStoragePassesToRows(
  passes: StorageGatePassReportItem[]
): StorageReportRow[] {
  return passes.map((pass) => {
    const link = pass.farmerStorageLinkId;
    const farmer = link?.farmerId;
    const createdBy = pass.createdBy;
    const createdByName =
      typeof createdBy === 'object' && createdBy !== null && 'name' in createdBy
        ? ((createdBy as { name?: string }).name ?? '—')
        : '—';

    return {
      id: pass._id,
      farmerName: farmer?.name ?? '—',
      accountNumber: link?.accountNumber ?? '—',
      farmerAddress: farmer?.address ?? '—',
      farmerMobile: farmer?.mobileNumber ?? '—',
      createdByName,
      gatePassNo: pass.gatePassNo ?? '—',
      manualGatePassNumber: pass.manualGatePassNumber ?? '—',
      date: formatDate(pass.date),
      variety: pass.variety ?? '—',
      totalBags: getPassTotalBags(pass),
      remarks: pass.remarks ?? '—',
    };
  });
}

const StorageReportsTable = () => {
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [appliedRange, setAppliedRange] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const { data, isLoading, error } = useGetStorageGatePassReports({
    groupByFarmer: false,
    groupByVariety: false,
    dateFrom: appliedRange.dateFrom,
    dateTo: appliedRange.dateTo,
  });

  const rows = useMemo((): StorageReportRow[] => {
    if (!data) return [];
    const flat = isFlatStorageData(data) ? data : [];
    return mapStoragePassesToRows(flat);
  }, [data]);

  const handleApplyDates = () => {
    if (!fromDate && !toDate) return;
    const params = {
      groupByFarmer: false,
      groupByVariety: false,
      dateFrom: fromDate ? formatDateToYYYYMMDD(fromDate) : undefined,
      dateTo: toDate ? formatDateToYYYYMMDD(toDate) : undefined,
    };
    const fetchPromise = queryClient.fetchQuery(
      storageGatePassReportQueryOptions(params)
    );
    toast.promise(fetchPromise, {
      loading: 'Applying date filters…',
      success: 'Date filters applied. Report updated.',
      error: 'Failed to load report for the selected dates.',
    });
    fetchPromise
      .then(() =>
        setAppliedRange({
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        })
      )
      .catch(() => {});
  };

  const handleClearDates = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedRange({});
    toast.success('Date filters cleared. Report updated.');
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <Skeleton className="font-custom h-8 w-48 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <h2 className="font-custom text-2xl font-semibold text-[#333]">
            Storage Report
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="font-custom text-destructive">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load storage report.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-custom text-2xl font-semibold text-[#333]">
            Storage Report
          </h2>
          <div className="font-custom flex flex-wrap items-end gap-3">
            <DatePicker
              id="storage-report-from"
              label="From"
              value={fromDate}
              onChange={setFromDate}
            />
            <DatePicker
              id="storage-report-to"
              label="To"
              value={toDate}
              onChange={setToDate}
            />
            <Button
              variant="default"
              size="sm"
              className="focus-visible:ring-primary h-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={handleApplyDates}
              disabled={!fromDate && !toDate}
            >
              Apply
            </Button>
            {(fromDate ||
              toDate ||
              appliedRange.dateFrom ||
              appliedRange.dateTo) && (
              <Button
                variant="outline"
                size="sm"
                className="focus-visible:ring-primary h-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                onClick={handleClearDates}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        <DataTable columns={columns} data={rows} />
      </div>
    </main>
  );
};

export default StorageReportsTable;
