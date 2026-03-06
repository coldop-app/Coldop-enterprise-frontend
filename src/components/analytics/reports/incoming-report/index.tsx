'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useGetIncomingGatePassReports } from '@/services/store-admin/analytics/incoming/useGetIncomingGatePassReports';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import { columns, type IncomingReportRow } from './columns';
import { DataTable } from './data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

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
  const { data, isLoading, error } = useGetIncomingGatePassReports({
    groupByFarmer: false,
    groupByVariety: false,
  });

  const rows = useMemo((): IncomingReportRow[] => {
    if (!data) return [];
    const flat = Array.isArray(data) ? data : [];
    return mapGatePassesToRows(flat as IncomingPass[]);
  }, [data]);

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
        <h2 className="font-custom text-2xl font-semibold text-[#333]">
          Incoming Report
        </h2>
        <DataTable columns={columns} data={rows} />
      </div>
    </main>
  );
};

export default IncomingReportTable;
