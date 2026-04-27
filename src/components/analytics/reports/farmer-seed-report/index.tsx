'use client';

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { useGetAllFarmerSeedEntries } from '@/services/store-admin/farmer-seed/useGetAllFarmerSeedEntries';
import { useStore } from '@/stores/store';
import type { FarmerSeedEntryListItem } from '@/types/farmer-seed';
import {
  createFarmerSeedReportColumns,
  farmerSeedBagSizeColumnId,
  type FarmerSeedReportRow,
} from './columns';
import {
  DataTable,
  type FarmerSeedReportDataTableRef,
  type FarmerSeedReportPdfSnapshot,
} from './data-table';

function formatDateValue(value: string | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'dd.MM.yyyy');
  } catch {
    return value;
  }
}

function toDateSortTimestamp(displayDate: string): number {
  if (!displayDate || displayDate === '—') return Number.NEGATIVE_INFINITY;
  const [day, month, year] = displayDate.split('.');
  const ts = new Date(`${year}-${month}-${day}`).getTime();
  return Number.isFinite(ts) ? ts : Number.NEGATIVE_INFINITY;
}

function normalizeBagSizeName(name: string): string {
  return name.replace(/–/g, '-').trim();
}

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function mapEntriesToRows(
  entries: FarmerSeedEntryListItem[]
): FarmerSeedReportRow[] {
  return entries.map((entry) => {
    const displayDate = formatDateValue(entry.date);
    const bagSizeQtyByName = entry.bagSizes.reduce<Record<string, number>>(
      (acc, bagSize) => {
        const normalizedName = normalizeBagSizeName(bagSize.name);
        acc[normalizedName] =
          (acc[normalizedName] ?? 0) + (bagSize.quantity ?? 0);
        return acc;
      },
      {}
    );
    const totalBags = entry.bagSizes.reduce(
      (sum, bagSize) => sum + (bagSize.quantity ?? 0),
      0
    );
    const rawTotalSeedAmount = entry.bagSizes.reduce(
      (sum, bagSize) =>
        sum +
        (bagSize.quantity ?? 0) *
          (Number.isFinite(bagSize.rate) ? bagSize.rate : 0),
      0
    );
    const totalSeedAmount = roundToTwoDecimals(rawTotalSeedAmount);
    const rate =
      totalBags > 0 ? roundToTwoDecimals(totalSeedAmount / totalBags) : 0;
    return {
      id: entry._id,
      farmerName: entry.farmerStorageLinkId?.farmerId?.name ?? '—',
      accountNumber: entry.farmerStorageLinkId?.accountNumber ?? '—',
      farmerAddress: entry.farmerStorageLinkId?.farmerId?.address ?? '—',
      gatePassNo: entry.gatePassNo ?? '—',
      invoiceNumber: entry.invoiceNumber || '—',
      date: displayDate,
      dateSortTs: toDateSortTimestamp(displayDate),
      variety: entry.variety || '—',
      generation: entry.generation || '—',
      totalBags,
      rate,
      totalSeedAmount,
      bagSizeQtyByName,
      remarks: entry.remarks || '—',
    };
  });
}

const FarmerSeedReportTable = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetAllFarmerSeedEntries();
  const coldStorage = useStore((s) => s.coldStorage);
  const tableRef =
    useRef<FarmerSeedReportDataTableRef<FarmerSeedReportRow>>(null);
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [appliedRange, setAppliedRange] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const rows = useMemo(() => mapEntriesToRows(data?.data ?? []), [data]);
  const rowsWithBags = useMemo(
    () => rows.filter((row) => row.totalBags > 0),
    [rows]
  );

  const filteredRows = useMemo(() => {
    if (!appliedRange.dateFrom && !appliedRange.dateTo) return rowsWithBags;

    const fromTs = appliedRange.dateFrom
      ? new Date(appliedRange.dateFrom).getTime()
      : Number.NEGATIVE_INFINITY;
    const toTs = appliedRange.dateTo
      ? new Date(appliedRange.dateTo).getTime()
      : Number.POSITIVE_INFINITY;

    return rowsWithBags.filter((row) => {
      if (!row.date || row.date === '—') return false;
      const [day, month, year] = row.date.split('.');
      const parsed = new Date(`${year}-${month}-${day}`).getTime();
      return parsed >= fromTs && parsed <= toTs;
    });
  }, [appliedRange.dateFrom, appliedRange.dateTo, rowsWithBags]);

  const visibleBagSizes = useMemo(() => {
    const sizes = new Set<string>();
    for (const row of filteredRows) {
      Object.entries(row.bagSizeQtyByName ?? {}).forEach(([size, qty]) => {
        if ((qty ?? 0) > 0) sizes.add(size);
      });
    }
    return Array.from(sizes);
  }, [filteredRows]);

  const reportColumns = useMemo(
    () => createFarmerSeedReportColumns(visibleBagSizes),
    [visibleBagSizes]
  );

  const totalColumnIds = useMemo(
    () => [
      'totalBags',
      'rate',
      'totalSeedAmount',
      ...visibleBagSizes.map((s) => farmerSeedBagSizeColumnId(s)),
    ],
    [visibleBagSizes]
  );

  const handleApplyDates = () => {
    setAppliedRange({
      dateFrom: fromDate ? formatDateToYYYYMMDD(fromDate) : undefined,
      dateTo: toDate ? formatDateToYYYYMMDD(toDate) : undefined,
    });
  };

  const handleClearDates = () => {
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedRange({});
  };

  const getDateRangeLabel = () => {
    if (appliedRange.dateFrom && appliedRange.dateTo) {
      return `${appliedRange.dateFrom} to ${appliedRange.dateTo}`;
    }
    if (appliedRange.dateFrom) return `From ${appliedRange.dateFrom}`;
    if (appliedRange.dateTo) return `To ${appliedRange.dateTo}`;
    return 'All dates';
  };

  const getLeafRowsFromSnapshot = (
    snapshot: FarmerSeedReportPdfSnapshot<FarmerSeedReportRow> | null
  ): FarmerSeedReportRow[] | null => {
    if (!snapshot || snapshot.rows.length === 0) return null;
    const leaves = snapshot.rows
      .filter(
        (item): item is { type: 'leaf'; row: FarmerSeedReportRow } =>
          item.type === 'leaf'
      )
      .map((item) => item.row);
    return leaves.length > 0 ? leaves : null;
  };

  const handleDownloadPdf = async () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }

    setIsGeneratingPdf(true);
    try {
      const snapshot: FarmerSeedReportPdfSnapshot<FarmerSeedReportRow> | null =
        tableRef.current?.getPdfSnapshot() ?? null;
      const effectiveRows = getLeafRowsFromSnapshot(snapshot) ?? filteredRows;
      const [{ pdf }, { FarmerSeedReportTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/farmer-seed-report-table-pdf'),
      ]);

      const blob = await pdf(
        <FarmerSeedReportTablePdf
          companyName={coldStorage?.name ?? 'Cold Storage'}
          dateRangeLabel={getDateRangeLabel()}
          reportTitle="Farmer Seed Report"
          rows={effectiveRows}
          tableSnapshot={snapshot}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      if (printWindow) {
        printWindow.location.href = url;
      } else {
        window.location.href = url;
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('PDF opened in new tab', {
        description: 'Farmer seed report is ready to view or print.',
      });
    } catch {
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
      if (printWindow) {
        printWindow.close();
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRowClick = (row: FarmerSeedReportRow) => {
    const selectedEntry = data?.data?.find((entry) => entry._id === row.id);
    if (!selectedEntry) return;
    void navigate({
      to: '/store-admin/farmer-seed/edit',
      search: { id: selectedEntry._id },
      state: { farmerSeedEntry: selectedEntry } as never,
    });
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl p-2 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <Skeleton className="font-custom h-8 w-56 rounded-lg" />
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
            Farmer Seed Report
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="font-custom text-destructive">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load farmer seed report.'}
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
        <h2 className="font-custom text-2xl font-semibold text-[#333]">
          Farmer Seed Report
        </h2>
        <DataTable
          ref={tableRef}
          columns={reportColumns}
          data={filteredRows}
          onRowClick={handleRowClick}
          totalColumnIds={totalColumnIds}
          toolbarLeftContent={
            <>
              <DatePicker
                id="farmer-seed-report-from"
                label="From"
                value={fromDate}
                onChange={setFromDate}
              />
              <DatePicker
                id="farmer-seed-report-to"
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
          toolbarRightContent={
            <Button
              className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || isLoading}
              aria-label={isGeneratingPdf ? 'Generating PDF…' : 'View report'}
            >
              <FileDown className="h-4 w-4 shrink-0" />
              {isGeneratingPdf ? 'Generating…' : 'View Report'}
            </Button>
          }
        />
      </div>
    </main>
  );
};

export default FarmerSeedReportTable;
