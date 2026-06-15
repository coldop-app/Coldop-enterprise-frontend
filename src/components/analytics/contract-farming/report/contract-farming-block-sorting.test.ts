import { describe, expect, it } from 'vitest';
import {
  NET_PROFIT_TO_COMPANY_COLUMN_ID,
  VARIETY_LEVEL_COLUMN_PREFIX,
} from './columns';
import {
  buildBlockSortValuesByKey,
  getSplitDisplayBlocks,
  sortFlattenedRowsByColumn,
} from './contract-farming-block-sorting';
import type { FlattenedRow } from './types';

const GRADE_HEADERS = ['40–45'] as const;

function makeRow(
  overrides: Partial<FlattenedRow> & {
    rowId: string;
    varietyRowKey: string;
    farmerId: string;
    varietyName: string;
  }
): FlattenedRow {
  return {
    mergedRowSpan: 1,
    isFirstOfMergedBlock: true,
    sizeRowIndex: overrides.sizeRowIndex ?? 0,
    farmerName: overrides.farmerName ?? 'Farmer',
    mobileNumber: overrides.mobileNumber ?? '9999999999',
    farmerMobile: overrides.mobileNumber ?? '9999999999',
    accountNumber: overrides.accountNumber ?? 100,
    farmerAccount: overrides.accountNumber ?? 100,
    address: overrides.address ?? 'Address',
    farmerAddress: overrides.address ?? 'Address',
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

describe('contract-farming-block-sorting', () => {
  it('keeps grouped family rows contiguous when sorting by net profit', () => {
    const rows: FlattenedRow[] = [
      makeRow({
        rowId: 'family-2-a',
        varietyRowKey: 'family-2|Alpha',
        farmerId: 'farmer-2',
        varietyName: 'Alpha',
        familyKey: 2,
        netProfitToCompany: 500,
      }),
      makeRow({
        rowId: 'family-4',
        varietyRowKey: 'family-4|Beta',
        farmerId: 'farmer-4',
        varietyName: 'Beta',
        familyKey: 4,
        netProfitToCompany: 300,
      }),
      makeRow({
        rowId: 'family-2-b',
        varietyRowKey: 'family-2|Gamma',
        farmerId: 'farmer-2',
        varietyName: 'Gamma',
        familyKey: 2,
        netProfitToCompany: 100,
      }),
    ];

    const sorted = sortFlattenedRowsByColumn(
      rows,
      NET_PROFIT_TO_COMPANY_COLUMN_ID,
      GRADE_HEADERS,
      true
    );

    const familyTwoRows = sorted.filter((row) => row.familyKey === 2);
    expect(familyTwoRows).toHaveLength(2);
    expect(familyTwoRows.map((row) => row.rowId).sort()).toEqual([
      'family-2-a',
      'family-2-b',
    ]);
    expect(sorted[2]?.familyKey).toBe(4);
    expect(getSplitDisplayBlocks(sorted)).toEqual([]);
  });

  it('keeps non-family farmer rows contiguous when sorting by variety', () => {
    const rows: FlattenedRow[] = [
      makeRow({
        rowId: 'farmer-1-b',
        varietyRowKey: 'farmer-1|Beta',
        farmerId: 'farmer-1',
        varietyName: 'Beta',
      }),
      makeRow({
        rowId: 'farmer-2',
        varietyRowKey: 'farmer-2|Alpha',
        farmerId: 'farmer-2',
        varietyName: 'Alpha',
      }),
      makeRow({
        rowId: 'farmer-1-a',
        varietyRowKey: 'farmer-1|Alpha',
        farmerId: 'farmer-1',
        varietyName: 'Alpha',
      }),
    ];

    const sorted = sortFlattenedRowsByColumn(
      rows,
      'variety',
      GRADE_HEADERS,
      false
    );

    expect(sorted.map((row) => row.rowId)).toEqual([
      'farmer-1-a',
      'farmer-1-b',
      'farmer-2',
    ]);
    expect(getSplitDisplayBlocks(sorted)).toEqual([]);
  });

  it('does not split family-span text columns such as farmer', () => {
    const rows: FlattenedRow[] = [
      makeRow({
        rowId: 'family-1-b',
        varietyRowKey: 'family-1|Beta',
        farmerId: 'farmer-1',
        farmerName: 'Family One',
        varietyName: 'Beta',
        familyKey: 1,
      }),
      makeRow({
        rowId: 'family-2',
        varietyRowKey: 'family-2|Alpha',
        farmerId: 'farmer-2',
        farmerName: 'Family Two',
        varietyName: 'Alpha',
        familyKey: 2,
      }),
      makeRow({
        rowId: 'family-1-a',
        varietyRowKey: 'family-1|Alpha',
        farmerId: 'farmer-1',
        farmerName: 'Family One',
        varietyName: 'Alpha',
        familyKey: 1,
      }),
    ];

    const sorted = sortFlattenedRowsByColumn(
      rows,
      'farmer',
      GRADE_HEADERS,
      false
    );

    expect(sorted.map((row) => row.rowId)).toEqual([
      'family-1-a',
      'family-1-b',
      'family-2',
    ]);
    expect(getSplitDisplayBlocks(sorted)).toEqual([]);
  });

  it('resolves dynamic grade bag column ids via prefix handler', () => {
    const grade = '40–45';
    const columnId = `${VARIETY_LEVEL_COLUMN_PREFIX}${grade}`;
    const rows: FlattenedRow[] = [
      makeRow({
        rowId: 'family-1',
        varietyRowKey: 'family-1|Alpha',
        farmerId: 'farmer-1',
        varietyName: 'Alpha',
        familyKey: 1,
        gradeData: { [grade]: { bags: 5, netWeightKg: 100 } },
      }),
      makeRow({
        rowId: 'family-2',
        varietyRowKey: 'family-2|Beta',
        farmerId: 'farmer-2',
        varietyName: 'Beta',
        familyKey: 2,
        gradeData: { [grade]: { bags: 2, netWeightKg: 40 } },
      }),
    ];

    const values = buildBlockSortValuesByKey(rows, GRADE_HEADERS);
    expect(values.get('family:1')?.[columnId]).toBe(5);
    expect(values.get('family:2')?.[columnId]).toBe(2);

    const sorted = sortFlattenedRowsByColumn(
      rows,
      columnId,
      GRADE_HEADERS,
      true
    );
    expect(sorted.map((row) => row.familyKey)).toEqual([1, 2]);
    expect(getSplitDisplayBlocks(sorted)).toEqual([]);
  });
});
