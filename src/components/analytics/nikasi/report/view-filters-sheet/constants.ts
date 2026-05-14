import type { FilterField, FilterOperator } from '@/lib/advanced-filters';
import type { FilterableColumnId, InternalTransferFilterValue } from './types';

export const internalTransferFilterOptions: InternalTransferFilterValue[] = [
  'Yes',
  'No',
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
  { id: 'gatePassNo', label: 'System Generated Gate Pass No' },
  { id: 'manualGatePassNumber', label: 'Manual Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety / bags' },
  { id: 'truckNumber', label: 'Truck number' },
  { id: 'bagsReceived', label: 'Bags issued' },
  { id: 'netWeightKg', label: 'Net (kg)' },
  { id: 'remarks', label: 'Remarks' },
  { id: 'location', label: 'Dispatch ledger' },
  { id: 'nikasiFrom', label: 'From' },
  { id: 'nikasiTo', label: 'To' },
];

export const advancedFilterFields: Array<{ id: FilterField; label: string }> = [
  { id: 'gatePassNo', label: 'System Generated Gate Pass No' },
  { id: 'manualGatePassNumber', label: 'Manual Gate Pass No' },
  { id: 'date', label: 'Date' },
  { id: 'variety', label: 'Variety / bags' },
  { id: 'truckNumber', label: 'Truck number' },
  { id: 'bagsReceived', label: 'Bags issued' },
  { id: 'netWeightKg', label: 'Net (kg)' },
  { id: 'remarks', label: 'Remarks' },
  { id: 'location', label: 'Dispatch ledger' },
  { id: 'nikasiFrom', label: 'From' },
  { id: 'nikasiTo', label: 'To' },
  { id: 'linkedByName', label: 'Linked by' },
  { id: 'createdByName', label: 'Created by' },
  { id: 'storageAccountLabel', label: 'Storage account' },
  { id: 'dispatchLedgerMobile', label: 'Ledger mobile' },
  { id: 'isInternalTransferLabel', label: 'Internal transfer' },
  { id: 'averageWeightPerBag', label: 'Avg / bag (kg)' },
];

export const getInitialSearchQueries = (): Record<
  FilterableColumnId,
  string
> => ({
  gatePassNo: '',
  manualGatePassNumber: '',
  date: '',
  variety: '',
  truckNumber: '',
  bagsReceived: '',
  netWeightKg: '',
  remarks: '',
  location: '',
  nikasiFrom: '',
  nikasiTo: '',
});

export const getInitialExpandedFilters = (): Record<
  FilterableColumnId,
  boolean
> => ({
  gatePassNo: false,
  manualGatePassNumber: false,
  date: false,
  variety: false,
  truckNumber: false,
  bagsReceived: false,
  netWeightKg: false,
  remarks: false,
  location: false,
  nikasiFrom: false,
  nikasiTo: false,
});

export const getEmptyValueFilters = (): Record<
  FilterableColumnId,
  string[]
> => ({
  gatePassNo: [],
  manualGatePassNumber: [],
  date: [],
  variety: [],
  truckNumber: [],
  bagsReceived: [],
  netWeightKg: [],
  remarks: [],
  location: [],
  nikasiFrom: [],
  nikasiTo: [],
});

export const getInitialValueFilterTouched = (): Record<
  FilterableColumnId,
  boolean
> => ({
  gatePassNo: false,
  manualGatePassNumber: false,
  date: false,
  variety: false,
  truckNumber: false,
  bagsReceived: false,
  netWeightKg: false,
  remarks: false,
  location: false,
  nikasiFrom: false,
  nikasiTo: false,
});
