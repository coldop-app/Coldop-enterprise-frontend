import type { ColumnFiltersState } from '@tanstack/react-table';
import {
  hasAnyUsableFilter,
  isAdvancedFilterGroup,
  type FilterGroupNode,
} from '@/lib/advanced-filters';
import {
  NET_AMOUNT_COLUMN_ID,
  NET_AMOUNT_PER_ACRE_COLUMN_ID,
  NET_PROFIT_TO_COMPANY_COLUMN_ID,
  NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID,
  SEED_AMOUNT_COLUMN_ID,
  TOTAL_ACRES_PLANTED_COLUMN_ID,
} from './columns';
import { getDisplayFamilyBlockKey } from './contract-farming-display-span-metadata';
import type { ContractFarmingGlobalFilterValue } from './contract-farming-filter-for-sorting';
import type { FlattenedRow } from './types';

export type ContractFarmingSortContext = {
  varietyFilterActive: boolean;
};

const DEFAULT_SORT_CONTEXT: ContractFarmingSortContext = {
  varietyFilterActive: false,
};

function isActiveColumnFilterValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

function globalFilterTargetsVarietyField(
  filter: ContractFarmingGlobalFilterValue
): boolean {
  if (!isAdvancedFilterGroup(filter) || !hasAnyUsableFilter(filter)) {
    return false;
  }

  const visit = (group: FilterGroupNode): boolean =>
    group.conditions.some((node) => {
      if (node.type === 'group') return visit(node);
      if (node.value.trim().length === 0) return false;
      return node.field === 'variety';
    });

  return visit(filter);
}

export function isContractFarmingVarietyFilterActive(
  columnFilters: ColumnFiltersState,
  globalFilter: ContractFarmingGlobalFilterValue
): boolean {
  if (
    columnFilters.some(
      ({ id, value }) => id === 'variety' && isActiveColumnFilterValue(value)
    )
  ) {
    return true;
  }

  return globalFilterTargetsVarietyField(globalFilter);
}

export function isVarietyScopedSizeColumn(columnId: string): boolean {
  return (
    columnId === 'acres' ||
    columnId === 'qty' ||
    columnId === SEED_AMOUNT_COLUMN_ID
  );
}

export function isVarietyScopedFinancialColumn(columnId: string): boolean {
  return (
    columnId === TOTAL_ACRES_PLANTED_COLUMN_ID ||
    columnId === NET_AMOUNT_COLUMN_ID ||
    columnId === NET_AMOUNT_PER_ACRE_COLUMN_ID ||
    columnId === NET_PROFIT_TO_COMPANY_COLUMN_ID ||
    columnId === NET_PROFIT_TO_COMPANY_PER_ACRE_COLUMN_ID
  );
}

export function getSortBlockKey(
  row: FlattenedRow,
  columnId: string,
  sortContext: ContractFarmingSortContext = DEFAULT_SORT_CONTEXT
): string {
  if (isVarietyScopedFinancialColumn(columnId)) {
    return `variety:${row.varietyRowKey}`;
  }

  if (sortContext.varietyFilterActive && isVarietyScopedSizeColumn(columnId)) {
    return `variety:${row.varietyRowKey}`;
  }

  return getDisplayFamilyBlockKey(row);
}
