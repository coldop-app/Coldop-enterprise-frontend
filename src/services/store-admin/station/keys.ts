/** Query key prefix for station master data. */
export const stationKeys = {
  all: ['store-admin', 'station'] as const,
  lists: () => [...stationKeys.all, 'list'] as const,
};
