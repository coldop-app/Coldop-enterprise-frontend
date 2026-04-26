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
  orderBagSizesByGradingReport,
  gradedBagSizeColumnId,
} from './grading-bag-sizes';
import {
  DataTable,
  type GradingReportDataTableRef,
  type GradingReportPdfSnapshot,
} from './data-table';
import { prepareGradingReportPdf } from './grading-report-pdf-prepare';
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

type GradedBagColumn = { size: string; columnId: string };
type NormalizedIncoming = {
  incomingId: string;
  farmerName: string;
  accountNumber: number | string;
  farmerAddress: string;
  farmerMobile: string;
  incomingGatePassNo: number | string;
  incomingManualNo: number | string;
  incomingGatePassDate: string;
  sortIncomingGatePassNo: number;
  sortIncomingManualNo: number;
  sortIncomingGatePassDate: string;
  variety: string;
  truckNumber: string;
  bagsReceived: number;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  netProductKg?: number;
};

type NormalizedPass = {
  passId: string;
  gatePassNo: number | string;
  manualGatePassNumber: number | string;
  sortGatePassNo: number;
  sortManualGatePassNumber: number;
  sortGradingPassDate: string;
  date: string;
  createdByName: string;
  grader: string;
  remarks: string;
  totalGradedBags: number;
  totalGradedWeightKg: number;
  wastagePercent?: number;
  gradedSizeBreakdown: ReturnType<typeof getAggregatedGradedSizeBreakdown>;
  incomings: NormalizedIncoming[];
};

const DASH = '—';
const GRADING_REPORT_FETCH_LIMIT = 5000;

function formatDate(
  iso: string | undefined,
  cache: Map<string, string>
): string {
  if (!iso) return DASH;
  const cached = cache.get(iso);
  if (cached != null) return cached;
  let formatted = iso;
  try {
    formatted = format(parseISO(iso), 'do MMMM yyyy');
  } catch {
    formatted = iso;
  }
  cache.set(iso, formatted);
  return formatted;
}

function getIncomingNetKg(inc: GradingGatePassIncomingRef): number | undefined {
  const gross = inc.weightSlip?.grossWeightKg;
  const tare = inc.weightSlip?.tareWeightKg;
  if (gross != null && tare != null) return gross - tare;
  return undefined;
}

function normalizeIncoming(
  pass: GradingGatePass,
  inc: GradingGatePassIncomingRef,
  dateCache: Map<string, string>
): NormalizedIncoming {
  const bagsReceived = inc.bagsReceived ?? 0;
  const grossWeightKg = inc.weightSlip?.grossWeightKg;
  const tareWeightKg = inc.weightSlip?.tareWeightKg;
  const netWeightKg = getIncomingNetKg(inc);
  const netProductKg =
    netWeightKg != null
      ? netWeightKg - bagsReceived * JUTE_BAG_WEIGHT
      : computeIncomingNetProductKg(netWeightKg, bagsReceived);

  return {
    incomingId: inc._id,
    farmerName: inc.farmerStorageLinkId?.farmerId?.name ?? DASH,
    accountNumber: inc.farmerStorageLinkId?.accountNumber ?? DASH,
    farmerAddress: inc.farmerStorageLinkId?.farmerId?.address ?? DASH,
    farmerMobile: inc.farmerStorageLinkId?.farmerId?.mobileNumber ?? DASH,
    incomingGatePassNo: inc.gatePassNo ?? DASH,
    incomingManualNo: inc.manualGatePassNumber ?? DASH,
    incomingGatePassDate: inc.date ? formatDate(inc.date, dateCache) : DASH,
    sortIncomingGatePassNo:
      inc.gatePassNo != null ? Number(inc.gatePassNo) : Number.NaN,
    sortIncomingManualNo:
      inc.manualGatePassNumber != null
        ? Number(inc.manualGatePassNumber)
        : Number.NaN,
    sortIncomingGatePassDate: inc.date ?? '',
    variety: inc.variety ?? pass.variety ?? DASH,
    truckNumber: inc.truckNumber ?? DASH,
    bagsReceived,
    grossWeightKg,
    tareWeightKg,
    netWeightKg,
    netProductKg,
  };
}

function buildNormalizedPasses(passes: GradingGatePass[]): {
  normalizedPasses: NormalizedPass[];
  visibleBagSizes: string[];
} {
  const dateCache = new Map<string, string>();
  const visibleBagSizeSet = new Set<string>();
  const normalizedPasses: NormalizedPass[] = [];

  for (const pass of passes) {
    const incomings = pass.incomingGatePassIds ?? [];
    if (incomings.length === 0) continue;

    const createdByName =
      typeof pass.createdBy === 'object' && pass.createdBy !== null
        ? pass.createdBy.name
        : DASH;
    const totalGradedBags = (pass.orderDetails ?? []).reduce(
      (sum, detail) =>
        sum + (detail.initialQuantity ?? detail.currentQuantity ?? 0),
      0
    );
    const { totalGradedWeightKg } = computeGradingOrderTotals(
      pass.orderDetails as Parameters<typeof computeGradingOrderTotals>[0]
    );
    const gradedSizeBreakdown = getAggregatedGradedSizeBreakdown(
      pass.orderDetails
    );

    for (const [size, breakdown] of Object.entries(gradedSizeBreakdown)) {
      if ((breakdown?.qty ?? 0) > 0) visibleBagSizeSet.add(size);
    }

    const normalizedIncomings = incomings.map((inc) =>
      normalizeIncoming(pass, inc, dateCache)
    );

    const groupTotalIncomingBags = normalizedIncomings.reduce(
      (sum, inc) => sum + inc.bagsReceived,
      0
    );
    let groupNetWeightTotal: number | undefined;
    for (const inc of normalizedIncomings) {
      if (inc.netWeightKg == null) continue;
      groupNetWeightTotal = (groupNetWeightTotal ?? 0) + inc.netWeightKg;
    }
    const groupNetProductKg =
      groupNetWeightTotal != null
        ? groupNetWeightTotal - groupTotalIncomingBags * JUTE_BAG_WEIGHT
        : computeIncomingNetProductKg(
            groupNetWeightTotal,
            groupTotalIncomingBags
          );
    const wastagePercent =
      groupNetProductKg != null && groupNetProductKg > 0
        ? (Math.max(0, groupNetProductKg - totalGradedWeightKg) /
            groupNetProductKg) *
          100
        : undefined;

    normalizedPasses.push({
      passId: pass._id,
      gatePassNo: pass.gatePassNo ?? DASH,
      manualGatePassNumber: pass.manualGatePassNumber ?? DASH,
      sortGatePassNo: pass.gatePassNo ?? Number.NaN,
      sortManualGatePassNumber:
        pass.manualGatePassNumber != null
          ? pass.manualGatePassNumber
          : Number.NaN,
      sortGradingPassDate: pass.date ?? '',
      date: formatDate(pass.date, dateCache),
      createdByName,
      grader: pass.grader ?? DASH,
      remarks: pass.remarks ?? DASH,
      totalGradedBags,
      totalGradedWeightKg,
      wastagePercent,
      gradedSizeBreakdown,
      incomings: normalizedIncomings,
    });
  }

  return {
    normalizedPasses,
    visibleBagSizes: orderBagSizesByGradingReport(visibleBagSizeSet),
  };
}

function createGradedBagQtyByColumnId(
  gradedSizeBreakdown: NormalizedPass['gradedSizeBreakdown'],
  gradedBagColumns: readonly GradedBagColumn[]
): Record<string, number> {
  const qtyByColumnId: Record<string, number> = {};
  for (const { size, columnId } of gradedBagColumns) {
    qtyByColumnId[columnId] = gradedSizeBreakdown?.[size]?.qty ?? 0;
  }
  return qtyByColumnId;
}

function buildRowsForTanstackTable(
  normalizedPasses: readonly NormalizedPass[],
  gradedBagColumns: readonly GradedBagColumn[]
): GradingReportRow[] {
  const rows: GradingReportRow[] = [];
  for (const pass of normalizedPasses) {
    const groupSize = pass.incomings.length;
    const gradedBagSizeQtyByColumnId = createGradedBagQtyByColumnId(
      pass.gradedSizeBreakdown,
      gradedBagColumns
    );
    for (let index = 0; index < groupSize; index += 1) {
      const inc = pass.incomings[index];
      rows.push({
        id:
          groupSize > 1
            ? `${pass.passId}-${inc.incomingId}-${index}`
            : pass.passId,
        farmerName: inc.farmerName,
        accountNumber: inc.accountNumber,
        farmerAddress: inc.farmerAddress,
        farmerMobile: inc.farmerMobile,
        createdByName: pass.createdByName,
        gatePassNo: pass.gatePassNo,
        manualGatePassNumber: pass.manualGatePassNumber,
        incomingGatePassNo: inc.incomingGatePassNo,
        incomingManualNo: inc.incomingManualNo,
        incomingGatePassDate: inc.incomingGatePassDate,
        sortIncomingGatePassNo: inc.sortIncomingGatePassNo,
        sortIncomingManualNo: inc.sortIncomingManualNo,
        sortIncomingGatePassDate: inc.sortIncomingGatePassDate,
        sortGatePassNo: pass.sortGatePassNo,
        sortManualGatePassNumber: pass.sortManualGatePassNumber,
        sortGradingPassDate: pass.sortGradingPassDate,
        date: pass.date,
        variety: inc.variety,
        truckNumber: inc.truckNumber,
        bagsReceived: inc.bagsReceived,
        grossWeightKg: inc.grossWeightKg ?? DASH,
        tareWeightKg: inc.tareWeightKg ?? DASH,
        netWeightKg: inc.netWeightKg ?? DASH,
        netProductKg: inc.netProductKg ?? DASH,
        totalGradedBags: pass.totalGradedBags,
        totalGradedWeightKg: pass.totalGradedWeightKg,
        wastageKg: pass.wastagePercent ?? DASH,
        grader: pass.grader,
        remarks: pass.remarks,
        gradingPassRowIndex: index,
        gradingPassGroupSize: groupSize,
        gradedSizeBreakdown: pass.gradedSizeBreakdown,
        gradedBagSizeQtyByColumnId,
      });
    }
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

  const passes = data?.data ?? [];

  const { normalizedPasses, visibleBagSizes } = useMemo(
    () => buildNormalizedPasses(passes),
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
    return buildRowsForTanstackTable(normalizedPasses, gradedBagColumns);
  }, [normalizedPasses, gradedBagColumns]);

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
      'grossWeightKg',
      'netWeightKg',
      'netProductKg',
    ],
    [gradedBagColumns]
  );

  const getGradingReportRowId = useCallback(
    (row: GradingReportRow) => row.id,
    []
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
      const prepared = prepareGradingReportPdf(rows, snapshot);
      const blob = await pdf(
        <GradingReportTablePdf
          companyName={coldStorageName}
          dateRangeLabel={dateRangeLabel}
          reportTitle="Grading Report"
          prepared={prepared}
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
          getRowId={getGradingReportRowId}
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
