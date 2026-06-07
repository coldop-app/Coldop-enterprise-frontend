import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';
import type {
  FarmerStorageLink,
  IncomingGatePassByFarmerStorageLinkItem,
} from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';

export type { GradingGatePass };

/** Populated station on GET .../passes `farmerStorageLink.stationId` */
export interface StationInPassesPayload {
  _id: string;
  name?: string;
  locality?: string;
  seedDispatchRatePerBag?: number;
  seedBuyBackRatePerQuintal?: number;
}

/** Populated locality on GET .../passes `farmerStorageLink.localityId` */
export interface LocalityInPassesPayload {
  _id: string;
  name?: string;
  stationId?: string;
  seedDispatchRatePerBag?: number;
  seedBuyBackRatePerQuintal?: number;
}

export type StationRates = {
  seedDispatchRatePerBag: number;
  seedBuyBackRatePerQuintal: number;
};

export function resolveEntityId(
  value: string | { _id?: string } | null | undefined
): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value._id ?? '';
}

/** Farmer storage link summary included in GET .../passes `data` */
export interface FarmerStorageLinkInPassesPayload {
  _id: string;
  accountNumber: number;
  name: string;
  mobileNumber: string;
  address: string;
  stationId?: string | StationInPassesPayload | null;
  localityId?: string | LocalityInPassesPayload | null;
  /** @deprecated Legacy populated station blob; prefer localityId for rates */
  station?: string | StationInPassesPayload | null;
}

/** Resolves station freight rates when the passes API returns a populated station or locality object. */
export function resolveStationRates(
  station: FarmerStorageLinkInPassesPayload['station'],
  locality?: FarmerStorageLinkInPassesPayload['localityId']
): StationRates | null {
  if (locality != null && typeof locality === 'object') {
    const dispatch = Number(locality.seedDispatchRatePerBag);
    const buyBack = Number(locality.seedBuyBackRatePerQuintal);
    if (Number.isFinite(dispatch) && Number.isFinite(buyBack)) {
      return {
        seedDispatchRatePerBag: dispatch,
        seedBuyBackRatePerQuintal: buyBack,
      };
    }
  }

  if (station == null || typeof station === 'string') return null;

  const dispatch = Number(station.seedDispatchRatePerBag);
  const buyBack = Number(station.seedBuyBackRatePerQuintal);
  if (!Number.isFinite(dispatch) || !Number.isFinite(buyBack)) return null;

  return {
    seedDispatchRatePerBag: dispatch,
    seedBuyBackRatePerQuintal: buyBack,
  };
}

export interface StorageGatePassWithLink {
  _id: string;
  farmerStorageLinkId: string;
  gatePassNo: number;
  date: string;
  bagSizes?: Array<{ name: string; initialQuantity: number }>;
}

export interface NikasiGatePass {
  _id: string;
  farmerStorageLinkId: string;
  gatePassNo: number;
  date: string;
  bagSize?: Array<{ name: string; quantityIssued: number }>;
}

export interface OutgoingGatePass {
  _id: string;
  farmerStorageLinkId: string;
  gatePassNo: number;
  date: string;
  orderDetails?: Array<{ variety?: string; quantityIssued?: number }>;
}

export interface FarmerSeedGatePass {
  _id: string;
  /** List APIs often send an id string; farmer profile `/passes` is enriched to a populated link for daybook cards */
  farmerStorageLinkId: string | FarmerStorageLink;
  gatePassNo: number;
  invoiceNumber: string;
  date: string;
  variety: string;
  generation: string;
  bagSizes: Array<{
    name: string;
    quantity: number;
    rate: number;
    acres: number;
  }>;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Totals returned by the get-all-gate-passes-of-farmer API */
export interface GatePassesTotals {
  incoming: number;
  grading: number;
  dispatch: number;
  storage: number;
  outgoing: number;
  totalUngraded: number;
  /** Total seed bags (from API aggregate) */
  totalSeedBags: number;
}

/** Payload of the get-all-gate-passes-of-farmer API (data key) */
export interface GetAllGatePassesOfFarmerData {
  farmerStorageLink: FarmerStorageLinkInPassesPayload | null;
  incoming: IncomingGatePassByFarmerStorageLinkItem[];
  grading: GradingGatePass[];
  dispatch: NikasiGatePass[];
  storage: StorageGatePassWithLink[];
  outgoing: OutgoingGatePass[];
  farmerSeeds: FarmerSeedGatePass[];
  totals: GatePassesTotals;
}

/** API response for GET .../passes */
export interface GetAllGatePassesOfFarmerApiResponse {
  success: boolean;
  message?: string;
  data?: GetAllGatePassesOfFarmerData | null;
}

export interface AllGatePassesOfFarmer {
  incoming: {
    data: IncomingGatePassByFarmerStorageLinkItem[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  grading: {
    data: GradingGatePass[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  storage: {
    data: StorageGatePassWithLink[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  nikasi: {
    data: NikasiGatePass[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  outgoing: {
    data: OutgoingGatePass[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  farmerSeeds: {
    data: FarmerSeedGatePass[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };
  farmerStorageLink: FarmerStorageLinkInPassesPayload | null;
  totals: GatePassesTotals | null;
  refetch: UseQueryResult<GetAllGatePassesOfFarmerData, Error>['refetch'];
  isFetching: boolean;
}

export const allGatePassesOfFarmerKeys = {
  all: ['store-admin', 'farmer-storage-link-gate-passes'] as const,
  detail: (farmerStorageLinkId: string) =>
    [...allGatePassesOfFarmerKeys.all, farmerStorageLinkId] as const,
};

type GetError = {
  success?: boolean;
  message?: string;
  error?: { code?: string; message?: string };
};

function getFetchErrorMessage(data?: GetError): string {
  return (
    data?.error?.message ??
    data?.message ??
    'Failed to fetch gate passes for farmer'
  );
}

const EMPTY_GATE_PASSES_TOTALS: GatePassesTotals = {
  incoming: 0,
  grading: 0,
  dispatch: 0,
  storage: 0,
  outgoing: 0,
  totalUngraded: 0,
  totalSeedBags: 0,
};

/** Stable fallbacks so list deps in consumers (useMemo etc.) stay referentially stable before data resolves. */
const EMPTY_INCOMING: IncomingGatePassByFarmerStorageLinkItem[] = [];
const EMPTY_GRADING: GradingGatePass[] = [];
const EMPTY_STORAGE: StorageGatePassWithLink[] = [];
const EMPTY_NIKASI: NikasiGatePass[] = [];
const EMPTY_OUTGOING: OutgoingGatePass[] = [];
const EMPTY_FARMER_SEEDS: FarmerSeedGatePass[] = [];

/**
 * GET `/farmer-storage-link/:id/passes` returns a flat `farmerStorageLink` summary while
 * gate pass rows use a string `farmerStorageLinkId`. Daybook cards expect the populated
 * link shape (`farmerId.name`, etc.) used by list/daybook APIs.
 */
function farmerStorageLinkSummaryToNested(
  link: FarmerStorageLinkInPassesPayload
): FarmerStorageLink {
  return {
    _id: link._id,
    coldStorageId: '',
    isActive: true,
    accountNumber: link.accountNumber,
    farmerId: {
      _id: link._id,
      name: link.name,
      address: link.address,
      mobileNumber: link.mobileNumber,
      accountNumber: link.accountNumber,
    },
  };
}

function nestedFarmerNameIsPresent(farmerStorageLinkRef: unknown): boolean {
  if (
    farmerStorageLinkRef == null ||
    typeof farmerStorageLinkRef !== 'object'
  ) {
    return false;
  }
  const farmerId = (farmerStorageLinkRef as { farmerId?: unknown }).farmerId;
  if (farmerId == null || typeof farmerId !== 'object') return false;
  const name = String((farmerId as { name?: unknown }).name ?? '').trim();
  return name.length > 0;
}

function enrichIncomingWithFarmerSummary(
  passes: IncomingGatePassByFarmerStorageLinkItem[],
  summary: FarmerStorageLinkInPassesPayload | null
): IncomingGatePassByFarmerStorageLinkItem[] {
  if (summary == null || summary._id === '') return passes;
  const populated = farmerStorageLinkSummaryToNested(summary);
  return passes.map((pass) => {
    if (nestedFarmerNameIsPresent(pass.farmerStorageLinkId)) return pass;
    return { ...pass, farmerStorageLinkId: populated };
  });
}

function enrichGradingWithFarmerSummary(
  passes: GradingGatePass[],
  summary: FarmerStorageLinkInPassesPayload | null
): GradingGatePass[] {
  if (summary == null || summary._id === '') return passes;
  const populated = farmerStorageLinkSummaryToNested(summary);
  return passes.map((pass) => {
    if (nestedFarmerNameIsPresent(pass.farmerStorageLinkId)) return pass;
    return { ...pass, farmerStorageLinkId: populated };
  });
}

function enrichFarmerSeedsWithFarmerSummary(
  seeds: FarmerSeedGatePass[],
  summary: FarmerStorageLinkInPassesPayload | null
): FarmerSeedGatePass[] {
  if (summary == null || summary._id === '') return seeds;
  const populated = farmerStorageLinkSummaryToNested(summary);
  return seeds.map((seed) => {
    if (nestedFarmerNameIsPresent(seed.farmerStorageLinkId)) return seed;
    return { ...seed, farmerStorageLinkId: populated };
  });
}

function normalizeGatePassesData(
  data: GetAllGatePassesOfFarmerData
): GetAllGatePassesOfFarmerData {
  const totals = data.totals;
  const farmerStorageLink =
    data.farmerStorageLink != null &&
    typeof data.farmerStorageLink === 'object' &&
    '_id' in data.farmerStorageLink
      ? data.farmerStorageLink
      : null;

  const incomingRaw = Array.isArray(data.incoming) ? data.incoming : [];
  const gradingRaw = Array.isArray(data.grading) ? data.grading : [];
  const farmerSeedsRaw = Array.isArray(data.farmerSeeds)
    ? data.farmerSeeds
    : [];

  return {
    farmerStorageLink,
    incoming: enrichIncomingWithFarmerSummary(incomingRaw, farmerStorageLink),
    grading: enrichGradingWithFarmerSummary(gradingRaw, farmerStorageLink),
    dispatch: Array.isArray(data.dispatch) ? data.dispatch : [],
    storage: Array.isArray(data.storage) ? data.storage : [],
    outgoing: Array.isArray(data.outgoing) ? data.outgoing : [],
    farmerSeeds: enrichFarmerSeedsWithFarmerSummary(
      farmerSeedsRaw,
      farmerStorageLink
    ),
    totals: {
      ...EMPTY_GATE_PASSES_TOTALS,
      ...totals,
      totalSeedBags: totals?.totalSeedBags ?? 0,
    },
  };
}

async function fetchAllGatePassesOfFarmer(
  farmerStorageLinkId: string
): Promise<GetAllGatePassesOfFarmerData> {
  try {
    const { data } = await storeAdminAxiosClient.get<
      GetAllGatePassesOfFarmerApiResponse | GetError
    >(`/farmer-storage-link/${encodeURIComponent(farmerStorageLinkId)}/passes`);

    if (!data.success || !('data' in data) || data.data == null) {
      throw new Error(getFetchErrorMessage(data));
    }

    return normalizeGatePassesData(data.data);
  } catch (error) {
    if (isAxiosError<GetError>(error)) {
      throw new Error(
        getFetchErrorMessage(error.response?.data),
        error.cause ? { cause: error.cause } : undefined
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to fetch gate passes for farmer', { cause: error });
  }
}

export function allGatePassesOfFarmerQueryOptions(farmerStorageLinkId: string) {
  return queryOptions({
    queryKey: allGatePassesOfFarmerKeys.detail(farmerStorageLinkId),
    queryFn: () => fetchAllGatePassesOfFarmer(farmerStorageLinkId),
    enabled: Boolean(farmerStorageLinkId),
    staleTime: 1000 * 60 * 2,
  });
}

/** Prefetch helper for TanStack Router loaders and hover preloading */
export function prefetchAllGatePassesOfFarmer(farmerStorageLinkId: string) {
  return queryClient.prefetchQuery(
    allGatePassesOfFarmerQueryOptions(farmerStorageLinkId)
  );
}

/**
 * Fetches all gate pass types and totals for a single farmer (by farmer-storage-link id)
 * from GET /farmer-storage-link/:id/passes
 */
export function useGetAllGatePassesOfFarmer(
  farmerStorageLinkId: string
): AllGatePassesOfFarmer {
  const query = useQuery(
    allGatePassesOfFarmerQueryOptions(farmerStorageLinkId)
  );
  const data = query.data;

  return {
    refetch: query.refetch,
    isFetching: query.isFetching,
    incoming: {
      data: data?.incoming ?? EMPTY_INCOMING,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    grading: {
      data: data?.grading ?? EMPTY_GRADING,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    storage: {
      data: data?.storage ?? EMPTY_STORAGE,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    nikasi: {
      data: data?.dispatch ?? EMPTY_NIKASI,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    outgoing: {
      data: data?.outgoing ?? EMPTY_OUTGOING,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    farmerSeeds: {
      data: data?.farmerSeeds ?? EMPTY_FARMER_SEEDS,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
    },
    farmerStorageLink: data?.farmerStorageLink ?? null,
    totals: data?.totals ?? null,
  };
}
