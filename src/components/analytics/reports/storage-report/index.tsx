'use client';

import { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useGetStorageGatePassReports,
  storageGatePassReportQueryOptions,
} from '@/services/store-admin/analytics/storage/useGetStorageGatePassReports';
import type {
  StorageGatePassReportData,
  StorageGatePassReportItem,
} from '@/types/analytics';
import {
  GRADING_SIZES,
  type GradingSize,
} from '@/components/forms/grading/constants';
import {
  getSizeColumnId,
  getStorageReportColumns,
  type StorageReportRow,
} from './columns';
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
    return format(d, 'do MMM yyyy');
  } catch {
    return iso;
  }
}

/** Bag size entry from API (bagSizes or orderDetails). */
type BagSizeEntry = {
  size: string;
  currentQuantity?: number;
  initialQuantity?: number;
};

/** Normalize API size string to match GRADING_SIZES (e.g. hyphen to en-dash). */
function normalizeSizeKey(apiSize: string): GradingSize | null {
  const s = String(apiSize ?? '').trim();
  if (!s) return null;
  const normalized = s.replace(/-/g, '–');
  return (GRADING_SIZES as readonly string[]).includes(normalized)
    ? (normalized as GradingSize)
    : (GRADING_SIZES as readonly string[]).includes(s)
      ? (s as GradingSize)
      : null;
}

/** Get per-size quantities from pass (bagSizes preferred, else orderDetails). */
function getSizeQuantities(
  pass: StorageGatePassReportItem & { bagSizes?: BagSizeEntry[] }
): Record<string, number> {
  const entries: BagSizeEntry[] =
    Array.isArray((pass as { bagSizes?: BagSizeEntry[] }).bagSizes) &&
    (pass as { bagSizes?: BagSizeEntry[] }).bagSizes!.length > 0
      ? (pass as { bagSizes: BagSizeEntry[] }).bagSizes
      : ((pass.orderDetails ?? []) as BagSizeEntry[]);
  const out: Record<string, number> = {};
  for (const e of entries) {
    const qty = e.currentQuantity ?? e.initialQuantity ?? 0;
    if (qty > 0) {
      const sizeKey = normalizeSizeKey(String(e.size ?? ''));
      if (sizeKey) out[sizeKey] = (out[sizeKey] ?? 0) + qty;
    }
  }
  return out;
}

/** Per-pass total bags from bagSizes or orderDetails */
function getPassTotalBags(
  pass: StorageGatePassReportItem & { bagSizes?: BagSizeEntry[] }
): number {
  const q = getSizeQuantities(pass);
  return Object.values(q).reduce((sum, n) => sum + n, 0);
}

/** Check if API returned flat list (no grouping) */
function isFlatStorageData(
  data: StorageGatePassReportData
): data is StorageGatePassReportItem[] {
  if (!Array.isArray(data) || data.length === 0) return true;
  const first = data[0];
  return first != null && typeof first === 'object' && !('gatePasses' in first);
}

/** Map flat API response (storage gate passes) to table rows with size columns. */
function mapStoragePassesToRows(
  passes: (StorageGatePassReportItem & { bagSizes?: BagSizeEntry[] })[]
): StorageReportRow[] {
  return passes.map((pass) => {
    const link = pass.farmerStorageLinkId;
    const farmer = link?.farmerId;
    const createdBy = pass.createdBy;
    const createdByName =
      typeof createdBy === 'object' && createdBy !== null && 'name' in createdBy
        ? ((createdBy as { name?: string }).name ?? '—')
        : '—';
    const sizeQuantities = getSizeQuantities(pass);
    const totalBags = getPassTotalBags(pass);

    const row: StorageReportRow = {
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
      totalBags,
      remarks: pass.remarks ?? '—',
    };
    for (const size of GRADING_SIZES) {
      row[getSizeColumnId(size)] = sizeQuantities[size] ?? 0;
    }
    return row;
  });
}

const StorageReportsTable = () => {
  const reportContentRef = useRef<HTMLDivElement>(null);
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
    return mapStoragePassesToRows(
      flat as (StorageGatePassReportItem & { bagSizes?: BagSizeEntry[] })[]
    );
  }, [data]);

  const sizesWithQuantity = useMemo(() => {
    return GRADING_SIZES.filter((size) =>
      rows.some((r) => (Number(r[getSizeColumnId(size)]) || 0) > 0)
    );
  }, [rows]);

  const columns = useMemo(
    () => getStorageReportColumns(sizesWithQuantity),
    [sizesWithQuantity]
  );

  const totalColumnIds = useMemo(
    () => ['totalBags', ...sizesWithQuantity.map(getSizeColumnId)],
    [sizesWithQuantity]
  );

  const handleApplyDates = () => {
    if (!fromDate && !toDate) return;
    if (fromDate && toDate) {
      const fromStr = formatDateToYYYYMMDD(fromDate);
      const toStr = formatDateToYYYYMMDD(toDate);
      if (toStr < fromStr) {
        toast.error('Invalid date range', {
          description: '"To" date must not be before "From" date.',
        });
        return;
      }
    }
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
      .then(() => {
        setAppliedRange({
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
        });
        requestAnimationFrame(() => {
          reportContentRef.current?.focus({ preventScroll: true });
        });
      })
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
      <div
        ref={reportContentRef}
        className="space-y-6"
        tabIndex={-1}
        aria-label="Storage report content"
      >
        <h2 className="font-custom text-2xl font-semibold text-[#333]">
          Storage Report
        </h2>
        <DataTable
          columns={columns}
          data={rows}
          totalColumnIds={totalColumnIds}
          initialColumnVisibility={{
            farmerName: false,
            accountNumber: false,
            farmerAddress: false,
            farmerMobile: false,
            createdByName: false,
            totalBags: false,
          }}
          toolbarLeftContent={
            <>
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
                className="font-custom focus-visible:ring-primary h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
                  className="font-custom focus-visible:ring-primary h-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  onClick={handleClearDates}
                >
                  Clear
                </Button>
              )}
            </>
          }
        />
      </div>
    </main>
  );
};

export default StorageReportsTable;
