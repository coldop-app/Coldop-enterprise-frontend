import type { FilterOperator } from '@/lib/advanced-filters';
import type { StatusFilterValue } from './types';

export const statusFilterOptions: StatusFilterValue[] = [
  'GRADED',
  'NOT_GRADED',
];

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
