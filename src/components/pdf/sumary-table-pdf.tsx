import { View, Text, StyleSheet } from '@react-pdf/renderer';
import {
  GRADING_SIZES,
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import {
  SIZE_HEADER_LABELS,
  computeWtReceivedAfterGrading,
  computeLessBardanaAfterGrading,
  computeActualWtOfPotato,
  computeAmountPayable,
} from '@/components/pdf/gradingVoucherCalculations';
import { STOCK_LEDGER_COL_WIDTHS } from '@/components/pdf/stockLedgerColumnWidths';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';

/** Per (type, weightKey) allocated values for summary right-hand columns */
export interface SummaryRightValues {
  wtReceivedAfterGrading: number;
  lessBardanaAfterGrading: number;
  actualWtOfPotato: number;
  rate: number | undefined;
  amountPayable: number;
}

/** Totals for right-hand columns (must match main table totals). */
export interface SummaryTotals {
  totalWtReceivedAfterGrading: number;
  totalLessBardanaAfterGrading: number;
  totalActualWtOfPotato: number;
  totalAmountPayable: number;
}

const BORDER = '#e5e7eb';
const HEADER_BG = '#f9fafb';

/** Key: "bagType|size|weightKey" (weightKey = weight.toFixed(2)), value: total bag count */
function buildGroupedMap(rows: StockLedgerRow[]): Map<string, number> {
  const map = new Map<string, number>();
  const add = (key: string, count: number) => {
    map.set(key, (map.get(key) ?? 0) + count);
  };
  const weightKey = (w: number | undefined) =>
    w != null && !Number.isNaN(w) ? w.toFixed(2) : '0.00';

  for (const row of rows) {
    const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
    if (hasSplit) {
      for (const size of GRADING_SIZES) {
        const juteQty = row.sizeBagsJute?.[size] ?? 0;
        const juteWt = row.sizeWeightPerBagJute?.[size];
        if (juteQty > 0) {
          add(`JUTE|${size}|${weightKey(juteWt)}`, juteQty);
        }
        const lenoQty = row.sizeBagsLeno?.[size] ?? 0;
        const lenoWt = row.sizeWeightPerBagLeno?.[size];
        if (lenoQty > 0) {
          add(`LENO|${size}|${weightKey(lenoWt)}`, lenoQty);
        }
      }
    } else {
      const bagType = (row.bagType ?? 'JUTE').toUpperCase();
      for (const size of GRADING_SIZES) {
        const qty = row.sizeBags?.[size] ?? 0;
        const wt = row.sizeWeightPerBag?.[size];
        if (qty > 0) {
          add(`${bagType}|${size}|${weightKey(wt)}`, qty);
        }
      }
    }
  }
  return map;
}

/** Distinct (bagType, weightPerBagKg) for row order: JUTE first, then LENO; within each, sort by weight. */
function getOrderedRowKeys(map: Map<string, number>): {
  type: string;
  weightKey: string;
  weightNum: number;
}[] {
  const seen = new Set<string>();
  for (const key of map.keys()) {
    const [type, , wk] = key.split('|');
    const k = `${type}|${wk}`;
    if (!seen.has(k)) seen.add(k);
  }
  const entries: {
    type: string;
    weightKey: string;
    weightNum: number;
  }[] = [];
  seen.forEach((k) => {
    const [type, weightKey] = k.split('|');
    const weightNum = parseFloat(weightKey);
    entries.push({
      type,
      weightKey,
      weightNum: Number.isNaN(weightNum) ? 0 : weightNum,
    });
  });
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'JUTE' ? -1 : 1;
    return a.weightNum - b.weightNum;
  });
  return entries;
}

/** One row per (type, weightKey, size) with count > 0 — one consolidated quantity per bag size per row. */
export interface SummaryRow {
  type: string;
  weightKey: string;
  weightNum: number;
  size: string;
  count: number;
}

function getSummaryRows(map: Map<string, number>): SummaryRow[] {
  const sizeOrder = new Map<string, number>(
    GRADING_SIZES.map((s, i) => [s, i])
  );
  const rows: SummaryRow[] = [];
  for (const [key, count] of map) {
    if (count <= 0) continue;
    const [type, size, weightKey] = key.split('|');
    const weightNum = parseFloat(weightKey);
    rows.push({
      type,
      weightKey,
      weightNum: Number.isNaN(weightNum) ? 0 : weightNum,
      size,
      count,
    });
  }
  rows.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'JUTE' ? -1 : 1;
    if (a.weightNum !== b.weightNum) return a.weightNum - b.weightNum;
    return (sizeOrder.get(a.size) ?? 99) - (sizeOrder.get(b.size) ?? 99);
  });
  return rows;
}

const weightKeyStr = (w: number | undefined) =>
  w != null && !Number.isNaN(w) ? w.toFixed(2) : '0.00';

/** Bag count per (type, weightKey) from a single ledger row. Key: "type|weightKey". */
function getRowContributionsByTypeWeight(
  row: StockLedgerRow
): Map<string, number> {
  const map = new Map<string, number>();
  const add = (key: string, count: number) => {
    map.set(key, (map.get(key) ?? 0) + count);
  };
  const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
  if (hasSplit) {
    for (const size of GRADING_SIZES) {
      const juteQty = row.sizeBagsJute?.[size] ?? 0;
      const juteWt = row.sizeWeightPerBagJute?.[size];
      if (juteQty > 0) add(`JUTE|${weightKeyStr(juteWt)}`, juteQty);
      const lenoQty = row.sizeBagsLeno?.[size] ?? 0;
      const lenoWt = row.sizeWeightPerBagLeno?.[size];
      if (lenoQty > 0) add(`LENO|${weightKeyStr(lenoWt)}`, lenoQty);
    }
  } else {
    const bagType = (row.bagType ?? 'JUTE').toUpperCase();
    for (const size of GRADING_SIZES) {
      const qty = row.sizeBags?.[size] ?? 0;
      const wt = row.sizeWeightPerBag?.[size];
      if (qty > 0) add(`${bagType}|${weightKeyStr(wt)}`, qty);
    }
  }
  return map;
}

/** Allocate each ledger row's values to (type, weightKey) by bag-share; same formulas as main table. */
function buildSummaryRightValues(
  rows: StockLedgerRow[],
  rowKeys: { type: string; weightKey: string }[]
): Map<string, SummaryRightValues> {
  const acc = new Map<string, SummaryRightValues>();
  for (const { type, weightKey } of rowKeys) {
    const k = `${type}|${weightKey}`;
    acc.set(k, {
      wtReceivedAfterGrading: 0,
      lessBardanaAfterGrading: 0,
      actualWtOfPotato: 0,
      rate: undefined,
      amountPayable: 0,
    });
  }
  for (const row of rows) {
    const contributions = getRowContributionsByTypeWeight(row);
    const rowTotalBags = [...contributions.values()].reduce((a, b) => a + b, 0);
    if (rowTotalBags <= 0) continue;
    const wtReceived = computeWtReceivedAfterGrading(row);
    const lessBardana = computeLessBardanaAfterGrading(row);
    const actualWt = computeActualWtOfPotato(row);
    const amountPayable = computeAmountPayable(row);
    for (const [key, bags] of contributions) {
      const entry = acc.get(key);
      if (!entry) continue;
      const frac = bags / rowTotalBags;
      entry.wtReceivedAfterGrading += frac * wtReceived;
      entry.lessBardanaAfterGrading += frac * lessBardana;
      entry.actualWtOfPotato += frac * actualWt;
      entry.amountPayable += frac * amountPayable;
    }
  }
  return acc;
}

/** Allocate base (type, weightKey) values to each (type, weightKey, size) row by size fraction. */
function buildSummaryRightValuesForRows(
  summaryRows: SummaryRow[],
  baseValues: Map<string, SummaryRightValues>
): Map<string, SummaryRightValues> {
  const totalBagsPerTypeWeight = new Map<string, number>();
  for (const row of summaryRows) {
    const k = `${row.type}|${row.weightKey}`;
    totalBagsPerTypeWeight.set(
      k,
      (totalBagsPerTypeWeight.get(k) ?? 0) + row.count
    );
  }
  const result = new Map<string, SummaryRightValues>();
  for (const row of summaryRows) {
    const baseKey = `${row.type}|${row.weightKey}`;
    const total = totalBagsPerTypeWeight.get(baseKey) ?? 1;
    const frac = row.count / total;
    const base = baseValues.get(baseKey);
    const rowKey = `${row.type}|${row.weightKey}|${row.size}`;
    if (!base) {
      result.set(rowKey, {
        wtReceivedAfterGrading: 0,
        lessBardanaAfterGrading: 0,
        actualWtOfPotato: 0,
        rate: undefined,
        amountPayable: 0,
      });
      continue;
    }
    const amountPayable = base.amountPayable * frac;
    const bagWt = row.type === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
    const netWt = row.count * (row.weightNum - bagWt);
    const rate =
      netWt > 0 && !Number.isNaN(netWt) ? amountPayable / netWt : undefined;
    result.set(rowKey, {
      wtReceivedAfterGrading: base.wtReceivedAfterGrading * frac,
      lessBardanaAfterGrading: base.lessBardanaAfterGrading * frac,
      actualWtOfPotato: base.actualWtOfPotato * frac,
      rate,
      amountPayable,
    });
  }
  return result;
}

/** Totals for right-hand columns using same formula as main table (sum over rows). */
function computeSummaryTotals(rows: StockLedgerRow[]): SummaryTotals {
  let totalWtReceivedAfterGrading = 0;
  let totalLessBardanaAfterGrading = 0;
  let totalActualWtOfPotato = 0;
  let totalAmountPayable = 0;
  for (const row of rows) {
    totalWtReceivedAfterGrading += computeWtReceivedAfterGrading(row);
    totalLessBardanaAfterGrading += computeLessBardanaAfterGrading(row);
    totalActualWtOfPotato += computeActualWtOfPotato(row);
    totalAmountPayable += computeAmountPayable(row);
  }
  return {
    totalWtReceivedAfterGrading,
    totalLessBardanaAfterGrading,
    totalActualWtOfPotato,
    totalAmountPayable,
  };
}

const TYPE_COL_WIDTH = STOCK_LEDGER_COL_WIDTHS.bagType;
const WEIGHT_PER_BAG_COL_WIDTH = 20;
const SIZE_COL_WIDTH = STOCK_LEDGER_COL_WIDTHS.sizeColumn;
const W = STOCK_LEDGER_COL_WIDTHS;

/** Right-hand columns after Wt/Bag (same order as main table). */
const RIGHT_COLUMNS: {
  label: string;
  width: number;
  key: keyof SummaryRightValues;
}[] = [
  {
    label: 'WT REC.',
    width: W.wtReceivedAfterGrading,
    key: 'wtReceivedAfterGrading',
  },
  {
    label: 'LESS BARD.',
    width: W.lessBardanaAfterGrading,
    key: 'lessBardanaAfterGrading',
  },
  {
    label: 'ACTUAL WT',
    width: W.actualWtOfPotato,
    key: 'actualWtOfPotato',
  },
  { label: 'RATE', width: 20, key: 'rate' },
  { label: 'AMT PAY.', width: W.amountPayable, key: 'amountPayable' },
];

const PCT_GRADED_SIZES_COL_WIDTH = 28;
const PCT_GRADED_SIZES_LABEL = '% of Graded Sizes';

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 2,
    padding: 8,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 6,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: HEADER_BG,
    borderWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  headerCell: {
    paddingVertical: 2,
    paddingHorizontal: 1,
    fontWeight: 700,
    fontSize: 3.5,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellLast: {
    borderRightWidth: 0,
  },
  headerCellText: {
    fontSize: 3.5,
    fontWeight: 700,
    color: '#333',
    textTransform: 'uppercase',
  },
  dataRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
  },
  cell: {
    paddingVertical: 1,
    paddingHorizontal: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellLast: {
    borderRightWidth: 0,
  },
  cellCenter: {
    textAlign: 'center',
  },
  cellContent: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSub: {
    fontSize: 2.5,
    color: '#6b7280',
  },
  totalRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#f3f4f6',
    flexShrink: 0,
  },
  totalCellText: {
    fontWeight: 700,
  },
});

export interface SummaryTablePdfProps {
  rows: StockLedgerRow[];
}

function formatRightCellValue(
  key: keyof SummaryRightValues,
  value: number | undefined
): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (key === 'rate') {
    return value.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (key === 'amountPayable') {
    return value > 0
      ? value.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—';
  }
  if (typeof value === 'number' && value > 0) {
    return value.toLocaleString('en-IN');
  }
  return value === 0 ? '—' : value.toLocaleString('en-IN');
}

export default function SummaryTablePdf({ rows }: SummaryTablePdfProps) {
  const groupedMap = buildGroupedMap(rows);
  const summaryRows = getSummaryRows(groupedMap);
  const rowKeys = getOrderedRowKeys(groupedMap);
  const baseRightValues = buildSummaryRightValues(rows, rowKeys);
  const summaryRightValuesByRow = buildSummaryRightValuesForRows(
    summaryRows,
    baseRightValues
  );
  const summaryTotals = computeSummaryTotals(rows);

  const totalsBySize: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    totalsBySize[size] = 0;
  }
  for (const key of groupedMap.keys()) {
    const [, size] = key.split('|');
    totalsBySize[size] = (totalsBySize[size] ?? 0) + (groupedMap.get(key) ?? 0);
  }

  /** Only show size columns that have at least one bag (preserve GRADING_SIZES order). */
  const sizesWithQuantities = GRADING_SIZES.filter(
    (size) => (totalsBySize[size] ?? 0) > 0
  );

  const hasAnyPostGrading = rows.some(
    (r) =>
      (r.sizeBagsJute != null && Object.keys(r.sizeBagsJute).length > 0) ||
      (r.sizeBagsLeno != null && Object.keys(r.sizeBagsLeno).length > 0) ||
      (r.sizeBags != null && Object.keys(r.sizeBags).length > 0)
  );
  const showGroupedSummary = hasAnyPostGrading && summaryRows.length > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Summary</Text>
      <View style={styles.headerRow}>
        <View style={[styles.headerCell, { width: TYPE_COL_WIDTH }]}>
          <Text style={styles.headerCellText}>Type</Text>
        </View>
        {sizesWithQuantities.map((size) => (
          <View
            key={size}
            style={[styles.headerCell, { width: SIZE_COL_WIDTH }]}
          >
            <Text style={styles.headerCellText}>
              {SIZE_HEADER_LABELS[size] ?? size}
            </Text>
          </View>
        ))}
        <View style={[styles.headerCell, { width: WEIGHT_PER_BAG_COL_WIDTH }]}>
          <Text style={styles.headerCellText}>Wt/Bag</Text>
        </View>
        {RIGHT_COLUMNS.map((col) => (
          <View key={col.key} style={[styles.headerCell, { width: col.width }]}>
            <Text style={styles.headerCellText}>{col.label}</Text>
          </View>
        ))}
        <View
          style={[
            styles.headerCell,
            styles.headerCellLast,
            { width: PCT_GRADED_SIZES_COL_WIDTH },
          ]}
        >
          <Text style={styles.headerCellText}>{PCT_GRADED_SIZES_LABEL}</Text>
        </View>
      </View>
      {showGroupedSummary &&
        summaryRows.map((row, rowIdx) => {
          const rowValueKey = `${row.type}|${row.weightKey}|${row.size}`;
          const entry = summaryRightValuesByRow.get(rowValueKey);
          return (
            <View key={`${rowValueKey}-${rowIdx}`} style={styles.dataRow}>
              <View style={[styles.cell, { width: TYPE_COL_WIDTH }]}>
                <Text style={styles.cellCenter}>{row.type}</Text>
              </View>
              {sizesWithQuantities.map((size) => (
                <View
                  key={size}
                  style={[styles.cell, { width: SIZE_COL_WIDTH }]}
                >
                  {size === row.size ? (
                    <Text style={styles.cellCenter}>
                      {row.count.toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                </View>
              ))}
              <View style={[styles.cell, { width: WEIGHT_PER_BAG_COL_WIDTH }]}>
                <Text style={styles.cellCenter}>
                  {row.weightNum > 0 && !Number.isNaN(row.weightNum)
                    ? String(row.weightNum)
                    : '—'}
                </Text>
              </View>
              {RIGHT_COLUMNS.map((col) => {
                const val = entry ? entry[col.key] : undefined;
                const str =
                  val !== undefined
                    ? formatRightCellValue(col.key, val as number | undefined)
                    : '—';
                return (
                  <View
                    key={col.key}
                    style={[styles.cell, { width: col.width }]}
                  >
                    <Text style={styles.cellCenter}>{str}</Text>
                  </View>
                );
              })}
              <View
                style={[
                  styles.cell,
                  styles.cellLast,
                  { width: PCT_GRADED_SIZES_COL_WIDTH },
                ]}
              >
                <Text style={styles.cellCenter}>
                  {summaryTotals.totalActualWtOfPotato > 0 && entry
                    ? `${((entry.actualWtOfPotato / summaryTotals.totalActualWtOfPotato) * 100).toFixed(2)}%`
                    : '—'}
                </Text>
              </View>
            </View>
          );
        })}
      {showGroupedSummary && (
        <View style={styles.totalRow}>
          <View style={[styles.cell, { width: TYPE_COL_WIDTH }]}>
            <Text style={[styles.cellCenter, styles.totalCellText]}>Total</Text>
          </View>
          {sizesWithQuantities.map((size) => (
            <View key={size} style={[styles.cell, { width: SIZE_COL_WIDTH }]}>
              <Text style={[styles.cellCenter, styles.totalCellText]}>
                {(totalsBySize[size] ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
          <View style={[styles.cell, { width: WEIGHT_PER_BAG_COL_WIDTH }]}>
            <Text style={[styles.cellCenter, styles.totalCellText]}>—</Text>
          </View>
          {RIGHT_COLUMNS.map((col) => {
            const totalVal =
              col.key === 'wtReceivedAfterGrading'
                ? summaryTotals.totalWtReceivedAfterGrading
                : col.key === 'lessBardanaAfterGrading'
                  ? summaryTotals.totalLessBardanaAfterGrading
                  : col.key === 'actualWtOfPotato'
                    ? summaryTotals.totalActualWtOfPotato
                    : col.key === 'rate'
                      ? undefined
                      : summaryTotals.totalAmountPayable;
            const str = formatRightCellValue(
              col.key,
              totalVal as number | undefined
            );
            return (
              <View key={col.key} style={[styles.cell, { width: col.width }]}>
                <Text style={[styles.cellCenter, styles.totalCellText]}>
                  {str}
                </Text>
              </View>
            );
          })}
          <View
            style={[
              styles.cell,
              styles.cellLast,
              { width: PCT_GRADED_SIZES_COL_WIDTH },
            ]}
          >
            <Text style={[styles.cellCenter, styles.totalCellText]}>
              {summaryTotals.totalActualWtOfPotato > 0 ? '100.00%' : '—'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
