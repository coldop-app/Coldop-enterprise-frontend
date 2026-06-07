import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from '@tanstack/react-query';
import storeAdminAxiosClient from '@/lib/axios';
import type { Locality } from '@/types/locality';
import type { GetStationsParams, StationWithLocalities } from '@/types/station';
import { stationKeys } from './keys';
import { fetchStations } from './useGetStations';

async function fetchStationsWithLocalities(
  params: GetStationsParams
): Promise<{ data: StationWithLocalities[] }> {
  const { data: stations } = await fetchStations(params);

  const withLocalities = await Promise.all(
    stations.map(async (station) => {
      const { data } = await storeAdminAxiosClient.get<{
        success: boolean;
        data?: Locality[] | null;
      }>('/locality/', {
        params: { stationId: station._id },
      });

      return {
        ...station,
        localities: Array.isArray(data.data) ? data.data : [],
      } satisfies StationWithLocalities;
    })
  );

  return { data: withLocalities };
}

export const stationsWithLocalitiesQueryOptions = (params: GetStationsParams) =>
  queryOptions({
    queryKey: stationKeys.withLocalities(params.coldStorageId),
    queryFn: () => fetchStationsWithLocalities(params),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

/** Fetches stations and nested localities for list UI. */
export function useGetStationsWithLocalities(
  params: GetStationsParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    ...stationsWithLocalitiesQueryOptions(params),
    placeholderData: keepPreviousData,
    enabled:
      (options?.enabled ?? true) && Boolean(params.coldStorageId?.trim()),
  });
}
