import {
  GRADING_REPORT_ROW_SPAN_BASE_IDS,
  type GradingReportRow,
} from '@/components/analytics/reports/grading-report/columns';
import {
  GRADING_REPORT_BAG_SIZE_LABELS,
  compareSizeKeysForReport,
  sizeKeyFromGradedBagColumnId,
  sortGradedBagSizeColumnIds,
} from '@/components/analytics/reports/grading-report/grading-bag-sizes';
import type { GradingReportPdfSnapshot } from '@/components/analytics/reports/grading-report/data-table';

/**
 * Layout budget for the first main-table page (includes report heading in the PDF).
 * One unit ≈ one plain data sub-row; rows with stacked bag-type lines count higher.
 */
export const PDF_MAIN_TABLE_FIRST_PAGE_LAYOUT_UNITS = 24;

/**
 * Layout budget for continuation main-table pages (no report heading; slightly more room).
 */
export const PDF_MAIN_TABLE_CONTINUATION_PAGE_LAYOUT_UNITS = 26;

/** @deprecated Use PDF_MAIN_TABLE_CONTINUATION_PAGE_LAYOUT_UNITS */
export const PDF_MAIN_TABLE_LAYOUT_UNITS_PER_PAGE =
  PDF_MAIN_TABLE_CONTINUATION_PAGE_LAYOUT_UNITS;

/** @deprecated Use first/continuation layout unit constants */
export const PDF_MAIN_TABLE_ROWS_PER_PAGE =
  PDF_MAIN_TABLE_CONTINUATION_PAGE_LAYOUT_UNITS;

export type PdfColumnDef = {
  key: string;
  label: string;
  width: string;
  align: 'left' | 'center';
};

const ALL_COLUMNS_STATIC: PdfColumnDef[] = [
  { key: 'farmerName', label: 'Farmer', width: '7%', align: 'left' },
  {
    key: 'accountNumber',
    label: 'Account No.',
    width: '4%',
    align: 'center',
  },
  {
    key: 'incomingGatePassNo',
    label: 'Incoming GP no.',
    width: '5%',
    align: 'center',
  },
  {
    key: 'incomingManualNo',
    label: 'Incoming manual no.',
    width: '5%',
    align: 'center',
  },
  {
    key: 'incomingGatePassDate',
    label: 'Incoming GP date',
    width: '6%',
    align: 'center',
  },
  { key: 'truckNumber', label: 'Truck no.', width: '5%', align: 'center' },
  { key: 'variety', label: 'Variety', width: '6%', align: 'left' },
  { key: 'bagsReceived', label: 'Bags rec.', width: '4%', align: 'center' },
  { key: 'grossWeightKg', label: 'Gross (kg)', width: '5%', align: 'center' },
  { key: 'tareWeightKg', label: 'Tare (kg)', width: '5%', align: 'center' },
  { key: 'netWeightKg', label: 'Net (kg)', width: '5%', align: 'center' },
  {
    key: 'netProductKg',
    label: 'Net product (kg)',
    width: '6%',
    align: 'center',
  },
  { key: 'gatePassNo', label: 'GP no.', width: '4%', align: 'center' },
  {
    key: 'manualGatePassNumber',
    label: 'Manual GP no.',
    width: '4%',
    align: 'center',
  },
  { key: 'date', label: 'Date', width: '6%', align: 'center' },
  { key: 'createdByName', label: 'Created by', width: '6%', align: 'left' },
  {
    key: 'totalGradedBags',
    label: 'Graded bags',
    width: '5%',
    align: 'center',
  },
  {
    key: 'totalGradedWeightKg',
    label: 'Graded wt (kg)',
    width: '5.5%',
    align: 'center',
  },
  { key: 'wastageKg', label: 'Wastage (kg)', width: '4.5%', align: 'center' },
  { key: 'grader', label: 'Grader', width: '7%', align: 'left' },
  { key: 'remarks', label: 'Remarks', width: '7%', align: 'left' },
];

function labelForBagColumnId(columnId: string): string {
  const sk = sizeKeyFromGradedBagColumnId(columnId);
  return sk ? (GRADING_REPORT_BAG_SIZE_LABELS[sk] ?? sk) : columnId;
}

export function buildFullColumnList(rows: GradingReportRow[]): PdfColumnDef[] {
  const bagIds = new Set<string>();
  for (const r of rows) {
    const m = r.gradedBagSizeQtyByColumnId;
    if (m) for (const k of Object.keys(m)) bagIds.add(k);
  }
  const bagCols: PdfColumnDef[] = sortGradedBagSizeColumnIds(
    Array.from(bagIds)
  ).map((id) => ({
    key: id,
    label: labelForBagColumnId(id),
    /** Slightly wider than before (~4px at PDF scale); trailing cols reduced below. */
    width: '4.0%',
    align: 'center' as const,
  }));
  const idx = ALL_COLUMNS_STATIC.findIndex((c) => c.key === 'totalGradedBags');
  if (idx < 0) return [...ALL_COLUMNS_STATIC, ...bagCols];
  return [
    ...ALL_COLUMNS_STATIC.slice(0, idx + 1),
    ...bagCols,
    ...ALL_COLUMNS_STATIC.slice(idx + 1),
  ];
}

function normalizePdfColumnsBagOrder(columns: PdfColumnDef[]): PdfColumnDef[] {
  const isBag = (c: PdfColumnDef) => c.key.startsWith('gradedBagSize_');
  const bagCols = columns.filter(isBag);
  if (bagCols.length === 0) return columns;
  const bagByKey = new Map(bagCols.map((c) => [c.key, c] as const));
  const sortedBags = sortGradedBagSizeColumnIds([...bagByKey.keys()]).map(
    (k) => bagByKey.get(k)!
  );
  const result: PdfColumnDef[] = [];
  let inserted = false;
  for (const c of columns) {
    if (isBag(c)) {
      if (!inserted) {
        result.push(...sortedBags);
        inserted = true;
      }
      continue;
    }
    result.push(c);
  }
  return result;
}

export function getColumnsForPdf(
  visibleColumnIds: string[],
  fullColumns: PdfColumnDef[],
  excludeGrouping?: string[]
): PdfColumnDef[] {
  const visible = new Set(
    visibleColumnIds.length > 0
      ? visibleColumnIds
      : fullColumns.map((c) => c.key)
  );
  const exclude = new Set(excludeGrouping ?? []);
  let filtered = fullColumns.filter(
    (c) => visible.has(c.key) && !exclude.has(c.key)
  );
  filtered = normalizePdfColumnsBagOrder(filtered);
  if (filtered.length === 0) return fullColumns;
  const totalPercent = filtered.reduce(
    (sum, c) => sum + parseFloat(c.width),
    0
  );
  const scale = 100 / totalPercent;
  return filtered.map((c) => ({
    ...c,
    width: `${(parseFloat(c.width) * scale).toFixed(1)}%`,
  }));
}

/** Visual stack depth for graded bag-size cells (mirrors `GradedBagSizePdfCell`). */
function gradedBagStackLinesForEntry(b: {
  qty: number;
  bagTypeParts?: { label: string; qty: number; weightPerBagKg: number }[];
}): number {
  if (!b || b.qty === 0) return 0;
  const parts = b.bagTypeParts ?? [];
  if (parts.length === 0) return 2;
  if (parts.length === 1) return 2;
  return 1 + parts.length;
}

/**
 * Layout units for one incoming line within a grading-pass group (≥1).
 * Multi-line bag breakdowns and long farmer names consume more of the page budget.
 */
export function estimateRowLayoutUnits(row: GradingReportRow): number {
  let u = 1;
  const bd = row.gradedSizeBreakdown;
  if (bd) {
    let maxStack = 0;
    for (const b of Object.values(bd)) {
      maxStack = Math.max(maxStack, gradedBagStackLinesForEntry(b));
    }
    if (maxStack > 1) {
      u += (maxStack - 1) * 0.9;
    }
  }
  if (typeof row.farmerName === 'string' && row.farmerName.trim().length > 42) {
    u += 0.4;
  }
  return Math.min(Math.max(u, 1), 6);
}

export function estimateGroupLayoutUnits(group: GradingReportRow[]): number {
  return group.reduce((sum, row) => sum + estimateRowLayoutUnits(row), 0);
}

/**
 * Pack whole grading-pass groups onto pages without splitting a group.
 * Uses a smaller budget on the first page when `applyFirstPageBudget` is true (report heading).
 * Later grouped sections without the heading should pass `applyFirstPageBudget: false`.
 */
export function chunkGradingPassGroups(
  groups: GradingReportRow[][],
  firstPageMaxLayoutUnits: number,
  continuationPageMaxLayoutUnits: number,
  applyFirstPageBudget = true
): GradingReportRow[][][] {
  if (groups.length === 0) return [];
  const pages: GradingReportRow[][][] = [];
  let current: GradingReportRow[][] = [];
  let unitCount = 0;
  let onFirstPdfPage = applyFirstPageBudget;

  const pageLimit = () =>
    onFirstPdfPage ? firstPageMaxLayoutUnits : continuationPageMaxLayoutUnits;

  for (const group of groups) {
    const gUnits = estimateGroupLayoutUnits(group);
    const limit = pageLimit();

    if (gUnits > limit) {
      if (current.length > 0) {
        pages.push(current);
        current = [];
        unitCount = 0;
        onFirstPdfPage = false;
      }
      pages.push([group]);
      onFirstPdfPage = false;
      continue;
    }
    if (unitCount + gUnits > limit && current.length > 0) {
      pages.push(current);
      current = [];
      unitCount = 0;
      onFirstPdfPage = false;
    }
    current.push(group);
    unitCount += gUnits;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

export function getGradingPassGroups(
  rows: GradingReportRow[]
): GradingReportRow[][] {
  const groups: GradingReportRow[][] = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    const size = row.gradingPassGroupSize ?? 1;
    groups.push(rows.slice(i, i + size));
    i += size;
  }
  return groups;
}

export function getSpanColumnSet(rows: GradingReportRow[]): Set<string> {
  const set = new Set<string>(
    GRADING_REPORT_ROW_SPAN_BASE_IDS as unknown as string[]
  );
  for (const r of rows) {
    const m = r.gradedBagSizeQtyByColumnId;
    if (m) for (const k of Object.keys(m)) set.add(k);
  }
  return set;
}

const TOTAL_KEYS: (keyof GradingReportRow)[] = [
  'bagsReceived',
  'totalGradedBags',
  'totalGradedWeightKg',
  'wastageKg',
  'grossWeightKg',
  'tareWeightKg',
  'netWeightKg',
  'netProductKg',
];

function toNum(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export function computeTotalsForRows(
  rows: GradingReportRow[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const key of TOTAL_KEYS) totals[key] = 0;
  for (const row of rows) {
    for (const key of TOTAL_KEYS) {
      totals[key] += toNum((row as Record<string, unknown>)[key]);
    }
    const qtyMap = row.gradedBagSizeQtyByColumnId;
    if (qtyMap) {
      for (const [k, v] of Object.entries(qtyMap)) {
        totals[k] = (totals[k] ?? 0) + toNum(v);
      }
    }
  }
  return totals;
}

export interface PdfSection {
  headers: Array<{
    depth: number;
    groupingColumnId: string;
    displayValue: string;
    firstLeaf?: GradingReportRow;
  }>;
  leaves: GradingReportRow[];
}

export function buildSectionsFromSnapshot(
  snapshot: GradingReportPdfSnapshot<GradingReportRow>
): PdfSection[] {
  const { rows, grouping } = snapshot;
  const deepestDepth = grouping.length > 0 ? grouping.length - 1 : -1;
  const sections: PdfSection[] = [];
  let current: PdfSection = { headers: [], leaves: [] };

  for (const item of rows) {
    if (item.type === 'group') {
      if (item.depth === deepestDepth) {
        if (current.leaves.length > 0) {
          sections.push(current);
          current = {
            headers: [...current.headers],
            leaves: [],
          };
        }
        current.headers[item.depth] = {
          depth: item.depth,
          groupingColumnId: item.groupingColumnId,
          displayValue: item.displayValue,
          firstLeaf: item.firstLeaf,
        };
      } else {
        current.headers[item.depth] = {
          depth: item.depth,
          groupingColumnId: item.groupingColumnId,
          displayValue: item.displayValue,
          firstLeaf: item.firstLeaf,
        };
      }
    } else {
      current.leaves.push(item.row);
    }
  }
  if (current.leaves.length > 0 || current.headers.length > 0) {
    sections.push(current);
  }
  return sections;
}

/** Aggregate totals for summary rows */
export interface SummaryRowTotals {
  count: number;
  bagsReceived: number;
  totalGradedBags: number;
  totalGradedWeightKg: number;
  wastageKg: number;
}

export interface VarietySummaryRow {
  variety: string;
  count: number;
  bagsReceived: number;
  totalGradedBags: number;
  totalGradedWeightKg: number;
  wastageKg: number;
}

export interface FarmerSummaryRow {
  farmerName: string;
  count: number;
  bagsReceived: number;
  totalGradedBags: number;
  totalGradedWeightKg: number;
  wastageKg: number;
}

export interface VarietyBagSizeSummaryRow {
  variety: string;
  bagSize: string;
  quantity: number;
}

export interface GradingReportTableSummary {
  byVariety: VarietySummaryRow[];
  byFarmer: FarmerSummaryRow[];
  byVarietyAndBagSize: VarietyBagSizeSummaryRow[];
  overall: SummaryRowTotals;
}

export function computeGradingReportSummary(
  rows: GradingReportRow[]
): GradingReportTableSummary {
  const varietyMap = new Map<string, SummaryRowTotals>();
  const farmerMap = new Map<string, SummaryRowTotals>();
  const varietyBagMap = new Map<string, VarietyBagSizeSummaryRow>();
  const overall: SummaryRowTotals = {
    count: 0,
    bagsReceived: 0,
    totalGradedBags: 0,
    totalGradedWeightKg: 0,
    wastageKg: 0,
  };

  const num = (v: number | string | null | undefined): number => {
    if (v == null || v === '' || v === '—') return 0;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isNaN(n) ? 0 : n;
  };

  for (const row of rows) {
    const isFirstRowOfPass = (row.gradingPassRowIndex ?? 0) === 0;
    if (!isFirstRowOfPass) continue;

    const totalGradedBags =
      typeof row.totalGradedBags === 'number' ? row.totalGradedBags : 0;
    const totalGradedWeightKg =
      typeof row.totalGradedWeightKg === 'number' ? row.totalGradedWeightKg : 0;
    const wastageKg = num(row.wastageKg);
    const bagsReceived = totalGradedBags;
    const variety = (row.variety ?? '').trim() || '—';
    const farmerName = (row.farmerName ?? '').trim() || '—';

    overall.count += 1;
    overall.bagsReceived += bagsReceived;
    overall.totalGradedBags += totalGradedBags;
    overall.totalGradedWeightKg += totalGradedWeightKg;
    overall.wastageKg += wastageKg;

    const v = varietyMap.get(variety);
    if (v) {
      v.count += 1;
      v.bagsReceived += bagsReceived;
      v.totalGradedBags += totalGradedBags;
      v.totalGradedWeightKg += totalGradedWeightKg;
      v.wastageKg += wastageKg;
    } else {
      varietyMap.set(variety, {
        count: 1,
        bagsReceived,
        totalGradedBags,
        totalGradedWeightKg,
        wastageKg,
      });
    }

    const f = farmerMap.get(farmerName);
    if (f) {
      f.count += 1;
      f.bagsReceived += bagsReceived;
      f.totalGradedBags += totalGradedBags;
      f.totalGradedWeightKg += totalGradedWeightKg;
      f.wastageKg += wastageKg;
    } else {
      farmerMap.set(farmerName, {
        count: 1,
        bagsReceived,
        totalGradedBags,
        totalGradedWeightKg,
        wastageKg,
      });
    }

    const qtyById = row.gradedBagSizeQtyByColumnId ?? {};
    for (const [columnId, qtyValue] of Object.entries(qtyById)) {
      if (!columnId.startsWith('gradedBagSize_')) continue;
      const sizeKey = sizeKeyFromGradedBagColumnId(columnId);
      if (!sizeKey) continue;
      const quantity = num(qtyValue);
      if (quantity === 0) continue;
      const key = `${variety}||${sizeKey}`;
      const existing = varietyBagMap.get(key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        varietyBagMap.set(key, { variety, bagSize: sizeKey, quantity });
      }
    }
  }

  const byVariety: VarietySummaryRow[] = Array.from(varietyMap.entries())
    .map(([variety, t]) => ({ variety, ...t }))
    .sort((a, b) => a.variety.localeCompare(b.variety));
  const byFarmer: FarmerSummaryRow[] = Array.from(farmerMap.entries())
    .map(([farmerName, t]) => ({ farmerName, ...t }))
    .sort((a, b) => a.farmerName.localeCompare(b.farmerName));
  const byVarietyAndBagSize: VarietyBagSizeSummaryRow[] = Array.from(
    varietyBagMap.values()
  ).sort((a, b) => {
    const v = a.variety.localeCompare(b.variety);
    if (v !== 0) return v;
    return compareSizeKeysForReport(a.bagSize, b.bagSize, a.bagSize, b.bagSize);
  });

  return { byVariety, byFarmer, byVarietyAndBagSize, overall };
}

export interface GradingReportPdfPreparedGrouped {
  kind: 'grouped';
  grandColumns: PdfColumnDef[];
  totals: Record<string, number>;
  summary: GradingReportTableSummary;
  spanColumnSet: string[];
  grouping: string[];
  sections: Array<{
    headers: PdfSection['headers'];
    leaves: GradingReportRow[];
    columnsForTable: PdfColumnDef[];
    sectionTotal: Record<string, number>;
    pageChunks: GradingReportRow[][][];
    isEmpty: boolean;
  }>;
}

export interface GradingReportPdfPreparedFlat {
  kind: 'flat';
  grandColumns: PdfColumnDef[];
  totals: Record<string, number>;
  summary: GradingReportTableSummary;
  spanColumnSet: string[];
  columnsForPdf: PdfColumnDef[];
  mainPageChunks: GradingReportRow[][][];
  leafRowsEmpty: boolean;
}

export type GradingReportPdfPrepared =
  | GradingReportPdfPreparedGrouped
  | GradingReportPdfPreparedFlat;

export interface PrepareGradingReportPdfCached {
  summary?: GradingReportTableSummary;
  totals?: Record<string, number>;
}

/**
 * Runs all PDF layout inputs (columns, totals, summary, pagination) outside
 * react-pdf so `pdf().toBlob()` does less work on the main thread.
 * Pass `cached` from `useMemo` on `rows` to avoid re-aggregating at click time.
 */
export function prepareGradingReportPdf(
  rows: GradingReportRow[],
  tableSnapshot: GradingReportPdfSnapshot<GradingReportRow> | null,
  cached?: PrepareGradingReportPdfCached
): GradingReportPdfPrepared {
  const useSnapshot =
    tableSnapshot &&
    tableSnapshot.rows.length > 0 &&
    (tableSnapshot.grouping.length > 0 ||
      tableSnapshot.visibleColumnIds.length > 0);

  const snapshotLeafRows =
    useSnapshot && tableSnapshot.rows.length > 0
      ? tableSnapshot.rows
          .filter(
            (r): r is { type: 'leaf'; row: GradingReportRow } =>
              r.type === 'leaf'
          )
          .map((r) => r.row)
      : [];

  const rowsForPdf = useSnapshot ? snapshotLeafRows : rows;
  const fullColumns = buildFullColumnList(rowsForPdf);
  const totals =
    useSnapshot || cached?.totals == null
      ? computeTotalsForRows(rowsForPdf)
      : cached.totals;
  const summary =
    useSnapshot || cached?.summary == null
      ? computeGradingReportSummary(rowsForPdf)
      : cached.summary;
  const spanKeys = [...getSpanColumnSet(rowsForPdf)];

  const visibleColumnIds =
    useSnapshot && tableSnapshot!.visibleColumnIds.length > 0
      ? tableSnapshot!.visibleColumnIds
      : fullColumns.map((c) => c.key);

  const grouping = useSnapshot ? tableSnapshot!.grouping : [];

  const grandColumns = getColumnsForPdf(visibleColumnIds, fullColumns);

  if (useSnapshot && tableSnapshot!.grouping.length > 0) {
    const sections = buildSectionsFromSnapshot(tableSnapshot!);
    const columnsForTable = getColumnsForPdf(
      visibleColumnIds,
      fullColumns,
      grouping
    );
    const sectionTotalsArr = sections.map((section) =>
      computeTotalsForRows(section.leaves)
    );

    const preparedSections = sections.map((section, sectionIndex) => {
      const sectionGroups = getGradingPassGroups(section.leaves);
      const pageChunks =
        section.leaves.length === 0
          ? []
          : chunkGradingPassGroups(
              sectionGroups,
              PDF_MAIN_TABLE_FIRST_PAGE_LAYOUT_UNITS,
              PDF_MAIN_TABLE_CONTINUATION_PAGE_LAYOUT_UNITS,
              sectionIndex === 0
            );
      return {
        headers: section.headers,
        leaves: section.leaves,
        columnsForTable,
        sectionTotal: sectionTotalsArr[sectionIndex] ?? {},
        pageChunks,
        isEmpty: section.leaves.length === 0,
      };
    });

    return {
      kind: 'grouped',
      grandColumns,
      totals,
      summary,
      spanColumnSet: spanKeys,
      grouping,
      sections: preparedSections,
    };
  }

  const columnsForPdf =
    useSnapshot && tableSnapshot!.visibleColumnIds.length > 0
      ? getColumnsForPdf(tableSnapshot!.visibleColumnIds, fullColumns)
      : getColumnsForPdf([], fullColumns);

  const leafRows = rowsForPdf;

  const mainGroups = getGradingPassGroups(leafRows);
  const mainPageChunks =
    leafRows.length === 0
      ? []
      : chunkGradingPassGroups(
          mainGroups,
          PDF_MAIN_TABLE_FIRST_PAGE_LAYOUT_UNITS,
          PDF_MAIN_TABLE_CONTINUATION_PAGE_LAYOUT_UNITS,
          true
        );

  return {
    kind: 'flat',
    grandColumns,
    totals,
    summary,
    spanColumnSet: spanKeys,
    columnsForPdf,
    mainPageChunks,
    leafRowsEmpty: leafRows.length === 0,
  };
}
