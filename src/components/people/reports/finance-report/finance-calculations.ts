import { roundMax2 } from '@/components/daybook/grading-calculations';
import {
  displayAccountingVarietyLabel,
  incomingIdsLinkedFromGradings,
  normalizeAccountingVarietyKey,
} from '@/components/people/reports/accounting-report/accounting-report-variety-sections';
import {
  aggregateIncomingTableTotals,
  prepareDataForIncomingTable,
  type IncomingTableTotals,
} from '@/components/people/reports/helpers/incoming-prepare';
import type { FarmerSeedRow } from '@/components/people/reports/helpers/seed-prepare';
import { prepareDataForFarmerSeedTable } from '@/components/people/reports/helpers/seed-prepare';
import type {
  FinanceGradingRow,
  FinancePlantingRow,
} from '@/components/people/reports/finance-report/columns';
import {
  ACTUAL_COST_WITHOUT_SUBSIDY,
  ACRES_TIMES_RATE_PARTICULAR_NAMES,
  GRADING_BAG_SIZES_40MM_AND_ABOVE,
  BUY_BACK_FREIGHT_PARTICULAR_NAME,
  FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME,
  GRADING_BAGS_TIMES_RATE_PARTICULAR_NAMES,
  INCOMING_BAGS_TIMES_RATE_PARTICULAR_NAMES,
  GRADING_CHARGES_PARTICULAR_NAME,
  MULTIPLICATION_EXPENSES_PARTICULAR_NAME,
  PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME,
  PARTICULARS,
  SALE_PRICE_PER_BAG,
  STORAGE_CHARGES_PARTICULAR_NAME,
} from '@/components/people/reports/finance-report/finance-constants';
import {
  ACCOUNTING_GRADING_BAG_SIZE_ORDER,
  aggregateGradingTableTotalBagsForPasses,
  aggregateGradingTableTotalBagsForPassesAndSizes,
  computeGradingTableTotals,
  extraGradingSizeLabelsFromRows,
  prepareDataForGradingTable,
  sizeLabelsWithAnyQuantity,
  type GradingTableFinanceTotals,
} from '@/components/people/reports/helpers/grading-prepare';
import {
  aggregateSummaryActualWeightKg,
  aggregateSummaryActualWeightKgBySize,
  aggregateSummaryActualWeightKgForSizeLabels,
  aggregateSummaryAmountPayable,
  prepareAccountingGradingSummary,
  summaryActualWeightKgForSizeLabel,
} from '@/components/people/reports/helpers/summary-prepare';
import type { PreferencesData } from '@/services/store-admin/preferences/useGetPreferences';
import type { FarmerSeedGatePass } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';

const GRADING_CHARGES_PARTICULAR_INDEX = PARTICULARS.findIndex(
  (item) => item.name === GRADING_CHARGES_PARTICULAR_NAME
);

const STORAGE_CHARGES_PARTICULAR_INDEX = PARTICULARS.findIndex(
  (item) => item.name === STORAGE_CHARGES_PARTICULAR_NAME
);

function particularsRowUsesIncomingBagsAndWeight(index: number): boolean {
  if (GRADING_CHARGES_PARTICULAR_INDEX < 0) return true;
  return index < GRADING_CHARGES_PARTICULAR_INDEX;
}

/** From Grading Charges through the row before Storage Charges (inclusive). */
function particularsRowUsesGradingBagsAndWeight(index: number): boolean {
  if (GRADING_CHARGES_PARTICULAR_INDEX < 0) return false;
  if (index < GRADING_CHARGES_PARTICULAR_INDEX) return false;
  if (
    STORAGE_CHARGES_PARTICULAR_INDEX >= 0 &&
    index >= STORAGE_CHARGES_PARTICULAR_INDEX
  ) {
    return false;
  }
  return true;
}

export type FinancePlantingVarietyGroup = {
  varietyKey: string;
  varietyLabel: string;
  seedRows: FinancePlantingRow[];
  particularsRows: FinancePlantingRow[];
  /** Buy-back payable (Multiplication Expenses) minus all other line amounts. */
  netAmount: number;
};

export type FinanceGradingVarietyGroup = {
  varietyKey: string;
  varietyLabel: string;
  gradingRows: FinanceGradingRow[];
};

export type FinanceGradingVarietyTotals = {
  bagsAfterGrading: number;
  weightStoredOrDispatchedKg: number;
  readyBagsPostStorage50kg: number;
  shortageAtSixPercent: number;
  afterShortageBag: number;
  saleAmount: number;
};

function sumFinanceGradingNumeric(
  rows: FinanceGradingRow[],
  pick: (row: FinanceGradingRow) => number | null | undefined
): number {
  let sum = 0;
  for (const row of rows) {
    const n = Number(pick(row));
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

/** Footer totals for a variety grading block (sums numeric columns). */
export function computeFinanceGradingVarietyTotals(
  rows: FinanceGradingRow[]
): FinanceGradingVarietyTotals {
  return {
    bagsAfterGrading: sumFinanceGradingNumeric(rows, (r) => r.bagsAfterGrading),
    weightStoredOrDispatchedKg: roundMax2(
      sumFinanceGradingNumeric(rows, (r) => r.weightStoredOrDispatchedKg)
    ),
    readyBagsPostStorage50kg: roundMax2(
      sumFinanceGradingNumeric(rows, (r) => r.readyBagsPostStorage50kg)
    ),
    shortageAtSixPercent: roundMax2(
      sumFinanceGradingNumeric(rows, (r) => r.shortageAtSixPercent)
    ),
    afterShortageBag: roundMax2(
      sumFinanceGradingNumeric(rows, (r) => r.afterShortageBag)
    ),
    saleAmount: roundMax2(sumFinanceGradingNumeric(rows, (r) => r.saleAmount)),
  };
}

/**
 * Net amount for the variety footer: summary buy-back payable minus seed and
 * all other expense particulars (excludes Multiplication Expenses from outflows).
 */
export function computePlantingVarietyNetAmount(
  seedRows: FinancePlantingRow[],
  particularsRows: FinancePlantingRow[]
): number {
  const multiplicationRow = particularsRows.find(
    (r) => r.particulars === MULTIPLICATION_EXPENSES_PARTICULAR_NAME
  );
  const buyBackPayable = Number(multiplicationRow?.amount) || 0;

  let totalOutflow = 0;
  for (const row of seedRows) {
    totalOutflow += Number(row.amount) || 0;
  }
  for (const row of particularsRows) {
    if (row.particulars === MULTIPLICATION_EXPENSES_PARTICULAR_NAME) continue;
    totalOutflow += Number(row.amount) || 0;
  }

  return roundMax2(buyBackPayable - totalOutflow);
}

function normalizeSizeToken(raw: string): string {
  return raw
    .trim()
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\s+/g, ' ');
}

function compactSizeKey(raw: string): string {
  return normalizeSizeToken(raw).replace(/\s+/g, '').toLowerCase();
}

const GRADING_SIZE_40MM_AND_ABOVE_NORM = new Set(
  GRADING_BAG_SIZES_40MM_AND_ABOVE.map((label) => normalizeSizeToken(label))
);

const GRADING_SHORTAGE_RATE = 0.06;

/** True when size is not in the ≥40 mm band (see `GRADING_BAG_SIZES_40MM_AND_ABOVE`). */
function isGradingSizeBelow40Mm(sizeLabel: string): boolean {
  return !GRADING_SIZE_40MM_AND_ABOVE_NORM.has(normalizeSizeToken(sizeLabel));
}

function sortVarietyKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === '' && b !== '') return 1;
    if (b === '' && a !== '') return -1;
    return a.localeCompare(b, 'en-IN');
  });
}

function collectFinanceVarietyKeys(
  seeds: FarmerSeedGatePass[],
  incoming: IncomingGatePassByFarmerStorageLinkItem[],
  grading: GradingGatePass[]
): string[] {
  const keySet = new Set<string>();
  for (const pass of seeds) {
    keySet.add(normalizeAccountingVarietyKey(pass.variety));
  }
  for (const pass of incoming) {
    keySet.add(normalizeAccountingVarietyKey(pass.variety));
  }
  for (const pass of grading) {
    keySet.add(normalizeAccountingVarietyKey(pass.variety));
  }
  const orderedKeys = sortVarietyKeys([...keySet]);
  return orderedKeys.length > 0 ? orderedKeys : [''];
}

function buildFinanceGradingRowsForPasses(
  passes: GradingGatePass[],
  varietyKey: string,
  preferences: PreferencesData | null | undefined = undefined
): FinanceGradingRow[] {
  const accountingRows = prepareDataForGradingTable(passes);
  if (accountingRows.length === 0) return [];

  const sizeLabelsOrdered = [
    ...ACCOUNTING_GRADING_BAG_SIZE_ORDER,
    ...extraGradingSizeLabelsFromRows(accountingRows),
  ];
  const totals = computeGradingTableTotals(accountingRows, sizeLabelsOrdered);
  const visibleLabels = sizeLabelsWithAnyQuantity(sizeLabelsOrdered, totals);
  const summaryRows = prepareAccountingGradingSummary(passes, preferences).rows;
  const actualWeightKgBySize =
    aggregateSummaryActualWeightKgBySize(summaryRows);

  const postStorageBagKg = 50;

  return visibleLabels.map((label) => {
    const actualWeightKg = summaryActualWeightKgForSizeLabel(
      actualWeightKgBySize,
      label
    );
    const weightStoredOrDispatchedKg =
      actualWeightKg > 0 ? actualWeightKg : null;
    const readyBagsPostStorage50kg =
      weightStoredOrDispatchedKg != null
        ? roundMax2(weightStoredOrDispatchedKg / postStorageBagKg)
        : null;
    const shortageAtSixPercent =
      readyBagsPostStorage50kg != null && isGradingSizeBelow40Mm(label)
        ? roundMax2(readyBagsPostStorage50kg * GRADING_SHORTAGE_RATE)
        : null;
    const afterShortageBag =
      readyBagsPostStorage50kg != null
        ? roundMax2(readyBagsPostStorage50kg - (shortageAtSixPercent ?? 0))
        : null;
    const salePricePerBag = resolveSalePricePerBagRate(varietyKey, label);
    const saleAmount =
      afterShortageBag != null && salePricePerBag != null
        ? roundMax2(afterShortageBag * salePricePerBag)
        : null;

    return {
      id: `${varietyKey}::${compactSizeKey(label)}`,
      particulars: '',
      gradingSizes: label,
      bagsAfterGrading: totals.bySize[label]?.bags ?? 0,
      weightStoredOrDispatchedKg,
      readyBagsPostStorage50kg,
      shortageAtSixPercent,
      afterShortageBag,
      salePricePerBag,
      saleAmount,
    };
  });
}

function resolveRateFromSizeRates(
  sizeRates: Record<string, number>,
  sizeLabel: string
): number | null {
  const sizeTrim = sizeLabel.trim();
  if (!sizeTrim) return null;

  const targetNorm = normalizeSizeToken(sizeTrim);
  const targetCompact = compactSizeKey(sizeTrim);

  if (Object.prototype.hasOwnProperty.call(sizeRates, sizeTrim)) {
    const v = Number(sizeRates[sizeTrim]);
    return Number.isFinite(v) ? v : null;
  }
  for (const [k, val] of Object.entries(sizeRates)) {
    if (normalizeSizeToken(k) === targetNorm) {
      const v = Number(val);
      return Number.isFinite(v) ? v : null;
    }
  }
  for (const [k, val] of Object.entries(sizeRates)) {
    if (compactSizeKey(k) === targetCompact) {
      const v = Number(val);
      return Number.isFinite(v) ? v : null;
    }
  }
  return null;
}

function resolveRateFromVarietySizeRateTable(
  table: readonly { variety: string; sizeRates: Record<string, number> }[],
  varietyRaw: string,
  sizeLabel: string
): number | null {
  const variety = varietyRaw.trim();
  const sizeTrim = sizeLabel.trim();
  if (!variety || !sizeTrim) return null;

  const entry =
    table.find((e) => e.variety === variety) ??
    table.find((e) => e.variety.trim().toLowerCase() === variety.toLowerCase());
  if (!entry) return null;

  return resolveRateFromSizeRates(entry.sizeRates, sizeTrim);
}

/** Rate from {@link ACTUAL_COST_WITHOUT_SUBSIDY} for variety + bag size (tolerates en-dash vs hyphen). */
export function resolveActualCostWithoutSubsidyRate(
  varietyRaw: string,
  sizeLabel: string
): number | null {
  return resolveRateFromVarietySizeRateTable(
    ACTUAL_COST_WITHOUT_SUBSIDY,
    varietyRaw,
    sizeLabel
  );
}

/** Sale price per bag from {@link SALE_PRICE_PER_BAG} (preferences later). */
export function resolveSalePricePerBagRate(
  varietyRaw: string,
  sizeLabel: string
): number | null {
  return resolveRateFromVarietySizeRateTable(
    SALE_PRICE_PER_BAG,
    varietyRaw,
    sizeLabel
  );
}

export function mapFarmerSeedRowToFinancePlantingRow(
  seedRow: FarmerSeedRow,
  varietyKey: string
): FinancePlantingRow {
  const numberOfBags = seedRow.totalBagsGiven;
  const rate = resolveActualCostWithoutSubsidyRate(
    varietyKey,
    seedRow.seedSize
  );
  const amount = rate != null ? roundMax2(numberOfBags * rate) : null;

  return {
    id: seedRow.id,
    particulars: seedRow.seedSize,
    areaPlantedAcres: seedRow.areaPlantedAcres,
    numberOfBags,
    bagWeight: null,
    ratePerAcreOrBag: rate,
    amount,
  };
}

/** Sum of acres across seed bag-size lines for a variety (matches farmer seed totalAcres). */
export function aggregateVarietyNetAcres(
  seedRows: Pick<FarmerSeedRow, 'areaPlantedAcres'>[]
): number {
  let sum = 0;
  for (const row of seedRows) {
    sum += Number(row.areaPlantedAcres) || 0;
  }
  return roundMax2(sum);
}

export function getIncomingRowsForVariety(
  varietyKey: string,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[],
  gradingPasses: GradingGatePass[]
) {
  const gradingForVariety = gradingPasses.filter(
    (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
  );
  const linkedIncomingIds = incomingIdsLinkedFromGradings(gradingForVariety);
  const incomingForVariety = incomingPasses.filter((inc) =>
    linkedIncomingIds.has(inc._id)
  );
  return prepareDataForIncomingTable(incomingForVariety);
}

const KG_PER_QUINTAL = 100;

type ParticularsAmountContext = {
  incomingNetWeightKg: number;
  netAcres: number;
  numberOfBags: number | null;
  /** Summary table footer: Σ Amount Payable (₹) for variety grading. */
  summaryAmountPayable: number;
};

/** Amount rules for static particulars rows (extend per row as needed). */
function resolveParticularsRowAmount(
  item: (typeof PARTICULARS)[number],
  context: ParticularsAmountContext
): number | null {
  const rate = Number(item.rate);
  if (!Number.isFinite(rate)) return null;

  if (item.name === FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME) {
    return roundMax2(rate);
  }

  if (item.name === BUY_BACK_FREIGHT_PARTICULAR_NAME) {
    const netKg = Number(context.incomingNetWeightKg) || 0;
    const quintals = netKg / KG_PER_QUINTAL;
    return roundMax2(quintals * rate);
  }

  if (ACRES_TIMES_RATE_PARTICULAR_NAMES.has(item.name)) {
    const acres = Number(context.netAcres) || 0;
    return roundMax2(acres * rate);
  }

  if (
    INCOMING_BAGS_TIMES_RATE_PARTICULAR_NAMES.has(item.name) ||
    GRADING_BAGS_TIMES_RATE_PARTICULAR_NAMES.has(item.name)
  ) {
    const bags = Number(context.numberOfBags) || 0;
    return roundMax2(bags * rate);
  }

  if (item.name === MULTIPLICATION_EXPENSES_PARTICULAR_NAME) {
    return roundMax2(Number(context.summaryAmountPayable) || 0);
  }

  return null;
}

export function buildParticularsPlantingRows(
  varietyKey: string,
  incomingTotals: IncomingTableTotals = { totalBags: 0, totalActualKg: 0 },
  netAcres = 0,
  gradingTotals: GradingTableFinanceTotals = {
    totalBags: 0,
    totalActualWeightKg: 0,
  },
  gradingTotals40MmAndAbove: GradingTableFinanceTotals = {
    totalBags: 0,
    totalActualWeightKg: 0,
  },
  summaryAmountPayable = 0
): FinancePlantingRow[] {
  const safeKey = varietyKey.replace(/[^a-zA-Z0-9_-]/g, '_');

  return PARTICULARS.map((item, index) => {
    const usesIncomingQty = particularsRowUsesIncomingBagsAndWeight(index);
    const usesGradingQty = particularsRowUsesGradingBagsAndWeight(index);
    const isPaladaarAfterLoading =
      item.name === PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME;
    const isStorageCharges = item.name === STORAGE_CHARGES_PARTICULAR_NAME;
    const isMultiplicationExpenses =
      item.name === MULTIPLICATION_EXPENSES_PARTICULAR_NAME;
    const usesFullGradingBagsAndWeight =
      usesGradingQty || isMultiplicationExpenses;
    const gradingTotalsBelow40 = gradingTotalsBelow40Mm(
      gradingTotals,
      gradingTotals40MmAndAbove
    );

    const bags = isStorageCharges
      ? gradingTotalsBelow40.totalBags
      : isPaladaarAfterLoading
        ? gradingTotals40MmAndAbove.totalBags
        : usesFullGradingBagsAndWeight
          ? gradingTotals.totalBags
          : usesIncomingQty
            ? incomingTotals.totalBags
            : null;

    const weight = isStorageCharges
      ? gradingTotalsBelow40.totalActualWeightKg
      : isPaladaarAfterLoading
        ? gradingTotals40MmAndAbove.totalActualWeightKg
        : usesFullGradingBagsAndWeight
          ? gradingTotals.totalActualWeightKg
          : usesIncomingQty
            ? incomingTotals.totalActualKg
            : null;

    return {
      id: `particular-${safeKey}-${index}`,
      particulars: item.name,
      areaPlantedAcres: netAcres,
      numberOfBags: bags,
      bagWeight: weight,
      ratePerAcreOrBag: item.rate,
      amount: resolveParticularsRowAmount(item, {
        incomingNetWeightKg: incomingTotals.totalActualKg,
        netAcres,
        numberOfBags: bags,
        summaryAmountPayable,
      }),
    };
  });
}

function aggregateGradingFinanceTotalsForPasses(
  gradingGatePasses: GradingGatePass[],
  preferences: PreferencesData | null | undefined
): GradingTableFinanceTotals {
  const summaryRows = prepareAccountingGradingSummary(
    gradingGatePasses,
    preferences ?? undefined
  ).rows;
  return {
    totalBags: aggregateGradingTableTotalBagsForPasses(gradingGatePasses),
    totalActualWeightKg: aggregateSummaryActualWeightKg(summaryRows),
  };
}

function aggregateGradingFinanceTotals40MmAndAbove(
  gradingGatePasses: GradingGatePass[],
  preferences: PreferencesData | null | undefined
): GradingTableFinanceTotals {
  const summaryRows = prepareAccountingGradingSummary(
    gradingGatePasses,
    preferences ?? undefined
  ).rows;
  return {
    totalBags: aggregateGradingTableTotalBagsForPassesAndSizes(
      gradingGatePasses,
      GRADING_BAG_SIZES_40MM_AND_ABOVE
    ),
    totalActualWeightKg: aggregateSummaryActualWeightKgForSizeLabels(
      summaryRows,
      GRADING_BAG_SIZES_40MM_AND_ABOVE
    ),
  };
}

/** Grading totals for sizes below 40 mm (full grading minus ≥40 mm band). */
function gradingTotalsBelow40Mm(
  gradingTotals: GradingTableFinanceTotals,
  gradingTotals40MmAndAbove: GradingTableFinanceTotals
): GradingTableFinanceTotals {
  const totalBags = Math.max(
    0,
    (Number(gradingTotals.totalBags) || 0) -
      (Number(gradingTotals40MmAndAbove.totalBags) || 0)
  );
  const weightDelta =
    (Number(gradingTotals.totalActualWeightKg) || 0) -
    (Number(gradingTotals40MmAndAbove.totalActualWeightKg) || 0);
  return {
    totalBags,
    totalActualWeightKg: roundMax2(Math.max(0, weightDelta)),
  };
}

export function buildFinanceGradingVarietyGroups(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined,
  gradingPasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined
): FinanceGradingVarietyGroup[] {
  const seeds = farmerSeeds ?? [];
  const incoming = incomingPasses ?? [];
  const grading = gradingPasses ?? [];
  const keysToRender = collectFinanceVarietyKeys(seeds, incoming, grading);

  return keysToRender.map((varietyKey) => {
    const gradingForVariety = grading.filter(
      (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
    );

    return {
      varietyKey,
      varietyLabel: displayAccountingVarietyLabel(varietyKey),
      gradingRows: buildFinanceGradingRowsForPasses(
        gradingForVariety,
        varietyKey,
        preferences
      ),
    };
  });
}

export function buildFinancePlantingVarietyGroups(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined,
  gradingPasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined
): FinancePlantingVarietyGroup[] {
  const seeds = farmerSeeds ?? [];
  const incoming = incomingPasses ?? [];
  const grading = gradingPasses ?? [];
  const keysToRender = collectFinanceVarietyKeys(seeds, incoming, grading);

  return keysToRender.map((varietyKey) => {
    const seedsForVariety = seeds.filter(
      (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
    );
    const seedRows = prepareDataForFarmerSeedTable(seedsForVariety);
    const netAcres = aggregateVarietyNetAcres(seedRows);
    const incomingRows = getIncomingRowsForVariety(
      varietyKey,
      incoming,
      grading
    );
    const incomingTotals = aggregateIncomingTableTotals(incomingRows);
    const gradingForVariety = grading.filter(
      (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
    );
    const gradingTotals = aggregateGradingFinanceTotalsForPasses(
      gradingForVariety,
      preferences
    );
    const gradingTotals40MmAndAbove = aggregateGradingFinanceTotals40MmAndAbove(
      gradingForVariety,
      preferences
    );
    const summaryAmountPayable = aggregateSummaryAmountPayable(
      prepareAccountingGradingSummary(gradingForVariety, preferences).rows
    );

    const seedRowsMapped = seedRows.map((row) =>
      mapFarmerSeedRowToFinancePlantingRow(row, varietyKey)
    );
    const particularsRows = buildParticularsPlantingRows(
      varietyKey,
      incomingTotals,
      netAcres,
      gradingTotals,
      gradingTotals40MmAndAbove,
      summaryAmountPayable
    );

    return {
      varietyKey,
      varietyLabel: displayAccountingVarietyLabel(varietyKey),
      seedRows: seedRowsMapped,
      particularsRows,
      netAmount: computePlantingVarietyNetAmount(
        seedRowsMapped,
        particularsRows
      ),
    };
  });
}
