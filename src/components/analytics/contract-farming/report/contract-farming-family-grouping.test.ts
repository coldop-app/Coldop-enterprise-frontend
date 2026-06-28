import { describe, expect, it } from 'vitest';

import { prepareFamilyGroupedRows } from './contract-farming-family-grouping';
import type { FlattenedRow } from './types';

const VARIETY = 'Test Variety';
const GRADE_HEADERS = ['40–45'] as const;

function makeRow(
  overrides: Partial<FlattenedRow> & {
    rowId: string;
    varietyRowKey: string;
    farmerId: string;
    accountNumber: number;
    familyKey: number;
    sizeRowIndex: number;
  }
): FlattenedRow {
  return {
    mergedRowSpan: 1,
    isFirstOfMergedBlock: overrides.sizeRowIndex === 0,
    farmerName: overrides.farmerName ?? 'Farmer',
    mobileNumber: overrides.mobileNumber ?? '9999999999',
    farmerMobile: overrides.mobileNumber ?? '9999999999',
    farmerAccount: overrides.accountNumber,
    address: overrides.address ?? 'Address',
    farmerAddress: overrides.address ?? 'Address',
    varietyName: overrides.varietyName ?? VARIETY,
    generation: overrides.generation ?? 'G1',
    sizeName: overrides.sizeName ?? '40–45',
    sizeQuantity: overrides.sizeQuantity ?? 10,
    sizeAcres: overrides.sizeAcres ?? 1,
    sizeAmountPayable: overrides.sizeAmountPayable ?? 1000,
    sizeAmount: overrides.sizeAmountPayable ?? 1000,
    buyBackBags: overrides.buyBackBags ?? null,
    buyBackNetWeightKg: overrides.buyBackNetWeightKg ?? null,
    incomingNetWeightKg: overrides.incomingNetWeightKg ?? null,
    gradeData: overrides.gradeData ?? {},
    varietyTotalAcres: overrides.varietyTotalAcres ?? 1,
    varietyTotalSeedAmountPayable:
      overrides.varietyTotalSeedAmountPayable ?? 1000,
    netProfitToCompany: overrides.netProfitToCompany ?? null,
    netProfitToCompanyPerAcre: overrides.netProfitToCompanyPerAcre ?? null,
    ...overrides,
  };
}

describe('prepareFamilyGroupedRows net profit', () => {
  it('sums net profit once per account when members have multiple size rows', () => {
    const sukhdevProfit = 81_135.36;
    const sohanProfit = 386_041.5;
    const sukhdevAcres = 2.5;
    const sohanAcres = 4.0;

    const rows: FlattenedRow[] = [
      makeRow({
        rowId: 'sukhdev-size-0',
        varietyRowKey: 'sukhdev|Test Variety',
        farmerId: 'sukhdev',
        farmerName: 'Sukhdev Singh',
        accountNumber: 20,
        familyKey: 1,
        sizeRowIndex: 0,
        sizeName: '40–45',
        varietyTotalAcres: sukhdevAcres,
        netProfitToCompany: sukhdevProfit,
      }),
      makeRow({
        rowId: 'sukhdev-size-1',
        varietyRowKey: 'sukhdev|Test Variety',
        farmerId: 'sukhdev',
        farmerName: 'Sukhdev Singh',
        accountNumber: 20,
        familyKey: 1,
        sizeRowIndex: 1,
        sizeName: '45–50',
        varietyTotalAcres: sukhdevAcres,
        netProfitToCompany: sukhdevProfit,
      }),
      makeRow({
        rowId: 'sukhdev-size-2',
        varietyRowKey: 'sukhdev|Test Variety',
        farmerId: 'sukhdev',
        farmerName: 'Sukhdev Singh',
        accountNumber: 20,
        familyKey: 1,
        sizeRowIndex: 2,
        sizeName: '50–55',
        varietyTotalAcres: sukhdevAcres,
        netProfitToCompany: sukhdevProfit,
      }),
      makeRow({
        rowId: 'sohan-size-0',
        varietyRowKey: 'sohan|Test Variety',
        farmerId: 'sohan',
        farmerName: 'SOHAN SINGH S/O SUKHDEV SINGH',
        accountNumber: 20.1,
        familyKey: 1,
        sizeRowIndex: 0,
        varietyTotalAcres: sohanAcres,
        netProfitToCompany: sohanProfit,
      }),
    ];

    const grouped = prepareFamilyGroupedRows(rows, GRADE_HEADERS);
    const familyRow = grouped.find((row) =>
      row.varietyRowKey.startsWith('family-')
    );

    expect(familyRow).toBeDefined();
    expect(familyRow?.netProfitToCompany).toBeCloseTo(
      sukhdevProfit + sohanProfit,
      2
    );
    expect(familyRow?.netProfitToCompany).toBeCloseTo(467_176.86, 2);
    expect(familyRow?.netProfitToCompanyPerAcre).toBeCloseTo(
      (sukhdevProfit + sohanProfit) / (sukhdevAcres + sohanAcres),
      6
    );
  });

  it('sums net profit across accounts with one size row each', () => {
    const rows: FlattenedRow[] = [
      makeRow({
        rowId: 'a-size-0',
        varietyRowKey: 'a|Test Variety',
        farmerId: 'a',
        accountNumber: 68,
        familyKey: 1,
        sizeRowIndex: 0,
        varietyTotalAcres: 3,
        netProfitToCompany: 500,
      }),
      makeRow({
        rowId: 'b-size-0',
        varietyRowKey: 'b|Test Variety',
        farmerId: 'b',
        accountNumber: 68.1,
        familyKey: 1,
        sizeRowIndex: 0,
        varietyTotalAcres: 2,
        netProfitToCompany: 300,
      }),
    ];

    const grouped = prepareFamilyGroupedRows(rows, GRADE_HEADERS);
    const familyRow = grouped.find((row) =>
      row.varietyRowKey.startsWith('family-')
    );

    expect(familyRow?.netProfitToCompany).toBe(800);
    expect(familyRow?.netProfitToCompanyPerAcre).toBe(160);
  });

  it('leaves non-family rows unchanged', () => {
    const row = makeRow({
      rowId: 'solo-size-0',
      varietyRowKey: 'solo|Test Variety',
      farmerId: 'solo',
      accountNumber: 99,
      familyKey: 0,
      sizeRowIndex: 0,
      netProfitToCompany: 1000,
      netProfitToCompanyPerAcre: 500,
    });

    const grouped = prepareFamilyGroupedRows([row], GRADE_HEADERS);

    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.netProfitToCompany).toBe(1000);
    expect(grouped[0]?.netProfitToCompanyPerAcre).toBe(500);
  });
});
