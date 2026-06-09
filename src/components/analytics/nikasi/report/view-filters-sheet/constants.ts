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
  { id: 'from', label: 'From' },
  { id: 'dispatchLedger', label: 'Dispatch Ledger' },
  { id: 'to', label: 'To' },
  { id: 'truckNumber', label: 'Truck Number' },
  { id: 'variety', label: 'Variety' },
  { id: 'totalBagsIssued', label: 'Total Bags Issued' },
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
  { id: 'averageWeightPerBag', label: 'Average Weight Per Bag' },
  { id: 'netWeight', label: 'Net Weight' },
  { id: 'isInternalTransfer', label: 'Internal Transfer' },
  { id: 'remarks', label: 'Remarks' },
];

/** Logic-builder fields mirror every filterable column. */
export function getNikasiAdvancedFilterFields(
  columns: Array<{ id: FilterableColumnId; label: string }>
): Array<{ id: FilterField; label: string }> {
  return columns.map(({ id, label }) => ({
    id: id as FilterField,
    label,
  }));
}

const FILTERABLE_COLUMN_IDS: FilterableColumnId[] = [
  'gatePassNo',
  'manualGatePassNumber',
  'date',
  'from',
  'dispatchLedger',
  'to',
  'truckNumber',
  'variety',
  'totalBagsIssued',
  'bagBelow25',
  'bag25to30',
  'bagBelow30',
  'bag30to35',
  'bag30to40',
  'bag35to40',
  'bag40to45',
  'bag45to50',
  'bag50to55',
  'bagAbove50',
  'bagAbove55',
  'bagCut',
  'averageWeightPerBag',
  'netWeight',
  'isInternalTransfer',
  'remarks',
];

function buildFilterableRecord<T>(
  factory: () => T
): Record<FilterableColumnId, T> {
  return FILTERABLE_COLUMN_IDS.reduce(
    (acc, id) => {
      acc[id] = factory();
      return acc;
    },
    {} as Record<FilterableColumnId, T>
  );
}

export const getInitialSearchQueries = (): Record<FilterableColumnId, string> =>
  buildFilterableRecord(() => '');

export const getInitialExpandedFilters = (): Record<
  FilterableColumnId,
  boolean
> => buildFilterableRecord(() => false);

export const getEmptyValueFilters = (): Record<FilterableColumnId, string[]> =>
  buildFilterableRecord(() => []);
