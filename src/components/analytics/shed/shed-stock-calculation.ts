import type {
  ShedStockReportShedTotals,
  ShedStockReportShedVariety,
} from '@/types/analytics';
import { normalizeSizeKey, sumByNormalizedSize } from './shed-report-utils';

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

export function buildCellBreakdown(
  selection: CellSelection,
  metric: ShedStockMetric,
  varieties: ShedStockReportShedVariety[],
  totals: ShedStockReportShedTotals,
  columnTotals: Record<string, number>
): CalculationBreakdown {
  const ungradedBags = totals.ungradedBags ?? 0;

  if (selection.type === 'cell') {
    const variety = findVariety(varieties, selection.variety);
    const value =
      variety != null
        ? sumByNormalizedSize(variety.sizes, selection.size, (row) =>
            Number(row[metric] ?? 0)
          )
        : 0;
    const mergeNote =
      variety != null ? getMergedSizeNote(variety, selection.size) : undefined;

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
          'Ungraded bags are tracked at report level only, not per size.',
          ...(mergeNote ? [mergeNote] : []),
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
    const value = variety?.[metric] ?? 0;

    if (metric === 'shedStock' && variety != null) {
      return {
        title: `${selection.variety} · Total`,
        subtitle:
          'Variety total (from API, may differ from sum of size columns)',
        result: value,
        terms: buildShedStockTerms(
          variety.gradingInitial,
          variety.stored,
          variety.notInternallyTransferred
        ),
        notes: [
          'Row total uses the variety-level aggregate from the API.',
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
          'Ungraded bags are not allocated per size column.',
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
