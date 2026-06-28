import { useCallback } from 'react';
import { useLocation, useRouter, useSearch } from '@tanstack/react-router';

export type ContractFarmingReportSearch = {
  groupFamilies?: boolean;
};

/** Parses `?groupFamilies=true` (or `1`) into a strict boolean flag. */
export function parseContractFarmingGroupFamiliesSearch(
  value: unknown
): boolean | undefined {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true;
  }
  return undefined;
}

export function validateContractFarmingReportSearch(
  search: Record<string, unknown>
): ContractFarmingReportSearch {
  return {
    groupFamilies: parseContractFarmingGroupFamiliesSearch(
      search.groupFamilies
    ),
  };
}

export function useContractFarmingGroupFamiliesSearch() {
  const router = useRouter();
  const pathname = useLocation({ select: (location) => location.pathname });
  const search = useSearch({ strict: false }) as ContractFarmingReportSearch;
  const groupFamiliesEnabled = search.groupFamilies === true;

  const setGroupFamiliesEnabled = useCallback(
    (enabled: boolean) => {
      void router.navigate({
        to: pathname,
        search: (prev) => ({
          ...prev,
          groupFamilies: enabled ? true : undefined,
        }),
      });
    },
    [router, pathname]
  );

  return { groupFamiliesEnabled, setGroupFamiliesEnabled };
}
