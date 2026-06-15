import { roundMax2 } from '@/components/daybook/grading-calculations';
import {
  buildAccountingReportVarietySections,
  incomingIdsLinkedFromGradings,
  type AccountingReportVarietySection,
} from '@/components/people/reports/accounting-report/accounting-report-variety-sections';
import type { FinanceGradingRow, FinancePlantingRow } from './columns';
import {
  aggregateIncomingTableTotals,
  prepareDataForIncomingTable,
  type IncomingTableTotals,
} from '@/components/people/reports/helpers/incoming-prepare';
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
  aggregateSummaryWeightReceivedKg,
  prepareAccountingGradingSummary,
  summaryActualWeightKgForSizeLabel,
  type GradingBagTypeQtySummaryRow,
} from '@/components/people/reports/helpers/summary-prepare';
import {
  aggregateTotalSeedAmount,
  prepareDataForFarmerSeedTable,
  type FarmerSeedRow,
} from '@/components/people/reports/helpers/seed-prepare';
import {
  getFinanceConstants,
  type FinanceConstantsData,
  type FinanceParticularRow,
  type PreferencesData,
} from '@/services/store-admin/preferences/useGetPreferences';
import type {
  FarmerSeedGatePass,
  StationRates,
} from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';
import type { GradingGatePass } from '@/types/grading-gate-pass';

const PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME =
  'Paladaar Charges after loading after grading';
const STORAGE_CHARGES_PARTICULAR_NAME = 'Storage Charges';
const FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME = 'Freight: Seed (Dispatched)';
const FREIGHT_BUY_BACK_PARTICULAR_NAME =
  'Freight: Buy Back material (Trolly Charges Rs. 20/- Qtl)';
const KG_PER_QUINTAL = 100;
const GRADING_SHORTAGE_RATE = 0.06;
const POST_STORAGE_BAG_KG = 50;

export type FinancePlantingVarietyGroup = {
  varietyKey: string;
  varietyLabel: string;
  seedRows: FinancePlantingRow[];
  particularsRows: FinancePlantingRow[];
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

export type FinanceReportRowStats = {
  varieties: number;
  planting: number;
  grading: number;
};

export type FinanceReportData = FinanceReportGroups & {
  summary: FinanceReportSummary;
  varietySummaries: FinanceVarietySummary[];
  rowStats: FinanceReportRowStats;
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
  netAmountPerAcre: number | null;
};

export type FinanceVarietySummary = {
  varietyKey: string;
  varietyLabel: string;
  netRevenue: number;
  totalAcresPlanted: number;
  netAmountPerAcre: number | null;
};

export type FinanceReportTotals = {
  totalIncomingBags: number;
  totalGradingBags: number;
  incomingNetWeightWithBaradanaKg: number;
  incomingNetWeightWithoutBaradanaKg: number;
  netGradingWeightKg: number;
  totalAmountPayable: number;
  totalSeedAmount: number;
};

export type ComputeFinanceReportTotalsInput = {
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined;
  gradingPasses: GradingGatePass[] | null | undefined;
  farmerSeeds: FarmerSeedGatePass[] | null | undefined;
  preferences: PreferencesData | null | undefined;
  selectedGradingPassIds?: Set<string> | null;
};

type VarietyFinanceMetrics = {
  varietyKey: string;
  gradingForVariety: GradingGatePass[];
  summaryRows: GradingBagTypeQtySummaryRow[];
  incomingTotals: IncomingTableTotals;
  netAcres: number;
  totalSeedBags: number;
  totalSeedAmount: number;
  totalGradingWeightWithBardanaKg: number;
  gradingTotals: GradingTableFinanceTotals;
  gradingTotals40MmAndAbove: GradingTableFinanceTotals;
  gradingTotalsBelow40: GradingTableFinanceTotals;
  summaryAmountPayable: number;
  seedRowsMapped: FinancePlantingRow[];
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

function isGradingSizeBelow40Mm(
  sizeLabel: string,
  fc: FinanceConstantsData
): boolean {
  return !gradingSizes40mmNormSet(fc).has(normalizeSizeToken(sizeLabel));
}

function filterGradingPasses(
  gradingPasses: GradingGatePass[],
  selectedGradingPassIds: Set<string> | null | undefined
): GradingGatePass[] {
  if (selectedGradingPassIds == null) return gradingPasses;
  return gradingPasses.filter((pass) => selectedGradingPassIds.has(pass._id));
}

function filterIncomingLinkedToGradings(
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[],
  gradingPasses: GradingGatePass[]
): IncomingGatePassByFarmerStorageLinkItem[] {
  const linkedIncomingIds = incomingIdsLinkedFromGradings(gradingPasses);
  return incomingPasses.filter((pass) => linkedIncomingIds.has(pass._id));
}

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

/** Planting seed lines: bags from gate passes; rate/amount from preferences (actual cost without subsidy). */
function mapFarmerSeedRowToFinancePlantingRow(
  seedRow: FarmerSeedRow,
  varietyKey: string,
  preferences: PreferencesData | null | undefined
): FinancePlantingRow {
  const rate = resolveActualCostWithoutSubsidyRate(
    varietyKey,
    seedRow.seedSize,
    preferences
  );
  const bags = Number(seedRow.totalBagsGiven) || 0;
  const amount = rate != null ? roundMax2(bags * rate) : null;

  return {
    id: seedRow.id,
    particulars: seedRow.seedSize,
    areaPlantedAcres: seedRow.areaPlantedAcres,
    numberOfBags: seedRow.totalBagsGiven,
    bagWeight: null,
    ratePerAcreOrBag: rate,
    amount,
  };
}

function aggregateMappedSeedAmount(rows: FinancePlantingRow[]): number {
  let sum = 0;
  for (const row of rows) {
    sum += Number(row.amount) || 0;
  }
  return roundMax2(sum);
}

export function aggregateVarietyNetAcres(
  seedRows: { areaPlantedAcres?: number | null }[]
): number {
  let sum = 0;
  for (const row of seedRows) {
    sum += Number(row.areaPlantedAcres) || 0;
  }
  return roundMax2(sum);
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

  return visibleLabels.map((label) => {
    const actualWeightKg = summaryActualWeightKgForSizeLabel(
      actualWeightKgBySize,
      label
    );
    const weightStoredOrDispatchedKg =
      actualWeightKg > 0 ? actualWeightKg : null;
    const readyBagsPostStorage50kg =
      weightStoredOrDispatchedKg != null
        ? roundMax2(weightStoredOrDispatchedKg / POST_STORAGE_BAG_KG)
        : null;
    const shortageAtSixPercent =
      readyBagsPostStorage50kg != null && isGradingSizeBelow40Mm(label, fc)
        ? Math.round(readyBagsPostStorage50kg * GRADING_SHORTAGE_RATE)
        : null;
    const afterShortageBag =
      readyBagsPostStorage50kg != null
        ? Math.round(readyBagsPostStorage50kg - (shortageAtSixPercent ?? 0))
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
    shortageAtSixPercent: sumFinanceGradingNumeric(
      rows,
      (r) => r.shortageAtSixPercent
    ),
    afterShortageBag: sumFinanceGradingNumeric(rows, (r) => r.afterShortageBag),
    saleAmount: roundMax2(sumFinanceGradingNumeric(rows, (r) => r.saleAmount)),
  };
}

function resolveGradingBagsForParticular(
  item: FinanceParticularRow,
  metrics: VarietyFinanceMetrics
): number {
  if (item.name === STORAGE_CHARGES_PARTICULAR_NAME) {
    return metrics.gradingTotalsBelow40.totalBags;
  }
  if (item.name === PALADAAR_AFTER_LOADING_GRADING_PARTICULAR_NAME) {
    return metrics.gradingTotals40MmAndAbove.totalBags;
  }
  return metrics.gradingTotals.totalBags;
}

function resolveParticularQuantityColumns(
  item: FinanceParticularRow,
  metrics: VarietyFinanceMetrics
): Pick<FinancePlantingRow, 'areaPlantedAcres' | 'numberOfBags' | 'bagWeight'> {
  switch (item.costDriver) {
    case 'Acres':
      return {
        areaPlantedAcres: metrics.netAcres,
        numberOfBags: null,
        bagWeight: null,
      };
    case 'IncomingWeightWithoutBardana':
      return {
        areaPlantedAcres: null,
        numberOfBags: null,
        bagWeight: metrics.incomingTotals.totalActualKg,
      };
    case 'IncomingWeightWithBardana':
      return {
        areaPlantedAcres: null,
        numberOfBags: null,
        bagWeight: metrics.incomingTotals.totalNetKg,
      };
    case 'GradingWeightWithoutBardana':
      return {
        areaPlantedAcres: null,
        numberOfBags: null,
        bagWeight: metrics.gradingTotals.totalActualWeightKg,
      };
    case 'GradingWeightWithBardana':
      return {
        areaPlantedAcres: null,
        numberOfBags: null,
        bagWeight: metrics.totalGradingWeightWithBardanaKg,
      };
    case 'IncomingBags':
      return {
        areaPlantedAcres: null,
        numberOfBags: metrics.incomingTotals.totalBags,
        bagWeight: null,
      };
    case 'GradingBags':
      return {
        areaPlantedAcres: null,
        numberOfBags: resolveGradingBagsForParticular(item, metrics),
        bagWeight: null,
      };
    case 'SeedBags':
      return {
        areaPlantedAcres: null,
        numberOfBags: metrics.totalSeedBags,
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

function amountFromWeightKgPerQuintal(kg: number, rate: number): number {
  const netKg = Number(kg) || 0;
  return roundMax2((netKg / KG_PER_QUINTAL) * rate);
}

function normalizeParticularName(name: string): string {
  return name.trim().toLowerCase();
}

function isFreightSeedDispatchedParticular(
  item: FinanceParticularRow
): boolean {
  const name = normalizeParticularName(item.name);
  return (
    name === normalizeParticularName(FREIGHT_SEED_DISPATCHED_PARTICULAR_NAME) ||
    name.startsWith('freight: seed')
  );
}

function isFreightBuyBackParticular(item: FinanceParticularRow): boolean {
  const name = normalizeParticularName(item.name);
  return (
    name === normalizeParticularName(FREIGHT_BUY_BACK_PARTICULAR_NAME) ||
    name.startsWith('freight: buy back') ||
    (item.costDriver === 'IncomingWeightWithoutBardana' &&
      name.includes('freight') &&
      name.includes('buy back'))
  );
}

function resolveParticularRate(
  item: FinanceParticularRow,
  stationRates: StationRates | null | undefined
): number {
  if (stationRates) {
    if (isFreightSeedDispatchedParticular(item)) {
      return stationRates.seedDispatchRatePerBag;
    }
    if (isFreightBuyBackParticular(item)) {
      return stationRates.seedBuyBackRatePerQuintal;
    }
  }
  return Number(item.rate);
}

function resolveParticularsRowAmount(
  item: FinanceParticularRow,
  metrics: VarietyFinanceMetrics,
  numberOfBags: number | null,
  rate: number
): number | null {
  if (!Number.isFinite(rate)) return null;

  switch (item.costDriver) {
    case 'Fixed':
      return roundMax2(rate);
    case 'IncomingWeightWithoutBardana':
      return amountFromWeightKgPerQuintal(
        metrics.incomingTotals.totalActualKg,
        rate
      );
    case 'IncomingWeightWithBardana':
      return amountFromWeightKgPerQuintal(
        metrics.incomingTotals.totalNetKg,
        rate
      );
    case 'GradingWeightWithoutBardana':
      return amountFromWeightKgPerQuintal(
        metrics.gradingTotals.totalActualWeightKg,
        rate
      );
    case 'GradingWeightWithBardana':
      return amountFromWeightKgPerQuintal(
        metrics.totalGradingWeightWithBardanaKg,
        rate
      );
    case 'Acres':
      return roundMax2((Number(metrics.netAcres) || 0) * rate);
    case 'IncomingBags':
    case 'GradingBags':
    case 'SeedBags':
      return roundMax2((Number(numberOfBags) || 0) * rate);
    case 'Buy-back-payable':
      return roundMax2(metrics.summaryAmountPayable);
    case 'NetAmountPayable':
      return roundMax2(metrics.summaryAmountPayable - metrics.totalSeedAmount);
    default:
      return null;
  }
}

function buildParticularsPlantingRows(
  metrics: VarietyFinanceMetrics,
  preferences: PreferencesData | null | undefined,
  stationRates: StationRates | null | undefined = undefined
): FinancePlantingRow[] {
  const fc = getFinanceConstants(preferences);
  const safeKey = metrics.varietyKey.replace(/[^a-zA-Z0-9_-]/g, '_');

  return fc.particulars.map((item, index) => {
    const quantityColumns = resolveParticularQuantityColumns(item, metrics);
    const rate = resolveParticularRate(item, stationRates);

    return {
      id: `particular-${safeKey}-${index}`,
      particulars: item.name,
      ...quantityColumns,
      ratePerAcreOrBag: rate,
      amount: resolveParticularsRowAmount(
        item,
        metrics,
        quantityColumns.numberOfBags,
        rate
      ),
    };
  });
}

function computeVarietyMetricsFromSection(
  section: AccountingReportVarietySection,
  preferences: PreferencesData | null | undefined
): VarietyFinanceMetrics {
  const {
    varietyKey,
    incomingRows,
    summaryRows,
    farmerSeedRows,
    gradingGatePassesForSummary: gradingForVariety,
  } = section;

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

  const seedRowsMapped = farmerSeedRows.map((row) =>
    mapFarmerSeedRowToFinancePlantingRow(row, varietyKey, preferences)
  );

  return {
    varietyKey,
    gradingForVariety,
    summaryRows,
    incomingTotals: aggregateIncomingTableTotals(incomingRows),
    netAcres: aggregateVarietyNetAcres(farmerSeedRows),
    totalSeedBags: farmerSeedRows.reduce(
      (sum, row) => sum + (Number(row.totalBagsGiven) || 0),
      0
    ),
    totalSeedAmount: aggregateMappedSeedAmount(seedRowsMapped),
    totalGradingWeightWithBardanaKg:
      aggregateSummaryWeightReceivedKg(summaryRows),
    gradingTotals,
    gradingTotals40MmAndAbove,
    gradingTotalsBelow40: gradingTotalsBelow40Mm(
      gradingTotals,
      gradingTotals40MmAndAbove
    ),
    summaryAmountPayable: aggregateSummaryAmountPayable(summaryRows),
    seedRowsMapped,
  };
}

/** Sum of all Amount column values in a variety's planting table (seed + particulars rows). */
export function sumPlantingVarietyRowAmounts(
  seedRows: FinancePlantingRow[],
  particularsRows: FinancePlantingRow[]
): number {
  let sum = 0;
  for (const row of [...seedRows, ...particularsRows]) {
    sum += Number(row.amount) || 0;
  }
  return roundMax2(sum);
}

export function computeFinanceReportRowStats(
  plantingGroups: FinancePlantingVarietyGroup[],
  gradingGroups: FinanceGradingVarietyGroup[]
): FinanceReportRowStats {
  let planting = 0;
  for (const group of plantingGroups) {
    planting += group.seedRows.length + group.particularsRows.length;
  }
  let grading = 0;
  for (const group of gradingGroups) {
    grading += group.gradingRows.length;
  }
  return {
    varieties: plantingGroups.length,
    planting,
    grading,
  };
}

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

  // Net revenue = total grading table sale amount − total planting table amount.
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

export function computeFinanceVarietySummaries(
  plantingGroups: FinancePlantingVarietyGroup[],
  gradingGroups: FinanceGradingVarietyGroup[]
): FinanceVarietySummary[] {
  const gradingByKey = new Map(
    gradingGroups.map((group) => [group.varietyKey, group])
  );

  return plantingGroups.map((planting) => {
    const grading = gradingByKey.get(planting.varietyKey);
    const saleAmount = grading?.totals.saleAmount ?? 0;
    const netRevenue = roundMax2(saleAmount - planting.netAmount);
    const totalAcresPlanted = aggregateVarietyNetAcres(planting.seedRows);
    const netAmountPerAcre =
      totalAcresPlanted > 0 ? roundMax2(netRevenue / totalAcresPlanted) : null;

    return {
      varietyKey: planting.varietyKey,
      varietyLabel: planting.varietyLabel,
      netRevenue,
      totalAcresPlanted,
      netAmountPerAcre,
    };
  });
}

export function buildFinanceReportGroups(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined,
  gradingPasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined,
  stationRates: StationRates | null | undefined = undefined
): FinanceReportGroups {
  const seeds = farmerSeeds ?? [];
  const incoming = incomingPasses ?? [];
  const grading = gradingPasses ?? [];
  const linkedIncoming = filterIncomingLinkedToGradings(incoming, grading);
  const varietySections = buildAccountingReportVarietySections(
    grading,
    linkedIncoming,
    seeds,
    preferences
  );

  const plantingGroups: FinancePlantingVarietyGroup[] = [];
  const gradingGroups: FinanceGradingVarietyGroup[] = [];

  for (const section of varietySections) {
    const metrics = computeVarietyMetricsFromSection(section, preferences);
    const { varietyKey } = section;

    const gradingRows = buildFinanceGradingRowsForPasses(
      metrics.gradingForVariety,
      varietyKey,
      preferences,
      metrics.summaryRows
    );
    gradingGroups.push({
      varietyKey,
      varietyLabel: section.varietyLabel,
      gradingRows,
      totals: computeFinanceGradingVarietyTotals(gradingRows),
    });

    const particularsRows = buildParticularsPlantingRows(
      metrics,
      preferences,
      stationRates
    );

    plantingGroups.push({
      varietyKey,
      varietyLabel: section.varietyLabel,
      seedRows: metrics.seedRowsMapped,
      particularsRows,
      netAmount: sumPlantingVarietyRowAmounts(
        metrics.seedRowsMapped,
        particularsRows
      ),
    });
  }

  return { plantingGroups, gradingGroups };
}

export function buildFinanceReportData(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined,
  incomingPasses: IncomingGatePassByFarmerStorageLinkItem[] | null | undefined,
  gradingPasses: GradingGatePass[] | null | undefined,
  preferences: PreferencesData | null | undefined = undefined,
  stationRates: StationRates | null | undefined = undefined
): FinanceReportData {
  const { plantingGroups, gradingGroups } = buildFinanceReportGroups(
    farmerSeeds,
    incomingPasses,
    gradingPasses,
    preferences,
    stationRates
  );

  return {
    plantingGroups,
    gradingGroups,
    summary: computeFinanceReportSummary(plantingGroups, gradingGroups),
    varietySummaries: computeFinanceVarietySummaries(
      plantingGroups,
      gradingGroups
    ),
    rowStats: computeFinanceReportRowStats(plantingGroups, gradingGroups),
  };
}

function computeTotalFarmerSeedAmount(
  farmerSeeds: FarmerSeedGatePass[]
): number {
  return aggregateTotalSeedAmount(prepareDataForFarmerSeedTable(farmerSeeds));
}

export function computeFinanceReportTotals(
  input: ComputeFinanceReportTotalsInput
): FinanceReportTotals {
  const incoming = input.incomingPasses ?? [];
  const grading = filterGradingPasses(
    input.gradingPasses ?? [],
    input.selectedGradingPassIds
  );
  const farmerSeeds = input.farmerSeeds ?? [];
  const preferences = input.preferences;

  const linkedIncoming = filterIncomingLinkedToGradings(incoming, grading);
  const incomingRows = prepareDataForIncomingTable(linkedIncoming);
  const incomingTotals = aggregateIncomingTableTotals(incomingRows);

  const summaryRows = prepareAccountingGradingSummary(
    grading,
    preferences
  ).rows;

  return {
    totalIncomingBags: incomingTotals.totalBags,
    totalGradingBags: aggregateGradingTableTotalBagsForPasses(grading),
    incomingNetWeightWithBaradanaKg: incomingTotals.totalNetKg,
    incomingNetWeightWithoutBaradanaKg: incomingTotals.totalActualKg,
    netGradingWeightKg: aggregateSummaryActualWeightKg(summaryRows),
    totalAmountPayable: aggregateSummaryAmountPayable(summaryRows),
    totalSeedAmount: computeTotalFarmerSeedAmount(farmerSeeds),
  };
}
