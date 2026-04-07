import {
  STANDARD_BAGS_PER_ACRE,
  type Variety,
} from '@/components/forms/grading/constants';
import type { FarmerSeedEntryByStorageLink } from '@/types/farmer-seed';
import type { SeedAmountPayableColumnId } from '@/components/pdf/SeedAmountPayableTablePdf';
import { getFarmerSeedBagSizesForVariety } from '@/components/pdf/seedAmountPayablePdfHelpers';

const EMPTY = '—';

export type PreparedSeedAmountPayableData = {
  varietyLabel: string;
  rowCells: string[][];
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
    amountReceived?: number;
  } | null,
  variety: string | null,
  summaryAmountPayableTotal?: number
): string {
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
      const n = getStandardBagsPerAcreNumber(variety);
      return n == null ? EMPTY : String(n);
    }
    case 'areaPlanted': {
      const bpa = getStandardBagsPerAcreNumber(variety);
      if (bpa == null || !Number.isFinite(bag.quantity) || bag.quantity <= 0)
        return EMPTY;
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
      return EMPTY;
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

export function prepareSeedAmountPayableTableData(params: {
  variety: string | null;
  farmerSeedEntries?: FarmerSeedEntryByStorageLink[] | null;
  summaryAmountPayableTotal?: number;
  columnIds: SeedAmountPayableColumnId[];
}): PreparedSeedAmountPayableData {
  const { variety, farmerSeedEntries, summaryAmountPayableTotal, columnIds } =
    params;
  const bagRows = getFarmerSeedBagSizesForVariety(variety, farmerSeedEntries);
  const varietyLabel = variety?.trim() ? variety : '—';

  const rowsSource = bagRows.length
    ? bagRows
    : ([null] as Array<(typeof bagRows)[number] | null>);
  const rowCells = rowsSource.map((bag) =>
    columnIds.map((colId) =>
      getCellText(colId, bag, variety, summaryAmountPayableTotal)
    )
  );

  return { varietyLabel, rowCells };
}
