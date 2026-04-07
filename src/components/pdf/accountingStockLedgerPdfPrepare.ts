import type {
  FarmerReportPdfRow,
  FarmerReportPdfSnapshot,
} from '@/components/pdf/farmer-report/farmer-report-pdf-types';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import type { FarmerSeedEntryByStorageLink } from '@/types/farmer-seed';
import { groupStockLedgerRowsByVariety } from '@/utils/accountingReportGrouping';
import { computeSummaryAmountPayableTotal } from '@/components/pdf/summaryTablePdfCompute';
import {
  type PreparedSummaryTableData,
  prepareSummaryTablePdfData,
} from '@/components/pdf/summaryTablePdfPrepare';
import {
  SEED_AMOUNT_PAYABLE_LEAF_COLUMNS,
  type SeedAmountPayableColumnId,
} from '@/components/pdf/SeedAmountPayableTablePdf';
import {
  type PreparedSeedAmountPayableData,
  prepareSeedAmountPayableTableData,
} from '@/components/pdf/seedAmountPayableTablePrepare';

const INCOMING_COLUMN_IDS = [
  'manualIncomingNo',
  'incomingDate',
  'store',
  'truckNumber',
  'variety',
  'bagsReceived',
  'weightSlipNo',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'lessBardanaKg',
  'actualWeightKg',
] as const;

const INCOMING_SUM_COLUMN_IDS = new Set<string>([
  'bagsReceived',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'lessBardanaKg',
  'actualWeightKg',
]);

type IncomingColumnTotal =
  | { kind: 'none' }
  | { kind: 'simple'; sum: number }
  | { kind: 'qtyWeight'; qty: number; weight: number };

export type PreparedIncomingSegment = {
  variety: string | null;
  dataRows: (FarmerReportPdfRow & { type: 'data' })[];
  totals: Record<string, IncomingColumnTotal>;
};

export type PreparedAccountingVarietySection = {
  variety: string;
  rows: StockLedgerRow[];
  summaryPrepared: PreparedSummaryTableData;
  seedPrepared: PreparedSeedAmountPayableData;
};

export type PreparedAccountingStockLedgerPdfData = {
  snapshot: FarmerReportPdfSnapshot;
  hideGradingPage: boolean;
  incomingColumnIds: string[];
  incomingColWidthPct: string;
  hasIncomingData: boolean;
  incomingSegments: PreparedIncomingSegment[];
  varietySections: PreparedAccountingVarietySection[];
};

function formatCellValue(value: string | number | undefined): string {
  if (value == null || value === '') return '—';
  return String(value);
}
function parseQtyWeight(value: string): { qty: string; weight: string } | null {
  const match = value.match(/^(.+?)\s*\(([^)]*)\)\s*$/);
  if (match) return { qty: match[1].trim(), weight: match[2].trim() };
  return null;
}
function parseLocaleNumber(raw: string): number | null {
  const n = parseFloat(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}
function computeIncomingColumnTotals(
  dataRows: (FarmerReportPdfRow & { type: 'data' })[],
  incomingColumnIds: string[]
): Record<string, IncomingColumnTotal> {
  const out: Record<string, IncomingColumnTotal> = {};
  for (const colId of incomingColumnIds) {
    if (!INCOMING_SUM_COLUMN_IDS.has(colId)) {
      out[colId] = { kind: 'none' };
      continue;
    }
    let simpleSum = 0;
    let qtySum = 0;
    let weightSum = 0;
    let anyQtyWeight = false;
    let anySimple = false;
    for (const row of dataRows) {
      const raw = formatCellValue(row.cells[colId]);
      if (raw === '—' || raw === '') continue;
      const qw = parseQtyWeight(raw);
      if (qw) {
        anyQtyWeight = true;
        const q = parseLocaleNumber(qw.qty);
        const w = parseLocaleNumber(qw.weight);
        if (q != null) qtySum += q;
        if (w != null) weightSum += w;
      } else {
        const n = parseLocaleNumber(raw);
        if (n != null) {
          anySimple = true;
          simpleSum += n;
        }
      }
    }
    if (anyQtyWeight)
      out[colId] = { kind: 'qtyWeight', qty: qtySum, weight: weightSum };
    else if (anySimple) out[colId] = { kind: 'simple', sum: simpleSum };
    else out[colId] = { kind: 'none' };
  }
  return out;
}
function filterIncomingPdfRows(
  rows: FarmerReportPdfRow[]
): FarmerReportPdfRow[] {
  const hasIncomingIdentity = (row: FarmerReportPdfRow & { type: 'data' }) => {
    const systemIncoming = formatCellValue(row.cells.systemIncomingNo);
    const manualIncoming = formatCellValue(row.cells.manualIncomingNo);
    return (
      systemIncoming !== '—' ||
      manualIncoming !== '—' ||
      (row.passRowIndex ?? 0) === 0
    );
  };
  return rows.filter(
    (row) =>
      row.type === 'variety' ||
      (row.type === 'data' && hasIncomingIdentity(row))
  );
}
function getIncomingSegmentsForPdf(
  filtered: FarmerReportPdfRow[],
  groupByVariety: boolean,
  incomingColumnIds: string[]
): PreparedIncomingSegment[] {
  if (!groupByVariety) {
    const dataRows = filtered.filter(
      (r): r is FarmerReportPdfRow & { type: 'data' } => r.type === 'data'
    );
    return dataRows.length
      ? [
          {
            variety: null,
            dataRows,
            totals: computeIncomingColumnTotals(dataRows, incomingColumnIds),
          },
        ]
      : [];
  }
  const segments: PreparedIncomingSegment[] = [];
  let current: {
    variety: string | null;
    dataRows: (FarmerReportPdfRow & { type: 'data' })[];
  } = {
    variety: null,
    dataRows: [],
  };
  for (const row of filtered) {
    if (row.type === 'variety') {
      if (current.dataRows.length > 0) {
        segments.push({
          variety: current.variety,
          dataRows: current.dataRows,
          totals: computeIncomingColumnTotals(
            current.dataRows,
            incomingColumnIds
          ),
        });
      }
      current = { variety: row.variety, dataRows: [] };
    } else {
      current.dataRows.push(row);
    }
  }
  if (current.dataRows.length > 0) {
    segments.push({
      variety: current.variety,
      dataRows: current.dataRows,
      totals: computeIncomingColumnTotals(current.dataRows, incomingColumnIds),
    });
  }
  return segments;
}

export function prepareAccountingStockLedgerPdfData(params: {
  snapshot: FarmerReportPdfSnapshot;
  stockLedgerRows: StockLedgerRow[];
  hideGradingPage?: boolean;
  farmerSeedEntries?: FarmerSeedEntryByStorageLink[] | null;
}): PreparedAccountingStockLedgerPdfData {
  const {
    snapshot,
    stockLedgerRows,
    hideGradingPage = false,
    farmerSeedEntries = null,
  } = params;
  const incomingColumnIds = snapshot.visibleColumnIds.filter((id) =>
    (INCOMING_COLUMN_IDS as readonly string[]).includes(id)
  );
  const hasIncomingData = snapshot.rows.some(
    (r) =>
      r.type === 'data' || (r.type === 'variety' && snapshot.groupByVariety)
  );
  const numIncomingCols = incomingColumnIds.length;
  const incomingColWidthPct =
    numIncomingCols > 0 ? `${(100 / numIncomingCols).toFixed(1)}%` : '100%';

  const incomingRows = filterIncomingPdfRows(snapshot.rows);
  const incomingSegments = getIncomingSegmentsForPdf(
    incomingRows,
    snapshot.groupByVariety,
    incomingColumnIds
  );

  const varietySections = groupStockLedgerRowsByVariety(stockLedgerRows).map(
    ({ variety, rows }) => ({
      variety,
      rows,
      summaryPrepared: prepareSummaryTablePdfData(rows),
      seedPrepared: prepareSeedAmountPayableTableData({
        variety,
        farmerSeedEntries,
        summaryAmountPayableTotal: computeSummaryAmountPayableTotal(rows),
        columnIds: SEED_AMOUNT_PAYABLE_LEAF_COLUMNS.map(
          (c) => c.id
        ) as SeedAmountPayableColumnId[],
      }),
    })
  );

  return {
    snapshot,
    hideGradingPage,
    incomingColumnIds,
    incomingColWidthPct,
    hasIncomingData,
    incomingSegments,
    varietySections,
  };
}
