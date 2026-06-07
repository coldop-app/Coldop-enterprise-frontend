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
import {
  aggregateTotalSeedAmount,
  prepareDataForFarmerSeedTable,
  type FarmerSeedRow,
} from '@/components/people/reports/helpers/seed-prepare';
import type {
  FinanceGradingRow,
  FinancePlantingRow,
} from '@/components/people/reports/finance-report/columns';
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
  type GradingBagTypeQtySummaryRow,
} from '@/components/people/reports/helpers/summary-prepare';
import {
  getFinanceConstants,
  type FinanceConstantsData,
  type FinanceCostDriver,
  type FinanceParticularRow,
  type PreferencesData,
} from '@/services/store-admin/preferences/useGetPreferences';
import type {
  FarmerSeedGatePass,
  StationRates,
} from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';

/** Row names that split grading bag counts by size band. */
const PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME =
  'Paladaar Charges after loading after grading';
const STORAGE_CHARGES_PARTICULAR_NAME = 'Storage Charges';
const FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME = 'Freight: Seed (Dispatched)';
const FREIGHT_BUY_BACK_PARTICULAR_NAME =
  'Freight: Buy Back material (Trolly Charges Rs. 20/- Qtl)';
const BUY_BACK_PAYABLE_COST_DRIVER: FinanceCostDriver = 'Buy-back-payable';

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
  totals: FinanceGradingVarietyTotals;
};

export type FinanceReportGroups = {
  plantingGroups: FinancePlantingVarietyGroup[];
  gradingGroups: FinanceGradingVarietyGroup[];
};

export type FinanceGradingVarietyTotals = {
  bagsAfterGrading: number;
  weightStoredOrDispatchedKg: number;
  readyBagsPostStorage50kg: number;
  shortageAtSixPercent: number;
  afterShortageBag: number;
  saleAmount: number;
};

export type FinanceReportSummary = {
  totalGradingSaleAmount: number;
  totalPlantingNetAmount: number;
  netRevenue: number;
  totalAcresPlanted: number;
  /** `null` when no acres are planted. */
  netAmountPerAcre: number | null;
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
 * Net amount for the variety footer: Multiplication Expenses (buy-back payable
 * minus farmer seed total) minus all other expense particulars. Seed cost is
 * already netted inside the Multiplication Expenses row.
 */
export function computePlantingVarietyNetAmount(
  _seedRows: FinancePlantingRow[],
  particularsRows: FinancePlantingRow[],
  preferences: PreferencesData | null | undefined
): number {
  const fc = getFinanceConstants(preferences);
  const buyBackPayableRowIndex = fc.particulars.findIndex(
    (item) => item.costDriver === BUY_BACK_PAYABLE_COST_DRIVER
  );
  const multiplicationExpenses =
    buyBackPayableRowIndex >= 0
      ? Number(particularsRows[buyBackPayableRowIndex]?.amount) || 0
      : 0;

  let totalOutflow = 0;
  for (let i = 0; i < particularsRows.length; i++) {
    if (i === buyBackPayableRowIndex) continue;
    totalOutflow += Number(particularsRows[i]?.amount) || 0;
  }

  return roundMax2(multiplicationExpenses - totalOutflow);
}

/** Report-level totals: grading sale amount minus planting net, and per-acre net. */
export function computeFinanceReportSummary(
  plantingGroups: FinancePlantingVarietyGroup[],
  gradingGroups: FinanceGradingVarietyGroup[]
): FinanceReportSummary {
  let totalPlantingNetAmount = 0;
  let totalAcresPlanted = 0;
  for (const group of plantingGroups) {
    totalPlantingNetAmount += group.netAmount;
    totalAcresPlanted += aggregateVarietyNetAcres(group.seedRows);
  }
  totalPlantingNetAmount = roundMax2(totalPlantingNetAmount);
  totalAcresPlanted = roundMax2(totalAcresPlanted);

  let totalGradingSaleAmount = 0;
  for (const group of gradingGroups) {
    totalGradingSaleAmount += group.totals.saleAmount;
  }
  totalGradingSaleAmount = roundMax2(totalGradingSaleAmount);

  const netRevenue = roundMax2(totalGradingSaleAmount - totalPlantingNetAmount);
  const netAmountPerAcre =
    totalAcresPlanted > 0 ? roundMax2(netRevenue / totalAcresPlanted) : null;

  return {
    totalGradingSaleAmount,
    totalPlantingNetAmount,
    netRevenue,
    totalAcresPlanted,
    netAmountPerAcre,
  };
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

function gradingSizes40mmNormSet(fc: FinanceConstantsData): Set<string> {
  return new Set(
    fc.gradingBagSizes40mmAndAbove.map((label) => normalizeSizeToken(label))
  );
}

const GRADING_SHORTAGE_RATE = 0.06;

/** True when size is not in the ≥40 mm band (from preferences). */
function isGradingSizeBelow40Mm(
  sizeLabel: string,
  fc: FinanceConstantsData
): boolean {
  return !gradingSizes40mmNormSet(fc).has(normalizeSizeToken(sizeLabel));
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
  preferences: PreferencesData | null | undefined = undefined,
  preparedSummaryRows?: GradingBagTypeQtySummaryRow[]
): FinanceGradingRow[] {
  const fc = getFinanceConstants(preferences);
  const accountingRows = prepareDataForGradingTable(passes);
  if (accountingRows.length === 0) return [];

  const sizeLabelsOrdered = [
    ...ACCOUNTING_GRADING_BAG_SIZE_ORDER,
    ...extraGradingSizeLabelsFromRows(accountingRows),
  ];
  const totals = computeGradingTableTotals(accountingRows, sizeLabelsOrdered);
  const visibleLabels = sizeLabelsWithAnyQuantity(sizeLabelsOrdered, totals);
  const summaryRows =
    preparedSummaryRows ??
    prepareAccountingGradingSummary(passes, preferences).rows;
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
      readyBagsPostStorage50kg != null && isGradingSizeBelow40Mm(label, fc)
        ? roundMax2(readyBagsPostStorage50kg * GRADING_SHORTAGE_RATE)
        : null;
    const afterShortageBag =
      readyBagsPostStorage50kg != null
        ? roundMax2(readyBagsPostStorage50kg - (shortageAtSixPercent ?? 0))
        : null;
    const salePricePerBag = resolveSalePricePerBagRate(
      varietyKey,
      label,
      preferences
    );
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

/** Rate from preferences (`actualCostWithoutSubsidy`) for variety + bag size. */
export function resolveActualCostWithoutSubsidyRate(
  varietyRaw: string,
  sizeLabel: string,
  preferences: PreferencesData | null | undefined
): number | null {
  const fc = getFinanceConstants(preferences);
  return resolveRateFromVarietySizeRateTable(
    fc.actualCostWithoutSubsidy,
    varietyRaw,
    sizeLabel
  );
}

/** Sale price per bag from preferences (`salePricePerBag`). */
export function resolveSalePricePerBagRate(
  varietyRaw: string,
  sizeLabel: string,
  preferences: PreferencesData | null | undefined
): number | null {
  const fc = getFinanceConstants(preferences);
  return resolveRateFromVarietySizeRateTable(
    fc.salePricePerBag,
    varietyRaw,
    sizeLabel
  );
}

export function mapFarmerSeedRowToFinancePlantingRow(
  seedRow: FarmerSeedRow,
  varietyKey: string,
  preferences: PreferencesData | null | undefined
): FinancePlantingRow {
  const numberOfBags = seedRow.totalBagsGiven;
  const rate = resolveActualCostWithoutSubsidyRate(
    varietyKey,
    seedRow.seedSize,
    preferences
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
  seedRows: { areaPlantedAcres?: number | null }[]
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

/** All incoming gate passes for a variety (by variety field, not grading-linked). */
function getAllIncomingRowsForVariety(
  varietyKey: string,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[]
) {
  const incomingForVariety = incomingPasses.filter(
    (inc) => normalizeAccountingVarietyKey(inc.variety) === varietyKey
  );
  return prepareDataForIncomingTable(incomingForVariety);
}

const KG_PER_QUINTAL = 100;

type ParticularsAmountContext = {
  incomingNetWeightKg: number;
  incomingGrossTareKg: number;
  netAcres: number;
  numberOfBags: number | null;
  totalSeedBags: number;
  stationRates: StationRates | null;
  /** Summary table footer: Σ Amount Payable (₹) for variety grading. */
  summaryAmountPayable: number;
  /** Farmer seed table footer: Σ totalSeedAmount (gate pass quantity × rate). */
  totalSeedAmount: number;
};

/** Amount rules for static particulars rows driven by `costDriver`. */
function resolveParticularsRowAmount(
  item: FinanceParticularRow,
  context: ParticularsAmountContext
): number | null {
  if (context.stationRates) {
    if (item.name === FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME) {
      return roundMax2(
        context.totalSeedBags * context.stationRates.seedDispatchRatePerBag
      );
    }
    if (item.name === FREIGHT_BUY_BACK_PARTICULAR_NAME) {
      const quintals =
        (Number(context.incomingGrossTareKg) || 0) / KG_PER_QUINTAL;
      return roundMax2(
        quintals * context.stationRates.seedBuyBackRatePerQuintal
      );
    }
  }

  const rate = Number(item.rate);
  if (!Number.isFinite(rate)) return null;

  switch (item.costDriver) {
    case 'Fixed':
      return roundMax2(rate);
    case 'Weight': {
      const netKg = Number(context.incomingNetWeightKg) || 0;
      const quintals = netKg / KG_PER_QUINTAL;
      return roundMax2(quintals * rate);
    }
    case 'Acres': {
      const acres = Number(context.netAcres) || 0;
      return roundMax2(acres * rate);
    }
    case 'IncomingBags':
    case 'GradingBags': {
      const bags = Number(context.numberOfBags) || 0;
      return roundMax2(bags * rate);
    }
    case 'Buy-back-payable':
      return roundMax2(
        (Number(context.summaryAmountPayable) || 0) -
          (Number(context.totalSeedAmount) || 0)
      );
    default:
      return null;
  }
}

function resolveGradingBagsForParticular(
  item: FinanceParticularRow,
  gradingTotals: GradingTableFinanceTotals,
  gradingTotals40MmAndAbove: GradingTableFinanceTotals,
  gradingTotalsBelow40: GradingTableFinanceTotals
): number {
  if (item.name === STORAGE_CHARGES_PARTICULAR_NAME) {
    return gradingTotalsBelow40.totalBags;
  }
  if (item.name === PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME) {
    return gradingTotals40MmAndAbove.totalBags;
  }
  return gradingTotals.totalBags;
}

function resolveParticularQuantityColumns(
  item: FinanceParticularRow,
  netAcres: number,
  incomingTotals: IncomingTableTotals,
  gradingTotals: GradingTableFinanceTotals,
  gradingTotals40MmAndAbove: GradingTableFinanceTotals,
  gradingTotalsBelow40: GradingTableFinanceTotals,
  stationRates: StationRates | null = null,
  totalSeedBags = 0,
  incomingGrossTareKg = 0
): Pick<FinancePlantingRow, 'areaPlantedAcres' | 'numberOfBags' | 'bagWeight'> {
  if (stationRates && item.name === FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME) {
    return {
      areaPlantedAcres: null,
      numberOfBags: totalSeedBags,
      bagWeight: null,
    };
  }

  if (stationRates && item.name === FREIGHT_BUY_BACK_PARTICULAR_NAME) {
    return {
      areaPlantedAcres: null,
      numberOfBags: null,
      bagWeight: incomingGrossTareKg > 0 ? incomingGrossTareKg : null,
    };
  }

  switch (item.costDriver) {
    case 'Acres':
      return {
        areaPlantedAcres: netAcres,
        numberOfBags: null,
        bagWeight: null,
      };
    case 'Weight':
      return {
        areaPlantedAcres: null,
        numberOfBags: null,
        bagWeight: incomingTotals.totalActualKg,
      };
    case 'IncomingBags':
      return {
        areaPlantedAcres: null,
        numberOfBags: incomingTotals.totalBags,
        bagWeight: null,
      };
    case 'GradingBags':
      return {
        areaPlantedAcres: null,
        numberOfBags: resolveGradingBagsForParticular(
          item,
          gradingTotals,
          gradingTotals40MmAndAbove,
          gradingTotalsBelow40
        ),
        bagWeight: null,
      };
    default:
      return {
        areaPlantedAcres: null,
        numberOfBags: null,
        bagWeight: null,
      };
  }
}

export function buildParticularsPlantingRows(
  varietyKey: string,
  incomingTotals: IncomingTableTotals = {
    totalBags: 0,
    totalActualKg: 0,
    totalNetKg: 0,
  },
  netAcres = 0,
  gradingTotals: GradingTableFinanceTotals = {
    totalBags: 0,
    totalActualWeightKg: 0,
  },
  gradingTotals40MmAndAbove: GradingTableFinanceTotals = {
    totalBags: 0,
    totalActualWeightKg: 0,
  },
  summaryAmountPayable = 0,
  preferences: PreferencesData | null | undefined = undefined,
  stationRates: StationRates | null = null,
  totalSeedBags = 0,
  incomingGrossTareKg = 0,
  totalSeedAmount = 0
): FinancePlantingRow[] {
  const fc = getFinanceConstants(preferences);
  const safeKey = varietyKey.replace(/[^a-zA-Z0-9_-]/g, '_');

  return fc.particulars.map((item, index) => {
    const gradingTotalsBelow40 = gradingTotalsBelow40Mm(
      gradingTotals,
      gradingTotals40MmAndAbove
    );
    const quantityColumns = resolveParticularQuantityColumns(
      item,
      netAcres,
      incomingTotals,
      gradingTotals,
      gradingTotals40MmAndAbove,
      gradingTotalsBelow40,
      stationRates,
      totalSeedBags,
      incomingGrossTareKg
    );

    const ratePerAcreOrBag =
      stationRates && item.name === FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME
        ? stationRates.seedDispatchRatePerBag
        : stationRates && item.name === FREIGHT_BUY_BACK_PARTICULAR_NAME
          ? stationRates.seedBuyBackRatePerQuintal
          : item.rate;

    return {
      id: `particular-${safeKey}-${index}`,
      particulars: item.name,
      ...quantityColumns,
      ratePerAcreOrBag,
      amount: resolveParticularsRowAmount(item, {
        incomingNetWeightKg: incomingTotals.totalActualKg,
        incomingGrossTareKg,
        netAcres,
        numberOfBags: quantityColumns.numberOfBags,
        totalSeedBags,
        stationRates,
        summaryAmountPayable,
        totalSeedAmount,
      }),
    };
  });
}

function aggregateGradingFinanceTotalsForPasses(
  gradingGatePasses: GradingGatePass[],
  preferences: PreferencesData | null | undefined,
  summaryRows?: GradingBagTypeQtySummaryRow[]
): GradingTableFinanceTotals {
  const rows =
    summaryRows ??
    prepareAccountingGradingSummary(gradingGatePasses, preferences ?? undefined)
      .rows;
  return {
    totalBags: aggregateGradingTableTotalBagsForPasses(gradingGatePasses),
    totalActualWeightKg: aggregateSummaryActualWeightKg(rows),
  };
}

function aggregateGradingFinanceTotals40MmAndAbove(
  gradingGatePasses: GradingGatePass[],
  preferences: PreferencesData | null | undefined,
  summaryRows?: GradingBagTypeQtySummaryRow[]
): GradingTableFinanceTotals {
  const fc = getFinanceConstants(preferences);
  const sizeBand = fc.gradingBagSizes40mmAndAbove;
  const rows =
    summaryRows ??
    prepareAccountingGradingSummary(gradingGatePasses, preferences ?? undefined)
      .rows;
  return {
    totalBags: aggregateGradingTableTotalBagsForPassesAndSizes(
      gradingGatePasses,
      sizeBand
    ),
    totalActualWeightKg: aggregateSummaryActualWeightKgForSizeLabels(
      rows,
      sizeBand
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

export function buildFinanceReportGroups(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined,
  gradingPasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined,
  stationRates: StationRates | null = null
): FinanceReportGroups {
  const seeds = farmerSeeds ?? [];
  const incoming = incomingPasses ?? [];
  const grading = gradingPasses ?? [];
  const keysToRender = collectFinanceVarietyKeys(seeds, incoming, grading);

  const plantingGroups: FinancePlantingVarietyGroup[] = [];
  const gradingGroups: FinanceGradingVarietyGroup[] = [];

  for (const varietyKey of keysToRender) {
    const gradingForVariety = grading.filter(
      (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
    );
    const summaryRows = prepareAccountingGradingSummary(
      gradingForVariety,
      preferences
    ).rows;

    const gradingRows = buildFinanceGradingRowsForPasses(
      gradingForVariety,
      varietyKey,
      preferences,
      summaryRows
    );
    gradingGroups.push({
      varietyKey,
      varietyLabel: displayAccountingVarietyLabel(varietyKey),
      gradingRows,
      totals: computeFinanceGradingVarietyTotals(gradingRows),
    });

    const seedsForVariety = seeds.filter(
      (p) => normalizeAccountingVarietyKey(p.variety) === varietyKey
    );
    const seedRows = prepareDataForFarmerSeedTable(seedsForVariety);
    const netAcres = aggregateVarietyNetAcres(seedRows);
    const totalSeedAmount = aggregateTotalSeedAmount(seedRows);
    const totalSeedBags = seedRows.reduce(
      (sum, row) => sum + (Number(row.totalBagsGiven) || 0),
      0
    );
    const incomingRows = getIncomingRowsForVariety(
      varietyKey,
      incoming,
      grading
    );
    const incomingTotals = aggregateIncomingTableTotals(incomingRows);
    const varietyIncomingTotals = aggregateIncomingTableTotals(
      getAllIncomingRowsForVariety(varietyKey, incoming)
    );
    const gradingTotals = aggregateGradingFinanceTotalsForPasses(
      gradingForVariety,
      preferences,
      summaryRows
    );
    const gradingTotals40MmAndAbove = aggregateGradingFinanceTotals40MmAndAbove(
      gradingForVariety,
      preferences,
      summaryRows
    );
    const summaryAmountPayable = aggregateSummaryAmountPayable(summaryRows);

    const seedRowsMapped = seedRows.map((row) =>
      mapFarmerSeedRowToFinancePlantingRow(row, varietyKey, preferences)
    );
    const particularsRows = buildParticularsPlantingRows(
      varietyKey,
      incomingTotals,
      netAcres,
      gradingTotals,
      gradingTotals40MmAndAbove,
      summaryAmountPayable,
      preferences,
      stationRates,
      totalSeedBags,
      varietyIncomingTotals.totalNetKg,
      totalSeedAmount
    );

    plantingGroups.push({
      varietyKey,
      varietyLabel: displayAccountingVarietyLabel(varietyKey),
      seedRows: seedRowsMapped,
      particularsRows,
      netAmount: computePlantingVarietyNetAmount(
        seedRowsMapped,
        particularsRows,
        preferences
      ),
    });
  }

  return { plantingGroups, gradingGroups };
}

export function buildFinanceGradingVarietyGroups(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined,
  gradingPasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined
): FinanceGradingVarietyGroup[] {
  return buildFinanceReportGroups(
    farmerSeeds,
    incomingPasses,
    gradingPasses,
    preferences
  ).gradingGroups;
}

export function buildFinancePlantingVarietyGroups(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined,
  gradingPasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined,
  stationRates: StationRates | null = null
): FinancePlantingVarietyGroup[] {
  return buildFinanceReportGroups(
    farmerSeeds,
    incomingPasses,
    gradingPasses,
    preferences,
    stationRates
  ).plantingGroups;
}
