import type { FilterOperator } from '@/lib/advanced-filters';

export const stringOperators: FilterOperator[] = [
  'contains',
  '=',
  '!=',
  'startsWith',
  'endsWith',
];

export const numberOperators: FilterOperator[] = [
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
];

export const filterOperatorLabels: Record<FilterOperator, string> = {
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
