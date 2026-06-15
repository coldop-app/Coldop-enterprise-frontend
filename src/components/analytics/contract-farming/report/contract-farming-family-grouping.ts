import { roundMax2 } from '@/components/daybook/grading-calculations';
import {
  getAverageQuintalPerAcre,
  getGradeBagCount,
  getNetAmountRupee,
  varietyMetricDedupeKey,
} from './contract-farming-report-calculations';
import {
  GRADE_BAG_COLUMN_KEY_PREFIX,
  type FamilyMemberSummary,
  type FlattenedRow,
} from './types';

function familyMergeKey(row: FlattenedRow): string {
  return `${row.familyKey ?? 0}\x00${row.varietyName}\x00${row.sizeName}`;
}

export function formatFamilyAccountNumber(accountNumber: number): string {
  const base = Math.trunc(accountNumber);
  if (Number.isInteger(accountNumber) || accountNumber === base) {
    return String(base);
  }
  const fraction = Math.round((accountNumber - base) * 10);
  return `${base}.${fraction}`;
}

function buildFamilyMembersByKey(
  rows: FlattenedRow[]
): Map<number, FamilyMemberSummary[]> {
  const byFamily = new Map<number, Map<string, FamilyMemberSummary>>();

  for (const row of rows) {
    const familyKey = row.familyKey ?? 0;
    if (familyKey === 0) continue;

    const members =
      byFamily.get(familyKey) ?? new Map<string, FamilyMemberSummary>();
    if (!members.has(row.farmerId)) {
      members.set(row.farmerId, {
        farmerId: row.farmerId,
        farmerName: row.farmerName,
        accountNumber: row.accountNumber,
      });
    }
    byFamily.set(familyKey, members);
  }

  const result = new Map<number, FamilyMemberSummary[]>();
  for (const [familyKey, members] of byFamily) {
    result.set(
      familyKey,
      Array.from(members.values()).sort(
        (a, b) => a.accountNumber - b.accountNumber
      )
    );
  }
  return result;
}

function mergeGradeData(
  members: FlattenedRow[]
): Record<string, { bags: number; netWeightKg: number }> {
  const byAccount = new Map<number, FlattenedRow>();
  for (const row of members) {
    if (!byAccount.has(row.accountNumber)) {
      byAccount.set(row.accountNumber, row);
    }
  }

  const merged: Record<string, { bags: number; netWeightKg: number }> = {};
  for (const row of byAccount.values()) {
    for (const [grade, value] of Object.entries(row.gradeData ?? {})) {
      const current = merged[grade] ?? { bags: 0, netWeightKg: 0 };
      merged[grade] = {
        bags: current.bags + Number(value?.bags ?? 0),
        netWeightKg: current.netWeightKg + Number(value?.netWeightKg ?? 0),
      };
    }
  }
  return merged;
}

function mergeFamilyGroup(
  familyKey: number,
  members: FlattenedRow[],
  familyMembers: FamilyMemberSummary[],
  gradeHeaders: readonly string[]
): FlattenedRow {
  const sortedMembers = [...members].sort((a, b) => {
    const accountCmp = a.accountNumber - b.accountNumber;
    if (accountCmp !== 0) return accountCmp;
    return a.sizeRowIndex - b.sizeRowIndex;
  });
  const first = sortedMembers[0]!;
  const byAccount = new Map<number, FlattenedRow>();
  for (const row of sortedMembers) {
    if (!byAccount.has(row.accountNumber)) {
      byAccount.set(row.accountNumber, row);
    }
  }
  const accountRows = Array.from(byAccount.values());

  const baseAccount = Math.trunc(first.accountNumber);
  const mobiles = [
    ...new Set(
      accountRows.map((row) => row.mobileNumber.trim()).filter(Boolean)
    ),
  ];
  const addresses = [
    ...new Set(accountRows.map((row) => row.address.trim()).filter(Boolean)),
  ];

  const gradeData = mergeGradeData(sortedMembers);

  let varietyTotalAcres = 0;
  let varietyTotalSeedAmountPayable = 0;
  let buyBackBags = 0;
  let buyBackNetWeightKg = 0;
  let incomingNetWeightKg = 0;
  let hasBuyBackBags = false;
  let hasBuyBackNetWeight = false;
  let hasIncomingNetWeight = false;

  for (const row of accountRows) {
    varietyTotalAcres += row.varietyTotalAcres;
    varietyTotalSeedAmountPayable += row.varietyTotalSeedAmountPayable;
    if (row.buyBackBags != null) {
      buyBackBags += row.buyBackBags;
      hasBuyBackBags = true;
    }
    if (row.buyBackNetWeightKg != null) {
      buyBackNetWeightKg += row.buyBackNetWeightKg;
      hasBuyBackNetWeight = true;
    }
    if (row.incomingNetWeightKg != null) {
      incomingNetWeightKg += row.incomingNetWeightKg;
      hasIncomingNetWeight = true;
    }
  }

  const primaryMember = familyMembers[0];

  let summedNetProfit = 0;
  let hasNetProfit = false;
  const seenVarietyAcres = new Set<string>();
  let totalFamilyAcres = 0;

  for (const row of sortedMembers) {
    const profit = row.netProfitToCompany;
    if (profit != null && Number.isFinite(profit)) {
      summedNetProfit += profit;
      hasNetProfit = true;
    }
    const varietyAcresKey = `${row.farmerId}|${row.varietyName}`;
    if (!seenVarietyAcres.has(varietyAcresKey)) {
      seenVarietyAcres.add(varietyAcresKey);
      totalFamilyAcres += row.varietyTotalAcres;
    }
  }

  const merged: FlattenedRow = {
    ...first,
    rowId: `family-${familyKey}-${first.varietyName}-${first.sizeName}`,
    varietyRowKey: `family-${familyKey}|${first.varietyName}`,
    familyKey,
    familyMembers,
    clubbedFarmerNames: undefined,
    farmerName: primaryMember?.farmerName ?? first.farmerName,
    farmerId: primaryMember?.farmerId ?? first.farmerId,
    mobileNumber: mobiles.join(', ') || first.mobileNumber,
    farmerMobile: mobiles.join(', ') || first.farmerMobile,
    accountNumber: baseAccount,
    farmerAccount: baseAccount,
    address: addresses.join(', ') || first.address,
    farmerAddress: addresses.join(', ') || first.farmerAddress,
    sizeQuantity: sortedMembers.reduce((sum, row) => sum + row.sizeQuantity, 0),
    sizeAcres: sortedMembers.reduce((sum, row) => sum + row.sizeAcres, 0),
    sizeAmountPayable: sortedMembers.reduce(
      (sum, row) => sum + row.sizeAmountPayable,
      0
    ),
    sizeAmount: sortedMembers.reduce((sum, row) => sum + row.sizeAmount, 0),
    gradeData,
    varietyTotalAcres,
    varietyTotalSeedAmountPayable,
    buyBackBags: hasBuyBackBags ? buyBackBags : null,
    buyBackNetWeightKg: hasBuyBackNetWeight ? buyBackNetWeightKg : null,
    incomingNetWeightKg: hasIncomingNetWeight ? incomingNetWeightKg : null,
    netProfitToCompany: hasNetProfit ? summedNetProfit : null,
    netProfitToCompanyPerAcre:
      hasNetProfit && totalFamilyAcres > 0
        ? summedNetProfit / totalFamilyAcres
        : null,
    mergedRowSpan: 1,
    isFirstOfMergedBlock: true,
    sizeRowIndex: 0,
    familyMergedRowSpan: 1,
    isFirstOfFamilyBlock: true,
  };

  gradeHeaders.forEach((grade) => {
    const key = `${GRADE_BAG_COLUMN_KEY_PREFIX}${grade}` as const;
    merged[key] = getGradeBagCount(merged, grade);
  });

  return merged;
}

function getFarmerBlockKey(row: FlattenedRow): string {
  const familyKey = row.familyKey ?? 0;
  if (familyKey > 0 && row.varietyRowKey.startsWith('family-')) {
    return `family:${familyKey}`;
  }
  const farmerId = row.farmerId ?? row.varietyRowKey.split('|')[0] ?? row.rowId;
  return `farmer:${farmerId}`;
}

/** Recomputes variety-level and farmer/family-level rowSpan metadata. */
export function recomputeSpanMetadata(rows: FlattenedRow[]): FlattenedRow[] {
  const varietyBlockCounts = new Map<string, number>();
  const farmerBlockCounts = new Map<string, number>();

  for (const row of rows) {
    const farmerBlockKey = getFarmerBlockKey(row);
    farmerBlockCounts.set(
      farmerBlockKey,
      (farmerBlockCounts.get(farmerBlockKey) ?? 0) + 1
    );
    varietyBlockCounts.set(
      row.varietyRowKey,
      (varietyBlockCounts.get(row.varietyRowKey) ?? 0) + 1
    );
  }

  const varietyBlockIndex = new Map<string, number>();
  const farmerBlockStarted = new Set<string>();

  return rows.map((row) => {
    const varietyKey = row.varietyRowKey;
    const sizeIndex = varietyBlockIndex.get(varietyKey) ?? 0;
    varietyBlockIndex.set(varietyKey, sizeIndex + 1);

    const mergedRowSpan = varietyBlockCounts.get(varietyKey) ?? 1;
    const isFirstOfMergedBlock = sizeIndex === 0;

    const farmerBlockKey = getFarmerBlockKey(row);
    const isFirstOfFamilyBlock = !farmerBlockStarted.has(farmerBlockKey);
    if (isFirstOfFamilyBlock) {
      farmerBlockStarted.add(farmerBlockKey);
    }
    const familyMergedRowSpan = farmerBlockCounts.get(farmerBlockKey) ?? 1;

    return {
      ...row,
      mergedRowSpan,
      isFirstOfMergedBlock,
      sizeRowIndex: sizeIndex,
      familyMergedRowSpan,
      isFirstOfFamilyBlock,
    };
  });
}

function sortContractFarmingRows(rows: FlattenedRow[]): FlattenedRow[] {
  return [...rows].sort((a, b) => {
    const familyA = a.familyKey ?? 0;
    const familyB = b.familyKey ?? 0;
    if (familyA !== familyB) {
      if (familyA === 0) return 1;
      if (familyB === 0) return -1;
      return familyA - familyB;
    }
    if (familyA > 0) {
      const accountCmp = a.accountNumber - b.accountNumber;
      if (accountCmp !== 0) return accountCmp;
    } else {
      const farmerCmp = a.farmerId.localeCompare(b.farmerId);
      if (farmerCmp !== 0) return farmerCmp;
    }
    const varietyCmp = a.varietyName.localeCompare(b.varietyName);
    if (varietyCmp !== 0) return varietyCmp;
    return a.sizeRowIndex - b.sizeRowIndex;
  });
}

function stripFamilyGroupingFields(row: FlattenedRow): FlattenedRow {
  return {
    ...row,
    familyMembers: undefined,
    clubbedFarmerNames: undefined,
  };
}

/**
 * Aggregates only rows with `familyKey > 0` at variety × size grain.
 * Rows with `familyKey === 0` are returned unchanged (no metric merging).
 */
export function prepareFamilyGroupedRows(
  rows: FlattenedRow[],
  gradeHeaders: readonly string[]
): FlattenedRow[] {
  const familyRows = rows.filter((row) => (row.familyKey ?? 0) > 0);
  const nonFamilyRows = rows
    .filter((row) => (row.familyKey ?? 0) === 0)
    .map(stripFamilyGroupingFields);

  if (familyRows.length === 0) {
    return recomputeSpanMetadata(nonFamilyRows);
  }

  const membersByFamily = buildFamilyMembersByKey(familyRows);
  const familyGroups = new Map<string, FlattenedRow[]>();

  for (const row of familyRows) {
    const key = familyMergeKey(row);
    const group = familyGroups.get(key) ?? [];
    group.push(row);
    familyGroups.set(key, group);
  }

  const emittedMergeKeys = new Set<string>();
  const mergedFamilyRows: FlattenedRow[] = [];

  for (const row of familyRows) {
    const familyKey = row.familyKey ?? 0;
    const key = familyMergeKey(row);
    if (emittedMergeKeys.has(key)) continue;
    emittedMergeKeys.add(key);

    const members = familyGroups.get(key) ?? [row];
    const familyMembers = membersByFamily.get(familyKey) ?? [];
    mergedFamilyRows.push(
      mergeFamilyGroup(familyKey, members, familyMembers, gradeHeaders)
    );
  }

  return recomputeSpanMetadata(
    stampFamilySortMetrics(
      sortContractFarmingRows([...mergedFamilyRows, ...nonFamilyRows])
    )
  );
}

function stampFamilySortMetrics(rows: FlattenedRow[]): FlattenedRow[] {
  const rowsByFamily = new Map<number, FlattenedRow[]>();

  for (const row of rows) {
    const familyKey = row.familyKey ?? 0;
    if (!isFamilyGroupedRowForStamp(row)) continue;
    const familyRows = rowsByFamily.get(familyKey) ?? [];
    familyRows.push(row);
    rowsByFamily.set(familyKey, familyRows);
  }

  const sortMetricsByFamily = new Map<number, FamilySortMetrics>();
  for (const [familyKey, familyRows] of rowsByFamily) {
    sortMetricsByFamily.set(familyKey, computeFamilySortMetrics(familyRows));
  }

  return rows.map((row) => {
    const familyKey = row.familyKey ?? 0;
    if (!isFamilyGroupedRowForStamp(row)) return row;

    const metrics = sortMetricsByFamily.get(familyKey);
    if (!metrics) return row;

    return {
      ...row,
      familySortNetProfitToCompany: metrics.netProfit,
      familySortNetProfitToCompanyPerAcre: metrics.netProfitPerAcre,
      familySortNetAmountPerAcre: metrics.netAmountPerAcre,
      familySortAverageQuintalPerAcre: metrics.averageQuintalPerAcre,
    };
  });
}

type FamilySortMetrics = {
  netProfit: number | null;
  netProfitPerAcre: number | null;
  netAmountPerAcre: number | null;
  averageQuintalPerAcre: number | null;
};

function computeFamilySortMetrics(
  familyRows: FlattenedRow[]
): FamilySortMetrics {
  const seenVarietyKeys = new Set<string>();
  const seenMetricKeys = new Set<string>();
  let netProfit = 0;
  let hasProfit = false;
  let varietyAcres = 0;
  let sumNetAmount = 0;
  let sumSizeAcres = 0;
  let hasNetAmount = false;
  let avgQuintalWeighted = 0;
  let avgQuintalVarietyAcres = 0;

  for (const row of familyRows) {
    const profit = row.netProfitToCompany;
    if (profit != null && Number.isFinite(profit)) {
      netProfit += profit;
      hasProfit = true;
    }

    if (!seenVarietyKeys.has(row.varietyRowKey)) {
      seenVarietyKeys.add(row.varietyRowKey);
      varietyAcres += row.varietyTotalAcres;
    }

    sumSizeAcres += row.sizeAcres;

    const metricKey = varietyMetricDedupeKey(row);
    if (seenMetricKeys.has(metricKey)) continue;
    seenMetricKeys.add(metricKey);

    const netAmount = getNetAmountRupee(row);
    if (netAmount != null) {
      sumNetAmount += netAmount;
      hasNetAmount = true;
    }

    const quintalPerAcre = getAverageQuintalPerAcre(row);
    const acres = row.varietyTotalAcres;
    if (quintalPerAcre != null && acres > 0) {
      avgQuintalWeighted += quintalPerAcre * acres;
      avgQuintalVarietyAcres += acres;
    }
  }

  return {
    netProfit: hasProfit ? netProfit : null,
    netProfitPerAcre:
      hasProfit && varietyAcres > 0 ? netProfit / varietyAcres : null,
    netAmountPerAcre:
      hasNetAmount && sumSizeAcres > 0
        ? roundMax2(sumNetAmount / sumSizeAcres)
        : null,
    averageQuintalPerAcre:
      avgQuintalVarietyAcres > 0
        ? avgQuintalWeighted / avgQuintalVarietyAcres
        : null,
  };
}

function isFamilyGroupedRowForStamp(row: FlattenedRow): boolean {
  const familyKey = row.familyKey ?? 0;
  return familyKey > 0 && row.varietyRowKey.startsWith('family-');
}

/** @deprecated Use {@link prepareFamilyGroupedRows}. */
export function applyFamilyGrouping(
  rows: FlattenedRow[],
  gradeHeaders: readonly string[]
): FlattenedRow[] {
  return prepareFamilyGroupedRows(rows, gradeHeaders);
}
