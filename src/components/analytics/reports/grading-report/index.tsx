'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useGetGradingGatePasses,
  gradingGatePassesQueryOptions,
} from '@/services/store-admin/grading-gate-pass/useGetGradingGatePasses';
import type {
  GradingGatePass,
  GradingGatePassIncomingRef,
} from '@/types/grading-gate-pass';
import {
  createGradingReportColumns,
  type GradingReportRow,
  gradingReportRowSpanColumnIds,
} from './columns';
import {
  getAggregatedGradedSizeBreakdown,
  getVisibleBagSizesFromPasses,
  gradedBagSizeColumnId,
} from './grading-bag-sizes';
import {
  DataTable,
  type GradingReportDataTableRef,
  type GradingReportPdfSnapshot,
} from './data-table';
import type { VisibilityState } from '@tanstack/table-core';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { queryClient } from '@/lib/queryClient';
import { useStore } from '@/stores/store';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import {
  computeGradingOrderTotals,
  computeIncomingNetProductKg,
} from '@/components/daybook/vouchers/grading-voucher-calculations';
import { JUTE_BAG_WEIGHT } from '@/components/forms/grading/constants';

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'do MMMM yyyy');
  } catch {
    return iso;
  }
}

function getFarmerName(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): string {
  return inc.farmerStorageLinkId?.farmerId?.name ?? '—';
}

function getAccountNumber(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): number | string {
  return inc.farmerStorageLinkId?.accountNumber ?? '—';
}

function getFarmerAddress(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): string {
  return inc.farmerStorageLinkId?.farmerId?.address ?? '—';
}

function getFarmerMobile(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): string {
  return inc.farmerStorageLinkId?.farmerId?.mobileNumber ?? '—';
}

function getIncomingGatePassNo(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): number | string {
  return inc.gatePassNo ?? '—';
}

function getIncomingManualNo(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): number | string {
  const v = inc.manualGatePassNumber;
  return v != null ? v : '—';
}

function getIncomingGatePassDate(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): string {
  return inc.date ? formatDate(inc.date) : '—';
}

function getTruckNumber(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): string {
  return inc.truckNumber ?? '—';
}

function getBagsReceived(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): number {
  return inc.bagsReceived ?? 0;
}

/**
 * Incoming net weight (kg) from weight slip: net = gross − tare.
 * GradingGatePassIncomingRef only has weightSlip with grossWeightKg/tareWeightKg.
 */
function getIncomingNetKg(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): number | undefined {
  const gross = inc.weightSlip?.grossWeightKg;
  const tare = inc.weightSlip?.tareWeightKg;
  if (gross != null && tare != null) return gross - tare;
  return undefined;
}

function getGrossTareNet(
  _pass: GradingGatePass,
  inc: GradingGatePassIncomingRef
): {
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
} {
  const gross = inc.weightSlip?.grossWeightKg;
  const tare = inc.weightSlip?.tareWeightKg;
  const netKg = getIncomingNetKg(_pass, inc);
  return {
    grossWeightKg: gross,
    tareWeightKg: tare,
    netWeightKg: netKg,
  };
}

/**
 * Map grading gate passes to table rows. Each grading pass has
 * incomingGatePassIds[]; when there are multiple incomings they are grouped:
 * one row per incoming with that incoming's details; grading pass details
 * (gate pass no., date, total graded bags/weight, wastage, grader, remarks)
 * appear on the first row of the group only. Wastage is computed at group level
 * (combined effective incoming net product − total graded weight).
 */
function mapGradingPassesToRows(
  passes: GradingGatePass[],
  gradedBagColumns: readonly { size: string; columnId: string }[]
): GradingReportRow[] {
  const rows: GradingReportRow[] = [];

  for (const pass of passes) {
    const incomings = pass.incomingGatePassIds ?? [];
    if (incomings.length === 0) continue;

    const createdByName =
      typeof pass.createdBy === 'object' && pass.createdBy !== null
        ? pass.createdBy.name
        : '—';
    const totalGradedBags = pass.orderDetails?.length
      ? pass.orderDetails.reduce(
          (sum, d) => sum + (d.initialQuantity ?? d.currentQuantity ?? 0),
          0
        )
      : 0;
    const { totalGradedWeightKg } = computeGradingOrderTotals(
      pass.orderDetails as Parameters<typeof computeGradingOrderTotals>[0]
    );

    const groupTotalIncomingBags = incomings.reduce(
      (sum, inc) => sum + getBagsReceived(pass, inc),
      0
    );
    const groupEffectiveIncomingNetKg = incomings.reduce<number | undefined>(
      (acc, inc) => {
        const net = getIncomingNetKg(pass, inc);
        if (net == null) return acc;
        return (acc ?? 0) + net;
      },
      undefined
    );
    const groupEffectiveIncomingNetProductKg =
      groupEffectiveIncomingNetKg != null && groupTotalIncomingBags != null
        ? groupEffectiveIncomingNetKg - groupTotalIncomingBags * JUTE_BAG_WEIGHT
        : computeIncomingNetProductKg(
            groupEffectiveIncomingNetKg,
            groupTotalIncomingBags
          );
    const wastageKg =
      groupEffectiveIncomingNetProductKg != null &&
      groupEffectiveIncomingNetProductKg > 0
        ? Math.max(0, groupEffectiveIncomingNetProductKg - totalGradedWeightKg)
        : undefined;

    incomings.forEach((inc, idx) => {
      const { grossWeightKg, tareWeightKg } = getGrossTareNet(pass, inc);
      const totalIncomingBags = getBagsReceived(pass, inc);
      const effectiveIncomingNetKg = getIncomingNetKg(pass, inc);
      const effectiveIncomingNetProductKg =
        effectiveIncomingNetKg != null && totalIncomingBags != null
          ? effectiveIncomingNetKg - totalIncomingBags * JUTE_BAG_WEIGHT
          : computeIncomingNetProductKg(
              effectiveIncomingNetKg,
              totalIncomingBags
            );

      const isFirstRow = idx === 0;
      const gradedSizeBreakdown = isFirstRow
        ? getAggregatedGradedSizeBreakdown(pass.orderDetails)
        : undefined;
      const gradedBagSizeQtyByColumnId = Object.fromEntries(
        gradedBagColumns.map(({ size, columnId }) => {
          const qty =
            isFirstRow && gradedSizeBreakdown?.[size]
              ? gradedSizeBreakdown[size]!.qty
              : 0;
          return [columnId, qty] as const;
        })
      );
      rows.push({
        id: incomings.length > 1 ? `${pass._id}-${idx}` : pass._id,
        farmerName: getFarmerName(pass, inc),
        accountNumber: getAccountNumber(pass, inc),
        farmerAddress: getFarmerAddress(pass, inc),
        farmerMobile: getFarmerMobile(pass, inc),
        createdByName,
        gatePassNo: isFirstRow ? (pass.gatePassNo ?? '—') : '—',
        manualGatePassNumber: isFirstRow
          ? (pass.manualGatePassNumber ?? '—')
          : '—',
        incomingGatePassNo: getIncomingGatePassNo(pass, inc),
        incomingManualNo: getIncomingManualNo(pass, inc),
        incomingGatePassDate: getIncomingGatePassDate(pass, inc),
        date: isFirstRow ? formatDate(pass.date) : '—',
        variety: inc.variety ?? pass.variety ?? '—',
        truckNumber: getTruckNumber(pass, inc),
        bagsReceived: totalIncomingBags,
        grossWeightKg: grossWeightKg ?? '—',
        tareWeightKg: tareWeightKg ?? '—',
        netWeightKg: effectiveIncomingNetKg ?? '—',
        netProductKg:
          effectiveIncomingNetProductKg != null
            ? effectiveIncomingNetProductKg
            : '—',
        totalGradedBags: isFirstRow ? totalGradedBags : 0,
        totalGradedWeightKg: isFirstRow ? totalGradedWeightKg : 0,
        wastageKg: isFirstRow ? (wastageKg ?? '—') : '—',
        grader: isFirstRow ? (pass.grader ?? '—') : '—',
        remarks: isFirstRow ? (pass.remarks ?? '—') : '—',
        gradingPassRowIndex: idx,
        gradingPassGroupSize: incomings.length,
        gradedSizeBreakdown,
        gradedBagSizeQtyByColumnId,
      });
    });
  }

  return rows;
}

/** Default column visibility: only incoming GP no., manual no., date, bags received, net weight */
const GRADING_REPORT_DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  incomingGatePassNo: true,
  incomingManualNo: true,
  incomingGatePassDate: true,
  bagsReceived: true,
  netWeightKg: false,
  netProductKg: true,
  truckNumber: false,
  grossWeightKg: false,
  tareWeightKg: false,
  gatePassNo: true,
  manualGatePassNumber: true,
  date: true,
  variety: true,
  totalGradedBags: true,
  totalGradedWeightKg: true,
  wastageKg: true,
  grader: true,
  remarks: false,
  farmerName: true,
  farmerAddress: false,
  farmerMobile: false,
  createdByName: false,
};

const GRADING_REPORT_FETCH_LIMIT = 5000;

/** Lets the browser paint / handle input before a long main-thread task (e.g. react-pdf). */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: 120 });
    } else {
      requestAnimationFrame(() => resolve());
    }
  });
}

const GradingReportTable = () => {
  const coldStorageName = useStore(
    (s) => s.coldStorage?.name ?? 'Cold Storage'
  );
  const tableRef = useRef<GradingReportDataTableRef<GradingReportRow>>(null);
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [appliedRange, setAppliedRange] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const { data, isLoading, error } = useGetGradingGatePasses({
    limit: GRADING_REPORT_FETCH_LIMIT,
    dateFrom: appliedRange.dateFrom,
    dateTo: appliedRange.dateTo,
    fetchAllPages: true,
  });

  const passes = data?.data;

  /** Bag-size columns: Below 30, 30–40, 35–40, … 50–55, Above 50, Above 55, Cut (see grading-bag-sizes). */
  const visibleBagSizes = useMemo(
    () => getVisibleBagSizesFromPasses(passes ?? []),
    [passes]
  );

  const bagSizeSignature = useMemo(
    () => visibleBagSizes.join('\0'),
    [visibleBagSizes]
  );

  const gradedBagColumns = useMemo(
    () =>
      visibleBagSizes.map((size) => ({
        size,
        columnId: gradedBagSizeColumnId(size),
      })),
    [visibleBagSizes]
  );

  const rows = useMemo((): GradingReportRow[] => {
    const list = passes ?? [];
    return mapGradingPassesToRows(list, gradedBagColumns);
  }, [passes, gradedBagColumns]);

  const reportColumns = useMemo(
    () => createGradingReportColumns(visibleBagSizes),
    [visibleBagSizes]
  );

  const initialColumnVisibilityMerged = useMemo(
    () => ({
      ...GRADING_REPORT_DEFAULT_COLUMN_VISIBILITY,
      ...Object.fromEntries(gradedBagColumns.map((c) => [c.columnId, true])),
    }),
    [gradedBagColumns]
  );

  const rowSpanColumnIds = useMemo(
    () => gradingReportRowSpanColumnIds(gradedBagColumns.map((c) => c.size)),
    [gradedBagColumns]
  );

  const totalColumnIds = useMemo(
    () => [
      'bagsReceived',
      'totalGradedBags',
      ...gradedBagColumns.map((c) => c.columnId),
      'totalGradedWeightKg',
      'wastageKg',
      'grossWeightKg',
      'netWeightKg',
      'netProductKg',
    ],
    [gradedBagColumns]
  );

  const reportContentRef = useRef<HTMLDivElement>(null);

  const handleApplyDates = useCallback(() => {
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
      limit: GRADING_REPORT_FETCH_LIMIT,
      dateFrom: fromDate ? formatDateToYYYYMMDD(fromDate) : undefined,
      dateTo: toDate ? formatDateToYYYYMMDD(toDate) : undefined,
      fetchAllPages: true,
    };
    const fetchPromise = queryClient.fetchQuery(
      gradingGatePassesQueryOptions(params)
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
  }, [fromDate, toDate]);

  const handleClearDates = useCallback(() => {
    setFromDate(undefined);
    setToDate(undefined);
    setAppliedRange({});
    toast.success('Date filters cleared. Report updated.');
  }, []);

  const dateRangeLabel = useMemo(() => {
    if (appliedRange.dateFrom && appliedRange.dateTo) {
      return `${appliedRange.dateFrom} to ${appliedRange.dateTo}`;
    }
    if (appliedRange.dateFrom) return `From ${appliedRange.dateFrom}`;
    if (appliedRange.dateTo) return `To ${appliedRange.dateTo}`;
    return 'All dates';
  }, [appliedRange.dateFrom, appliedRange.dateTo]);

  const handleDownloadPdf = useCallback(async () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(
        '<html><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#666;">Generating PDF…</body></html>'
      );
    }
    setIsGeneratingPdf(true);
    try {
      const snapshot: GradingReportPdfSnapshot<GradingReportRow> | null =
        tableRef.current?.getPdfSnapshot() ?? null;
      await yieldToMain();
      const [{ pdf }, { GradingReportTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/grading-report-table-pdf'),
      ]);
      await yieldToMain();
      const blob = await pdf(
        <GradingReportTablePdf
          companyName={coldStorageName}
          dateRangeLabel={dateRangeLabel}
          reportTitle="Grading Report"
          rows={rows}
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
        description: 'Grading report is ready to view or print.',
      });
    } catch {
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [coldStorageName, dateRangeLabel, rows]);

  const toolbarLeftContent = useMemo(
    () => (
      <>
        <DatePicker
          id="grading-report-from"
          label="From"
          value={fromDate}
          onChange={setFromDate}
        />
        <DatePicker
          id="grading-report-to"
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
    ),
    [
      appliedRange.dateFrom,
      appliedRange.dateTo,
      fromDate,
      toDate,
      handleApplyDates,
      handleClearDates,
    ]
  );

  const toolbarRightContent = useMemo(
    () => (
      <Button
        className="font-custom focus-visible:ring-primary h-10 w-full shrink-0 gap-2 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf || isLoading}
        aria-label={
          isGeneratingPdf
            ? 'Generating PDF…'
            : isLoading
              ? 'Loading report…'
              : 'View report'
        }
      >
        <FileDown className="h-4 w-4 shrink-0" />
        {isGeneratingPdf ? 'Generating…' : 'View Report'}
      </Button>
    ),
    [handleDownloadPdf, isGeneratingPdf, isLoading]
  );

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
            Grading Report
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="font-custom text-destructive">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load grading report.'}
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
        aria-label="Grading report content"
      >
        <h2 className="font-custom text-2xl font-semibold text-[#333]">
          Grading Report
        </h2>
        <DataTable
          key={bagSizeSignature}
          ref={tableRef}
          columns={reportColumns}
          data={rows}
          initialColumnVisibility={initialColumnVisibilityMerged}
          rowSpanColumnIds={rowSpanColumnIds}
          totalColumnIds={totalColumnIds}
          toolbarLeftContent={toolbarLeftContent}
          toolbarRightContent={toolbarRightContent}
        />
      </div>
    </main>
  );
};

export default GradingReportTable;
