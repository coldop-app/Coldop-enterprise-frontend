import type { FarmerStorageLink } from '@/types/farmer';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';
import type { NikasiGatePass } from '@/types/nikasi-gate-pass';
import type {
  IncomingVoucherData,
  PassVoucherData,
} from '@/components/daybook/vouchers';
import type { IncomingStatusFilter } from '@/components/daybook/tabs/shared';

function matchesGatePassOrDate(
  gatePassNo: string | number | undefined,
  manualNo: string | number | undefined,
  date: string | undefined,
  searchQuery: string
) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return true;
  const no = String(gatePassNo ?? manualNo ?? '');
  const dateStr = date ? new Date(date).toLocaleDateString('en-IN') : '';
  return no.toLowerCase().includes(q) || dateStr.toLowerCase().includes(q);
}

function sortByDate<T extends { date?: string }>(
  list: T[],
  sortOrder: 'asc' | 'desc'
) {
  return [...list].sort((a, b) => {
    const d =
      new Date(a.date ?? '').getTime() - new Date(b.date ?? '').getTime();
    return sortOrder === 'desc' ? -d : d;
  });
}

export function filterIncomingPasses(
  passes: IncomingGatePassByFarmerStorageLinkItem[],
  opts: {
    statusFilter: IncomingStatusFilter;
    searchQuery: string;
    sortOrder: 'asc' | 'desc';
  }
) {
  const byStatus = passes.filter((p) => {
    if (opts.statusFilter === 'graded') return p.status === 'CLOSED';
    if (opts.statusFilter === 'ungraded') return p.status !== 'CLOSED';
    return true;
  });
  const bySearch = byStatus.filter((p) =>
    matchesGatePassOrDate(
      p.gatePassNo,
      p.manualGatePassNumber,
      p.date,
      opts.searchQuery
    )
  );
  return sortByDate(bySearch, opts.sortOrder);
}

export function filterSortablePasses<
  T extends {
    gatePassNo?: number;
    manualGatePassNumber?: number | string;
    date?: string;
  },
>(passes: T[], searchQuery: string, sortOrder: 'asc' | 'desc') {
  const bySearch = passes.filter((p) =>
    matchesGatePassOrDate(
      p.gatePassNo,
      p.manualGatePassNumber,
      p.date,
      searchQuery
    )
  );
  return sortByDate(bySearch, sortOrder);
}

export function buildFarmerAggregates(
  totals: {
    incoming?: number;
    totalUngraded?: number;
    grading?: number;
    storage?: number;
    dispatch?: number;
    outgoing?: number;
  } | null
) {
  return {
    totalBagsIncoming: totals?.incoming ?? 0,
    totalBagsUngraded: totals?.totalUngraded ?? 0,
    totalBagsGraded: totals?.grading ?? 0,
    totalBagsStored: totals?.storage ?? 0,
    totalBagsNikasi: totals?.dispatch ?? 0,
    totalBagsOutgoing: totals?.outgoing ?? 0,
  };
}

export function toIncomingVoucherProps(
  pass: IncomingGatePassByFarmerStorageLinkItem & {
    farmerStorageLinkId?:
      | string
      | {
          farmerId?: { name?: string; address?: string; mobileNumber?: string };
          accountNumber?: number;
        };
    createdBy?: string | { name?: string };
  },
  fallbackLink?: FarmerStorageLink | null
) {
  const link =
    pass.farmerStorageLinkId != null &&
    typeof pass.farmerStorageLinkId === 'object'
      ? pass.farmerStorageLinkId
      : (fallbackLink ?? null);
  const voucher: IncomingVoucherData = {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    location: pass.location,
    truckNumber: pass.truckNumber,
    bagsReceived: pass.bagsReceived,
    status: pass.status,
    weightSlip: pass.weightSlip,
    remarks: pass.remarks,
    createdBy:
      pass.createdBy != null && typeof pass.createdBy === 'object'
        ? { name: (pass.createdBy as { name?: string }).name }
        : undefined,
  };
  return {
    voucher,
    farmerName: link?.farmerId?.name,
    farmerAccount: link?.accountNumber,
    farmerAddress: link?.farmerId?.address,
    farmerMobile: link?.farmerId?.mobileNumber,
  };
}

export function toGradingVoucherProps(
  pass: GradingGatePass & {
    incomingGatePassIds?: Array<{
      farmerStorageLinkId?: unknown;
      bagsReceived?: number;
      weightSlip?: { grossWeightKg?: number; tareWeightKg?: number };
    }>;
  },
  fallbackLink?: FarmerStorageLink | null
) {
  const firstIncoming = pass.incomingGatePassIds?.[0];
  const link =
    firstIncoming &&
    typeof firstIncoming.farmerStorageLinkId === 'object' &&
    firstIncoming.farmerStorageLinkId != null
      ? (firstIncoming.farmerStorageLinkId as {
          farmerId?: { name?: string };
          accountNumber?: number;
        })
      : (fallbackLink ?? null);
  const incomingBagsCount =
    pass.incomingGatePassIds?.reduce(
      (sum, inc) =>
        sum +
        (typeof inc === 'object' && inc && 'bagsReceived' in inc
          ? (inc.bagsReceived ?? 0)
          : 0),
      0
    ) ?? 0;
  let incomingNetKg: number | undefined;
  const firstWithSlip = pass.incomingGatePassIds?.find(
    (inc) =>
      typeof inc === 'object' &&
      inc != null &&
      'weightSlip' in inc &&
      (inc as { weightSlip?: unknown }).weightSlip != null
  ) as
    | { weightSlip?: { grossWeightKg?: number; tareWeightKg?: number } }
    | undefined;
  if (firstWithSlip?.weightSlip) {
    const { grossWeightKg = 0, tareWeightKg = 0 } = firstWithSlip.weightSlip;
    incomingNetKg = grossWeightKg - tareWeightKg;
  }
  const voucher: PassVoucherData = {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    orderDetails: pass.orderDetails,
    allocationStatus: pass.allocationStatus,
    grader: pass.grader,
    remarks: pass.remarks,
    createdBy:
      pass.createdBy != null && typeof pass.createdBy === 'object'
        ? { name: (pass.createdBy as { name?: string }).name }
        : undefined,
  };
  return {
    voucher,
    farmerName: link?.farmerId?.name,
    farmerAccount: link?.accountNumber,
    farmerStorageLinkId: pass.farmerStorageLinkId,
    incomingNetKg,
    incomingBagsCount,
    incomingGatePassIds: pass.incomingGatePassIds ?? [],
  };
}

export function nikasiToPassVoucherData(pass: NikasiGatePass): PassVoucherData {
  return {
    _id: pass._id,
    gatePassNo: pass.gatePassNo,
    manualGatePassNumber: pass.manualGatePassNumber,
    date: pass.date,
    variety: pass.variety,
    from: pass.from,
    toField: pass.toField,
    orderDetails: pass.orderDetails,
    bagSize: pass.bagSize,
    remarks: pass.remarks,
    gradingGatePassIds:
      pass.gradingGatePassIds as PassVoucherData['gradingGatePassIds'],
    gradingGatePassSnapshots:
      pass.gradingGatePassSnapshots as PassVoucherData['gradingGatePassSnapshots'],
  };
}
