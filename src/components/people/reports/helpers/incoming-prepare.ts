import {
  DEFAULT_BAG_WEIGHTS,
  getBagWeightsFromStore,
  roundMax2,
} from '@/components/daybook/grading-calculations';
import type { AccountingIncomingRow } from '@/components/people/reports/incoming-table';
import type { IncomingGatePassByFarmerStorageLinkItem } from '@/types/incoming-gate-pass';

function formatIncomingDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Maps farmer incoming gate passes to accounting incoming table rows; net/bardana/actual match daybook grading rules.
 * Kg fields are stored with `roundMax2`; the accounting incoming table shows decimals only when needed (whole numbers omit `.00`).
 */
export function prepareDataForIncomingTable(
  incomingGatePasses:
    | IncomingGatePassByFarmerStorageLinkItem[]
    | null
    | undefined,
  bagWeights?: Record<string, number>
): AccountingIncomingRow[] {
  const passes = incomingGatePasses ?? [];
  if (passes.length === 0) return [];

  const weights = bagWeights ?? getBagWeightsFromStore();
  const juteWt = weights.JUTE ?? DEFAULT_BAG_WEIGHTS.JUTE;

  const out: AccountingIncomingRow[] = [];
  for (const row of passes) {
    const bags = row.bagsReceived ?? 0;
    const gross = row.weightSlip?.grossWeightKg ?? 0;
    const tare = row.weightSlip?.tareWeightKg ?? 0;
    const baseNetKg = gross - tare;
    const bardanaKg = bags * juteWt;
    const netProductKg = baseNetKg - bardanaKg;

    out.push({
      id: row._id,
      manualIncomingGatePassNumber:
        row.manualGatePassNumber != null
          ? String(row.manualGatePassNumber)
          : '',
      incomingDate: formatIncomingDate(row.date),
      store: row.location ?? '',
      truckNumber: row.truckNumber ?? '',
      variety: row.variety ?? '',
      bags,
      weightSlipNumber: row.weightSlip?.slipNumber ?? '',
      grossKg: roundMax2(gross),
      tareKg: roundMax2(tare),
      netKg: roundMax2(baseNetKg),
      bardanaWeight: roundMax2(bardanaKg),
      actualKg: roundMax2(netProductKg),
    });
  }
  return out;
}
