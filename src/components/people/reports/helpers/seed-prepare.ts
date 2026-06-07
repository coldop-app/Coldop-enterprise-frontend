import { roundMax2 } from '@/components/daybook/grading-calculations';
import type { FarmerSeedGatePass } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';

export type FarmerSeedRow = {
  id: string;
  date: string;
  seedSize: string;
  /** Bags issued for this line (`bagSizes[].quantity`). */
  totalBagsGiven: number;
  /** Acres planted for this line (`bagSizes[].acres`). */
  areaPlantedAcres: number;
  bagsPerAcre: number;
  seedRatePerBag: number;
  totalSeedAmount: number;
};

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Converts farmer seed gate passes into per-size table rows.
 * Bags/acre = quantity / acres; total amount = quantity * rate.
 * Omits bag-size lines where `quantity` is 0 so empty brackets do not appear in reports.
 */
export function prepareDataForFarmerSeedTable(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined
): FarmerSeedRow[] {
  const seedEntries = farmerSeeds ?? [];
  if (seedEntries.length === 0) return [];

  const rows: FarmerSeedRow[] = [];

  for (const entry of seedEntries) {
    const bagSizes = entry.bagSizes ?? [];
    const dateLabel = formatDate(entry.date);
    for (let index = 0; index < bagSizes.length; index += 1) {
      const bag = bagSizes[index];
      const quantity = Number(bag.quantity) || 0;
      if (quantity === 0) continue;

      const acres = Number(bag.acres) || 0;
      const rate = Number(bag.rate) || 0;

      rows.push({
        id: `${entry._id}__${index}`,
        date: dateLabel,
        seedSize: bag.name ?? '',
        totalBagsGiven: quantity,
        areaPlantedAcres: roundMax2(acres),
        bagsPerAcre: acres > 0 ? roundMax2(quantity / acres) : 0,
        seedRatePerBag: roundMax2(rate),
        totalSeedAmount: roundMax2(quantity * rate),
      });
    }
  }

  return rows;
}

/** Sum of Total Seed Amount (Rs) across farmer seed table rows (gate pass quantity × rate). */
export function aggregateTotalSeedAmount(rows: FarmerSeedRow[]): number {
  let sum = 0;
  for (const row of rows) {
    sum += Number(row.totalSeedAmount) || 0;
  }
  return roundMax2(sum);
}
