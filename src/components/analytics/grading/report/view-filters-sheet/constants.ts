import type { GradingFilterOperator } from './advanced-filters';
import type { GradingFilterableColumnId } from './types';
import {
  GRADING_BAG_SIZE_COLUMN_ORDER,
  defaultGradingColumnOrder,
  getGradingBagSizeColumnId,
  gradingBagSizeColumnHeaderText,
} from '../column-meta';

export const stringOperators: GradingFilterOperator[] = [
  'contains',
  '=',
  '!=',
  'startsWith',
  'endsWith',
];

export const numberOperators: GradingFilterOperator[] = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
];

export const filterOperatorLabels: Record<GradingFilterOperator, string> = {
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  '=': 'equals',
  '!=': 'not equal',
  '>': 'greater than',
  '>=': '≥ greater or equal',
  '<': 'less than',
  '<=': '≤ less or equal',
};

const columnLabelEntries: [GradingFilterableColumnId, string][] = [
  ['incomingGatePassIds', 'Incoming Manual Gate Pass No'],
  ['incomingBagsReceived', 'Bags received'],
  ['incomingSlipNumber', 'Slip No.'],
  ['incomingGrossKg', 'Gross (kg)'],
  ['incomingTareKg', 'Tare (kg)'],
  ['incomingNetKg', 'Net (kg)'],
  ['incomingBardanaWeightKg', 'Incoming bardana weight'],
  ['incomingNetWeightWithoutBardana', 'Incoming Net Weight (w/o Bardana)'],
  ['createdBy', 'Created By'],
  ['gatePassNo', 'System Generated Gate Pass No'],
  ['manualGatePassNumber', 'Manual Gate Pass No'],
  ['date', 'Date'],
  ['farmerName', 'Farmer'],
  ['farmerAddress', 'Address'],
  ['variety', 'Variety'],
  ['gradedBags', 'Graded bags'],
  ...GRADING_BAG_SIZE_COLUMN_ORDER.map(
    (sizeLabel) =>
      [
        getGradingBagSizeColumnId(sizeLabel),
        gradingBagSizeColumnHeaderText(sizeLabel),
      ] as [GradingFilterableColumnId, string]
  ),
  ['gradingBardanaWeightKg', 'Grading bardana weight'],
  [
    'netWeightAfterGradingWithoutBardana',
    'Net Weight After Grading (w/o Bardana)',
  ],
  ['wastagePercent', 'Wastage (%)'],
  ['grader', 'Grader'],
  ['remarks', 'Remarks'],
];

export const gradingColumnLabels: Record<string, string> =
  Object.fromEntries(columnLabelEntries);

export const filterableColumns: Array<{
  id: GradingFilterableColumnId;
  label: string;
}> = defaultGradingColumnOrder.map((id) => ({
  id,
  label: gradingColumnLabels[id] ?? id,
}));

export const advancedFilterFields: Array<{
  id: GradingFilterableColumnId;
  label: string;
}> = filterableColumns;

const emptyRecord = (): Record<GradingFilterableColumnId, string> =>
  Object.fromEntries(defaultGradingColumnOrder.map((id) => [id, ''])) as Record<
    GradingFilterableColumnId,
    string
  >;

const falseRecord = (): Record<GradingFilterableColumnId, boolean> =>
  Object.fromEntries(
    defaultGradingColumnOrder.map((id) => [id, false])
  ) as Record<GradingFilterableColumnId, boolean>;

const emptyFiltersRecord = (): Record<GradingFilterableColumnId, string[]> =>
  Object.fromEntries(defaultGradingColumnOrder.map((id) => [id, []])) as Record<
    GradingFilterableColumnId,
    string[]
  >;

export const getInitialSearchQueries = (): Record<
  GradingFilterableColumnId,
  string
> => emptyRecord();

export const getInitialExpandedFilters = (): Record<
  GradingFilterableColumnId,
  boolean
> => falseRecord();

export const getEmptyValueFilters = (): Record<
  GradingFilterableColumnId,
  string[]
> => emptyFiltersRecord();

export const getInitialValueFilterTouched = (): Record<
  GradingFilterableColumnId,
  boolean
> => falseRecord();
