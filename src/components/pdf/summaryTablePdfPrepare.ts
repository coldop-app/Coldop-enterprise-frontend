import { GRADING_SIZES } from '@/components/forms/grading/constants';
import type { StockLedgerRow } from '@/components/pdf/stockLedgerTypes';
import {
  type SummaryRightValues,
  buildGroupedMap,
  getSummaryRows,
  buildSummaryRightValuesByRow,
  computeSummaryTotalsFromRows,
} from '@/components/pdf/summaryTablePdfCompute';

export type PreparedSummaryTableRow = {
  key: string;
  type: string;
  size: string;
  count: number;
  weightDisplay: string;
  rightValues: Record<keyof SummaryRightValues, string>;
  pctOfGradedSizes: string;
};

export type PreparedSummaryTableData = {
  sizesWithQuantities: string[];
  rows: PreparedSummaryTableRow[];
  totalsBySize: Record<string, number>;
  totalsRightValues: Record<keyof SummaryRightValues, string>;
  totalPctOfGradedSizes: string;
  showGroupedSummary: boolean;
};

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

export function prepareSummaryTablePdfData(
  rows: StockLedgerRow[]
): PreparedSummaryTableData {
  const groupedMap = buildGroupedMap(rows);
  const summaryRows = getSummaryRows(groupedMap);
  const summaryRightValuesByRow = buildSummaryRightValuesByRow(summaryRows);
  const summaryTotals = computeSummaryTotalsFromRows(
    summaryRows,
    summaryRightValuesByRow
  );

  const totalsBySize: Record<string, number> = {};
  for (const size of GRADING_SIZES) totalsBySize[size] = 0;
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

  const preparedRows: PreparedSummaryTableRow[] = summaryRows.map((row) => {
    const rowValueKey = `${row.type}|${row.weightKey}|${row.size}|${row.variety}`;
    const entry = summaryRightValuesByRow.get(rowValueKey);
    return {
      key: rowValueKey,
      type: row.type,
      size: row.size,
      count: row.count,
      weightDisplay:
        row.weightNum > 0 && !Number.isNaN(row.weightNum)
          ? String(row.weightNum)
          : '—',
      rightValues: {
        wtReceivedAfterGrading: formatRightCellValue(
          'wtReceivedAfterGrading',
          entry?.wtReceivedAfterGrading
        ),
        lessBardanaAfterGrading: formatRightCellValue(
          'lessBardanaAfterGrading',
          entry?.lessBardanaAfterGrading
        ),
        actualWtOfPotato: formatRightCellValue(
          'actualWtOfPotato',
          entry?.actualWtOfPotato
        ),
        rate: formatRightCellValue('rate', entry?.rate),
        amountPayable: formatRightCellValue(
          'amountPayable',
          entry?.amountPayable
        ),
      },
      pctOfGradedSizes:
        summaryTotals.totalActualWtOfPotato > 0 && entry
          ? `${((entry.actualWtOfPotato / summaryTotals.totalActualWtOfPotato) * 100).toFixed(2)}%`
          : '—',
    };
  });

  const totalsRightValues: Record<keyof SummaryRightValues, string> = {
    wtReceivedAfterGrading: formatRightCellValue(
      'wtReceivedAfterGrading',
      summaryTotals.totalWtReceivedAfterGrading
    ),
    lessBardanaAfterGrading: formatRightCellValue(
      'lessBardanaAfterGrading',
      summaryTotals.totalLessBardanaAfterGrading
    ),
    actualWtOfPotato: formatRightCellValue(
      'actualWtOfPotato',
      summaryTotals.totalActualWtOfPotato
    ),
    rate: formatRightCellValue('rate', undefined),
    amountPayable: formatRightCellValue(
      'amountPayable',
      summaryTotals.totalAmountPayable
    ),
  };

  return {
    sizesWithQuantities,
    rows: preparedRows,
    totalsBySize,
    totalsRightValues,
    totalPctOfGradedSizes:
      summaryTotals.totalActualWtOfPotato > 0 ? '100.00%' : '—',
    showGroupedSummary,
  };
}
