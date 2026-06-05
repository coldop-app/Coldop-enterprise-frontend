/** Query key prefix for station master data. */
export const stationKeys = {
  all: ['store-admin', 'station'] as const,
  lists: (coldStorageId: string) =>
    [...stationKeys.all, 'list', coldStorageId] as const,
};
