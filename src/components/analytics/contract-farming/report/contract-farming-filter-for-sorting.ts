import type {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  Row,
} from '@tanstack/react-table';
import {
  hasAnyUsableFilter,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import type { FlattenedRow } from './types';

export type ContractFarmingGlobalFilterValue = string | FilterGroupNode;

type ColumnValueGetter = (row: FlattenedRow) => unknown;

function isActiveColumnFilterValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

function isActiveGlobalFilterValue(
  filterValue: ContractFarmingGlobalFilterValue
): boolean {
  if (isAdvancedFilterGroup(filterValue)) {
    return hasAnyUsableFilter(filterValue);
  }
  return String(filterValue ?? '').trim().length > 0;
}

function buildColumnValueGetter(
  column: ColumnDef<FlattenedRow, unknown>
): ColumnValueGetter | null {
  const col = column as ColumnDef<FlattenedRow, unknown> & {
    accessorKey?: keyof FlattenedRow | string;
    accessorFn?: (row: FlattenedRow, index: number) => unknown;
  };

  if (typeof col.accessorFn === 'function') {
    return (row) => col.accessorFn!(row, 0);
  }

  if (col.accessorKey != null) {
    const key = col.accessorKey as keyof FlattenedRow;
    return (row) => row[key];
  }

  return null;
}

function buildColumnValueGettersById(
  columns: ColumnDef<FlattenedRow, unknown>[]
): Map<string, ColumnValueGetter> {
  const gettersById = new Map<string, ColumnValueGetter>();

  for (const column of columns) {
    const columnId = column.id;
    if (!columnId) continue;
    const getValue = buildColumnValueGetter(column);
    if (getValue) {
      gettersById.set(columnId, getValue);
    }
  }

  return gettersById;
}

function createFilterableRow(
  original: FlattenedRow,
  gettersById: Map<string, ColumnValueGetter>
): Row<FlattenedRow> {
  return {
    original,
    id: original.rowId,
    getValue: (columnId: string) => {
      const getValue = gettersById.get(columnId);
      return getValue ? getValue(original) : undefined;
    },
  } as Row<FlattenedRow>;
}

function passesColumnFilters(
  row: Row<FlattenedRow>,
  columnFilters: ColumnFiltersState,
  columnsById: Map<string, ColumnDef<FlattenedRow, unknown>>
): boolean {
  for (const { id, value } of columnFilters) {
    if (!isActiveColumnFilterValue(value)) continue;

    const column = columnsById.get(id);
    const filterFn = column?.filterFn;
    if (typeof filterFn !== 'function') continue;

    const passes = (filterFn as FilterFn<FlattenedRow>)(
      row,
      id,
      value,
      () => undefined
    );
    if (!passes) return false;
  }

  return true;
}

function passesGlobalFilter(
  original: FlattenedRow,
  globalFilter: ContractFarmingGlobalFilterValue,
  globalFilterFn: (
    row: { original: FlattenedRow },
    columnId: string,
    filterValue: ContractFarmingGlobalFilterValue
  ) => boolean
): boolean {
  if (!isActiveGlobalFilterValue(globalFilter)) return true;
  return globalFilterFn({ original }, 'global', globalFilter);
}

/**
 * Applies the same column + global filters TanStack Table uses so block sort
 * keys are computed from the visible row set.
 */
export function filterFlattenedRowsForBlockSorting(
  rows: FlattenedRow[],
  columns: ColumnDef<FlattenedRow, unknown>[],
  columnFilters: ColumnFiltersState,
  globalFilter: ContractFarmingGlobalFilterValue,
  globalFilterFn: (
    row: { original: FlattenedRow },
    columnId: string,
    filterValue: ContractFarmingGlobalFilterValue
  ) => boolean
): FlattenedRow[] {
  const hasActiveColumnFilters = columnFilters.some(({ value }) =>
    isActiveColumnFilterValue(value)
  );
  const hasActiveGlobalFilter = isActiveGlobalFilterValue(globalFilter);

  if (!hasActiveColumnFilters && !hasActiveGlobalFilter) {
    return rows;
  }

  const columnsById = new Map(
    columns.flatMap((column) =>
      column.id ? [[column.id, column] as const] : []
    )
  );
  const gettersById = buildColumnValueGettersById(columns);

  return rows.filter((original) => {
    const row = createFilterableRow(original, gettersById);
    if (!passesColumnFilters(row, columnFilters, columnsById)) return false;
    return passesGlobalFilter(original, globalFilter, globalFilterFn);
  });
}
