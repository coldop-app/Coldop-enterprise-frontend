'use client';

import { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useGetGradingGatePassReports,
  gradingGatePassReportQueryOptions,
} from '@/services/store-admin/analytics/grading/useGetGradingGatePassReports';
import type {
  GradingGatePassReportData,
  GradingGatePassReportItem,
} from '@/types/analytics';
import type { GradingGatePassIncomingGatePass } from '@/types/grading-gate-pass';
import { columns, type GradingReportRow } from './columns';
import { DataTable } from './data-table';
import type { VisibilityState } from '@tanstack/table-core';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
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

function getFarmerName(pass: GradingGatePassReportItem): string {
  if (pass.farmerStorageLink?.farmerId?.name) {
    return pass.farmerStorageLink.farmerId.name;
  }
  const inc = pass.incomingGatePassId;
  if (inc && 'farmerStorageLinkId' in inc) {
    return (
      (inc as GradingGatePassIncomingGatePass).farmerStorageLinkId?.farmerId
        ?.name ?? '—'
    );
  }
  return '—';
}

function getAccountNumber(pass: GradingGatePassReportItem): number | string {
  if (pass.farmerStorageLink?.accountNumber != null) {
    return pass.farmerStorageLink.accountNumber;
  }
  const inc = pass.incomingGatePassId;
  if (inc && 'farmerStorageLinkId' in inc) {
    return (
      (inc as GradingGatePassIncomingGatePass).farmerStorageLinkId
        ?.accountNumber ?? '—'
    );
  }
  return '—';
}

function getFarmerAddress(pass: GradingGatePassReportItem): string {
  if (pass.farmerStorageLink?.farmerId?.address) {
    return pass.farmerStorageLink.farmerId.address;
  }
  const inc = pass.incomingGatePassId;
  if (inc && 'farmerStorageLinkId' in inc) {
    return (
      (inc as GradingGatePassIncomingGatePass).farmerStorageLinkId?.farmerId
        ?.address ?? '—'
    );
  }
  return '—';
}

function getFarmerMobile(pass: GradingGatePassReportItem): string {
  if (pass.farmerStorageLink?.farmerId?.mobileNumber) {
    return pass.farmerStorageLink.farmerId.mobileNumber;
  }
  const inc = pass.incomingGatePassId;
  if (inc && 'farmerStorageLinkId' in inc) {
    return (
      (inc as GradingGatePassIncomingGatePass).farmerStorageLinkId?.farmerId
        ?.mobileNumber ?? '—'
    );
  }
  return '—';
}

function getIncomingGatePassNo(
  pass: GradingGatePassReportItem
): number | string {
  const inc = pass.incomingGatePassId;
  if (inc && typeof inc === 'object' && 'gatePassNo' in inc) {
    return inc.gatePassNo ?? '—';
  }
  return '—';
}

function getIncomingManualNo(pass: GradingGatePassReportItem): number | string {
  const inc = pass.incomingGatePassId;
  if (inc && typeof inc === 'object' && 'manualGatePassNumber' in inc) {
    const v = (inc as { manualGatePassNumber?: number }).manualGatePassNumber;
    return v != null ? v : '—';
  }
  return '—';
}

function getIncomingGatePassDate(pass: GradingGatePassReportItem): string {
  const inc = pass.incomingGatePassId;
  if (inc && typeof inc === 'object' && 'date' in inc) {
    const dateStr = (inc as { date?: string }).date;
    if (dateStr) return formatDate(dateStr);
  }
  return '—';
}

function getTruckNumber(pass: GradingGatePassReportItem): string {
  const inc = pass.incomingGatePassId;
  if (inc && typeof inc === 'object' && 'truckNumber' in inc) {
    return (inc as { truckNumber?: string }).truckNumber ?? '—';
  }
  return '—';
}

function getBagsReceived(pass: GradingGatePassReportItem): number {
  const inc = pass.incomingGatePassId;
  if (inc && typeof inc === 'object' && 'bagsReceived' in inc) {
    return (inc as { bagsReceived?: number }).bagsReceived ?? 0;
  }
  if (pass.orderDetails?.length) {
    return pass.orderDetails.reduce(
      (sum, d) => sum + (d.initialQuantity ?? d.currentQuantity ?? 0),
      0
    );
  }
  return 0;
}

/**
 * Incoming net weight (kg) using same logic as grading voucher:
 * - If grossWeightKg and tareWeightKg present (weight slip): net = gross − tare
 * - Else if netWeightKg present: use it
 * - Else undefined
 */
function getIncomingNetKg(pass: GradingGatePassReportItem): number | undefined {
  const inc = pass.incomingGatePassId;
  if (!inc || typeof inc !== 'object') return undefined;
  const withWeight = inc as {
    grossWeightKg?: number;
    tareWeightKg?: number;
    netWeightKg?: number;
    weightSlip?: { grossWeightKg?: number; tareWeightKg?: number };
  };
  const gross =
    withWeight.grossWeightKg ?? withWeight.weightSlip?.grossWeightKg;
  const tare = withWeight.tareWeightKg ?? withWeight.weightSlip?.tareWeightKg;
  if (gross != null && tare != null) return gross - tare;
  if (withWeight.netWeightKg != null) return withWeight.netWeightKg;
  return undefined;
}

function getGrossTareNet(pass: GradingGatePassReportItem): {
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
} {
  const inc = pass.incomingGatePassId;
  if (!inc || typeof inc !== 'object') return {};
  const withWeight = inc as {
    grossWeightKg?: number;
    tareWeightKg?: number;
    netWeightKg?: number;
    weightSlip?: { grossWeightKg?: number; tareWeightKg?: number };
  };
  const gross =
    withWeight.grossWeightKg ?? withWeight.weightSlip?.grossWeightKg;
  const tare = withWeight.tareWeightKg ?? withWeight.weightSlip?.tareWeightKg;
  const netKg = getIncomingNetKg(pass);
  return {
    grossWeightKg: gross,
    tareWeightKg: tare,
    netWeightKg: netKg,
  };
}

/**
 * Map flat API response to table rows using the same calculation flow as GradingVoucher:
 * - effectiveIncomingNetKg from weight slip (gross − tare) or netWeightKg
 * - effectiveIncomingNetProductKg = effectiveIncomingNetKg − (bags × JUTE_BAG_WEIGHT)
 * - wastageKg = max(0, effectiveIncomingNetProductKg − totalGradedWeightKg)
 */
function mapGradingPassesToRows(
  passes: GradingGatePassReportItem[]
): GradingReportRow[] {
  return passes.map((pass) => {
    const createdByName = pass.createdBy?.name ?? '—';
    const { grossWeightKg, tareWeightKg } = getGrossTareNet(pass);
    const totalGradedBags = pass.orderDetails?.length
      ? pass.orderDetails.reduce(
          (sum, d) => sum + (d.initialQuantity ?? d.currentQuantity ?? 0),
          0
        )
      : 0;

    const { totalGradedWeightKg } = computeGradingOrderTotals(
      pass.orderDetails as Parameters<typeof computeGradingOrderTotals>[0]
    );

    const totalIncomingBags = getBagsReceived(pass);
    const effectiveIncomingNetKg = getIncomingNetKg(pass);
    const effectiveIncomingNetProductKg =
      effectiveIncomingNetKg != null && totalIncomingBags != null
        ? effectiveIncomingNetKg - totalIncomingBags * JUTE_BAG_WEIGHT
        : computeIncomingNetProductKg(
            effectiveIncomingNetKg,
            totalIncomingBags
          );

    const wastageKg =
      effectiveIncomingNetProductKg != null && effectiveIncomingNetProductKg > 0
        ? Math.max(0, effectiveIncomingNetProductKg - totalGradedWeightKg)
        : undefined;

    return {
      id: pass._id,
      farmerName: getFarmerName(pass),
      accountNumber: getAccountNumber(pass),
      farmerAddress: getFarmerAddress(pass),
      farmerMobile: getFarmerMobile(pass),
      createdByName,
      gatePassNo: pass.gatePassNo ?? '—',
      manualGatePassNumber: pass.manualGatePassNumber ?? '—',
      incomingGatePassNo: getIncomingGatePassNo(pass),
      incomingManualNo: getIncomingManualNo(pass),
      incomingGatePassDate: getIncomingGatePassDate(pass),
      date: formatDate(pass.date),
      variety: pass.variety ?? '—',
      truckNumber: getTruckNumber(pass),
      bagsReceived: totalIncomingBags,
      grossWeightKg: grossWeightKg ?? '—',
      tareWeightKg: tareWeightKg ?? '—',
      netWeightKg: effectiveIncomingNetKg ?? '—',
      netProductKg:
        effectiveIncomingNetProductKg != null
          ? effectiveIncomingNetProductKg
          : '—',
      totalGradedBags,
      totalGradedWeightKg,
      wastageKg: wastageKg ?? '—',
      grader: pass.grader ?? '—',
      remarks: pass.remarks ?? '—',
    };
  });
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

/** Check if API returned flat list (no grouping) */
function isFlatGradingData(
  data: GradingGatePassReportData
): data is GradingGatePassReportItem[] {
  if (!Array.isArray(data) || data.length === 0) return true;
  const first = data[0];
  return first != null && typeof first === 'object' && !('gatePasses' in first);
}

const GradingReportTable = () => {
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [appliedRange, setAppliedRange] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const { data, isLoading, error } = useGetGradingGatePassReports({
    groupByFarmer: false,
    groupByVariety: false,
    dateFrom: appliedRange.dateFrom,
    dateTo: appliedRange.dateTo,
  });

  const rows = useMemo((): GradingReportRow[] => {
    if (!data) return [];
    const flat = isFlatGradingData(data) ? data : [];
    return mapGradingPassesToRows(flat);
  }, [data]);

  const reportContentRef = useRef<HTMLDivElement>(null);

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
      gradingGatePassReportQueryOptions(params)
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
          columns={columns}
          data={rows}
          initialColumnVisibility={GRADING_REPORT_DEFAULT_COLUMN_VISIBILITY}
          toolbarLeftContent={
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
          }
        />
      </div>
    </main>
  );
};

export default GradingReportTable;
