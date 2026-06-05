import type {
  ShedStockReportShedTotals,
  ShedStockReportShedVariety,
} from '@/types/analytics';
import {
  isUngradedSize,
  normalizeSizeKey,
  sumByNormalizedSize,
} from './shed-report-utils';
import {
  type UngradedBagsByVariety,
  getApiUngradedMetricValue,
  getNotInternalUngradedBags,
  getUngradedShedStockCellValue,
  getUngradedTableBags,
  getShedStockVarietyTotal,
} from './shed-ungraded-utils';

export type ShedStockMetric = keyof Pick<
  ShedStockReportShedVariety,
  | 'gradingInitial'
  | 'stored'
  | 'dispatched'
  | 'internallyTransferred'
  | 'notInternallyTransferred'
  | 'shedStock'
>;

export type CellSelection =
  | { type: 'cell'; variety: string; size: string }
  | { type: 'row-total'; variety: string }
  | { type: 'column-total'; size: string }
  | { type: 'grand-total' };

export interface FormulaTerm {
  label: string;
  value: number;
  operator?: '+' | '−' | '=';
  variant: 'positive' | 'negative' | 'result' | 'neutral';
}

export interface CalculationBreakdown {
  title: string;
  subtitle: string;
  result: number;
  terms: FormulaTerm[];
  notes: string[];
}

const METRIC_LABELS: Record<ShedStockMetric, string> = {
  gradingInitial: 'Grading Initial',
  stored: 'Stored',
  dispatched: 'Dispatched',
  internallyTransferred: 'Internally Transferred',
  notInternallyTransferred: 'Not Internally Transferred',
  shedStock: 'Shed Stock',
};

const METRIC_DESCRIPTIONS: Record<ShedStockMetric, string> = {
  gradingInitial:
    'Bags graded in the selected date range (initial quantity before storage or dispatch).',
  stored: 'Bags moved to cold storage within the date range.',
  dispatched:
    'Total bags dispatched (includes both internal and external transfers).',
  internallyTransferred:
    'Dispatched bags marked as internal transfer between locations.',
  notInternallyTransferred:
    'Dispatched bags that are not internal transfers (subtracted from shed stock).',
  shedStock:
    'Graded bags still in the shed after storage and non-internal dispatch.',
};

export function getMetricLabel(metric: ShedStockMetric): string {
  return METRIC_LABELS[metric];
}

function findVariety(
  varieties: ShedStockReportShedVariety[],
  varietyName: string
): ShedStockReportShedVariety | undefined {
  return varieties.find((v) => v.variety === varietyName);
}

function sumMetricForSize(
  varieties: ShedStockReportShedVariety[],
  size: string,
  metric: ShedStockMetric
): number {
  let total = 0;
  for (const variety of varieties) {
    total += sumByNormalizedSize(variety.sizes, size, (row) =>
      Number(row[metric] ?? 0)
    );
  }
  return total;
}

function buildShedStockTerms(
  grading: number,
  stored: number,
  notInternallyTransferred: number,
  ungraded = 0
): FormulaTerm[] {
  const terms: FormulaTerm[] = [
    {
      label: 'Grading Initial',
      value: grading,
      operator: '+',
      variant: 'positive',
    },
  ];

  if (ungraded > 0) {
    terms.push({
      label: 'Ungraded',
      value: ungraded,
      operator: '+',
      variant: 'positive',
    });
  }

  terms.push(
    {
      label: 'Stored',
      value: stored,
      operator: '−',
      variant: 'negative',
    },
    {
      label: 'Not Internally Transferred',
      value: notInternallyTransferred,
      operator: '−',
      variant: 'negative',
    },
    {
      label: 'Shed Stock',
      value: grading + ungraded - stored - notInternallyTransferred,
      operator: '=',
      variant: 'result',
    }
  );

  return terms;
}

function buildDirectMetricTerms(
  metric: ShedStockMetric,
  value: number
): FormulaTerm[] {
  return [
    {
      label: METRIC_LABELS[metric],
      value,
      operator: '=',
      variant: 'result',
    },
  ];
}

function getCellComponents(
  variety: ShedStockReportShedVariety,
  size: string
): {
  gradingInitial: number;
  stored: number;
  notInternallyTransferred: number;
  shedStock: number;
} {
  return {
    gradingInitial: sumByNormalizedSize(variety.sizes, size, (r) =>
      Number(r.gradingInitial ?? 0)
    ),
    stored: sumByNormalizedSize(variety.sizes, size, (r) =>
      Number(r.stored ?? 0)
    ),
    notInternallyTransferred: sumByNormalizedSize(variety.sizes, size, (r) =>
      Number(r.notInternallyTransferred ?? 0)
    ),
    shedStock: sumByNormalizedSize(variety.sizes, size, (r) =>
      Number(r.shedStock ?? 0)
    ),
  };
}

function getMergedSizeNote(
  variety: ShedStockReportShedVariety,
  size: string
): string | undefined {
  const targetKey = normalizeSizeKey(size);
  const rawSizes = variety.sizes
    .filter((row) => normalizeSizeKey(row.size) === targetKey)
    .map((row) => row.size);
  const unique = [...new Set(rawSizes)];
  if (unique.length <= 1) return undefined;
  return `This column merges ${unique.length} size labels (${unique.join(', ')}) after normalization.`;
}

function buildUngradedShedStockTerms(
  physicalUngraded: number,
  notInternalUngraded: number
): FormulaTerm[] {
  const terms: FormulaTerm[] = [];

  if (physicalUngraded > 0) {
    terms.push({
      label: 'Ungraded in Shed',
      value: physicalUngraded,
      operator: '+',
      variant: 'positive',
    });
  }

  if (notInternalUngraded > 0) {
    terms.push({
      label: 'Not Int. Transfer (Ungraded)',
      value: notInternalUngraded,
      operator: '−',
      variant: 'negative',
    });
  }

  terms.push({
    label: 'Ungraded Shed Stock',
    value: physicalUngraded - notInternalUngraded,
    operator: '=',
    variant: 'result',
  });

  return terms;
}

export function buildCellBreakdown(
  selection: CellSelection,
  metric: ShedStockMetric,
  varieties: ShedStockReportShedVariety[],
  totals: ShedStockReportShedTotals,
  columnTotals: Record<string, number>,
  ungradedTable: UngradedBagsByVariety = new Map(),
  notInternalUngraded: UngradedBagsByVariety = new Map()
): CalculationBreakdown {
  const ungradedBags = totals.ungradedBags ?? 0;

  if (selection.type === 'cell') {
    const variety = findVariety(varieties, selection.variety);
    const isUngradedColumn = isUngradedSize(selection.size);
    const value =
      variety != null
        ? isUngradedColumn && metric === 'shedStock'
          ? getUngradedShedStockCellValue(
              variety,
              ungradedTable,
              notInternalUngraded
            )
          : isUngradedColumn && metric === 'notInternallyTransferred'
            ? getNotInternalUngradedBags(
                notInternalUngraded,
                variety.variety
              ) ||
              getApiUngradedMetricValue(variety, 'notInternallyTransferred')
            : isUngradedColumn
              ? getApiUngradedMetricValue(variety, metric)
              : sumByNormalizedSize(variety.sizes, selection.size, (row) =>
                  Number(row[metric] ?? 0)
                )
        : 0;
    const mergeNote =
      variety != null && !isUngradedColumn
        ? getMergedSizeNote(variety, selection.size)
        : undefined;

    if (metric === 'shedStock' && variety != null && isUngradedColumn) {
      const physicalUngraded = getUngradedTableBags(
        ungradedTable,
        variety.variety
      );
      const notInternal = getNotInternalUngradedBags(
        notInternalUngraded,
        variety.variety
      );
      return {
        title: `${selection.variety} · Ungraded`,
        subtitle: 'Ungraded shed stock for this variety',
        result: value,
        terms: buildUngradedShedStockTerms(physicalUngraded, notInternal),
        notes: [
          'Combines ungraded bags in the shed with ungraded dispatch that is not an internal transfer.',
          ...(physicalUngraded === 0
            ? ['No ungraded bags in the shed table for this variety.']
            : []),
          ...(notInternal === 0
            ? [
                'No ungraded not-internally-transferred dispatch for this variety.',
              ]
            : []),
        ],
      };
    }

    if (metric === 'shedStock' && variety != null) {
      const c = getCellComponents(variety, selection.size);
      return {
        title: `${selection.variety} · ${selection.size}`,
        subtitle: 'Graded shed stock at this variety and size',
        result: value,
        terms: buildShedStockTerms(
          c.gradingInitial,
          c.stored,
          c.notInternallyTransferred
        ),
        notes: [
          METRIC_DESCRIPTIONS.shedStock,
          ...(mergeNote ? [mergeNote] : []),
        ],
      };
    }

    if (
      metric === 'notInternallyTransferred' &&
      variety != null &&
      isUngradedColumn
    ) {
      const notInternal = getNotInternalUngradedBags(
        notInternalUngraded,
        variety.variety
      );
      return {
        title: `${selection.variety} · Ungraded`,
        subtitle: 'Not internally transferred ungraded dispatch',
        result: value,
        terms: buildDirectMetricTerms(metric, value),
        notes: [
          METRIC_DESCRIPTIONS.notInternallyTransferred,
          ...(notInternal > 0
            ? [
                `${notInternal.toLocaleString('en-IN')} bags from the not-internally-transferred dispatch table.`,
              ]
            : ['Value from shed stock API size row.']),
        ],
      };
    }

    return {
      title: `${selection.variety} · ${selection.size}`,
      subtitle: METRIC_LABELS[metric],
      result: value,
      terms: buildDirectMetricTerms(metric, value),
      notes: [METRIC_DESCRIPTIONS[metric], ...(mergeNote ? [mergeNote] : [])],
    };
  }

  if (selection.type === 'row-total') {
    const variety = findVariety(varieties, selection.variety);
    const value =
      variety != null && metric === 'shedStock'
        ? getShedStockVarietyTotal(variety, ungradedTable)
        : (variety?.[metric] ?? 0);

    if (metric === 'shedStock' && variety != null) {
      const physicalUngraded = getUngradedTableBags(
        ungradedTable,
        variety.variety
      );
      return {
        title: `${selection.variety} · Total`,
        subtitle: 'Variety shed stock including ungraded bags in the shed',
        result: value,
        terms: buildShedStockTerms(
          variety.gradingInitial,
          variety.stored,
          variety.notInternallyTransferred,
          physicalUngraded
        ),
        notes: [
          'Graded variety total from API plus ungraded bags in the shed for this variety.',
          'It may not equal the sum of visible size columns when sizes are merged or hidden.',
        ],
      };
    }

    return {
      title: `${selection.variety} · Total`,
      subtitle: METRIC_LABELS[metric],
      result: value,
      terms: buildDirectMetricTerms(metric, value),
      notes: [
        METRIC_DESCRIPTIONS[metric],
        'Row total from API variety aggregate.',
      ],
    };
  }

  if (selection.type === 'column-total') {
    const value = columnTotals[selection.size] ?? 0;

    if (metric === 'shedStock' && isUngradedSize(selection.size)) {
      let physicalTotal = 0;
      let notInternalTotal = 0;
      for (const variety of varieties) {
        physicalTotal += getUngradedTableBags(ungradedTable, variety.variety);
        notInternalTotal += getNotInternalUngradedBags(
          notInternalUngraded,
          variety.variety
        );
      }
      return {
        title: 'Ungraded · Column Total',
        subtitle: 'Sum across all varieties for the ungraded column',
        result: value,
        terms: buildUngradedShedStockTerms(physicalTotal, notInternalTotal),
        notes: [
          'Combines ungraded bags in the shed with ungraded not-internally-transferred dispatch.',
        ],
      };
    }

    if (metric === 'shedStock') {
      const grading = sumMetricForSize(
        varieties,
        selection.size,
        'gradingInitial'
      );
      const stored = sumMetricForSize(varieties, selection.size, 'stored');
      const notInternal = sumMetricForSize(
        varieties,
        selection.size,
        'notInternallyTransferred'
      );

      return {
        title: `${selection.size} · Column Total`,
        subtitle: 'Sum across all varieties for this size',
        result: value,
        terms: buildShedStockTerms(grading, stored, notInternal),
        notes: [
          'Column total is the sum of each variety’s value for this size.',
        ],
      };
    }

    return {
      title: `${selection.size} · Column Total`,
      subtitle: METRIC_LABELS[metric],
      result: value,
      terms: buildDirectMetricTerms(metric, value),
      notes: [
        METRIC_DESCRIPTIONS[metric],
        'Sum of this metric across all varieties for the selected size.',
      ],
    };
  }

  // grand-total
  const result =
    metric === 'shedStock' ? totals.shedStock + ungradedBags : totals[metric];

  if (metric === 'shedStock') {
    return {
      title: 'Report Total',
      subtitle: 'Overall shed stock for the selected date range',
      result,
      terms: buildShedStockTerms(
        totals.gradingInitial,
        totals.stored,
        totals.notInternallyTransferred,
        ungradedBags
      ),
      notes: [
        METRIC_DESCRIPTIONS.shedStock,
        `Graded shed stock from API: ${totals.shedStock.toLocaleString('en-IN')} bags.`,
        ...(ungradedBags > 0
          ? [`Ungraded bags added: ${ungradedBags.toLocaleString('en-IN')}.`]
          : []),
      ],
    };
  }

  return {
    title: 'Report Total',
    subtitle: METRIC_LABELS[metric],
    result,
    terms: buildDirectMetricTerms(metric, result),
    notes: [METRIC_DESCRIPTIONS[metric], 'Grand total from API totals.'],
  };
}

export function buildOverallBreakdown(
  totals: ShedStockReportShedTotals
): CalculationBreakdown {
  const ungradedBags = totals.ungradedBags ?? 0;
  const result = totals.shedStock + ungradedBags;

  return {
    title: 'Overall Shed Stock Formula',
    subtitle: 'How the report total is derived',
    result,
    terms: buildShedStockTerms(
      totals.gradingInitial,
      totals.stored,
      totals.notInternallyTransferred,
      ungradedBags
    ),
    notes: [
      'Displayed Shed Stock = Grading Initial + Ungraded − Stored − Not Internally Transferred',
      'Internally transferred dispatch is tracked separately and does not reduce shed stock.',
    ],
  };
}
