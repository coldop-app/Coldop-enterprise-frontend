import type { FarmerProfileAggregates } from '@/components/people/FarmerProfileOverview';
import type { GetAllGatePassesOfFarmerData } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';

export const PROFILE_SORT_ORDER_OPTIONS = [
  'Latest first',
  'Oldest first',
] as const;
export type ProfileSortOrder = (typeof PROFILE_SORT_ORDER_OPTIONS)[number];

export const PROFILE_INCOMING_STATUS_OPTIONS = [
  'All',
  'Graded',
  'Ungraded',
] as const;
export type ProfileIncomingStatusFilter =
  (typeof PROFILE_INCOMING_STATUS_OPTIONS)[number];

export function parseIsoDateMs(value: string | undefined): number {
  if (value == null || value === '') return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortByIsoDate<T>(
  items: T[],
  getDate: (item: T) => string | undefined,
  order: ProfileSortOrder
): T[] {
  const factor = order === 'Latest first' ? -1 : 1;
  return [...items].sort((a, b) => {
    const da = parseIsoDateMs(getDate(a));
    const db = parseIsoDateMs(getDate(b));
    return factor * (da - db);
  });
}

export function matchesIncomingStatusFilter(
  gatePass: IncomingGatePassByFarmerStorageLinkItem,
  filter: ProfileIncomingStatusFilter
): boolean {
  if (filter === 'All') return true;
  if (filter === 'Graded') return gatePass.status === 'GRADED';
  if (filter === 'Ungraded') return gatePass.status === 'NOT_GRADED';
  return true;
}

export function toComparableString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toComparableString(item)).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => toComparableString(item))
      .join(' ');
  }
  return '';
}

export function normalizeClientSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

export function matchesSearchQuery(
  haystack: unknown,
  normalizedQuery: string
): boolean {
  if (normalizedQuery.length === 0) return true;
  return toComparableString(haystack).includes(normalizedQuery);
}

function sumSeedBagsFromEntries(
  farmerSeeds: GetAllGatePassesOfFarmerData['farmerSeeds']
): number {
  return farmerSeeds.reduce((sum, s) => {
    const sizes = s.bagSizes ?? [];
    return sum + sizes.reduce((a, b) => a + (Number(b.quantity) || 0), 0);
  }, 0);
}

export function buildFarmerProfileAggregates(
  data: GetAllGatePassesOfFarmerData | undefined
): FarmerProfileAggregates {
  const incoming = data?.incoming ?? [];
  const grading = data?.grading ?? [];
  const storage = data?.storage ?? [];
  const dispatch = data?.dispatch ?? [];
  const outgoing = data?.outgoing ?? [];
  const farmerSeeds = data?.farmerSeeds ?? [];
  const totals = data?.totals;

  const clientIncoming = incoming.reduce(
    (sum, p) => sum + (Number(p.bagsReceived) || 0),
    0
  );

  const clientUngraded = incoming
    .filter((p) => p.status === 'NOT_GRADED')
    .reduce((sum, p) => sum + (Number(p.bagsReceived) || 0), 0);

  const clientGraded = grading.reduce((sum, g) => {
    const rows = g.orderDetails ?? [];
    return (
      sum +
      rows.reduce(
        (rowSum, row) => rowSum + (Number(row.initialQuantity) || 0),
        0
      )
    );
  }, 0);

  const clientSeed = sumSeedBagsFromEntries(farmerSeeds);

  const totalBagsStored = storage.reduce((sum, s) => {
    const sizes = s.bagSizes ?? [];
    return (
      sum + sizes.reduce((a, b) => a + (Number(b.initialQuantity) || 0), 0)
    );
  }, 0);

  const totalBagsNikasi = dispatch.reduce((sum, n) => {
    const sizes = n.bagSize ?? [];
    return sum + sizes.reduce((a, b) => a + (Number(b.quantityIssued) || 0), 0);
  }, 0);

  const totalBagsOutgoing = outgoing.reduce((sum, o) => {
    const details = o.orderDetails ?? [];
    return (
      sum + details.reduce((a, d) => a + (Number(d.quantityIssued) || 0), 0)
    );
  }, 0);

  return {
    totalBagsSeed: totals?.totalSeedBags ?? clientSeed,
    totalBagsIncoming: totals?.incoming ?? clientIncoming,
    totalBagsUngraded: totals?.totalUngraded ?? clientUngraded,
    totalBagsGraded: totals?.grading ?? clientGraded,
    totalBagsStored: totals?.storage ?? totalBagsStored,
    totalBagsNikasi: totals?.dispatch ?? totalBagsNikasi,
    totalBagsOutgoing: totals?.outgoing ?? totalBagsOutgoing,
  };
}
