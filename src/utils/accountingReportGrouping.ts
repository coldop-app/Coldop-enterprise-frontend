import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';

/** Group stock ledger rows by `variety` (sorted by variety name). Preserves row order within each group. */
export function groupStockLedgerRowsByVariety(
  rows: StockLedgerRow[]
): { variety: string; rows: StockLedgerRow[] }[] {
  const map = new Map<string, StockLedgerRow[]>();
  for (const row of rows) {
    const v = (row.variety ?? '').trim() || '—';
    const list = map.get(v) ?? [];
    list.push(row);
    map.set(v, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([variety, groupRows]) => ({ variety, rows: groupRows }));
}
