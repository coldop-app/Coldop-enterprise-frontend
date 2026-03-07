'use client';

import { useMemo, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  useGetIncomingGatePassReports,
  incomingGatePassReportQueryOptions,
} from '@/services/store-admin/analytics/incoming/useGetIncomingGatePassReports';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import { columns, type IncomingReportRow } from './columns';
import {
  DataTable,
  type IncomingReportDataTableRef,
  type IncomingReportPdfSnapshot,
} from './data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD } from '@/lib/helpers';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';

/** API can return populated createdBy and optional weightSlip/bagsReceived etc. */
type IncomingPass = IncomingGatePassWithLink & {
  createdBy?: { _id?: string; name?: string; mobileNumber?: string } | string;
  weightSlip?: {
    slipNumber?: string;
    grossWeightKg?: number;
    tareWeightKg?: number;
  };
  bagsReceived?: number;
  manualGatePassNumber?: number;
  truckNumber?: string;
  status?: string;
  gradingSummary?: { totalGradedBags?: number };
};

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'yyyy-MM-dd');
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, 'dd MMM yyyy, HH:mm');
  } catch {
    return iso;
  }
}

/** Map flat API response (gate passes) to table rows */
function mapGatePassesToRows(gatePasses: IncomingPass[]): IncomingReportRow[] {
  return gatePasses.map((pass) => {
    const bagsFromSizes = (pass.bagSizes ?? []).reduce(
      (sum, b) => sum + (b.initialQuantity ?? 0),
      0
    );
    const bags = pass.bagsReceived ?? bagsFromSizes;
    const link = pass.farmerStorageLinkId;
    const farmer = link?.farmerId;
    const createdBy = pass.createdBy;
    const createdByName =
      typeof createdBy === 'object' && createdBy !== null && 'name' in createdBy
        ? ((createdBy as { name?: string }).name ?? '—')
        : '—';
    const gross = pass.weightSlip?.grossWeightKg;
    const tare = pass.weightSlip?.tareWeightKg;
    const net =
      gross != null &&
      tare != null &&
      !Number.isNaN(gross) &&
      !Number.isNaN(tare)
        ? gross - tare
        : undefined;

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
      truckNumber: pass.truckNumber ?? '—',
      bags,
      grossWeightKg: gross ?? '—',
      tareWeightKg: tare ?? '—',
      netWeightKg: net ?? '—',
      status: pass.status ?? '—',
      totalGradedBags: pass.gradingSummary?.totalGradedBags ?? '—',
      remarks: pass.remarks ?? '—',
      createdAt: formatDateTime(pass.createdAt),
      updatedAt: formatDateTime(pass.updatedAt),
    };
  });
}

const IncomingReportTable = () => {
  const tableRef = useRef<IncomingReportDataTableRef<IncomingReportRow>>(null);
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [appliedRange, setAppliedRange] = useState<{
    dateFrom?: string;
    dateTo?: string;
  }>({});

  const { data, isLoading, error } = useGetIncomingGatePassReports({
    groupByFarmer: false,
    groupByVariety: false,
    dateFrom: appliedRange.dateFrom,
    dateTo: appliedRange.dateTo,
  });

  const rows = useMemo((): IncomingReportRow[] => {
    if (!data) return [];
    const flat = Array.isArray(data) ? data : [];
    return mapGatePassesToRows(flat as IncomingPass[]);
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
      incomingGatePassReportQueryOptions(params)
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

  const getDateRangeLabel = () => {
    if (appliedRange.dateFrom && appliedRange.dateTo) {
      return `${appliedRange.dateFrom} to ${appliedRange.dateTo}`;
    }
    if (appliedRange.dateFrom) return `From ${appliedRange.dateFrom}`;
    if (appliedRange.dateTo) return `To ${appliedRange.dateTo}`;
    return 'All dates';
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const snapshot: IncomingReportPdfSnapshot<IncomingReportRow> | null =
        tableRef.current?.getPdfSnapshot() ?? null;
      const [{ pdf }, { IncomingReportTablePdf }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/analytics/incoming-report-table-pdf'),
      ]);
      const blob = await pdf(
        <IncomingReportTablePdf
          companyName="Cold Storage"
          dateRangeLabel={getDateRangeLabel()}
          reportTitle="INCOMING REPORT"
          rows={rows}
          tableSnapshot={snapshot}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success('PDF opened in new tab', {
        description: 'Incoming report is ready to view or print.',
      });
    } catch {
      toast.error('Could not generate PDF', {
        description: 'Please try again.',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
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
            Incoming Report
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="font-custom text-destructive">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load incoming report.'}
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
            Incoming Report
          </h2>
          <div className="font-custom flex flex-wrap items-end gap-3">
            <DatePicker
              id="incoming-report-from"
              label="From"
              value={fromDate}
              onChange={setFromDate}
            />
            <DatePicker
              id="incoming-report-to"
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
            <Button
              variant="outline"
              size="sm"
              className="focus-visible:ring-primary h-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              aria-label={isGeneratingPdf ? 'Generating PDF…' : 'View report'}
            >
              <FileDown className="font-custom mr-2 h-4 w-4" />
              {isGeneratingPdf ? 'Generating…' : 'View Report'}
            </Button>
          </div>
        </div>
        <DataTable ref={tableRef} columns={columns} data={rows} />
      </div>
    </main>
  );
};

export default IncomingReportTable;
