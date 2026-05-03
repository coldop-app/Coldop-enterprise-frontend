import type { AccountingIncomingRow } from '@/components/people/reports/incoming-table';
import {
  calculateIncomingMetrics,
  roundMax2,
} from '@/components/daybook/grading-calculations';
import type { IncomingGatePass } from '@/types/incoming-gate-pass';

function formatDdMmYyyy(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function truncatedBagsReceived(pass: IncomingGatePass): number {
  return Math.trunc(pass.bagsReceived ?? 0);
}

/**
 * Maps farmer incoming gate passes to rows for {@link AccountingIncomingRow}.
 * Weights follow {@link calculateIncomingMetrics}: net = gross − tare, bardana = bags × jute (prefs), actual = net − bardana.
 * Passes with zero bags (after truncation) are omitted.
 */
export function PrepareIncomingTable(
  passes: IncomingGatePass[] | null | undefined
): AccountingIncomingRow[] {
  if (!passes?.length) return [];

  const withBags = passes.filter((p) => truncatedBagsReceived(p) !== 0);
  if (withBags.length === 0) return [];

  const sorted = [...withBags].sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });

  const { rows } = calculateIncomingMetrics(sorted);

  return rows.map((row): AccountingIncomingRow => {
    const gross = roundMax2(row.weightSlip?.grossWeightKg ?? 0);
    const tare = roundMax2(row.weightSlip?.tareWeightKg ?? 0);
    const netKg = roundMax2(row.baseNetKg ?? 0);
    const bardanaWeight = roundMax2(row.bardanaKg ?? 0);
    const actualKg = roundMax2(row.netProductKg ?? 0);

    return {
      id: row._id,
      manualIncomingGatePassNumber: String(row.manualGatePassNumber ?? ''),
      incomingDate: formatDdMmYyyy(row.date),
      store: row.location?.trim() ? row.location : '—',
      truckNumber: row.truckNumber?.trim() ? row.truckNumber : '—',
      variety: row.variety?.trim() ? row.variety : '—',
      bags: truncatedBagsReceived(row),
      weightSlipNumber: row.weightSlip?.slipNumber?.trim()
        ? row.weightSlip.slipNumber
        : '—',
      grossKg: gross,
      tareKg: tare,
      netKg,
      bardanaWeight,
      actualKg,
    };
  });
}
