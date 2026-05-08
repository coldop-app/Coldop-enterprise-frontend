import { queryOptions, useQuery } from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import { queryClient } from '@/lib/queryClient';

export interface PreferenceOption {
  label: string;
  value: string;
}

export interface BagConfig {
  juteBagWeight: number;
  lenoBagWeight: number;
  bagTypes: string[];
}

export interface BuyBackCost {
  variety: string;
  sizeRates: Record<string, number>;
}

export interface PreferencesCustomData {
  potatoVarieties: PreferenceOption[];
  farmerSeedGenerations: PreferenceOption[];
  graderOptions: string[];
  incomingLocations: string[];
  bagConfig: BagConfig;
  standardBagsPerAcre: Record<string, number>;
  buyBackCost: BuyBackCost[];
}

export interface PreferencesData {
  _id: string;
  coldStorageId: string;
  bagSizes: string[];
  reportFormat: string;
  custom: PreferencesCustomData;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetPreferencesApiResponse {
  success: boolean;
  data: PreferencesData | null;
  message?: string;
}

export function normalizePreferences(
  preferences: PreferencesData,
  fallback?: PreferencesData
): PreferencesData {
  const custom = preferences.custom ?? ({} as PreferencesData['custom']);
  const fallbackCustom = fallback?.custom;
  const bagConfig =
    custom.bagConfig ?? ({} as PreferencesData['custom']['bagConfig']);
  const fallbackBagConfig = fallbackCustom?.bagConfig;

  return {
    ...preferences,
    bagSizes: preferences.bagSizes ?? fallback?.bagSizes ?? [],
    reportFormat: preferences.reportFormat ?? fallback?.reportFormat ?? '',
    custom: {
      ...custom,
      potatoVarieties:
        custom.potatoVarieties ?? fallbackCustom?.potatoVarieties ?? [],
      farmerSeedGenerations:
        custom.farmerSeedGenerations ??
        fallbackCustom?.farmerSeedGenerations ??
        [],
      graderOptions:
        custom.graderOptions ?? fallbackCustom?.graderOptions ?? [],
      incomingLocations:
        custom.incomingLocations ?? fallbackCustom?.incomingLocations ?? [],
      bagConfig: {
        ...bagConfig,
        juteBagWeight:
          bagConfig.juteBagWeight ?? fallbackBagConfig?.juteBagWeight ?? 0,
        lenoBagWeight:
          bagConfig.lenoBagWeight ?? fallbackBagConfig?.lenoBagWeight ?? 0,
        bagTypes: bagConfig.bagTypes ?? fallbackBagConfig?.bagTypes ?? [],
      },
      standardBagsPerAcre:
        custom.standardBagsPerAcre ?? fallbackCustom?.standardBagsPerAcre ?? {},
      buyBackCost: custom.buyBackCost ?? fallbackCustom?.buyBackCost ?? [],
    },
  };
}

/** Query key factory - use for invalidation and consistent cache keys */
export const preferencesKeys = {
  all: ['store-admin', 'preferences'] as const,
  detail: () => [...preferencesKeys.all, 'detail'] as const,
};

/** Fetcher used by queryOptions and prefetch */
async function fetchPreferences(): Promise<PreferencesData> {
  const { data } =
    await storeAdminAxiosClient.get<GetPreferencesApiResponse>('/preferences');

  if (!data.success || data.data == null) {
    throw new Error(data.message ?? 'Failed to fetch preferences');
  }

  return normalizePreferences(data.data);
}

/** Query options - use with useQuery, prefetchQuery, or in loaders */
export const preferencesQueryOptions = () =>
  queryOptions({
    queryKey: preferencesKeys.detail(),
    queryFn: fetchPreferences,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

/** GET /preferences */
export function useGetPreferences() {
  return useQuery(preferencesQueryOptions());
}

/** Prefetch preferences - e.g. on route hover or before navigation */
export function prefetchPreferences() {
  return queryClient.prefetchQuery(preferencesQueryOptions());
}
