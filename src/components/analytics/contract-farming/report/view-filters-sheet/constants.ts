import type { FilterField, FilterOperator } from '@/lib/advanced-filters';
import type { FilterableColumnId, StatusFilterValue } from './types';

export const statusFilterOptions: StatusFilterValue[] = ['ACTIVE'];

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
  { id: 'gatePassNo', label: 'Account No.' },
  { id: 'date', label: 'Date' },
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Buy-Back Net (kg)' },
  { id: 'location', label: 'Planted Acres' },
  { id: 'truckNumber', label: 'Buy-Back Varieties' },
];

export const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'gatePassNo', label: 'Account No.' },
  { id: 'date', label: 'Date' },
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Buy-Back Net (kg)' },
  { id: 'status', label: 'Status' },
  { id: 'location', label: 'Planted Acres' },
  { id: 'truckNumber', label: 'Buy-Back Varieties' },
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
  location: '',
  truckNumber: '',
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
  location: false,
  truckNumber: false,
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
  location: [],
  truckNumber: [],
});
