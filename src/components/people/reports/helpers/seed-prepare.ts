import { roundMax2 } from '@/components/daybook/grading-calculations';
import type { FarmerSeedGatePass } from '@/services/store-admin/people/useGetAllGatePassesOfFarmer';

export type FarmerSeedRow = {
  id: string;
  date: string;
  seedSize: string;
  /** Bags issued for this line (`bagSizes[].quantity`). */
  totalBagsGiven: number;
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
 */
export function prepareDataForFarmerSeedTable(
  farmerSeeds: FarmerSeedGatePass[] | null | undefined
): FarmerSeedRow[] {
  const seedEntries = farmerSeeds ?? [];
  if (seedEntries.length === 0) return [];

  const rows: FarmerSeedRow[] = [];

  for (const entry of seedEntries) {
    const bagSizes = entry.bagSizes ?? [];
    for (let index = 0; index < bagSizes.length; index += 1) {
      const bag = bagSizes[index];
      const quantity = Number(bag.quantity) || 0;
      const acres = Number(bag.acres) || 0;
      const rate = Number(bag.rate) || 0;

      rows.push({
        id: `${entry._id}__${index}`,
        date: formatDate(entry.date),
        seedSize: bag.name ?? '',
        totalBagsGiven: quantity,
        bagsPerAcre: acres > 0 ? roundMax2(quantity / acres) : 0,
        seedRatePerBag: roundMax2(rate),
        totalSeedAmount: roundMax2(quantity * rate),
      });
    }
  }

  return rows;
}
