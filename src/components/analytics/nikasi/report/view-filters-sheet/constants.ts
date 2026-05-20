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
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
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
  { id: 'farmerName', label: 'Farmer' },
  { id: 'variety', label: 'Variety' },
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
  farmerName: '',
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
  farmerName: false,
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
  farmerName: [],
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
  farmerName: false,
  variety: false,
  truckNumber: false,
  bagsReceived: false,
  netWeightKg: false,
  remarks: false,
  location: false,
  nikasiFrom: false,
  nikasiTo: false,
});

export function buildAllAdvancedFilterFields(
  bagSizeColumnConfig: Array<{ id: string; label: string }>
): Array<{ id: FilterField; label: string }> {
  const bagFields = bagSizeColumnConfig.map(({ id, label }) => ({
    id: id as FilterField,
    label: `${label} (mm)`,
  }));
  const varietyIndex = advancedFilterFields.findIndex(
    (c) => c.id === 'variety'
  );
  if (varietyIndex < 0) {
    return [...advancedFilterFields, ...bagFields];
  }
  const insertAt = varietyIndex + 1;
  return [
    ...advancedFilterFields.slice(0, insertAt),
    ...bagFields,
    ...advancedFilterFields.slice(insertAt),
  ];
}

export function buildAllFilterableColumns(
  bagSizeColumnConfig: Array<{ id: string; label: string }>
): Array<{ id: string; label: string }> {
  const bagFilters = bagSizeColumnConfig.map(({ id, label }) => ({
    id,
    label: `${label} (mm)`,
  }));
  const varietyIndex = filterableColumns.findIndex((c) => c.id === 'variety');
  if (varietyIndex < 0) {
    return [...filterableColumns, ...bagFilters];
  }
  return [
    ...filterableColumns.slice(0, varietyIndex + 1),
    ...bagFilters,
    ...filterableColumns.slice(varietyIndex + 1),
  ];
}

export function buildFilterStateRecord<T>(
  columnIds: string[],
  valueForKey: () => T
): Record<string, T> {
  return Object.fromEntries(columnIds.map((id) => [id, valueForKey()]));
}

export function mergeFilterStateRecord<T>(
  prev: Record<string, T>,
  columnIds: string[],
  valueForKey: () => T
): Record<string, T> {
  const next = { ...prev };
  for (const id of columnIds) {
    if (!(id in next)) next[id] = valueForKey();
  }
  return next;
}
