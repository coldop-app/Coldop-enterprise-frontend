import {
  Item,
  ItemActions,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/date-picker';
import { useGetIncomingGatePassReport } from '@/services/store-admin/incoming-gate-pass/analytics/useGetIncomingGatePassReport';
import type { IncomingGatePassWithLink } from '@/types/incoming-gate-pass';
import { DataTable } from './data-table';
import { columns, type IncomingReportRow } from './columns';

function getFarmerName(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    const farmerName = gatePass.farmerStorageLinkId.farmerId.name;
    const accountNumber = gatePass.farmerStorageLinkId.accountNumber;

    if (typeof accountNumber === 'number') {
      return `${farmerName} (#${accountNumber})`;
    }

    return farmerName;
  }

  return '-';
}

function getFarmerId(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId._id;
  }

  return '-';
}

function getFarmerMobile(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId.mobileNumber ?? '-';
  }

  return '-';
}

function getFarmerAddress(gatePass: IncomingGatePassWithLink): string {
  if (
    gatePass.farmerStorageLinkId &&
    typeof gatePass.farmerStorageLinkId !== 'string' &&
    gatePass.farmerStorageLinkId.farmerId &&
    typeof gatePass.farmerStorageLinkId.farmerId !== 'string'
  ) {
    return gatePass.farmerStorageLinkId.farmerId.address ?? '-';
  }

  return '-';
}

function getCreatedByName(gatePass: IncomingGatePassWithLink): string {
  if (gatePass.createdBy && typeof gatePass.createdBy !== 'string') {
    return gatePass.createdBy.name;
  }

  return '-';
}

function getCreatedByMobile(gatePass: IncomingGatePassWithLink): string {
  if (gatePass.createdBy && typeof gatePass.createdBy !== 'string') {
    return gatePass.createdBy.mobileNumber ?? '-';
  }

  return '-';
}

function toDisplayDate(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB');
}

function toApiDate(value: string): string | undefined {
  const [day, month, year] = value.split('.');
  if (!day || !month || !year) return undefined;

  const normalizedDay = day.padStart(2, '0');
  const normalizedMonth = month.padStart(2, '0');
  if (year.length !== 4) return undefined;

  return `${year}-${normalizedMonth}-${normalizedDay}`;
}

const IncomingReportTable = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const hasDateFilters = Boolean(fromDate && toDate);
  const hasAppliedDateFilters = Boolean(appliedFromDate && appliedToDate);
  const canApply = Boolean(fromDate && toDate);

  const { data, isFetching, isLoading, isError, error, refetch } =
    useGetIncomingGatePassReport(
      {
        fromDate: hasAppliedDateFilters ? appliedFromDate : undefined,
        toDate: hasAppliedDateFilters ? appliedToDate : undefined,
      },
      {
        enabled: true,
      }
    );

  const incomingReportData = useMemo<IncomingReportRow[]>(
    () =>
      (data ?? []).map((item) => ({
        id: item._id,
        farmerId: getFarmerId(item),
        gatePassNo: item.gatePassNo,
        manualGatePassNumber: item.manualGatePassNumber,
        farmerName: getFarmerName(item),
        farmerMobileNumber: getFarmerMobile(item),
        farmerAddress: getFarmerAddress(item),
        createdByName: getCreatedByName(item),
        createdByMobileNumber: getCreatedByMobile(item),
        variety: item.variety,
        location: item.location,
        truckNumber: item.truckNumber,
        bagsReceived: item.bagsReceived,
        slipNumber: item.weightSlip?.slipNumber ?? '-',
        grossWeightKg: item.weightSlip?.grossWeightKg ?? 0,
        tareWeightKg: item.weightSlip?.tareWeightKg ?? 0,
        netWeightKg:
          (item.weightSlip?.grossWeightKg ?? 0) -
          (item.weightSlip?.tareWeightKg ?? 0),
        remarks: item.remarks ?? '-',
        date: toDisplayDate(item.date),
        createdAt: toDisplayDate(item.createdAt),
        updatedAt: toDisplayDate(item.updatedAt),
        status: item.status,
      })),
    [data]
  );

  const handleApply = () => {
    if (hasDateFilters) {
      const nextFromDate = toApiDate(fromDate);
      const nextToDate = toApiDate(toDate);

      if (!nextFromDate || !nextToDate) return;

      setAppliedFromDate(nextFromDate);
      setAppliedToDate(nextToDate);
    }
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  return (
    <>
      <main className="mx-auto max-w-7xl p-3 sm:p-4 lg:p-6">
        <div className="space-y-6">
          <Item
            variant="outline"
            size="sm"
            className="cursor-pointer rounded-xl shadow-sm"
          >
            <ItemHeader className="h-full">
              <div className="flex items-center gap-3">
                <ItemMedia variant="icon" className="rounded-lg">
                  <BarChart3 className="text-primary h-5 w-5" />
                </ItemMedia>
                <ItemTitle className="font-custom text-sm font-semibold sm:text-base">
                  Incoming Gate Pass Report
                </ItemTitle>
              </div>

              <ItemActions>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-custom gap-2"
                  disabled={isFetching}
                  onClick={() => refetch()}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </ItemActions>
            </ItemHeader>
          </Item>

          <Item
            variant="outline"
            size="sm"
            className="border-border/70 rounded-2xl p-2 shadow-sm sm:p-3"
          >
            <div className="flex w-full flex-nowrap items-end gap-4 overflow-x-auto px-1 py-1">
              <div className="min-w-max">
                <DatePicker
                  id="analytics-from-date"
                  label="From"
                  compact
                  value={fromDate}
                  onChange={setFromDate}
                />
              </div>

              <div className="min-w-max">
                <DatePicker
                  id="analytics-to-date"
                  label="To"
                  compact
                  value={toDate}
                  onChange={setToDate}
                />
              </div>

              <Button
                className="font-custom rounded-lg px-5 shadow-sm transition-all duration-200 ease-in-out hover:shadow-md"
                disabled={!canApply}
                onClick={handleApply}
              >
                Apply
              </Button>
              <Button
                variant="secondary"
                className="font-custom border-border/70 bg-background/80 hover:bg-secondary rounded-lg border px-5 text-[#333] transition-colors duration-200 ease-in-out"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            </div>
          </Item>

          <Item
            variant="outline"
            size="sm"
            className="rounded-2xl p-3 shadow-sm"
          >
            {isError && (
              <p className="mb-3 text-sm text-red-600">
                {error instanceof Error
                  ? error.message
                  : 'Failed to load incoming report'}
              </p>
            )}
            {isLoading && (
              <p className="mb-3 text-sm text-gray-600">Loading report...</p>
            )}
            <DataTable columns={columns} data={incomingReportData} />
          </Item>
        </div>
      </main>
    </>
  );
};

export default IncomingReportTable;
