import { useCallback, useMemo, useState } from 'react';

import { usePreferencesStore } from '@/stores/usePreferencesStore';
import type { StorageGatePassWithLink } from '@/types/storage-gate-pass';
import {
  allocateFullPass,
  clearPassAllocations,
  groupPassesByDate,
  isPassFullyAllocated,
  passMatchesLocationFilters,
  passMatchesSearch,
  uniqueLocationsFromPasses,
  uniqueSizesFromPasses,
  uniqueVarietiesFromPasses,
} from './-storage-gate-pass-matrix-utils';

export type SizeVisibility = 'all' | Set<string>;
export type VoucherSort = 'asc' | 'desc';

type LocationFilters = {
  chamber: string;
  floor: string;
  row: string;
};

const EMPTY_LOCATION_FILTERS: LocationFilters = {
  chamber: '',
  floor: '',
  row: '',
};

type UseStorageGatePassMatrixArgs = {
  allPasses: StorageGatePassWithLink[];
  allocations: Record<string, number>;
  onAllocationsChange: (next: Record<string, number>) => void;
};

export function isSizeVisible(
  sizeVisibility: SizeVisibility,
  size: string
): boolean {
  if (sizeVisibility === 'all') return true;
  return sizeVisibility.has(size);
}

export function useStorageGatePassMatrix({
  allPasses,
  allocations,
  onAllocationsChange,
}: UseStorageGatePassMatrixArgs) {
  const [gatePassSearch, setGatePassSearch] = useState('');
  const [voucherSort, setVoucherSort] = useState<VoucherSort>('desc');
  const [sizeVisibility, setSizeVisibility] = useState<SizeVisibility>('all');
  const [varietyFilter, setVarietyFilter] = useState('');
  const [locationFilters, setLocationFilters] = useState<LocationFilters>(
    EMPTY_LOCATION_FILTERS
  );
  const preferenceBagSizes = usePreferencesStore(
    (state) => state.preferences?.bagSizes
  );

  const uniqueVarieties = useMemo(
    () => uniqueVarietiesFromPasses(allPasses),
    [allPasses]
  );
  const uniqueLocations = useMemo(
    () => uniqueLocationsFromPasses(allPasses),
    [allPasses]
  );
  const sizesForColumnPicker = useMemo(
    () => uniqueSizesFromPasses(allPasses, preferenceBagSizes),
    [allPasses, preferenceBagSizes]
  );

  const needsVarietySelection =
    uniqueVarieties.length > 1 && varietyFilter.trim() === '';

  const hasActiveFilters = Boolean(
    gatePassSearch.trim() ||
    varietyFilter ||
    locationFilters.chamber ||
    locationFilters.floor ||
    locationFilters.row ||
    sizeVisibility !== 'all'
  );

  const filteredPasses = useMemo(() => {
    if (needsVarietySelection) return [];

    let next = allPasses;
    if (varietyFilter) {
      next = next.filter((pass) => pass.variety?.trim() === varietyFilter);
    }
    next = next.filter((pass) => passMatchesSearch(pass, gatePassSearch));
    next = next.filter((pass) =>
      passMatchesLocationFilters(pass, locationFilters)
    );

    const sorted = [...next].sort((a, b) => {
      const diff = (a.gatePassNo ?? 0) - (b.gatePassNo ?? 0);
      return voucherSort === 'asc' ? diff : -diff;
    });
    return sorted;
  }, [
    allPasses,
    gatePassSearch,
    locationFilters,
    needsVarietySelection,
    varietyFilter,
    voucherSort,
  ]);

  const displayGroups = useMemo(
    () => groupPassesByDate(filteredPasses),
    [filteredPasses]
  );

  const visibleSizes = useMemo(() => {
    const sizes = uniqueSizesFromPasses(filteredPasses, preferenceBagSizes);
    return sizes.filter((size) => isSizeVisible(sizeVisibility, size));
  }, [filteredPasses, preferenceBagSizes, sizeVisibility]);

  const hasFilteredData = displayGroups.some(
    (group) => group.passes.length > 0
  );

  const selectedPassIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pass of filteredPasses) {
      if (isPassFullyAllocated(pass, allocations)) ids.add(pass._id);
    }
    return ids;
  }, [allocations, filteredPasses]);

  const handleSelectAllSizes = useCallback(() => {
    setSizeVisibility('all');
  }, []);

  const handleSizeToggle = useCallback(
    (size: string) => {
      setSizeVisibility((prev) => {
        const allSizes = sizesForColumnPicker;
        if (prev === 'all') {
          const next = new Set(allSizes.filter((item) => item !== size));
          return next.size === allSizes.length ? 'all' : next;
        }
        const next = new Set(prev);
        if (next.has(size)) next.delete(size);
        else next.add(size);
        if (next.size === allSizes.length) return 'all';
        return next;
      });
    },
    [sizesForColumnPicker]
  );

  const handlePassToggle = useCallback(
    (passId: string) => {
      const pass = allPasses.find((item) => item._id === passId);
      if (!pass) return;
      if (isPassFullyAllocated(pass, allocations)) {
        onAllocationsChange(clearPassAllocations(passId, allocations));
        return;
      }
      onAllocationsChange(allocateFullPass(pass, allocations));
    },
    [allPasses, allocations, onAllocationsChange]
  );

  const handleAllocationChange = useCallback(
    (key: string, quantity: number) => {
      const next = { ...allocations };
      if (quantity > 0) next[key] = quantity;
      else delete next[key];
      onAllocationsChange(next);
    },
    [allocations, onAllocationsChange]
  );

  const handleAllocationClear = useCallback(
    (key: string) => {
      if (!(key in allocations)) return;
      const next = { ...allocations };
      delete next[key];
      onAllocationsChange(next);
    },
    [allocations, onAllocationsChange]
  );

  const handleResetFilters = useCallback(() => {
    setGatePassSearch('');
    setVoucherSort('desc');
    setSizeVisibility('all');
    setVarietyFilter('');
    setLocationFilters(EMPTY_LOCATION_FILTERS);
  }, []);

  return {
    gatePassSearch,
    setGatePassSearch,
    voucherSort,
    setVoucherSort,
    sizeVisibility,
    setSizeVisibility,
    varietyFilter,
    setVarietyFilter,
    locationFilters,
    setLocationFilters,
    uniqueVarieties,
    uniqueLocations,
    sizesForColumnPicker,
    needsVarietySelection,
    hasActiveFilters,
    displayGroups,
    visibleSizes,
    selectedPassIds,
    hasFilteredData,
    isSizeVisible,
    handleSelectAllSizes,
    handleSizeToggle,
    handlePassToggle,
    handleAllocationChange,
    handleAllocationClear,
    handleResetFilters,
  };
}
