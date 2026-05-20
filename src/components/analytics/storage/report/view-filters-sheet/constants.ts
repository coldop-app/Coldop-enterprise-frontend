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
  { id: 'gatePassNo', label: 'System Generated Gate Pass No' },
  { id: 'manualGatePassNumber', label: 'Manual Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety' },
  { id: 'bagBelow25', label: 'Below 25 (mm)' },
  { id: 'bag25to30', label: '25-30 (mm)' },
  { id: 'bagBelow30', label: 'Below 30 (mm)' },
  { id: 'bag30to35', label: '30-35 (mm)' },
  { id: 'bag30to40', label: '30-40 (mm)' },
  { id: 'bag35to40', label: '35-40 (mm)' },
  { id: 'bag40to45', label: '40-45 (mm)' },
  { id: 'bag45to50', label: '45-50 (mm)' },
  { id: 'bag50to55', label: '50-55 (mm)' },
  { id: 'bagAbove50', label: 'Above 50 (mm)' },
  { id: 'bagAbove55', label: 'Above 55 (mm)' },
  { id: 'bagCut', label: 'Cut' },
  { id: 'totalBags', label: 'Total Bags' },
];

export const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'gatePassNo', label: 'System Generated Gate Pass No' },
  { id: 'manualGatePassNumber', label: 'Manual Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety' },
  { id: 'totalBags', label: 'Total Bags' },
];

export const getInitialSearchQueries = (): Record<
  FilterableColumnId,
  string
> => ({
  gatePassNo: '',
  manualGatePassNumber: '',
  date: '',
  variety: '',
  bagBelow25: '',
  bag25to30: '',
  bagBelow30: '',
  bag30to35: '',
  bag30to40: '',
  bag35to40: '',
  bag40to45: '',
  bag45to50: '',
  bag50to55: '',
  bagAbove50: '',
  bagAbove55: '',
  bagCut: '',
  totalBags: '',
});

export const getInitialExpandedFilters = (): Record<
  FilterableColumnId,
  boolean
> => ({
  gatePassNo: false,
  manualGatePassNumber: false,
  date: false,
  variety: false,
  bagBelow25: false,
  bag25to30: false,
  bagBelow30: false,
  bag30to35: false,
  bag30to40: false,
  bag35to40: false,
  bag40to45: false,
  bag45to50: false,
  bag50to55: false,
  bagAbove50: false,
  bagAbove55: false,
  bagCut: false,
  totalBags: false,
});

export const getEmptyValueFilters = (): Record<
  FilterableColumnId,
  string[]
> => ({
  gatePassNo: [],
  manualGatePassNumber: [],
  date: [],
  variety: [],
  bagBelow25: [],
  bag25to30: [],
  bagBelow30: [],
  bag30to35: [],
  bag30to40: [],
  bag35to40: [],
  bag40to45: [],
  bag45to50: [],
  bag50to55: [],
  bagAbove50: [],
  bagAbove55: [],
  bagCut: [],
  totalBags: [],
});
