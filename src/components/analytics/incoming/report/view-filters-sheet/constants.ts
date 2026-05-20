import type { FilterField, FilterOperator } from '@/lib/advanced-filters';
import type { FilterableColumnId, StatusFilterValue } from './types';

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

export const filterableColumns: Array<{
  id: FilterableColumnId;
  label: string;
}> = [
  { id: 'farmerName', label: 'Farmer' },
  { id: 'farmerAddress', label: 'Farmer address' },
  { id: 'gatePassNo', label: 'System Generated Gate Pass No' },
  { id: 'manualGatePassNumber', label: 'Manual Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety' },
  { id: 'truckNumber', label: 'Truck number' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Net (kg)' },
  { id: 'remarks', label: 'Remarks' },
];

export const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'farmerName', label: 'Farmer' },
  { id: 'farmerAddress', label: 'Farmer address' },
  { id: 'gatePassNo', label: 'System Generated Gate Pass No' },
  { id: 'manualGatePassNumber', label: 'Manual Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety' },
  { id: 'truckNumber', label: 'Truck number' },
  { id: 'bagsReceived', label: 'Bags' },
  { id: 'netWeightKg', label: 'Net (kg)' },
  { id: 'status', label: 'Status' },
  { id: 'remarks', label: 'Remarks' },
];

export const getInitialSearchQueries = (): Record<
  FilterableColumnId,
  string
> => ({
  farmerName: '',
  farmerAddress: '',
  gatePassNo: '',
  manualGatePassNumber: '',
  date: '',
  variety: '',
  truckNumber: '',
  bagsReceived: '',
  netWeightKg: '',
  remarks: '',
});

export const getInitialExpandedFilters = (): Record<
  FilterableColumnId,
  boolean
> => ({
  farmerName: false,
  farmerAddress: false,
  gatePassNo: false,
  manualGatePassNumber: false,
  date: false,
  variety: false,
  truckNumber: false,
  bagsReceived: false,
  netWeightKg: false,
  remarks: false,
});

export const getEmptyValueFilters = (): Record<
  FilterableColumnId,
  string[]
> => ({
  farmerName: [],
  farmerAddress: [],
  gatePassNo: [],
  manualGatePassNumber: [],
  date: [],
  variety: [],
  truckNumber: [],
  bagsReceived: [],
  netWeightKg: [],
  remarks: [],
});
