/** Query key prefix for locality master data. */
export const localityKeys = {
  all: ['store-admin', 'locality'] as const,
  lists: (stationId: string) =>
    [...localityKeys.all, 'list', stationId] as const,
};
