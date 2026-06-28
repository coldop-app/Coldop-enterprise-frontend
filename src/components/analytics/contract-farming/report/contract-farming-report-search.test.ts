import { describe, expect, it } from 'vitest';

import {
  parseContractFarmingGroupFamiliesSearch,
  validateContractFarmingReportSearch,
} from './contract-farming-report-search';

describe('contract-farming-report-search', () => {
  it('parses truthy groupFamilies values', () => {
    expect(parseContractFarmingGroupFamiliesSearch(true)).toBe(true);
    expect(parseContractFarmingGroupFamiliesSearch('true')).toBe(true);
    expect(parseContractFarmingGroupFamiliesSearch(1)).toBe(true);
    expect(parseContractFarmingGroupFamiliesSearch('1')).toBe(true);
  });

  it('returns undefined for missing or falsey groupFamilies values', () => {
    expect(parseContractFarmingGroupFamiliesSearch(undefined)).toBeUndefined();
    expect(parseContractFarmingGroupFamiliesSearch(false)).toBeUndefined();
    expect(parseContractFarmingGroupFamiliesSearch('false')).toBeUndefined();
    expect(parseContractFarmingGroupFamiliesSearch(0)).toBeUndefined();
  });

  it('validates contract farming report search', () => {
    expect(validateContractFarmingReportSearch({})).toEqual({});
    expect(
      validateContractFarmingReportSearch({ groupFamilies: 'true' })
    ).toEqual({ groupFamilies: true });
  });
});
