import {
  calculateIncomingMetrics,
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
  const { rows } = calculateIncomingMetrics(passes, weights);

  return rows.map((row) => ({
    id: row._id,
    manualIncomingGatePassNumber:
      row.manualGatePassNumber != null ? String(row.manualGatePassNumber) : '',
    incomingDate: formatIncomingDate(row.date),
    store: row.location ?? '',
    truckNumber: row.truckNumber ?? '',
    variety: row.variety ?? '',
    bags: row.bagsReceived ?? 0,
    weightSlipNumber: row.weightSlip?.slipNumber ?? '',
    grossKg: roundMax2(row.weightSlip?.grossWeightKg ?? 0),
    tareKg: roundMax2(row.weightSlip?.tareWeightKg ?? 0),
    netKg: roundMax2(row.baseNetKg),
    bardanaWeight: roundMax2(row.bardanaKg),
    actualKg: roundMax2(row.netProductKg),
  }));
}
