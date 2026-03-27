import { JUTE_BAG_WEIGHT } from '@/components/forms/grading/constants';
import type { StockLedgerRow } from './stockLedgerTypes';

/** Less Bardana for incoming voucher: bags received × JUTE bag weight (kg). */
export function computeIncomingLessBardana(row: StockLedgerRow): number {
  return row.bagsReceived * JUTE_BAG_WEIGHT;
}

/** Actual Weight from incoming gate pass (Net − Less Bardana). */
export function computeIncomingActualWeight(
  row: StockLedgerRow
): number | undefined {
  const lessBardana = computeIncomingLessBardana(row);
  if (row.netWeightKg == null || Number.isNaN(row.netWeightKg)) {
    return undefined;
  }
  return row.netWeightKg - lessBardana;
}
