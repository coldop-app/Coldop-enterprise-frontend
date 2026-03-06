import { parseDateToTimestamp, formatDisplayDate } from '@/lib/helpers';
import type { GradingGatePass } from '@/types/grading-gate-pass';

/** Collect unique sizes from all grading passes, sorted */
export function getUniqueSizes(passes: GradingGatePass[]): string[] {
  const set = new Set<string>();
  for (const pass of passes) {
    for (const detail of pass.orderDetails ?? []) {
      if (detail.size) set.add(detail.size);
    }
  }
  return Array.from(set).sort();
}

/** Collect unique varieties from all grading passes, sorted */
export function getUniqueVarieties(passes: GradingGatePass[]): string[] {
  const set = new Set<string>();
  for (const pass of passes) {
    if (pass.variety?.trim()) set.add(pass.variety.trim());
  }
  return Array.from(set).sort();
}

/** Get order detail for a given size from a grading pass */
export function getOrderDetailForSize(
  pass: GradingGatePass,
  size: string
): { currentQuantity: number; initialQuantity: number } | null {
  const detail = pass.orderDetails?.find((d) => d.size === size);
  if (!detail) return null;
  return {
    currentQuantity: detail.currentQuantity ?? 0,
    initialQuantity: detail.initialQuantity ?? 0,
  };
}

/** Get farmer storage link ID from a pass (string) */
export function getFarmerStorageLinkId(pass: GradingGatePass): string {
  if (typeof pass.farmerStorageLinkId === 'string')
    return pass.farmerStorageLinkId;
  const firstRef = pass.incomingGatePassIds?.[0];
  const nested = firstRef?.farmerStorageLinkId;
  if (nested && typeof nested === 'object' && '_id' in nested)
    return (nested as { _id: string })._id;
  return pass._id;
}

/** Get farmer name from a pass (when incoming ref is populated) */
export function getFarmerName(pass: GradingGatePass): string {
  const firstRef = pass.incomingGatePassIds?.[0];
  const nested = firstRef?.farmerStorageLinkId;
  if (nested && typeof nested === 'object' && 'farmerId' in nested) {
    const farmer = (nested as { farmerId?: { name?: string } }).farmerId;
    if (farmer?.name) return farmer.name;
  }
  return 'Unknown farmer';
}

export interface GroupedByFarmer {
  farmerStorageLinkId: string;
  farmerName: string;
  passes: GradingGatePass[];
}

export interface GroupedByDate {
  date: string;
  passes: GradingGatePass[];
}

/** Sort passes by voucher number (gatePassNo) */
function sortPassesByVoucher(
  passes: GradingGatePass[],
  order: 'asc' | 'desc'
): GradingGatePass[] {
  return [...passes].sort((a, b) => {
    const na = a.gatePassNo ?? 0;
    const nb = b.gatePassNo ?? 0;
    return order === 'asc' ? na - nb : nb - na;
  });
}

/** Group passes by farmer using Object.groupBy; sort within each group by voucher number */
export function groupPassesByFarmer(
  passes: GradingGatePass[],
  voucherSort: 'asc' | 'desc'
): GroupedByFarmer[] {
  const byLink = Object.groupBy(passes, (pass) =>
    getFarmerStorageLinkId(pass)
  ) as Partial<Record<string, GradingGatePass[]>>;
  const groups: GroupedByFarmer[] = Object.entries(byLink).map(
    ([linkId, passList]) => {
      const list = passList ?? [];
      const farmerName = list[0] ? getFarmerName(list[0]) : 'Unknown farmer';
      const sorted = sortPassesByVoucher(list, voucherSort);
      return { farmerStorageLinkId: linkId, farmerName, passes: sorted };
    }
  );
  groups.sort((a, b) => {
    const voucherA = a.passes[0]?.gatePassNo ?? 0;
    const voucherB = b.passes[0]?.gatePassNo ?? 0;
    return voucherSort === 'asc' ? voucherA - voucherB : voucherB - voucherA;
  });
  return groups;
}

/** Group passes by date using Object.groupBy; preserve voucher order within each group */
export function groupPassesByDate(
  passes: GradingGatePass[],
  voucherSort: 'asc' | 'desc'
): GroupedByDate[] {
  const grouped = Object.groupBy(passes, (pass) => pass.date ?? '') as Partial<
    Record<string, GradingGatePass[]>
  >;
  const entries = Object.entries(grouped)
    .map(([date, list]) => ({
      date,
      passes: sortPassesByVoucher(list ?? [], voucherSort),
    }))
    .filter((g) => g.date !== '');
  entries.sort((a, b) => {
    const ta = parseDateToTimestamp(a.date);
    const tb = parseDateToTimestamp(b.date);
    if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
    return ta - tb;
  });
  return entries;
}

/** Unified display group for table (farmer or date) */
export interface StorageDisplayGroup {
  groupKey: string;
  groupLabel: string;
  passes: GradingGatePass[];
}

export function toDisplayGroups(
  farmerGroups: GroupedByFarmer[]
): StorageDisplayGroup[] {
  return farmerGroups.map((g) => ({
    groupKey: g.farmerStorageLinkId,
    groupLabel: g.farmerName,
    passes: g.passes,
  }));
}

export function toDisplayGroupsFromDate(
  dateGroups: GroupedByDate[]
): StorageDisplayGroup[] {
  return dateGroups.map((g) => ({
    groupKey: g.date,
    groupLabel: formatDisplayDate(g.date) || g.date,
    passes: g.passes,
  }));
}
