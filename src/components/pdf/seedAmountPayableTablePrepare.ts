import {
  STANDARD_BAGS_PER_ACRE,
  type Variety,
} from '@/components/forms/grading/constants';
import type { FarmerSeedEntryByStorageLink } from '@/types/farmer-seed';
import type { SeedAmountPayableColumnId } from '@/components/pdf/SeedAmountPayableTablePdf';
import {
  dedupeFarmerSeedEntriesById,
  getFarmerSeedEntriesForVarietyOrdered,
} from '@/components/pdf/seedAmountPayablePdfHelpers';
import { formatOrdinalDateEn } from '@/lib/helpers';

const EMPTY = '—';

export type PreparedSeedAmountPayableData = {
  varietyLabel: string;
  /** One row per bag line per seed-given record (entries kept separate). */
  detailRowCells: string[][];
  /**
   * Global amount payable (same value shown on each row’s AMT PAYABLE column).
   * PDF total row must not sum this column across rows.
   */
  summaryAmountPayableTotal?: number;
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
  } | null,
  variety: string | null,
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
  if (!bag) {
    if (colId === 'bagsPerAcre') {
      const n = getStandardBagsPerAcreNumber(variety);
      return n == null ? EMPTY : String(n);
    }
    return EMPTY;
  }

  switch (colId) {
    case 'date':
      return formatOrdinalDateEn(options?.entryDate);
    case 'seedAmountPayable':
      return bag.name?.trim() ? bag.name : EMPTY;
    case 'bagsForPlantation':
      return Number.isFinite(bag.quantity) ? String(bag.quantity) : EMPTY;
    case 'bagsPerAcre': {
      const n = getBagsPerAcreNumber();
      return n == null ? EMPTY : formatCommaNumber(n);
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
  const varietyLabel = variety?.trim() ? variety : '—';

  const matchingEntries = dedupeFarmerSeedEntriesById(
    getFarmerSeedEntriesForVarietyOrdered(variety, farmerSeedEntries)
  );

  const detailRowCells: string[][] = [];
  for (const entry of matchingEntries) {
    const bags = entry.bagSizes ?? [];
    for (const bag of bags) {
      detailRowCells.push(
        columnIds.map((colId) =>
          getCellText(colId, bag, variety, {
            entryDate: entry.date,
          })
        )
      );
    }
  }

  const emptyDetailPlaceholder: string[][] =
    detailRowCells.length > 0
      ? []
      : [columnIds.map((colId) => getCellText(colId, null, variety, {}))];

  const detailFinal =
    detailRowCells.length > 0 ? detailRowCells : emptyDetailPlaceholder;

  return {
    varietyLabel,
    detailRowCells: detailFinal,
    summaryAmountPayableTotal,
  };
}
