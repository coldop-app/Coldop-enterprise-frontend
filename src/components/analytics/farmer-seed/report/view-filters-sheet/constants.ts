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
  { id: 'farmerName', label: 'Farmer' },
  { id: 'totalAcres', label: 'Acres planted' },
  { id: 'gatePassNo', label: 'Gate pass no.' },
  { id: 'invoiceNumber', label: 'Invoice number' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety' },
  { id: 'generation', label: 'Stage' },
  { id: 'bag35to40', label: '35-40 (mm)' },
  { id: 'bag40to45', label: '40-45 (mm)' },
  { id: 'bag40to50', label: '40-50 (mm)' },
  { id: 'bag45to50', label: '45-50 (mm)' },
  { id: 'bag50to55', label: '50-55 (mm)' },
  { id: 'totalBags', label: 'Total bags' },
  { id: 'averageRate', label: 'Rate per bag' },
  { id: 'totalAmount', label: 'Total rate' },
  { id: 'remarks', label: 'Remarks' },
];

export const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'farmerName', label: 'Farmer' },
  { id: 'totalAcres', label: 'Acres planted' },
  { id: 'gatePassNo', label: 'Gate pass no.' },
  { id: 'invoiceNumber', label: 'Invoice number' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety' },
  { id: 'generation', label: 'Stage' },
  { id: 'bag35to40', label: '35-40 (mm)' },
  { id: 'bag40to45', label: '40-45 (mm)' },
  { id: 'bag40to50', label: '40-50 (mm)' },
  { id: 'bag45to50', label: '45-50 (mm)' },
  { id: 'bag50to55', label: '50-55 (mm)' },
  { id: 'totalBags', label: 'Total bags' },
  { id: 'averageRate', label: 'Rate per bag' },
  { id: 'totalAmount', label: 'Total rate' },
  { id: 'remarks', label: 'Remarks' },
];

export const getInitialSearchQueries = (): Record<
  FilterableColumnId,
  string
> => ({
  farmerName: '',
  totalAcres: '',
  gatePassNo: '',
  invoiceNumber: '',
  date: '',
  variety: '',
  generation: '',
  bag35to40: '',
  bag40to45: '',
  bag40to50: '',
  bag45to50: '',
  bag50to55: '',
  totalBags: '',
  averageRate: '',
  totalAmount: '',
  remarks: '',
});

export const getInitialExpandedFilters = (): Record<
  FilterableColumnId,
  boolean
> => ({
  farmerName: false,
  totalAcres: false,
  gatePassNo: false,
  invoiceNumber: false,
  date: false,
  variety: false,
  generation: false,
  bag35to40: false,
  bag40to45: false,
  bag40to50: false,
  bag45to50: false,
  bag50to55: false,
  totalBags: false,
  averageRate: false,
  totalAmount: false,
  remarks: false,
});

export const getEmptyValueFilters = (): Record<
  FilterableColumnId,
  string[]
> => ({
  farmerName: [],
  totalAcres: [],
  gatePassNo: [],
  invoiceNumber: [],
  date: [],
  variety: [],
  generation: [],
  bag35to40: [],
  bag40to45: [],
  bag40to50: [],
  bag45to50: [],
  bag50to55: [],
  totalBags: [],
  averageRate: [],
  totalAmount: [],
  remarks: [],
});
