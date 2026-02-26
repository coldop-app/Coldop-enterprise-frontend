import * as XLSX from 'xlsx';
import { formatVoucherDate } from '@/components/daybook/vouchers/format-date';
import {
  GRADING_SIZES,
  JUTE_BAG_WEIGHT,
  LENO_BAG_WEIGHT,
} from '@/components/forms/grading/constants';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import {
  computeIncomingLessBardana,
  computeIncomingActualWeight,
} from '@/components/pdf/incomingVoucherCalculations';
import {
  computeWtReceivedAfterGrading,
  computeLessBardanaAfterGrading,
  computeActualWtOfPotato,
  computeWeightShortage,
  computeWeightShortagePercent,
  computeAmountPayable,
  getTotalJuteAndLenoBags,
  getBuyBackRate,
  SIZE_HEADER_LABELS,
} from '@/components/pdf/gradingVoucherCalculations';
import { sortRowsByGatePassNo } from '@/components/pdf/StockLedgerPdf';

/** Sizes that have at least one bag across the given rows (order preserved from GRADING_SIZES). Used for main table and GGP. */
function getSizesWithQuantities(rows: StockLedgerRow[]): string[] {
  return GRADING_SIZES.filter((size) =>
    rows.some((row) => {
      const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
      if (hasSplit) {
        return (
          (row.sizeBagsJute?.[size] ?? 0) + (row.sizeBagsLeno?.[size] ?? 0) > 0
        );
      }
      return (row.sizeBags?.[size] ?? 0) > 0;
    })
  );
}

/** Build header row matching StockLedgerPdf.tsx table columns (only size columns that have quantities). */
function getHeaders(sizesWithQuantities: string[]): string[] {
  const sizeLabels = sizesWithQuantities.map((s) => SIZE_HEADER_LABELS[s] ?? s);
  return [
    'System Incoming GP No',
    'Incoming GP No',
    'System Grading GP NO',
    'Grading Gp No',
    'Incoming gate pass date',
    'Grading gate pass date',
    'Store',
    'Variety',
    'Truck Number',
    'Bags Received',
    'Weight Slip No.',
    'Gross Weight',
    'Tare Weight',
    'Net Weight',
    'Less Bard Weight @0.700 g',
    'Actual Weight of Potato',
    'Number of Bags Post Grading',
    'Type',
    ...sizeLabels,
    'Weight Received After Grading',
    'Less Bard Weight',
    'Actual wt of Graded Potato',
    'Weight Shortage',
    'Shortage %',
    'Amount Payable',
  ];
}

/** Format cell value for display (matches PDF "—" for empty) */
function fmt(value: number | string | undefined): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '—';
    return value.toLocaleString('en-IN');
  }
  return String(value);
}

/** Resolve JUTE size bags: explicit sizeBagsJute or legacy bagType + sizeBags (matches PDF). */
function getSizeBagsJute(
  row: StockLedgerRow
): Record<string, number> | undefined {
  if (row.sizeBagsJute != null && Object.keys(row.sizeBagsJute).length > 0)
    return row.sizeBagsJute;
  if (row.bagType === 'JUTE' && row.sizeBags) return row.sizeBags;
  return undefined;
}

/** Resolve LENO size bags: explicit sizeBagsLeno or legacy bagType + sizeBags (matches PDF). */
function getSizeBagsLeno(
  row: StockLedgerRow
): Record<string, number> | undefined {
  if (row.sizeBagsLeno != null && Object.keys(row.sizeBagsLeno).length > 0)
    return row.sizeBagsLeno;
  if (row.bagType === 'LENO' && row.sizeBags) return row.sizeBags;
  return undefined;
}

/** Build left-block cells (Gp No through Post Gr.) — shared when bifurcated. */
function leftBlockCells(row: StockLedgerRow): (string | number)[] {
  const dateStr = formatVoucherDate(row.date);
  const gradingDateStr =
    row.gradingGatePassDate != null &&
    String(row.gradingGatePassDate).trim() !== ''
      ? formatVoucherDate(row.gradingGatePassDate)
      : '—';
  const truckStr =
    row.truckNumber != null && String(row.truckNumber).trim() !== ''
      ? String(row.truckNumber)
      : '—';
  const slipStr =
    row.weightSlipNumber != null && String(row.weightSlipNumber).trim() !== ''
      ? row.weightSlipNumber
      : '—';
  const manualNoStr =
    row.manualIncomingVoucherNo != null &&
    String(row.manualIncomingVoucherNo).trim() !== ''
      ? String(row.manualIncomingVoucherNo)
      : '—';
  const ggpNoStr =
    row.gradingGatePassNo != null && String(row.gradingGatePassNo).trim() !== ''
      ? String(row.gradingGatePassNo)
      : '—';
  const manualGgpStr =
    row.manualGradingGatePassNo != null &&
    String(row.manualGradingGatePassNo).trim() !== ''
      ? String(row.manualGradingGatePassNo)
      : '—';
  const varietyStr =
    row.variety != null && String(row.variety).trim() !== ''
      ? row.variety.trim()
      : '—';
  const lessBardanaKg = computeIncomingLessBardana(row);
  const actualWeightKg = computeIncomingActualWeight(row);
  return [
    row.incomingGatePassNo,
    manualNoStr,
    ggpNoStr,
    manualGgpStr,
    dateStr,
    gradingDateStr,
    row.store,
    varietyStr,
    truckStr,
    row.bagsReceived,
    slipStr,
    fmt(row.grossWeightKg),
    fmt(row.tareWeightKg),
    fmt(row.netWeightKg),
    lessBardanaKg,
    fmt(actualWeightKg),
    row.postGradingBags != null ? row.postGradingBags : '—',
  ];
}

/** Build Type + size columns for one bag type (JUTE or LENO), matching PDF. Only includes sizes that have quantities. */
function typeAndSizeCells(
  bagType: 'JUTE' | 'LENO',
  sizeBags: Record<string, number> | undefined,
  sizeWeightPerBag: Record<string, number> | undefined,
  sizesWithQuantities: string[]
): (string | number)[] {
  const sizeCells = sizesWithQuantities.map((size) => {
    const value = sizeBags?.[size];
    const weightKg = sizeWeightPerBag?.[size];
    const showQty = value != null && value > 0;
    if (!showQty) return '';
    if (weightKg != null && !Number.isNaN(weightKg) && weightKg > 0) {
      return `${value} (${weightKg})`;
    }
    return String(value);
  });
  return [bagType, ...sizeCells];
}

/**
 * One or two data rows per ledger row, matching PDF:
 * - When row has post-grading bifurcation (JUTE/LENO), emit two rows like PDF sub-rows.
 * - Otherwise emit one row.
 * Only includes size columns that have quantities (sizesWithQuantities).
 */
function rowToExcelRows(
  row: StockLedgerRow,
  sizesWithQuantities: string[]
): (string | number)[][] {
  const left = leftBlockCells(row);
  const sizeBagsJute = getSizeBagsJute(row);
  const sizeBagsLeno = getSizeBagsLeno(row);
  const hasPostGrading =
    row.postGradingBags != null || sizeBagsJute != null || sizeBagsLeno != null;

  const wtReceivedAfterGrading = computeWtReceivedAfterGrading(row);
  const { totalJute, totalLeno } = getTotalJuteAndLenoBags(row);
  const lessBardanaJute = totalJute * JUTE_BAG_WEIGHT;
  const lessBardanaLeno = totalLeno * LENO_BAG_WEIGHT;
  const actualWtOfPotato = computeActualWtOfPotato(row);
  const weightShortage = computeWeightShortage(row);
  const weightShortagePercent = computeWeightShortagePercent(row);
  const amountPayable = computeAmountPayable(row);

  const rightTailFirst: (string | number)[] = [
    wtReceivedAfterGrading > 0 ? wtReceivedAfterGrading : '—',
    lessBardanaJute > 0 ? lessBardanaJute : '—',
    actualWtOfPotato > 0 ? actualWtOfPotato : '—',
    weightShortage != null && !Number.isNaN(weightShortage)
      ? weightShortage
      : '—',
    weightShortagePercent != null && !Number.isNaN(weightShortagePercent)
      ? `${weightShortagePercent.toFixed(1)}%`
      : '—',
    amountPayable > 0
      ? amountPayable.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—',
  ];
  const rightTailSecond: (string | number)[] = [
    '',
    lessBardanaLeno > 0 ? lessBardanaLeno : '—',
    '',
    '',
    '',
    '',
  ];

  if (hasPostGrading) {
    const juteTypeSize = typeAndSizeCells(
      'JUTE',
      sizeBagsJute,
      row.sizeWeightPerBagJute,
      sizesWithQuantities
    );
    const lenoTypeSize = typeAndSizeCells(
      'LENO',
      sizeBagsLeno,
      row.sizeWeightPerBagLeno,
      sizesWithQuantities
    );
    return [
      [...left, ...juteTypeSize, ...rightTailFirst],
      [...left, ...lenoTypeSize, ...rightTailSecond],
    ];
  }

  const typeStr = row.bagType ?? '—';
  const sizeCells = sizesWithQuantities.map((size) => {
    const value = row.sizeBags?.[size];
    const weightKg = row.sizeWeightPerBag?.[size];
    const showQty = value != null && value > 0;
    if (!showQty) return '';
    if (weightKg != null && !Number.isNaN(weightKg) && weightKg > 0) {
      return `${value} (${weightKg})`;
    }
    return String(value);
  });
  const lessBardanaAfterGrading = computeLessBardanaAfterGrading(row);
  const singleRight: (string | number)[] = [
    wtReceivedAfterGrading > 0 ? wtReceivedAfterGrading : '—',
    lessBardanaAfterGrading > 0 ? lessBardanaAfterGrading : '—',
    actualWtOfPotato > 0 ? actualWtOfPotato : '—',
    weightShortage != null && !Number.isNaN(weightShortage)
      ? weightShortage
      : '—',
    weightShortagePercent != null && !Number.isNaN(weightShortagePercent)
      ? `${weightShortagePercent.toFixed(1)}%`
      : '—',
    amountPayable > 0
      ? amountPayable.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '—',
  ];
  return [[...left, typeStr, ...sizeCells, ...singleRight]];
}

// ---------- Summary table (matches SummaryTablePdf) ----------

/** Key: "bagType|size|weightKey|variety", value: total bag count */
function buildGroupedMap(rows: StockLedgerRow[]): Map<string, number> {
  const map = new Map<string, number>();
  const add = (key: string, count: number) => {
    map.set(key, (map.get(key) ?? 0) + count);
  };
  const weightKey = (w: number | undefined) =>
    w != null && !Number.isNaN(w) ? w.toFixed(2) : '0.00';
  const varietyKey = (v: string | undefined) => (v ?? '').trim() || '';

  for (const row of rows) {
    const variety = varietyKey(row.variety);
    const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
    if (hasSplit) {
      for (const size of GRADING_SIZES) {
        const juteQty = row.sizeBagsJute?.[size] ?? 0;
        const juteWt = row.sizeWeightPerBagJute?.[size];
        if (juteQty > 0) {
          add(`JUTE|${size}|${weightKey(juteWt)}|${variety}`, juteQty);
        }
        const lenoQty = row.sizeBagsLeno?.[size] ?? 0;
        const lenoWt = row.sizeWeightPerBagLeno?.[size];
        if (lenoQty > 0) {
          add(`LENO|${size}|${weightKey(lenoWt)}|${variety}`, lenoQty);
        }
      }
    } else {
      const bagType = (row.bagType ?? 'JUTE').toUpperCase();
      for (const size of GRADING_SIZES) {
        const qty = row.sizeBags?.[size] ?? 0;
        const wt = row.sizeWeightPerBag?.[size];
        if (qty > 0) {
          add(`${bagType}|${size}|${weightKey(wt)}|${variety}`, qty);
        }
      }
    }
  }
  return map;
}

interface SummaryRow {
  type: string;
  weightKey: string;
  weightNum: number;
  size: string;
  variety: string;
  count: number;
}

function getSummaryRows(map: Map<string, number>): SummaryRow[] {
  const sizeOrder = new Map<string, number>(
    GRADING_SIZES.map((s, i) => [s, i])
  );
  const rows: SummaryRow[] = [];
  for (const [key, count] of map) {
    if (count <= 0) continue;
    const parts = key.split('|');
    const type = parts[0] ?? 'JUTE';
    const size = parts[1] ?? '';
    const weightKey = parts[2] ?? '0.00';
    const variety = parts[3] ?? '';
    const weightNum = parseFloat(weightKey);
    rows.push({
      type,
      weightKey,
      weightNum: Number.isNaN(weightNum) ? 0 : weightNum,
      size,
      variety,
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

interface SummaryRightValues {
  wtReceivedAfterGrading: number;
  lessBardanaAfterGrading: number;
  actualWtOfPotato: number;
  rate: number | undefined;
  amountPayable: number;
}

function computeSummaryRightValuesForRow(row: SummaryRow): SummaryRightValues {
  const bagWt = row.type === 'LENO' ? LENO_BAG_WEIGHT : JUTE_BAG_WEIGHT;
  const weightRecd = row.weightNum * row.count;
  const lessBardana = row.count * bagWt;
  const actualWt = weightRecd - lessBardana;
  const rate = getBuyBackRate(row.variety || undefined, row.size);
  const amountPayable = actualWt * rate;
  return {
    wtReceivedAfterGrading: weightRecd,
    lessBardanaAfterGrading: lessBardana,
    actualWtOfPotato: actualWt,
    rate: rate > 0 ? rate : undefined,
    amountPayable,
  };
}

function buildSummaryRightValuesByRow(
  summaryRows: SummaryRow[]
): Map<string, SummaryRightValues> {
  const result = new Map<string, SummaryRightValues>();
  for (const row of summaryRows) {
    const rowKey = `${row.type}|${row.weightKey}|${row.size}|${row.variety}`;
    result.set(rowKey, computeSummaryRightValuesForRow(row));
  }
  return result;
}

interface SummaryTotals {
  totalWtReceivedAfterGrading: number;
  totalLessBardanaAfterGrading: number;
  totalActualWtOfPotato: number;
  totalAmountPayable: number;
}

function computeSummaryTotalsFromRows(
  summaryRows: SummaryRow[],
  rightValuesByRow: Map<string, SummaryRightValues>
): SummaryTotals {
  let totalWtReceivedAfterGrading = 0;
  let totalLessBardanaAfterGrading = 0;
  let totalActualWtOfPotato = 0;
  let totalAmountPayable = 0;
  for (const row of summaryRows) {
    const rowKey = `${row.type}|${row.weightKey}|${row.size}|${row.variety}`;
    const entry = rightValuesByRow.get(rowKey);
    if (entry) {
      totalWtReceivedAfterGrading += entry.wtReceivedAfterGrading;
      totalLessBardanaAfterGrading += entry.lessBardanaAfterGrading;
      totalActualWtOfPotato += entry.actualWtOfPotato;
      totalAmountPayable += entry.amountPayable;
    }
  }
  return {
    totalWtReceivedAfterGrading,
    totalLessBardanaAfterGrading,
    totalActualWtOfPotato,
    totalAmountPayable,
  };
}

function formatSummaryRightCell(
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

const SUMMARY_RIGHT_COLUMNS: {
  label: string;
  key: keyof SummaryRightValues;
}[] = [
  { label: 'WT REC.', key: 'wtReceivedAfterGrading' },
  { label: 'LESS BARD.', key: 'lessBardanaAfterGrading' },
  { label: 'ACTUAL WT', key: 'actualWtOfPotato' },
  { label: 'RATE', key: 'rate' },
  { label: 'AMT PAY.', key: 'amountPayable' },
];

/** Build Summary sheet data (matches SummaryTablePdf). */
function buildSummarySheetData(rows: StockLedgerRow[]): (string | number)[][] {
  const groupedMap = buildGroupedMap(rows);
  const summaryRows = getSummaryRows(groupedMap);
  const rightValuesByRow = buildSummaryRightValuesByRow(summaryRows);
  const summaryTotals = computeSummaryTotalsFromRows(
    summaryRows,
    rightValuesByRow
  );

  const totalsBySize: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    totalsBySize[size] = 0;
  }
  for (const key of groupedMap.keys()) {
    const [, size] = key.split('|');
    totalsBySize[size] = (totalsBySize[size] ?? 0) + (groupedMap.get(key) ?? 0);
  }

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

  const result: (string | number)[][] = [['Summary'], []];

  if (!showGroupedSummary) {
    result.push(['No graded data']);
    return result;
  }

  const headerRow: (string | number)[] = [
    'Type',
    ...sizesWithQuantities.map((s) => SIZE_HEADER_LABELS[s] ?? s),
    'Wt/Bag',
    ...SUMMARY_RIGHT_COLUMNS.map((c) => c.label),
    '% of Graded Sizes',
  ];
  result.push(headerRow);

  for (const row of summaryRows) {
    const rowKey = `${row.type}|${row.weightKey}|${row.size}|${row.variety}`;
    const entry = rightValuesByRow.get(rowKey);
    const sizeCells = sizesWithQuantities.map((size) =>
      size === row.size ? row.count : ''
    );
    const wtBagStr =
      row.weightNum > 0 && !Number.isNaN(row.weightNum)
        ? String(row.weightNum)
        : '—';
    const rightCells = SUMMARY_RIGHT_COLUMNS.map((col) =>
      entry
        ? formatSummaryRightCell(col.key, entry[col.key] as number | undefined)
        : '—'
    );
    const pctStr =
      summaryTotals.totalActualWtOfPotato > 0 && entry
        ? `${((entry.actualWtOfPotato / summaryTotals.totalActualWtOfPotato) * 100).toFixed(2)}%`
        : '—';
    result.push([row.type, ...sizeCells, wtBagStr, ...rightCells, pctStr]);
  }

  const totalRightCells = SUMMARY_RIGHT_COLUMNS.map((col) => {
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
    return formatSummaryRightCell(col.key, totalVal as number | undefined);
  });
  result.push([
    'Total',
    ...sizesWithQuantities.map((s) => (totalsBySize[s] ?? 0) || ''),
    '—',
    ...totalRightCells,
    summaryTotals.totalActualWtOfPotato > 0 ? '100.00%' : '—',
  ]);

  return result;
}

// ---------- Grading Gate Pass table (matches GradingGatePassTablePdf) ----------

function formatGgpValue(value: number | string | undefined): string {
  if (value == null || String(value).trim() === '') return '—';
  return String(value);
}

function getSizeWtAndType(
  row: StockLedgerRow,
  size: string
): { wt: string; type: string } {
  const juteWt = row.sizeWeightPerBagJute?.[size];
  const lenoWt = row.sizeWeightPerBagLeno?.[size];
  const unifiedWt = row.sizeWeightPerBag?.[size];
  const hasJute =
    juteWt != null &&
    !Number.isNaN(juteWt) &&
    (row.sizeBagsJute?.[size] ?? 0) > 0;
  const hasLeno =
    lenoWt != null &&
    !Number.isNaN(lenoWt) &&
    (row.sizeBagsLeno?.[size] ?? 0) > 0;
  if (hasJute)
    return {
      wt: juteWt > 0 ? String(juteWt) : '—',
      type: 'JUTE',
    };
  if (hasLeno)
    return {
      wt: lenoWt > 0 ? String(lenoWt) : '—',
      type: 'LENO',
    };
  if (
    unifiedWt != null &&
    !Number.isNaN(unifiedWt) &&
    (row.sizeBags?.[size] ?? 0) > 0
  )
    return {
      wt: unifiedWt > 0 ? String(unifiedWt) : '—',
      type: row.bagType ?? '—',
    };
  return { wt: '—', type: '—' };
}

function getSizeQty(row: StockLedgerRow, size: string): number {
  const jute = row.sizeBagsJute?.[size] ?? 0;
  const leno = row.sizeBagsLeno?.[size] ?? 0;
  if (jute > 0 || leno > 0) return jute + leno;
  return row.sizeBags?.[size] ?? 0;
}

function getRowTotal(row: StockLedgerRow): number {
  return GRADING_SIZES.reduce((sum, size) => sum + getSizeQty(row, size), 0);
}

/** Build Grading Gate Pass sheet data (matches GradingGatePassTablePdf). Returns null if no rows with GGP. */
function buildGradingGatePassSheetData(
  farmerName: string,
  rows: StockLedgerRow[]
): (string | number)[][] | null {
  const rowsWithGgp = rows.filter(
    (row) =>
      (row.gradingGatePassNo != null &&
        String(row.gradingGatePassNo).trim() !== '') ||
      (row.manualGradingGatePassNo != null &&
        String(row.manualGradingGatePassNo).trim() !== '')
  );

  if (rowsWithGgp.length === 0) return null;

  const sizesWithQty = getSizesWithQuantities(rowsWithGgp);

  const result: (string | number)[][] = [['Grading Gate Pass Table'], []];

  const headerRow: (string | number)[] = [
    'System Incoming GP No',
    'Incoming GP No',
    'System Grading GP No',
    'Grading GP Number',
    'Farmer Name',
    'Variety',
    'Grading Date',
  ];
  for (const size of sizesWithQty) {
    headerRow.push(SIZE_HEADER_LABELS[size] ?? size, 'Wt in Kg', 'Bag Type');
  }
  headerRow.push('Total');
  result.push(headerRow);

  for (const row of rowsWithGgp) {
    const rowTotal = getRowTotal(row);
    const dateStr =
      row.gradingGatePassDate != null &&
      String(row.gradingGatePassDate).trim() !== ''
        ? formatVoucherDate(row.gradingGatePassDate)
        : row.date != null && String(row.date).trim() !== ''
          ? formatVoucherDate(row.date)
          : '—';
    const varietyStr =
      row.variety != null && String(row.variety).trim() !== ''
        ? String(row.variety).trim()
        : '—';
    const rowCells: (string | number)[] = [
      formatGgpValue(row.incomingGatePassNo),
      formatGgpValue(row.manualIncomingVoucherNo),
      formatGgpValue(row.gradingGatePassNo),
      formatGgpValue(row.manualGradingGatePassNo),
      farmerName,
      varietyStr,
      dateStr,
    ];
    for (const size of sizesWithQty) {
      const { wt, type } = getSizeWtAndType(row, size);
      const qty = getSizeQty(row, size);
      rowCells.push(qty > 0 ? qty : '—', wt, type);
    }
    rowCells.push(rowTotal > 0 ? rowTotal : '—');
    result.push(rowCells);
  }

  const totalsBySize: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    totalsBySize[size] = rowsWithGgp.reduce(
      (sum, row) => sum + getSizeQty(row, size),
      0
    );
  }
  const grandTotal = rowsWithGgp.reduce(
    (sum, row) => sum + getRowTotal(row),
    0
  );
  const totalRow: (string | number)[] = ['—', '—', 'Total', '—', '—', '—', '—'];
  for (const size of sizesWithQty) {
    const totalQty = totalsBySize[size] ?? 0;
    totalRow.push(totalQty > 0 ? totalQty : '—', '—', '—');
  }
  totalRow.push(grandTotal > 0 ? grandTotal : '—');
  result.push(totalRow);

  return result;
}

/** Build total row (same as PDF Total row). Only includes size columns that have quantities. */
function buildTotalRow(
  rows: StockLedgerRow[],
  sizesWithQuantities: string[]
): (string | number)[] {
  let totalBagsReceived = 0;
  let totalGrossKg = 0;
  let totalTareKg = 0;
  let totalNetKg = 0;
  let totalLessBardanaKg = 0;
  let totalActualWeightKg = 0;
  let totalPostGradingBags = 0;
  const totalSizeBags: Record<string, number> = {};
  for (const size of GRADING_SIZES) {
    totalSizeBags[size] = 0;
  }
  let totalWtReceivedAfterGrading = 0;
  let totalLessBardanaAfterGrading = 0;
  let totalActualWtOfPotato = 0;
  let totalWeightShortage = 0;
  let totalAmountPayable = 0;

  for (const row of rows) {
    totalBagsReceived += row.bagsReceived;
    totalGrossKg += row.grossWeightKg ?? 0;
    totalTareKg += row.tareWeightKg ?? 0;
    totalNetKg += row.netWeightKg ?? 0;
    totalLessBardanaKg += computeIncomingLessBardana(row);
    const actualKg = computeIncomingActualWeight(row);
    if (actualKg != null) totalActualWeightKg += actualKg;
    totalPostGradingBags += row.postGradingBags ?? 0;
    const hasSplit = row.sizeBagsJute != null || row.sizeBagsLeno != null;
    for (const size of GRADING_SIZES) {
      totalSizeBags[size] += hasSplit
        ? (row.sizeBagsJute?.[size] ?? 0) + (row.sizeBagsLeno?.[size] ?? 0)
        : (row.sizeBags?.[size] ?? 0);
    }
    totalWtReceivedAfterGrading += computeWtReceivedAfterGrading(row);
    totalLessBardanaAfterGrading += computeLessBardanaAfterGrading(row);
    totalActualWtOfPotato += computeActualWtOfPotato(row);
    const shortage = computeWeightShortage(row);
    if (shortage != null && !Number.isNaN(shortage))
      totalWeightShortage += shortage;
    totalAmountPayable += computeAmountPayable(row);
  }

  const totalWeightShortagePercent =
    totalActualWeightKg > 0
      ? (totalWeightShortage / totalActualWeightKg) * 100
      : null;

  const sizeCells = sizesWithQuantities.map((size) =>
    totalSizeBags[size] > 0 ? totalSizeBags[size] : ''
  );

  return [
    'Total',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalBagsReceived,
    '',
    totalGrossKg,
    totalTareKg,
    totalNetKg,
    totalLessBardanaKg,
    totalActualWeightKg,
    totalPostGradingBags,
    '',
    ...sizeCells,
    totalWtReceivedAfterGrading > 0 ? totalWtReceivedAfterGrading : '',
    totalLessBardanaAfterGrading > 0 ? totalLessBardanaAfterGrading : '',
    totalActualWtOfPotato > 0 ? totalActualWtOfPotato : '',
    totalWeightShortage !== 0 ? totalWeightShortage : '',
    totalWeightShortagePercent != null &&
    !Number.isNaN(totalWeightShortagePercent)
      ? `${totalWeightShortagePercent.toFixed(1)}%`
      : '',
    totalAmountPayable > 0
      ? totalAmountPayable.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '',
  ];
}

/**
 * Generate and download an xlsx file for the stock ledger (same format as PDF).
 */
export function downloadStockLedgerExcel(
  farmerName: string,
  rows: StockLedgerRow[]
): void {
  const sorted = sortRowsByGatePassNo(rows);
  const sizesWithQuantities = getSizesWithQuantities(sorted);
  const headers = getHeaders(sizesWithQuantities);
  const dataRows = sorted.flatMap((row) =>
    rowToExcelRows(row, sizesWithQuantities)
  );
  const totalRow = buildTotalRow(sorted, sizesWithQuantities);

  const wsData: (string | number)[][] = [
    [farmerName],
    [],
    headers,
    ...dataRows,
    totalRow,
  ];

  const wb = XLSX.utils.book_new();

  const mainSheet = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, mainSheet, 'Stock Ledger');

  const summaryData = buildSummarySheetData(sorted);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

  const ggpData = buildGradingGatePassSheetData(farmerName, sorted);
  if (ggpData != null) {
    const ggpSheet = XLSX.utils.aoa_to_sheet(ggpData);
    XLSX.utils.book_append_sheet(wb, ggpSheet, 'Grading Gate Pass');
  }

  const safeName = farmerName.replace(/[/\\?*[\]:]/g, '-').slice(0, 31);
  const filename = `${safeName || 'StockLedger'}_Stock_Ledger.xlsx`;
  XLSX.writeFile(wb, filename);
}
