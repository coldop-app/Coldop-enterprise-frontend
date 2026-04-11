import {
  STANDARD_BAGS_PER_ACRE,
  type Variety,
} from '@/components/forms/grading/constants';
import type {
  FarmerSeedBagSize,
  FarmerSeedEntryByStorageLink,
} from '@/types/farmer-seed';
import type { SeedAmountPayableColumnId } from '@/components/pdf/SeedAmountPayableTablePdf';
import {
  getFarmerSeedEntriesForVarietyOrdered,
  mergeFarmerSeedBagsByName,
} from '@/components/pdf/seedAmountPayablePdfHelpers';
import { formatOrdinalDateEn } from '@/lib/helpers';

const EMPTY = '—';

export type PreparedSeedAmountPayableData = {
  varietyLabel: string;
  /** One row per bag line per seed-given record (entries kept separate). */
  detailRowCells: string[][];
  /**
   * Variety-wise clubbed rows (bag names merged). Populated when there is more than one
   * seed-given record for this variety so totals are not double-counted with detail.
   */
  clubbedRowCells: string[][];
};

function formatCommaNumber(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function getStandardBagsPerAcreNumber(
  variety: string | null | undefined
): number | null {
  const t = (variety ?? '').trim();
  if (!t) return null;
  for (const key of Object.keys(STANDARD_BAGS_PER_ACRE) as Variety[]) {
    if (key.toLowerCase() === t.toLowerCase()) {
      const n = STANDARD_BAGS_PER_ACRE[key];
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

function getCellText(
  colId: SeedAmountPayableColumnId,
  bag: {
    name: string;
    quantity: number;
    rate: number;
    acres?: number;
    amountReceived?: number;
  } | null,
  variety: string | null,
  summaryAmountPayableTotal?: number,
  options?: { entryDate?: string }
): string {
  const getBagAcresNumber = () => {
    if (!bag || !Number.isFinite(bag.acres) || (bag.acres ?? 0) <= 0) {
      return null;
    }
    return bag.acres as number;
  };
  const getBagsPerAcreNumber = () => {
    const bagAcres = getBagAcresNumber();
    if (
      bag != null &&
      bagAcres != null &&
      Number.isFinite(bag.quantity) &&
      bag.quantity > 0 &&
      bagAcres > 0
    ) {
      return bag.quantity / bagAcres;
    }
    return getStandardBagsPerAcreNumber(variety);
  };
  const getLineAmountNumber = () => {
    if (!bag || !Number.isFinite(bag.quantity) || !Number.isFinite(bag.rate))
      return null;
    const total = bag.quantity * bag.rate;
    return Number.isFinite(total) ? total : null;
  };
  const getSeedBalance = () => {
    const amount = getLineAmountNumber();
    if (amount == null) return null;
    const received =
      typeof bag?.amountReceived === 'number' &&
      Number.isFinite(bag.amountReceived)
        ? bag.amountReceived
        : 0;
    const balance = amount - received;
    return Number.isFinite(balance) ? balance : null;
  };

  if (colId === 'amtPayable') {
    if (
      summaryAmountPayableTotal == null ||
      !Number.isFinite(summaryAmountPayableTotal)
    )
      return EMPTY;
    if (summaryAmountPayableTotal <= 0) return EMPTY;
    return summaryAmountPayableTotal.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (!bag) {
    if (colId === 'bagsPerAcre') {
      const n = getStandardBagsPerAcreNumber(variety);
      return n == null ? EMPTY : String(n);
    }
    return EMPTY;
  }

  switch (colId) {
    case 'seedAmountPayable':
      return bag.name?.trim() ? bag.name : EMPTY;
    case 'bagsForPlantation':
      return Number.isFinite(bag.quantity) ? String(bag.quantity) : EMPTY;
    case 'bagsPerAcre': {
      const n = getBagsPerAcreNumber();
      return n == null ? EMPTY : formatCommaNumber(n);
    }
    case 'areaPlanted': {
      const bagAcres = getBagAcresNumber();
      if (bagAcres != null) return formatCommaNumber(bagAcres);
      const bpa = getStandardBagsPerAcreNumber(variety);
      if (bpa == null || !Number.isFinite(bag.quantity) || bag.quantity <= 0) {
        return EMPTY;
      }
      return formatCommaNumber(bag.quantity / bpa);
    }
    case 'rate':
      if (!Number.isFinite(bag.rate)) return EMPTY;
      return Number.isInteger(bag.rate)
        ? String(bag.rate)
        : bag.rate.toFixed(2);
    case 'amount': {
      const n = getLineAmountNumber();
      return n == null ? EMPTY : formatCommaNumber(n);
    }
    case 'date':
      return formatOrdinalDateEn(options?.entryDate);
    case 'amountReceived':
      return typeof bag.amountReceived === 'number' &&
        Number.isFinite(bag.amountReceived)
        ? formatCommaNumber(bag.amountReceived)
        : EMPTY;
    case 'seedAmountBalance': {
      const n = getSeedBalance();
      return n == null ? EMPTY : formatCommaNumber(n);
    }
    case 'seedBalance': {
      const n = getSeedBalance();
      return n == null ? EMPTY : formatCommaNumber(n);
    }
    case 'netAmt': {
      if (
        summaryAmountPayableTotal == null ||
        !Number.isFinite(summaryAmountPayableTotal)
      )
        return EMPTY;
      const bal = getSeedBalance();
      if (bal == null) return EMPTY;
      return formatCommaNumber(summaryAmountPayableTotal - bal);
    }
    default:
      return EMPTY;
  }
}

function buildRowCellsForBags(
  bags: Array<FarmerSeedBagSize | null>,
  columnIds: SeedAmountPayableColumnId[],
  variety: string | null,
  summaryAmountPayableTotal: number | undefined,
  entryDate: string | undefined
): string[][] {
  const rowsSource = bags.length
    ? bags
    : ([null] as Array<FarmerSeedBagSize | null>);
  return rowsSource.map((bag) =>
    columnIds.map((colId) =>
      getCellText(colId, bag, variety, summaryAmountPayableTotal, {
        entryDate,
      })
    )
  );
}

export function prepareSeedAmountPayableTableData(params: {
  variety: string | null;
  farmerSeedEntries?: FarmerSeedEntryByStorageLink[] | null;
  summaryAmountPayableTotal?: number;
  columnIds: SeedAmountPayableColumnId[];
}): PreparedSeedAmountPayableData {
  const { variety, farmerSeedEntries, summaryAmountPayableTotal, columnIds } =
    params;
  const varietyLabel = variety?.trim() ? variety : '—';

  const matchingEntries = getFarmerSeedEntriesForVarietyOrdered(
    variety,
    farmerSeedEntries
  );

  const detailRowCells: string[][] = [];
  for (const entry of matchingEntries) {
    const bags = entry.bagSizes ?? [];
    for (const bag of bags) {
      detailRowCells.push(
        columnIds.map((colId) =>
          getCellText(colId, bag, variety, summaryAmountPayableTotal, {
            entryDate: entry.date,
          })
        )
      );
    }
  }

  const emptyDetailPlaceholder: string[][] =
    detailRowCells.length > 0
      ? []
      : [
          columnIds.map((colId) =>
            getCellText(colId, null, variety, summaryAmountPayableTotal, {})
          ),
        ];

  const detailFinal =
    detailRowCells.length > 0 ? detailRowCells : emptyDetailPlaceholder;

  const allBags = matchingEntries.flatMap((e) => e.bagSizes ?? []);
  const clubbedBags =
    matchingEntries.length > 1
      ? mergeFarmerSeedBagsByName(allBags)
      : ([] as FarmerSeedBagSize[]);

  const clubbedRowCells =
    clubbedBags.length > 0
      ? buildRowCellsForBags(
          clubbedBags,
          columnIds,
          variety,
          summaryAmountPayableTotal,
          undefined
        )
      : [];

  return { varietyLabel, detailRowCells: detailFinal, clubbedRowCells };
}
