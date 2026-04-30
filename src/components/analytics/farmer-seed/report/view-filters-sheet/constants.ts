import type { FilterField, FilterOperator } from '@/lib/advanced-filters';
import type { FilterableColumnId } from './types';

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

export const filterableColumns: Array<{
  id: FilterableColumnId;
  label: string;
}> = [
  { id: 'gatePassNo', label: 'Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Acres' },
];

export const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'gatePassNo', label: 'Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Acres' },
];

export const getInitialSearchQueries = (): Record<
  FilterableColumnId,
  string
> => ({
  gatePassNo: '',
  date: '',
  farmerName: '',
  variety: '',
  bagsReceived: '',
  netWeightKg: '',
});

export const getInitialExpandedFilters = (): Record<
  FilterableColumnId,
  boolean
> => ({
  gatePassNo: false,
  date: false,
  farmerName: false,
  variety: false,
  bagsReceived: false,
  netWeightKg: false,
});

export const getEmptyValueFilters = (): Record<
  FilterableColumnId,
  string[]
> => ({
  gatePassNo: [],
  date: [],
  farmerName: [],
  variety: [],
  bagsReceived: [],
  netWeightKg: [],
});
